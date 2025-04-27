// This script checks the balance of ROLU tokens for a given address
const hre = require("hardhat");

async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: npx hardhat run scripts/check-balance.js --network <network> <token-address> <account-address>");
        process.exit(1);
    }

    const tokenAddress = args[0];
    const accountAddress = args[1];

    // Get the network name
    const network = hre.network.name;
    console.log(`Checking ROLU balance on ${network}...`);

    try {
        // Create a contract instance
        const RoluToken = await hre.ethers.getContractFactory("RoluToken");
        const token = RoluToken.attach(tokenAddress);

        // Get token information
        const tokenName = await token.name();
        const tokenSymbol = await token.symbol();

        console.log(`Token: ${tokenName} (${tokenSymbol})`);
        console.log(`Token Address: ${tokenAddress}`);
        console.log(`Checking balance for: ${accountAddress}`);

        // Get the balance
        const balance = await token.balanceOf(accountAddress);
        console.log(`Balance: ${hre.ethers.formatUnits(balance, 18)} ${tokenSymbol}`);

        // Get total supply
        const totalSupply = await token.totalSupply();
        console.log(`Total Supply: ${hre.ethers.formatUnits(totalSupply, 18)} ${tokenSymbol}`);

        // Calculate percentage of total supply
        const percentage = (balance * 10000n / totalSupply) / 100;
        console.log(`This account holds approximately ${percentage}% of the total supply`);
    } catch (error) {
        console.error("Error checking balance:");
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