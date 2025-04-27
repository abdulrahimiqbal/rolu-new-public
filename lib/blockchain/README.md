# Blockchain Integration

This directory contains code for interacting with blockchains, primarily World Chain Sepolia for token transfers.

## Batch Processor

The batch processor (`batch-processor.ts`) handles sending ROLU tokens to multiple users in batches. It processes transactions from the database and sends them to the blockchain.

### Features

- Processes transactions in configurable batch sizes
- Handles retry logic for failed transactions
- Sends notifications to users when transactions succeed
- Manages transaction status in the database

## World App Notifications

When token transfers complete successfully, users receive notifications via World App.

### Required Environment Variables

To enable World App notifications, add these to your `.env` file:

```
# World App Notification API
WORLD_APP_API_KEY=your_api_key_from_developer_portal
WORLD_APP_ID=your_app_id_from_developer_portal
```

### Optional Environment Variables

```
# Override default notification API URL (optional)
WORLD_APP_NOTIFICATION_URL=https://developer.worldcoin.org/api/v2/minikit/send-notification
```

### Notification Format

Users receive a notification with:
- Title: "ROLU Token Transfer Success"
- Message: "Congratulations! You received X.XX ROLU tokens in your wallet."
- Deep link back to the application

### Cron Job

The batch processor is typically executed via a cron job that calls `/api/cron/process-claims`. 
This endpoint handles the batch processing of token transfers. 