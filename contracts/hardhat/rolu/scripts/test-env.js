// This script tests the environment setup and network connectivity
const hre = require("hardhat");

async function main() {
    // Get the network name
    const network = hre.network.name;
    console.log(`Testing environment on ${network}...`);

    try {
        // Get the deployer's address
        const [deployer] = await hre.ethers.getSigners();
        console.log(`Account address: ${deployer.address}`);

        // Check account balance
        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH`);

        // Check if the balance is sufficient for deployment
        const minBalance = hre.ethers.parseEther("0.01"); // Minimum 0.01 ETH required
        if (balance < minBalance) {
            console.warn(`WARNING: Account balance is low. Consider funding your account with more ETH for deployment.`);
        } else {
            console.log(`Account has sufficient balance for deployment.`);
        }

        // Get the latest block number
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        console.log(`Latest block number: ${blockNumber}`);

        // Get chain ID
        const chainId = (await hre.ethers.provider.getNetwork()).chainId;
        console.log(`Chain ID: ${chainId}`);

        // Check gas price
        const gasPrice = await hre.ethers.provider.getFeeData();
        console.log(`Gas price: ${hre.ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} Gwei`);

        console.log("\nEnvironment test completed successfully!");
        console.log("----------------------------------------------------");
        console.log("Network:", network);
        console.log("Chain ID:", chainId);
        console.log("Account:", deployer.address);
        console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
        console.log("----------------------------------------------------");

    } catch (error) {
        console.error("Error testing environment:");
        console.error(error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 