# Rolu Blockchain Integration

This directory contains the blockchain components for the Rolu Educational Gaming Platform.

## Project Structure

```
contracts/
├── abi/                  # Contract ABIs for frontend integration
│   └── RoluToken.json    # ABI for the RoluToken contract
├── hardhat/              # Hardhat project for development and deployment
│   └── rolu/             # Main Hardhat project directory
│       ├── contracts/    # Smart contract source files
│       ├── scripts/      # Deployment and utility scripts
│       └── ...           # Hardhat configuration and dependencies
├── RoluToken.sol         # Main RoluToken contract source
└── scripts/              # Deployment scripts for production use
    ├── deploy-worldchain.js  # Script to deploy to World Chain
    └── check-balance.js      # Script to check token balances
```

## Rolu Token (ROLU)

The Rolu Token (ROLU) is an ERC-20 token used as a reward mechanism in the Rolu Educational Gaming Platform. It has the following features:

- Fixed supply of 100,000,000 tokens
- 90% allocated to treasury for game rewards
- 10% allocated to team for operations and marketing
- Pausable functionality for emergency situations
- Ownership controls for security

## Deployment Environments

The token can be deployed to:

1. **World Chain Sepolia Testnet** - For development and testing

   - Chain ID: 4801
   - RPC URL: https://worldchain-sepolia.g.alchemy.com/public

2. **World Chain Mainnet** - For production use (future)
   - Chain ID: 480
   - RPC URL: https://worldchain-mainnet.g.alchemy.com/public

## Development Workflow

1. **Setup Environment**

   - Configure `.env` file with private key and API endpoints
   - Install dependencies with `pnpm install`

2. **Test Environment**

   - Run `npx hardhat run scripts/test-env.js --network worldChainSepolia`
   - Ensure you have sufficient ETH for gas

3. **Deploy Contract**

   - Run `npx hardhat run scripts/deploy-worldchain.js --network worldChainSepolia`
   - Save the contract address for frontend integration

4. **Export ABI**

   - Run `npx hardhat run scripts/export-abi.js`
   - This creates a JSON file in the `/contracts/abi` directory

5. **Configure Frontend**
   - Update the contract address in environment variables
   - Use the integrated token.ts file for interactions

## Frontend Integration

The `lib/blockchain/token.ts` file provides utility functions for interacting with the token contract from the frontend:

- `createProvider()` - Creates an ethers provider for the selected network
- `getTokenContract()` - Gets a read-only contract instance
- `getTokenContractWithSigner()` - Gets a writable contract instance
- `getTokenBalance()` - Fetches token balance for an address
- `isCorrectNetwork()` - Checks if user is on the correct network
- `switchToWorldChain()` - Helps user switch to World Chain network

## Security Considerations

- Always secure private keys
- Test thoroughly on testnet before mainnet
- Consider a security audit for production deployment
- Use multi-sig wallets for treasury management

## Resources

- [World Chain Documentation](https://docs.world.org/world-chain/quick-start/info)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
