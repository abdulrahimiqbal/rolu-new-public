# ROLU Token Batch Processing System

This document provides an overview of the batch processing system for ROLU token transfers.

## Overview

The batch processing system consolidates multiple ROLU token claims into fewer blockchain transactions, significantly reducing gas costs. Instead of processing each user claim individually, the system queues claims in the database and processes them in batches at scheduled intervals.

## Architecture

### Components

1. **TokenDispatcher Contract**: A smart contract that accepts arrays of recipient addresses and token amounts to process multiple token transfers in a single transaction.

2. **Batch Processing Script**: A Node.js script that collects queued token claims from the database and submits them in batches to the TokenDispatcher contract.

3. **Cron API Endpoint**: An API route that triggers the batch processing script at scheduled intervals.

4. **TokenTransaction Model**: A database model that tracks token claim requests and their processing status.

### Flow

1. User initiates a claim from the app.
2. Claim is validated, and the user's in-app token balance is reduced.
3. A TokenTransaction record is created with QUEUED status.
4. Every 24 hours, a cron job triggers the batch processor.
5. The processor collects all QUEUED claims, organizes them into batches, and sends batch transactions.
6. Transaction statuses are updated in the database.

## Implementation

### Smart Contract: TokenDispatcher

The TokenDispatcher contract is the on-chain component that processes batches:

```solidity
// Simplified API
function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external returns (uint256 successCount);
```

- Takes arrays of recipients and amounts.
- Transfers tokens from the admin wallet to each recipient using transferFrom.
- Returns the count of successful transfers.
- Emits events for tracking purposes.

### Batch Processor Script

A script in `lib/blockchain/batch-processor.ts` that:

1. Queries the database for QUEUED claims
2. Groups them into batches of appropriate size (e.g., 150 claims per transaction)
3. Updates claim statuses to PROCESSING
4. Executes the batched transfers via the TokenDispatcher contract
5. Updates claims to COMPLETED or FAILED based on the transaction result

### Cron API Endpoint

An API route at `/api/cron/process-claims` that:

1. Authenticates the request using a secret key
2. Executes the batch processor script
3. Returns success/failure status

### Database Schema

The TokenTransaction model tracks claim requests with the following fields:

- `id`: Unique identifier for the claim
- `userId`: User who initiated the claim
- `amount`: Human-readable amount (e.g., 100 ROLU)
- `walletAddress`: User's wallet address
- `amountWei`: Amount in Wei (base units)
- `status`: QUEUED, PROCESSING, COMPLETED, or FAILED
- `batchTransactionHash`: Hash of the batch transaction
- `errorMessage`: Reason for failure (if any)
- `createdAt`, `updatedAt`: Timestamps

## Deployment

The TokenDispatcher contract is deployed using thirdweb:

```bash
npx thirdweb deploy -k $ADMIN_WALLET_PRIVATE_KEY
```

Detailed deployment instructions are available in [DEPLOY_INSTRUCTIONS.md](./contracts/DEPLOY_INSTRUCTIONS.md).

## Benefits

- **Cost Reduction**: Drastically reduces gas costs by consolidating many transfers into few transactions.
- **Scalability**: Can handle a large number of token claims efficiently.
- **Transparency**: Provides transaction hashes and status updates to users.
- **Reliability**: Implements error handling and transaction monitoring.
- **Security**: Admin wallet only needs to approve the dispatcher contract once.

## Monitoring & Maintenance

- Monitor batch processing through logs
- Adjust batch sizes based on gas costs and network conditions
- Track failed transfers and handle them manually if needed
- Ensure the admin wallet has sufficient funds for gas fees

## Further Improvements

- Implement retry mechanism for failed transfers
- Add a priority system for urgent transfers
- Develop a dashboard for monitoring batch processing status
- Implement webhook notifications for successful/failed batches 