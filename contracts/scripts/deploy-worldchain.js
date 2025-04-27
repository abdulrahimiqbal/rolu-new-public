// This script deploys the RoluToken contract to World Chain (testnet or mainnet)
const hre = require("hardhat");

async function main() {
    // Get the network name
    const network = hre.network.name;
    console.log(`Deploying RoluToken to ${network}...`);

    // Get the deployer's address
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer address: ${deployer.address}`);

    // Display deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH`);

    // For testing purposes, we'll use the deployer address for treasury and team allocations
    // In production, you should use separate secure addresses
    const treasuryAddress = deployer.address;
    const teamAddress = deployer.address;

    // Deploy the contract
    console.log("Deploying RoluToken contract...");
    const RoluToken = await hre.ethers.getContractFactory("RoluToken");
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

    console.log(`Treasury balance: ${hre.ethers.formatUnits(treasuryBalance, 18)} ROLU`);
    console.log(`Team balance: ${hre.ethers.formatUnits(teamBalance, 18)} ROLU`);

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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 