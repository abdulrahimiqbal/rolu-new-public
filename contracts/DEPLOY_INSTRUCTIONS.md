# Deploying TokenDispatcher Contract Using Thirdweb

This guide explains how to deploy the TokenDispatcher contract through thirdweb to enable batch processing of ROLU token transfers.

## Prerequisites

1. Node.js installed (v16+ recommended)
2. Admin wallet with sufficient World Chain tokens for deployment
3. ROLU Token contract already deployed on World Chain
4. Thirdweb CLI installed globally: `npm i -g @thirdweb-dev/cli`

## Deployment Steps

### 1. Install Required Dependencies

Ensure you have the OpenZeppelin contracts installed in your project:

```bash
npm install @openzeppelin/contracts
```

### 2. Configure Environment Variables

Create a `.env` file in your project root or update your existing one to include:

```
# Admin wallet private key (Keep this secure!)
ADMIN_WALLET_PRIVATE_KEY=your_private_key_here

# World Chain RPC URL
WORLDCHAIN_RPC_URL=https://rpc.world

# ROLU Token contract address
ROLU_TOKEN_ADDRESS=0x...your_token_address...
```

### 3. Deploy the Contract Using Thirdweb

Run the following command to deploy the TokenDispatcher contract:

```bash
npx thirdweb deploy -k $ADMIN_WALLET_PRIVATE_KEY
```

This command will:
1. Compile your smart contracts
2. Show a browser interface for deploying the contract
3. Allow you to choose which contract to deploy (select TokenDispatcher)

### 4. In the Thirdweb Deploy UI:

1. Select the World Chain network from the dropdown
2. Set the constructor parameter:
   - `_roluTokenAddress`: The address of your deployed ROLU Token contract
3. Confirm deployment

### 5. After Deployment:

1. Save the deployed contract address
2. Update your environment variables to include:

```
# Add this to your .env file
TOKEN_DISPATCHER_ADDRESS=0x...dispatcher_contract_address...
```

### 6. Final Setup

1. **Approve the TokenDispatcher Contract**: The admin wallet must approve the TokenDispatcher contract to spend ROLU tokens. You can do this from the thirdweb dashboard or execute:

```javascript
// Using ethers.js
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(
  process.env.WORLDCHAIN_RPC_URL,
  undefined,
  // Disable ENS since World Chain doesn't support ENS
  { disableEns: true }
);
const adminWallet = new ethers.Wallet(process.env.ADMIN_WALLET_PRIVATE_KEY, provider);

const ROLU_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
const roluToken = new ethers.Contract(process.env.ROLU_TOKEN_ADDRESS, ROLU_ABI, adminWallet);

// Approve the dispatcher for a large amount (or unlimited)
async function approveDispatcher() {
  const MAX_UINT256 = ethers.MaxUint256; // Maximum allowance
  const tx = await roluToken.approve(process.env.TOKEN_DISPATCHER_ADDRESS, MAX_UINT256);
  console.log(`Approval transaction sent: ${tx.hash}`);
  await tx.wait();
  console.log("Approval confirmed");
}

approveDispatcher().catch(console.error);
```

2. **Test with a Small Batch**: Before processing real user claims, test the system with a small batch of test transactions.

## Using the Thirdweb Dashboard

After deployment, you can interact with your contract through the Thirdweb dashboard:

1. Go to https://thirdweb.com/dashboard
2. Connect your wallet
3. Find your deployed TokenDispatcher contract
4. Use the UI to execute contract functions, view events, etc.

## Maintenance and Updates

- **Monitor Gas Costs**: Keep track of batch processing gas costs to optimize batch sizes.
- **Set Up CRON Job**: Configure a scheduled CRON job to call the `/api/cron/process-claims` endpoint every 24 hours.
- **Update Token Address**: If needed, you can update the ROLU token address using the `updateTokenAddress` function through the Thirdweb dashboard.

## Security Considerations

- The admin private key should be kept secure and not exposed in client-side code.
- Regularly monitor the contract for any unusual activity.
- Consider implementing a multi-signature wallet for contract ownership for additional security.
- Test thoroughly before using in production with real user funds. 