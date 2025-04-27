# Private Key Setup Guide

This guide explains how to securely set up your private key for deploying smart contracts to World Chain.

## IMPORTANT SECURITY WARNING

Your private key gives FULL access to your funds and should NEVER be shared with anyone or committed to version control. Anyone with your private key can steal all your funds.

## Setting Up Your Private Key

### Option 1: Using .env File (Recommended for Development)

1. Create a `.env` file in the project root by copying the example:

   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and replace the placeholder with your actual private key:

   ```
   PRIVATE_KEY=0x123abc...  # Your actual private key here
   ```

3. Make sure `.env` is in your `.gitignore` file to prevent accidental commits.

### Option 2: Using Environment Variables (Recommended for CI/CD)

Set the private key as an environment variable in your terminal:

```bash
# For Linux/macOS
export PRIVATE_KEY=0x123abc...

# For Windows Command Prompt
set PRIVATE_KEY=0x123abc...

# For Windows PowerShell
$env:PRIVATE_KEY="0x123abc..."
```

## How to Get Your Private Key

### MetaMask

1. Open MetaMask and click on the three dots in the upper right
2. Select "Account details"
3. Click "Export Private Key"
4. Enter your password
5. Copy the private key (starts with 0x)

### Other Wallets

Most wallets have a similar option to export your private key. Check your wallet's documentation.

## Creating a Testnet Account

For testing, it's recommended to create a new wallet exclusively for development:

1. Create a new account in MetaMask or another wallet
2. Fund it with a small amount of test ETH from a faucet
3. Only use this account for testing and development

## Getting Testnet ETH

To deploy contracts on World Chain Sepolia testnet, you'll need some testnet ETH:

1. Use the [World Chain Sepolia Faucet](https://worldchain-sepolia.g.alchemy.com/public)
2. Or bridge some Sepolia ETH to World Chain Sepolia using the [official bridge](https://worldchain-sepolia.bridge.alchemy.com)

## Best Practices

1. **Never share your private key** with anyone
2. **Never commit your private key** to Git or any version control
3. For production deployments, consider using:
   - Hardware wallets (Ledger, Trezor)
   - Multi-signature wallets
   - Deployment management tools with enhanced security
4. Use different accounts for testing and production
5. Keep minimal funds in development accounts
6. Regularly rotate development keys

## Validating Your Setup

After setting up your private key, validate your environment:

```bash
npx hardhat run scripts/test-env.js --network worldChainSepolia
```

This script will check if your account is properly configured and has sufficient funds for deployment.
