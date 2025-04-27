# ROLU Token Claim Batch Processing Documentation

**Version:** 1.0
**Date:** 2025-04-14

## 1. Problem Description

Currently, each user claim for ROLU tokens triggers an individual `transfer` transaction on the blockchain (World Chain). The gas fees for these numerous transactions are paid by the admin wallet, leading to significant operational costs, especially with a large user base (e.g., 15,000+ potential claims). This approach is not scalable or cost-effective.

## 2. Solution Overview: Batch Processing

To drastically reduce gas costs, we will implement a batch processing system. Instead of processing claims individually and instantly on-chain:

1.  **Queue Claims:** When a user initiates a claim via the app, the request is validated, the amount is deducted from their _in-app_ database balance, and the claim details (user ID, wallet address, amount) are stored in the database with a `QUEUED` status.
2.  **Scheduled Batch Execution:** A backend script runs periodically (e.g., every 24 hours).
3.  **Aggregate & Send:** This script gathers all `QUEUED` claims, groups them into batches of a suitable size (e.g., 100-200 claims per batch to respect block gas limits), and sends **one** blockchain transaction per batch using a dedicated smart contract (`TokenDispatcher`).
4.  **Update Status:** The script updates the status of processed claims in the database to `COMPLETED` or `FAILED` based on the batch transaction's success, storing the transaction hash.

This approach consolidates potentially hundreds or thousands of transfers into a few transactions per day, significantly reducing the overhead gas costs associated with individual transfers.

## 3. Chosen Method: Dispatcher Contract

Since the `RoluToken` ERC20 contract is already deployed and operational, we will use a separate **`TokenDispatcher` smart contract**.

- **How it Works:** This new contract has a function (`batchTransfer`) that accepts arrays of recipient addresses and amounts. The admin wallet calls this function. The `TokenDispatcher` contract, which must be pre-approved by the admin wallet to spend ROLU tokens, then executes the individual `transferFrom` calls on the `RoluToken` contract internally within that single transaction.
- **Why this method?** It avoids the need to upgrade or redeploy the existing, verified `RoluToken` contract, minimizing disruption.

## 4. Implementation Details

### 4.1. Database Schema (`TokenTransaction` or `ClaimRequest` Model)

Ensure your database model for tracking claims includes these fields (using Prisma schema syntax as an example):

```prisma
enum ClaimStatus {
  QUEUED
  PROCESSING // Optional: Mark as processing during batch execution
  COMPLETED
  FAILED
}

model TokenTransaction {
  id                String      @id @default(cuid())
  userId            String      // Link to your User model
  user              User        @relation(fields: [userId], references: [id])
  walletAddress     String      // User's wallet address at the time of claim
  amount            Decimal     // Human-readable amount claimed (e.g., 150.75 ROLU)
  amountWei         String      // Amount in Wei (e.g., "150750000000000000000")
  status            ClaimStatus @default(QUEUED)
  batchTransactionHash String?     // Hash of the batch TX that processed this claim
  errorMessage      String?     // Reason if the claim processing failed
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([userId])
  @@index([status])
}

// Make sure your User model has the relation back
model User {
  id             String   @id @default(cuid())
  // ... other user fields
  wallet_address String?
  roluBalance    Decimal  @default(0) // In-app balance
  claims         TokenTransaction[] // Relation to claims
}
```
