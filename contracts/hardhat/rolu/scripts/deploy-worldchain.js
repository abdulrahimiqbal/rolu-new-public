// This script deploys the RoluToken contract to World Chain (testnet or mainnet)
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    // Get the network name
    const network = hre.network.name;
    console.log(`Deploying RoluToken to ${network}...`);

    // Check if we're deploying to mainnet
    const isMainnet = network === "worldChainMainnet";
    if (isMainnet) {
        console.log("\x1b[33m%s\x1b[0m", "WARNING: You are deploying to MAINNET!");
        console.log("\x1b[33m%s\x1b[0m", "This will use real WLD tokens for gas fees!");
        // Add a 5-second delay to allow for cancellation if needed
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer address: ${deployer.address}`);

    // Display deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} WLD`);

    // In production, you should use real secure addresses for treasury and team allocations
    // For now, we'll prompt to make sure proper addresses are used
    console.log("\x1b[33m%s\x1b[0m", "IMPORTANT: For mainnet deployment, you should use secure multi-sig wallets");

    // For mainnet deployment, consider using secure multi-sig wallets or other secure addresses
    // For this example, we're still using the deployer address, but this should be changed
    // to proper secure addresses before the actual mainnet deployment
    const treasuryAddress = deployer.address;
    const teamAddress = deployer.address;

    console.log(`Treasury address: ${treasuryAddress}`);
    console.log(`Team address: ${teamAddress}`);

    // Deploy the contract
    console.log("Deploying RoluToken contract...");
    const RoluToken = await ethers.getContractFactory("RoluToken");
    const token = await RoluToken.deploy(
        treasuryAddress,
        teamAddress
    );

    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log(`RoluToken deployed to: ${tokenAddress}`);

    // Display the initial balances
    const treasuryBalance = await token.balanceOf(treasuryAddress);
    const teamBalance = await token.balanceOf(teamAddress);

    console.log(`Treasury balance: ${ethers.formatUnits(treasuryBalance, 18)} ROLU`);
    console.log(`Team balance: ${ethers.formatUnits(teamBalance, 18)} ROLU`);

    console.log("\nDeployment complete!");
    console.log("----------------------------------------------------");
    console.log("Contract address:", tokenAddress);
    console.log("Network:", network);
    console.log("----------------------------------------------------");

    // Wait for a few confirmations for better explorer indexing
    console.log("Waiting for confirmations...");
    if (network !== "hardhat") {
        await token.deploymentTransaction().wait(5);
        console.log("Confirmed!");
    }

    // Instructions for verification
    if (network !== "hardhat") {
        console.log("\nVerify the contract with:");
        console.log(`npx hardhat verify --network ${network} ${tokenAddress} ${treasuryAddress} ${teamAddress}`);
    }

    // Reminder to update environment variables
    if (isMainnet) {
        console.log("\n\x1b[33m%s\x1b[0m", "IMPORTANT: Don't forget to update your environment variables!");
        console.log("\x1b[33m%s\x1b[0m", "Add the following to your .env and .env.local files:");
        console.log(`NEXT_PUBLIC_ROLU_TOKEN_ADDRESS_MAINNET=${tokenAddress}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 