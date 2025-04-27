# RoluToken Mainnet Deployment Guide

This guide outlines the steps to deploy the RoluToken contract to World Chain mainnet.

## Prerequisites

1. Private key with sufficient WLD tokens for gas fees
2. Secure addresses for treasury and team token allocations (ideally multi-sig wallets)
3. Updated environment variables

## Pre-Deployment Checklist

- [ ] Contract code has been audited
- [ ] Contract owner address is secure (ideally a multi-sig wallet)
- [ ] Treasury and team addresses are secure
- [ ] Deployer wallet has sufficient WLD tokens for gas (at least 0.1 WLD recommended)
- [ ] All environment variables are correctly configured

## Deployment Steps

1. **Test Network Connection**

   ```bash
   npx hardhat run scripts/test-env.js --network worldChainMainnet
   ```

   Ensure that the output shows:

   - Correct account address
   - Sufficient balance for deployment
   - Chain ID: 480 (World Chain mainnet)

2. **Update Treasury and Team Addresses**

   Edit the `deploy-worldchain.js` script and replace the placeholder addresses with your secure addresses:

   ```javascript
   const treasuryAddress = "0x..."; // Replace with actual treasury address
   const teamAddress = "0x..."; // Replace with actual team address
   ```

3. **Deploy the Contract**

   ```bash
   npx hardhat run scripts/deploy-worldchain.js --network worldChainMainnet
   ```

   Save the contract address from the output.

4. **Verify the Contract**

   ```bash
   npx hardhat verify --network worldChainMainnet <CONTRACT_ADDRESS> <TREASURY_ADDRESS> <TEAM_ADDRESS>
   ```

   Replace `<CONTRACT_ADDRESS>`, `<TREASURY_ADDRESS>`, and `<TEAM_ADDRESS>` with the actual addresses.

5. **Update Environment Variables**

   Update `.env` and `.env.local` files with:

   ```
   NEXT_PUBLIC_ROLU_TOKEN_ADDRESS_MAINNET=<CONTRACT_ADDRESS>
   NEXT_PUBLIC_DEFAULT_NETWORK=worldChainMainnet
   NEXT_PUBLIC_ENABLE_TESTNET=false
   ```

6. **Verify Token Functionality**

   - Check token balances at treasury and team addresses
   - Try a small token transfer to ensure everything works as expected

## Post-Deployment

1. **Contract Ownership**

   - If needed, transfer contract ownership to a more secure address/multi-sig

2. **Documentation**

   - Document the deployed contract address
   - Update the project documentation with mainnet information

3. **Frontend Integration**
   - Deploy updated frontend with mainnet configuration
   - Test token integration in the application

## Mainnet Contract Information

```
Contract: RoluToken
Address: <CONTRACT_ADDRESS>
Network: World Chain Mainnet (Chain ID: 480)
Explorer: https://worldscan.org/address/<CONTRACT_ADDRESS>
```

## Troubleshooting

If deployment fails:

1. Check gas price and increase if necessary
2. Ensure sufficient WLD balance on deployer account
3. Verify network connection
4. Check for contract compilation errors
