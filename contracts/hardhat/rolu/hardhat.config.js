// require("@matterlabs/hardhat-zksync-solc"); // Commented out for testing
// require("@matterlabs/hardhat-zksync-verify"); // Commented out for testing
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ethers");

// Import dotenv to load environment variables from .env file
require('dotenv').config();

// Define private key variable for deployment
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

// Use API key if provided, otherwise use default public endpoint
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const worldChainSepoliaUrl = ALCHEMY_API_KEY
  ? `https://worldchain-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : "https://worldchain-sepolia.g.alchemy.com/public";
const worldChainMainnetUrl = ALCHEMY_API_KEY
  ? `https://worldchain-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : "https://worldchain-mainnet.g.alchemy.com/public";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  /* // Commented out zksolc section for testing
  zksolc: {
    version: "1.4.1",
    compilerSource: "binary",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  */
  networks: {
    /* // Commented out zkSync networks for testing
    zkSyncSepoliaTestnet: {
      url: "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia",
      zksync: true,
      chainId: 300,
      verifyURL:
        "https://explorer.sepolia.era.zksync.dev/contract_verification",
    },
    zkSyncMainnet: {
      url: "https://mainnet.era.zksync.io",
      ethNetwork: "mainnet",
      zksync: true,
      chainId: 324,
      verifyURL:
        "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
    },
    */
    worldChainSepolia: {
      url: worldChainSepoliaUrl,
      accounts: [PRIVATE_KEY],
      chainId: 4801, // World Chain Sepolia chain ID
      gasPrice: 'auto',
      gas: 2100000,
      timeout: 60000,
    },
    worldChainMainnet: {
      url: worldChainMainnetUrl,
      accounts: [PRIVATE_KEY],
      chainId: 480, // World Chain Mainnet chain ID
      gasPrice: 'auto',
      gas: 2100000,
      timeout: 60000,
    },
    hardhat: {
      chainId: 31337,
    },
  },
  /* // Commented out zk specific paths for testing - use defaults
  paths: {
    artifacts: "./artifacts-zk",
    cache: "./cache-zk",
    sources: "./contracts",
    tests: "./test",
  },
  */ 
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    // Keep etherscan config as it might be needed for standard verification
    apiKey: {
      worldChainSepolia: process.env.ETHERSCAN_API_KEY || '',
      worldChainMainnet: process.env.ETHERSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: "worldChainSepolia",
        chainId: 4801,
        urls: {
          apiURL: "https://worldchain-sepolia.explorer.alchemy.com/api", // Using Alchemy based API URL
          browserURL: "https://worldchain-sepolia.explorer.alchemy.com" // Using Alchemy based Browser URL
        }
      },
      {
        network: "worldChainMainnet",
        chainId: 480,
        urls: {
          apiURL: "https://worldscan.org/api",
          browserURL: "https://worldscan.org"
        }
      }
    ]
  },
};
