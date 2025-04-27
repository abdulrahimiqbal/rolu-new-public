// This script compiles the contracts and exports the ABI
const fs = require('fs');
const path = require('path');
const hre = require("hardhat");

async function main() {
    console.log("Compiling contracts...");

    // Compile contracts
    await hre.run('compile');

    // Get contract artifacts
    const RoluTokenArtifact = await hre.artifacts.readArtifact("RoluToken");

    // Extract ABI
    const abi = RoluTokenArtifact.abi;

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', '..', '..', 'abi');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write ABI to file
    const outputPath = path.join(outputDir, 'RoluToken.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify(abi, null, 2)
    );

    console.log(`ABI exported to ${outputPath}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 