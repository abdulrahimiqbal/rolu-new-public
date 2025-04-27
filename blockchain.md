continue from there @blockchain.md
right now i need to work it like step by step and deploy the token and then integrate the functionality to the app later in the steps

Bridging an Ethereum token to World Chain

1. Deploy your token on World Chain
   Choose your preferred bridging framework and use it to deploy an ERC-20 for your token on World Chain. We recommend using the framework provided by World Chain's standard bridge contracts, and deploying your token with the OptimismMintableERC20Factory. This deployment method offers guarantees that will streamline the approval process. If you opt for a different bridging framework, it must be compatible with the standard bridge interface, or we may have difficulty supporting it.

2. Submit details for your token
   Follow the instructions in the GitHub repository and submit a PR with the required details for your token. You must specify a section for worldchain-sepolia and/or worldchain in your token’s data.json file. The submission is straightforward if your token is already listed on the Superchain token list.

3. Await final approval
   The World team regularly reviews submissions, and you should receive a response within 24-72 hours, depending on whether the PR is submitted on a weekday, weekend, or holiday.

@https://github.com/ethereum-optimism/specs/blob/main/specs/protocol/bridges.md
@https://docs.world.org/world-chain/developers/world-chain-contracts
Bridging an Ethereum token to World Chain

1. Deploy your token on World Chain
   Choose your preferred bridging framework and use it to deploy an ERC-20 for your token on World Chain. We recommend using the framework provided by World Chain's standard bridge contracts, and deploying your token with the OptimismMintableERC20Factory. This deployment method offers guarantees that will streamline the approval process. If you opt for a different bridging framework, it must be compatible with the standard bridge interface, or we may have difficulty supporting it.

2. Submit details for your token
   Follow the instructions in the GitHub repository and submit a PR with the required details for your token. You must specify a section for worldchain-sepolia and/or worldchain in your token’s data.json file. The submission is straightforward if your token is already listed on the Superchain token list.

3. Await final approval
   The World team regularly reviews submissions, and you should receive a response within 24-72 hours, depending on whether the PR is submitted on a weekday, weekend, or holiday.
   @https://docs.world.org/world-chain/quick-start/info#world-chain-sepolia-testnet
   @https://docs.world.org/world-chain/developers/world-chain-contracts#world-chain-sepolia-testnet
   @https://docs.world.org/mini-apps/sharing/uno-qa

├── AUTH_SYSTEM.md
├── BLOCKCHAIN_SETUP.md
├── README.md
├── WORLDID_INTEGRATION.md
├── app
│   ├── admin
│   │   ├── README.md
│   │   ├── assets
│   │   │   └── page.tsx
│   │   ├── brands
│   │   │   ├── assets
│   │   │   │   └── [brandId]
│   │   │   ├── create
│   │   │   │   └── page.tsx
│   │   │   ├── edit
│   │   │   │   └── [id]
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── game-assets
│   │   │   └── page.tsx
│   │   ├── game-settings
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── promo-cards
│   │   │   └── page.tsx
│   │   ├── quizzes
│   │   │   └── page.tsx
│   │   └── settings
│   │   └── page.tsx
│   ├── api
│   │   ├── admin
│   │   │   ├── assets
│   │   │   │   ├── [id]
│   │   │   │   ├── route.ts
│   │   │   │   └── upload
│   │   │   ├── brands
│   │   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── settings
│   │   │   ├── [id]
│   │   │   └── route.ts
│   │   ├── assets
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.ts
│   │   │   ├── logout
│   │   │   │   └── route.ts
│   │   │   └── test-login
│   │   │   └── route.ts
│   │   ├── brands
│   │   │   └── route.ts
│   │   ├── complete-siwe
│   │   │   └── route.ts
│   │   ├── game
│   │   │   ├── brands
│   │   │   │   └── route.ts
│   │   │   ├── config
│   │   │   │   └── [brandId]
│   │   │   ├── start
│   │   │   │   └── route.ts
│   │   │   └── submit
│   │   │   └── route.ts
│   │   ├── game-assets
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── game-settings
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   ├── default
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── leaderboard
│   │   │   └── route.ts
│   │   ├── nonce
│   │   │   └── route.ts
│   │   ├── promotional-cards
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── quizzes
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── sign-cloudinary-params
│   │   │   └── route.ts
│   │   ├── token
│   │   │   └── mint
│   │   │   └── route.ts
│   │   ├── upload
│   │   │   └── route.ts
│   │   ├── user
│   │   │   └── update-stats
│   │   │   └── route.ts
│   │   └── users
│   │   └── profile
│   │   └── route.ts
│   ├── config.ts
│   ├── favicon.ico
│   ├── fonts
│   │   ├── GeistMonoVF.woff
│   │   └── GeistVF.woff
│   ├── gameplay
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── profile
│   │   └── page.tsx
│   └── sign-in
│   └── page.tsx
├── blockchain.md
├── changelog.md
├── components
│   ├── admin
│   │   ├── admin-layout.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── stat-card.tsx
│   ├── auth
│   │   ├── login-button.tsx
│   │   ├── login-form.tsx
│   │   ├── user-menu.tsx
│   │   ├── with-auth.tsx
│   │   └── world-id-auth.tsx
│   ├── brand
│   ├── game
│   │   ├── game-canvas.tsx
│   │   ├── game-container.tsx
│   │   └── game-controls.tsx
│   ├── home
│   │   └── promo-cards-carousel.tsx
│   ├── providers
│   │   ├── eruda
│   │   │   ├── index.tsx
│   │   │   └── provider.tsx
│   │   └── minikit-provider.tsx
│   ├── quiz
│   │   └── quiz-modal.tsx
│   └── ui
│   ├── alert-dialog.tsx
│   ├── avatar.tsx
│   ├── blockchain-wallet.tsx
│   ├── bottom-nav.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── carousel.tsx
│   ├── dropdown-menu.tsx
│   ├── game-card.tsx
│   ├── header.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── language-switcher.tsx
│   ├── leaderboard.tsx
│   ├── main-layout.tsx
│   ├── select.tsx
│   ├── sonner.tsx
│   ├── switch.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── user-profile.tsx
├── components.json
├── contexts
│   ├── auth-context.tsx
│   ├── auth-provider.tsx
│   ├── game-context.tsx
│   └── providers.tsx
├── contracts
│   ├── PRIVATE_KEY_SETUP.md
│   ├── RoluToken.sol
│   ├── abi
│   │   └── RoluToken.json
│   ├── deploy
│   │   ├── deploy-worldchain.js
│   │   └── deploy.js
│   ├── hardhat
│   │   ├── README.md
│   │   ├── contracts
│   │   ├── hardhat.config.js
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── scripts
│   │   │   ├── check-balance.js
│   │   │   ├── deploy-worldchain.js
│   │   │   └── test-env.js
│   │   └── test
│   ├── token
│   └── treasury
├── hardhat.config.js
├── hooks
├── lib
│   ├── auth.ts
│   ├── blockchain
│   │   └── token.ts
│   ├── cloudinary.ts
│   ├── game-config.ts
│   ├── game-rewards.ts
│   ├── i18n.ts
│   ├── prisma.ts
│   ├── quiz-service.ts
│   ├── utils.ts
│   └── worldcoin.ts
├── middleware.ts
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── prisma
│   ├── migrations
│   │   ├── 20250306183200_initial_migratino
│   │   │   └── migration.sql
│   │   ├── 20250306193236_update_user_model
│   │   │   └── migration.sql
│   │   ├── 20250308224936_add_game_settings
│   │   │   └── migration.sql
│   │   ├── 20250321183234_add_promotional_cards
│   │   │   └── migration.sql
│   │   ├── 20250321183916_add_promotional_cards
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   └── seed.ts
├── public
│   └── images
├── scripts
│   ├── check-balance.js
│   └── deploy-worldchain.js
├── tailwind.config.ts
├── test
├── tokens
├── tsconfig.json
└── types
├── game.ts
└── json.d.ts

97 directories, 146 files
tree -L 5 -I node_modules
.
├── AUTH_SYSTEM.md
├── README.md
├── WORLDID_INTEGRATION.md
├── app
│   ├── admin
│   │   ├── README.md
│   │   ├── assets
│   │   │   └── page.tsx
│   │   ├── brands
│   │   │   ├── assets
│   │   │   │   └── [brandId]
│   │   │   ├── create
│   │   │   │   └── page.tsx
│   │   │   ├── edit
│   │   │   │   └── [id]
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── game-assets
│   │   │   └── page.tsx
│   │   ├── game-settings
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── promo-cards
│   │   │   └── page.tsx
│   │   ├── quizzes
│   │   │   └── page.tsx
│   │   └── settings
│   │   └── page.tsx
│   ├── api
│   │   ├── admin
│   │   │   ├── assets
│   │   │   │   ├── [id]
│   │   │   │   ├── route.ts
│   │   │   │   └── upload
│   │   │   ├── brands
│   │   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── settings
│   │   │   ├── [id]
│   │   │   └── route.ts
│   │   ├── assets
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── auth
│   │   │   ├── login
│   │   │   │   └── route.ts
│   │   │   ├── logout
│   │   │   │   └── route.ts
│   │   │   └── test-login
│   │   │   └── route.ts
│   │   ├── brands
│   │   │   └── route.ts
│   │   ├── complete-siwe
│   │   │   └── route.ts
│   │   ├── game
│   │   │   ├── brands
│   │   │   │   └── route.ts
│   │   │   ├── config
│   │   │   │   └── [brandId]
│   │   │   ├── start
│   │   │   │   └── route.ts
│   │   │   └── submit
│   │   │   └── route.ts
│   │   ├── game-assets
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── game-settings
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   ├── default
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── leaderboard
│   │   │   └── route.ts
│   │   ├── nonce
│   │   │   └── route.ts
│   │   ├── promotional-cards
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── quizzes
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── sign-cloudinary-params
│   │   │   └── route.ts
│   │   ├── token
│   │   │   └── mint
│   │   │   └── route.ts
│   │   ├── upload
│   │   │   └── route.ts
│   │   ├── user
│   │   │   └── update-stats
│   │   │   └── route.ts
│   │   └── users
│   │   └── profile
│   │   └── route.ts
│   ├── config.ts
│   ├── favicon.ico
│   ├── fonts
│   │   ├── GeistMonoVF.woff
│   │   └── GeistVF.woff
│   ├── gameplay
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── profile
│   │   └── page.tsx
│   └── sign-in
│   └── page.tsx
├── blockchain.md
├── changelog.md
├── components
│   ├── admin
│   │   ├── admin-layout.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── stat-card.tsx
│   ├── auth
│   │   ├── login-button.tsx
│   │   ├── login-form.tsx
│   │   ├── user-menu.tsx
│   │   ├── with-auth.tsx
│   │   └── world-id-auth.tsx
│   ├── brand
│   ├── game
│   │   ├── game-canvas.tsx
│   │   ├── game-container.tsx
│   │   └── game-controls.tsx
│   ├── home
│   │   └── promo-cards-carousel.tsx
│   ├── providers
│   │   ├── eruda
│   │   │   ├── index.tsx
│   │   │   └── provider.tsx
│   │   └── minikit-provider.tsx
│   ├── quiz
│   │   └── quiz-modal.tsx
│   └── ui
│   ├── alert-dialog.tsx
│   ├── avatar.tsx
│   ├── blockchain-wallet.tsx
│   ├── bottom-nav.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── carousel.tsx
│   ├── dropdown-menu.tsx
│   ├── game-card.tsx
│   ├── header.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── language-switcher.tsx
│   ├── leaderboard.tsx
│   ├── main-layout.tsx
│   ├── select.tsx
│   ├── sonner.tsx
│   ├── switch.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── user-profile.tsx
├── components.json
├── contexts
│   ├── auth-context.tsx
│   ├── auth-provider.tsx
│   ├── game-context.tsx
│   └── providers.tsx
├── hooks
├── lib
│   ├── auth.ts
│   ├── blockchain
│   │   └── token.ts
│   ├── cloudinary.ts
│   ├── game-config.ts
│   ├── game-rewards.ts
│   ├── i18n.ts
│   ├── prisma.ts
│   ├── quiz-service.ts
│   ├── utils.ts
│   └── worldcoin.ts
├── middleware.ts
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── prisma
│   ├── migrations
│   │   ├── 20250306183200_initial_migratino
│   │   │   └── migration.sql
│   │   ├── 20250306193236_update_user_model
│   │   │   └── migration.sql
│   │   ├── 20250308224936_add_game_settings
│   │   │   └── migration.sql
│   │   ├── 20250321183234_add_promotional_cards
│   │   │   └── migration.sql
│   │   ├── 20250321183916_add_promotional_cards
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   └── seed.ts
├── public
│   └── images
├── scripts
├── tailwind.config.ts
├── test
├── tokens
├── tsconfig.json
└── types
├── game.ts
└── json.d.ts

here is the hardhat contract github repo starter
@https://github.com/NomicFoundation/hardhat

right now i need to deploy the token and then we would work on the other things

# Rolu Token Integration & Blockchain Implementation Plan

## Overview

This document outlines the implementation plan for Rolu Token on World Chain, starting with deployment on the Sepolia testnet and later migrating to mainnet.

## Table of Contents

- [Token Specification](#token-specification)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Deployment Strategy](#deployment-strategy)
- [Treasury Implementation](#treasury-implementation)
- [App Integration](#app-integration)
- [Testing & Verification](#testing--verification)
- [Security Considerations](#security-considerations)
- [Mainnet Migration Plan](#mainnet-migration-plan)

## Token Specification

- **Name**: Rolu Token
- **Symbol**: ROLU
- **Decimals**: 18
- **Total Supply**: 100,000,000 ROLU
- **Initial Distribution**:
  - Treasury: 90,000,000 ROLU (90%)
  - Team/Operations/Marketing: 10,000,000 ROLU (10%)
- **Economics**:
  - Redemption Rate: 1 ROLU = $0.015 (1.5 cents)
  - Daily Earning Cap: ~66.67 ROLU per user per day (equivalent to $1)

## Smart Contract Architecture

### Contracts

1. **RoluToken.sol**

   - ERC20 token contract with fixed supply
   - Owner functions for minting (during initial deployment)
   - Pause functionality for emergency situations

2. **RoluTreasury.sol**

   - Secure token storage
   - Controlled distribution mechanisms
   - Administrative functions with multi-sig requirements (for mainnet)
   - Rate configuration for future adjustments

3. **RoluRewards.sol**
   - Distribution and claiming logic
   - Anti-farming protections
   - Daily caps enforcement
   - Integration with World ID for sybil resistance

## Deployment Strategy

### Phase 1: Testnet Deployment (World Chain Sepolia)

1. **Environment Setup**

   - Configure Hardhat for World Chain Sepolia
   - Create deployment scripts with environment variable support
   - Set up secure wallet management

2. **Token Deployment**

   - Deploy RoluToken contract
   - Mint 100M tokens to deployer address
   - Verify contract on World Chain Sepolia Explorer

3. **Treasury Deployment**

   - Deploy RoluTreasury contract
   - Transfer 90M ROLU to treasury
   - Set initial parameters
   - Verify contract on explorer

4. **Rewards Contract Deployment**
   - Deploy RoluRewards contract
   - Connect to treasury
   - Set limits and redemption rates
   - Configure admin access

### Phase 2: Testing and Verification

1. **Contract Testing**

   - Verify token transfers
   - Test treasury withdrawals
   - Validate reward distributions
   - Confirm daily caps

2. **Integration Testing**
   - Test app-to-contract interactions
   - Verify World ID integration
   - Test reward calculations
   - Verify anti-farming measures

## Treasury Implementation

### Key Functions

1. **Deposit**

   - Accept ROLU tokens from authorized sources
   - Track deposits by source

2. **Withdraw**

   - Restricted to authorized services/addresses
   - Rate-limited for security
   - Configurable by admin

3. **Configure**
   - Update redemption rates
   - Modify withdrawal limits
   - Add/remove authorized services

### Anti-Farming Protections

1. **Time-Based Restrictions**

   - 24-hour withdrawal period enforcement
   - Progressive rate limiting

2. **Amount Limits**

   - Daily cap of ~66.67 ROLU per user (equivalent to $1)
   - Maximum lifetime rewards (configurable)

3. **Sybil Protection**
   - World ID integration for unique humans
   - Activity metrics to detect farming patterns

## App Integration

### Backend Components

1. **Token Service**

   - Enhance `lib/blockchain/token.ts` for ROLU operations
   - Add balance checking and transaction building
   - Implement reward calculation logic

2. **API Endpoints**
   - `/api/token/mint`: For reward distribution
   - `/api/token/balance`: For checking balances
   - `/api/token/claim`: For reward claiming

### Frontend Components

1. **Wallet Connection**

   - World ID and wallet integration
   - Balance display
   - Transaction history

2. **Reward UI**

   - Display earned rewards
   - Claim button and confirmation
   - Transaction status updates

3. **UNO Quick Action Integration**
   - Generate UNO swap links (when ready)
   - Implement using helper function:

```javascript
function getUnoDeeplinkUrl({
  fromToken, // ROLU token address
  toToken, // Desired token (e.g., USDC.e)
  amount, // Amount in base units
  referrerAppId, // Your app's ID
  referrerDeeplinkPath,
}) {
  // Implementation as per docs...
}
```

## Security Considerations

1. **Smart Contract Security**

   - Rate limiting for withdrawals
   - Emergency pause functionality
   - Role-based access control
   - Consider audit before mainnet

2. **Backend Security**

   - Secure key management
   - Rate limiting on API endpoints
   - Transaction signing security

3. **User Protection**
   - Clear transaction information
   - Confirmation steps for token operations
   - Educational information about tokens

## Mainnet Migration Plan

1. **Pre-Deployment Checks**

   - Full audit of smart contracts
   - Economic parameter review
   - Multi-sig wallet setup for treasury control

2. **Deployment Process**

   - Deploy contracts with same parameters as testnet
   - Verify all contracts on World Chain Explorer
   - Transfer to multi-sig control
   - Adjust parameters for production environment

3. **Token Economics**
   - Possibly adjust redemption rates
   - Review daily caps based on testnet learnings
   - Implement any needed economic governance mechanisms

## Implementation Schedule

### Week 1

- Configure development environment for World Chain
- Implement and test RoluToken contract
- Deploy token on Sepolia testnet

### Week 2

- Implement and test Treasury contract
- Implement and test Rewards contract
- Configure initial parameters

### Week 3

- Develop backend integration components
- Create API endpoints
- Implement balance checking and reward calculations

### Week 4

- Develop frontend UI components
- Test complete integration
- Implement security monitoring
- Document all implementations and APIs

## Required Technologies

- **Smart Contract Development**: Solidity, Hardhat
- **Deployment**: World Chain Sepolia (testnet), World Chain (mainnet)
- **Backend Integration**: Next.js API routes, ethers.js
- **Frontend**: React components for wallet interaction
- **Security**: Secure key management, rate limiting
- **Authentication**: World ID for sybil resistance

## Implementation Notes

- Deploy using the recommended OptimismMintableERC20Factory for World Chain compatibility
- Implement a daily tracking mechanism for per-user limits
- Use the World ID verification to prevent multiple accounts
- Store transaction hashes in your database for reference
- Implement proper error handling for failed transactions
