// This script checks the WLD balance of an address on World Chain
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    // Get the network name
    const network = hre.network.name;
    console.log(`Checking WLD balance on ${network}...`);

    // Get the address from command line or use deployer address
    let address;

    if (process.argv.length > 2) {
        address = process.argv[2];
    } else {
        const [deployer] = await ethers.getSigners();
        address = deployer.address;
    }

    console.log(`Checking address: ${address}`);

    // Get chain info
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const blockNumber = await ethers.provider.getBlockNumber();

    console.log(`Chain ID: ${chainId}`);
    console.log(`Latest block number: ${blockNumber}`);

    // Get balance
    const balance = await ethers.provider.getBalance(address);
    console.log(`WLD Balance: ${ethers.formatEther(balance)} WLD`);

    // Check if balance is sufficient for deployment
    const minDeployBalance = ethers.parseEther("0.1"); // Recommend at least 0.1 WLD

    if (balance < minDeployBalance) {
        console.log("\x1b[31m%s\x1b[0m", `WARNING: Address has insufficient WLD balance for deployment!`);
        console.log("\x1b[31m%s\x1b[0m", `Recommended minimum balance: 0.1 WLD`);
        console.log("\x1b[31m%s\x1b[0m", `Please fund your account with WLD tokens before proceeding.`);
    } else {
        console.log("\x1b[32m%s\x1b[0m", `Address has sufficient WLD balance for deployment.`);
    }

    // Get gas price
    const gasPrice = await ethers.provider.getFeeData();
    console.log(`Current gas price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} Gwei`);

    // Estimate gas required for deployment
    console.log(`\nEstimating cost for RoluToken deployment...`);

    // Rough estimate based on similar contracts
    const estimatedGas = 3000000; // Approximate gas for RoluToken deployment
    const estimatedCost = (gasPrice.gasPrice || 0) * BigInt(estimatedGas);

    console.log(`Estimated gas required: ~${estimatedGas} gas units`);
    console.log(`Estimated cost: ~${ethers.formatEther(estimatedCost)} WLD`);

    // Summary
    console.log("\nSummary:");
    console.log("----------------------------------------------------");
    console.log(`Network: ${network}`);
    console.log(`Address: ${address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} WLD`);
    console.log(`Estimated deployment cost: ~${ethers.formatEther(estimatedCost)} WLD`);

    if (balance > estimatedCost) {
        console.log("\x1b[32m%s\x1b[0m", `Status: READY FOR DEPLOYMENT`);
    } else {
        console.log("\x1b[31m%s\x1b[0m", `Status: INSUFFICIENT FUNDS FOR DEPLOYMENT`);
    }
    console.log("----------------------------------------------------");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 