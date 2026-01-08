import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther, type Address } from "viem";

const { viem, networkHelpers } = await network.connect();
const publicClient = await viem.getPublicClient();

/* -------------------------------------------------------------------------- */
/*                                  Fixtures                                  */
/* -------------------------------------------------------------------------- */

async function deployFactoryFixture() {
    const [owner, admin1, admin2, member1, member2, member3] =
        await viem.getWalletClients();

    const factory = await viem.deployContract("GroupFundFactory");
    const implementationAddress =
        (await factory.read.implementation()) as `0x${string}`;

    const fakeGroupAddress =
        "0x1234567890123456789012345678901234567890" as Address;

    return {
        factory,
        implementationAddress,
        owner,
        admin1,
        admin2,
        member1,
        member2,
        member3,
        fakeGroupAddress,
    };
}

/* -------------------------------------------------------------------------- */
/*                                   Tests                                    */
/* -------------------------------------------------------------------------- */

describe("GroupFund", () => {
    it("deploys factory and implementation", async () => {
        const { factory, implementationAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        assert.ok(factory.address);
        assert.ok(implementationAddress);
    });

    it("creates a group fund with initial admins", async () => {
        const { factory, owner, admin1, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        assert.equal(receipt.status, "success");

        // Get deployed group fund address from events
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        assert.equal(events.length, 1);

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Verify creator
        const creator = (await groupFund.read.creator()) as `0x${string}`;
        assert.equal(creator.toLowerCase(), owner.account.address.toLowerCase());

        // Verify both owner and admin1 are admins
        const isOwnerAdmin = (await groupFund.read.isAdmin([
            owner.account.address,
        ])) as boolean;
        const isAdmin1Admin = (await groupFund.read.isAdmin([
            admin1.account.address,
        ])) as boolean;

        assert.equal(isOwnerAdmin, true);
        assert.equal(isAdmin1Admin, true);
    });

    it("allows members to deposit and tracks contributions", async () => {
        const { factory, owner, admin1, member1, member2, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        // Deploy group fund
        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Member1 deposits 5 ETH
        await groupFund.write.deposit({
            value: parseEther("5"),
            account: member1.account,
        });

        const member1Contribution = (await groupFund.read.getMemberContribution([
            member1.account.address,
        ])) as bigint;
        assert.equal(member1Contribution, parseEther("5"));

        // Member2 deposits 3 ETH
        await groupFund.write.deposit({
            value: parseEther("3"),
            account: member2.account,
        });

        const member2Contribution = (await groupFund.read.getMemberContribution([
            member2.account.address,
        ])) as bigint;
        assert.equal(member2Contribution, parseEther("3"));

        // Check total balance
        const balance = (await groupFund.read.getBalance()) as bigint;
        assert.equal(balance, parseEther("8"));

        // Check total deposited
        const totalDeposited = (await groupFund.read.totalDeposited()) as bigint;
        assert.equal(totalDeposited, parseEther("8"));

        // Check members list
        const members = (await groupFund.read.getMembers()) as `0x${string}`[];
        assert.equal(members.length, 2);
    });

    it("allows admins to withdraw funds", async () => {
        const { factory, owner, admin1, member1, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        // Deploy and get group fund
        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Member deposits
        await groupFund.write.deposit({
            value: parseEther("10"),
            account: member1.account,
        });

        // Admin withdraws 4 ETH
        await groupFund.write.withdraw([parseEther("4")], {
            account: owner.account,
        });

        const balance = (await groupFund.read.getBalance()) as bigint;
        assert.equal(balance, parseEther("6"));

        const totalWithdrawn = (await groupFund.read.totalWithdrawn()) as bigint;
        assert.equal(totalWithdrawn, parseEther("4"));
    });

    it("rejects withdrawal by non-admin", async () => {
        const { factory, owner, admin1, member1, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        // Deploy group fund
        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Member deposits
        await groupFund.write.deposit({
            value: parseEther("5"),
            account: member1.account,
        });

        // Member tries to withdraw (should fail)
        await assert.rejects(
            groupFund.write.withdraw([parseEther("1")], {
                account: member1.account,
            })
        );
    });

    it("allows creator to add and remove admins", async () => {
        const { factory, owner, admin1, member1, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        // Deploy group fund
        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Add member1 as admin
        await groupFund.write.addAdmin([member1.account.address], {
            account: owner.account,
        });

        const isMember1Admin = (await groupFund.read.isAdmin([
            member1.account.address,
        ])) as boolean;
        assert.equal(isMember1Admin, true);

        // Remove admin1
        await groupFund.write.removeAdmin([admin1.account.address], {
            account: owner.account,
        });

        const isAdmin1StillAdmin = (await groupFund.read.isAdmin([
            admin1.account.address,
        ])) as boolean;
        assert.equal(isAdmin1StillAdmin, false);
    });

    it("prevents creator from being removed as admin", async () => {
        const { factory, owner, admin1, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        // Deploy group fund
        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Try to remove creator (should fail)
        await assert.rejects(
            groupFund.write.removeAdmin([owner.account.address], {
                account: owner.account,
            })
        );
    });

    it("returns correct stats", async () => {
        const { factory, owner, admin1, member1, member2, fakeGroupAddress } =
            await networkHelpers.loadFixture(deployFactoryFixture);

        // Deploy group fund
        const hash = await factory.write.createGroupFund([
            owner.account.address,
            fakeGroupAddress,
            [admin1.account.address],
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const events = await publicClient.getContractEvents({
            address: factory.address,
            abi: factory.abi,
            eventName: "GroupFundDeployed",
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
        });

        const groupFundAddress = (events[0] as any).args
            .groupFund as `0x${string}`;
        const groupFund = await viem.getContractAt(
            "GroupFundImplementation",
            groupFundAddress
        );

        // Some deposits
        await groupFund.write.deposit({
            value: parseEther("5"),
            account: member1.account,
        });

        await groupFund.write.deposit({
            value: parseEther("3"),
            account: member2.account,
        });

        // One withdrawal
        await groupFund.write.withdraw([parseEther("2")], {
            account: owner.account,
        });

        // Check stats
        const stats = (await groupFund.read.getStats()) as [
            bigint,
            bigint,
            bigint,
            bigint,
            bigint
        ];

        const [balance, deposited, withdrawn, memberCount, adminCount] = stats;

        assert.equal(balance, parseEther("6")); // 8 - 2
        assert.equal(deposited, parseEther("8"));
        assert.equal(withdrawn, parseEther("2"));
        assert.equal(memberCount, 2n);
        assert.equal(adminCount, 2n); // owner + admin1
    });
});
