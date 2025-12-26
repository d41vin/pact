import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, parseEther } from "viem";

const { viem, networkHelpers } = await network.connect();
const publicClient = await viem.getPublicClient();

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function generateClaimKeyPair() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

async function generateClaimProof(
  privateKey: `0x${string}`,
  claimerAddress: `0x${string}`
) {
  const account = privateKeyToAccount(privateKey);
  const messageHash = keccak256(claimerAddress);
  return account.signMessage({ message: { raw: messageHash } });
}

async function nowInSeconds(): Promise<number> {
  const block = await publicClient.getBlock();
  return Number(block.timestamp);
}

async function deployFactoryFixture() {
  const [deployer, user1, user2, user3] = await viem.getWalletClients();
  const factory = await viem.deployContract("ClaimLinkFactory");
  const implementationAddress =
    (await factory.read.implementation()) as `0x${string}`;

  return {
    factory,
    implementationAddress,
    deployer,
    user1,
    user2,
    user3
  };
}

/* -------------------------------------------------------------------------- */
/*                                   Tests                                    */
/* -------------------------------------------------------------------------- */

describe("ClaimLinkImplementation", () => {
  it("deploys factory and implementation", async () => {
    const { factory, implementationAddress } =
      await networkHelpers.loadFixture(deployFactoryFixture);

    assert.ok(factory.address);
    assert.ok(implementationAddress);
  });

  it("verifies EIP-191 proof (anyone mode)", async () => {
    const { factory, user1 } =
      await networkHelpers.loadFixture(deployFactoryFixture);

    const amount = parseEther("1");
    const expiration = (await nowInSeconds()) + 3600;
    const keypair = generateClaimKeyPair();

    const hash = await factory.write.createClaimLink(
      [
        0,
        "0x0000000000000000000000000000000000000000",
        amount,
        0,
        1,
        BigInt(expiration),
        5n,
        [],
        [],
        keypair.address
      ],
      { value: amount }
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "ClaimLinkDeployed",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });

    assert.equal(events.length, 1);

    const claimLinkAddress = (events[0] as any).args.claimLink as `0x${string}`;

    const claimLink = await viem.getContractAt(
      "ClaimLinkImplementation",
      claimLinkAddress
    );

    const proof = await generateClaimProof(
      keypair.privateKey,
      user1.account.address
    );

    await claimLink.write.claimWithProof([proof], {
      account: user1.account
    });

    const hasClaimed = (await claimLink.read.hasClaimed([
      user1.account.address
    ])) as boolean;

    assert.equal(hasClaimed, true);
  });

  it("rejects invalid proof", async () => {
    const { factory, user1 } =
      await networkHelpers.loadFixture(deployFactoryFixture);

    const amount = parseEther("1");
    const expiration = (await nowInSeconds()) + 3600;

    const goodKey = generateClaimKeyPair();
    const badKey = generateClaimKeyPair();

    const hash = await factory.write.createClaimLink(
      [
        0,
        "0x0000000000000000000000000000000000000000",
        amount,
        0,
        1,
        BigInt(expiration),
        5n,
        [],
        [],
        goodKey.address
      ],
      { value: amount }
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "ClaimLinkDeployed",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });

    const claimLinkAddress = (events[0] as any).args.claimLink as `0x${string}`;

    const claimLink = await viem.getContractAt(
      "ClaimLinkImplementation",
      claimLinkAddress
    );

    const badProof = await generateClaimProof(
      badKey.privateKey,
      user1.account.address
    );

    await viem.assertions.revertWith(
      claimLink.write.claimWithProof([badProof], {
        account: user1.account
      }),
      "Invalid proof"
    );
  });

  it("handles expiration correctly", async () => {
    const { factory } = await networkHelpers.loadFixture(deployFactoryFixture);

    const amount = parseEther("1");
    const expiration = (await nowInSeconds()) + 10;
    const keypair = generateClaimKeyPair();

    const hash = await factory.write.createClaimLink(
      [
        0,
        "0x0000000000000000000000000000000000000000",
        amount,
        0,
        1,
        BigInt(expiration),
        5n,
        [],
        [],
        keypair.address
      ],
      { value: amount }
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "ClaimLinkDeployed",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });

    const claimLinkAddress = (events[0] as any).args.claimLink as `0x${string}`;

    const claimLink = await viem.getContractAt(
      "ClaimLinkImplementation",
      claimLinkAddress
    );

    assert.equal(await claimLink.read.isExpired(), false);

    await networkHelpers.time.increase(11); // Increase by 11 seconds (expiration is 10 seconds)

    assert.equal(await claimLink.read.isExpired(), true);
  });

  it("enforces maxClaimers", async () => {
    const { factory, user1, user2, user3 } =
      await networkHelpers.loadFixture(deployFactoryFixture);

    const amount = parseEther("0.3");
    const expiration = (await nowInSeconds()) + 3600;
    const keypair = generateClaimKeyPair();

    const hash = await factory.write.createClaimLink(
      [
        0,
        "0x0000000000000000000000000000000000000000",
        amount,
        0,
        1,
        BigInt(expiration),
        3n,
        [],
        [],
        keypair.address
      ],
      { value: amount }
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const events = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "ClaimLinkDeployed",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });

    const claimLinkAddress = (events[0] as any).args.claimLink as `0x${string}`;

    const claimLink = await viem.getContractAt(
      "ClaimLinkImplementation",
      claimLinkAddress
    );

    for (const user of [user1, user2, user3]) {
      const proof = await generateClaimProof(
        keypair.privateKey,
        user.account.address
      );
      await claimLink.write.claimWithProof([proof], {
        account: user.account
      });
    }

    const claimers = (await claimLink.read.getClaimers()) as `0x${string}`[];

    assert.equal(claimers.length, 3);
    assert.equal(await claimLink.read.status(), 2);
  });
});
