# Rolu Token Smart Contract

This repository contains the smart contract for the Rolu Token (ROLU), an ERC-20 token designed for the Rolu Educational Gaming Platform.

## Overview

The Rolu Token (ROLU) is used as a reward mechanism in the Rolu Educational Gaming Platform. It has a fixed supply of 100,000,000 tokens, distributed as follows:

- 90% (90,000,000 ROLU) to the treasury for rewards
- 10% (10,000,000 ROLU) to the team for operations and marketing

## Contract Features

- ERC-20 standard implementation
- Pausable functionality for emergency situations
- Fixed supply of 100 million tokens
- Owner privileges for security controls

## Prerequisites

- Node.js v16+ and npm/pnpm
- An Ethereum wallet with private key (for deployment)
- Some ETH on World Chain Sepolia testnet (for testing)
- Basic understanding of smart contracts and Hardhat

## Setup

1. Clone this repository and navigate to the project directory

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Create a `.env` file based on `.env.example` and add your private key
   ```bash
   cp .env.example .env
   # Then edit .env with your actual private key
   ```
   ⚠️ NEVER commit your actual private key to version control

## Testing the Environment

Before deploying, it's recommended to test your environment and network connectivity:

```bash
npx hardhat run scripts/test-env.js --network worldChainSepolia
```

This script will check your account balance, network connectivity, and other essential parameters.

## Deployment

### Deploying to World Chain Sepolia Testnet

```bash
npx hardhat run scripts/deploy-worldchain.js --network worldChainSepolia
```

### Deploying to World Chain Mainnet (production)

```bash
npx hardhat run scripts/deploy-worldchain.js --network worldChainMainnet
```

## Verifying Contract

After deployment, you can verify your contract on the block explorer. The deployment script will provide the exact verification command.

## Checking Token Balances

You can check the balance of any address using the following command:

```bash
npx hardhat run scripts/check-balance.js --network worldChainSepolia <token-address> <account-address>
```

Replace `<token-address>` with your deployed token address and `<account-address>` with the address you want to check.

## Integrating with World Chain Bridge

After deploying your token on World Chain, follow these steps to bridge it:

1. Follow the instructions in the [World Chain documentation](https://docs.world.org/world-chain/quick-start/info#world-chain-sepolia-testnet)
2. Submit details for your token following the process in their GitHub repository
3. Wait for the World team to review and approve your submission

## Security Considerations

- Secure your private key and never share it
- Consider a multi-sig wallet for the treasury in production
- Thoroughly test all functionality on testnet before mainnet deployment
- Consider a professional security audit before mainnet launch

## License

This project is licensed under the MIT License.
