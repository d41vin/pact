import 'dotenv/config'; // Load .env variables
import { network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const networkName = process.env.HARDHAT_NETWORK || "mantleSepolia";

    console.log(`\n🚀 Deploying ClaimLinkFactory to ${networkName}...\n`);

    const { viem } = await network.connect({
        network: networkName,
        chainType: "op",
    });

    const publicClient = await viem.getPublicClient();
    const [deployer] = await viem.getWalletClients();

    console.log("📍 Deployer address:", deployer.account.address);

    const balance = await publicClient.getBalance({ address: deployer.account.address });
    console.log("💰 Deployer balance:", balance.toString(), "wei");

    // Deploy ClaimLinkFactory (it deploys ClaimLinkImplementation in constructor)
    console.log("\n📦 Deploying ClaimLinkFactory...");

    const factory = await viem.deployContract("ClaimLinkFactory");

    console.log("✅ ClaimLinkFactory deployed to:", factory.address);

    // Get implementation address from factory
    const implementationAddress = await factory.read.implementation();
    console.log("✅ ClaimLinkImplementation deployed to:", implementationAddress);

    // Output for frontend configuration
    console.log("\n" + "=".repeat(60));
    console.log("📋 FRONTEND CONFIGURATION");
    console.log("=".repeat(60));
    console.log(`\nAdd these to frontend/.env.local:\n`);
    console.log(`NEXT_PUBLIC_CLAIM_LINK_FACTORY_ADDRESS=${factory.address}`);
    console.log(`NEXT_PUBLIC_CLAIM_LINK_IMPLEMENTATION_ADDRESS=${implementationAddress}`);

    console.log("\n" + "=".repeat(60));
    console.log("🔍 VERIFICATION COMMANDS");
    console.log("=".repeat(60));
    console.log(`\nnpx hardhat verify --network ${networkName} ${factory.address}`);
    console.log(`npx hardhat verify --network ${networkName} ${implementationAddress}`);

    // Save deployment info to a JSON file
    const deploymentInfo = {
        network: networkName,
        timestamp: new Date().toISOString(),
        deployer: deployer.account.address,
        contracts: {
            ClaimLinkFactory: factory.address,
            ClaimLinkImplementation: implementationAddress,
        },
    };

    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${networkName}-claim-link.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

    console.log("\n✨ Deployment complete!\n");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
