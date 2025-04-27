import { ethers } from 'ethers';
import { prisma } from '../prisma';
import 'dotenv/config';
import { TokenTransaction as PrismaTokenTransaction } from '@prisma/client';
import { RPC_URLS } from './token';
import logger from '../logger';
import { createSafeProvider, patchEthersProviders, cleanAddress } from './provider-factory';

// Patch all ethers providers to disable ENS
patchEthersProviders();

// Status values as constants
const STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

// Define the TokenTransaction type for raw query results
type TokenTransaction = {
  id: string;
  userId: string;
  amount: number;
  walletAddress: string | null;
  amountWei: string | null;
  // Handle both old and new status fields
  status: string; // Old status field (text)
  status_new?: string; // New status field (ClaimStatus enum)
  transactionHash: string | null;
  batchTransactionHash: string | null;
  errorMessage: string | null; // Camel case as per schema
  createdAt: Date;
  updatedAt: Date;
  retry_count?: number;
};

// ABI for TokenDispatcher contract
const TOKEN_DISPATCHER_ABI = [
  "function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external returns (uint256)"
];

// Global nonce management variables
let currentNonce: number | null = null;
let nonceLock = false;
const nonceMonitor = new Map<number, boolean>(); // Track used nonces

/**
 * Get the next available nonce for the wallet
 * This function is synchronized to prevent nonce conflicts in concurrent batches
 */
async function getNextNonce(provider: ethers.JsonRpcProvider, walletAddress: string, batchNumber: number): Promise<number> {
  // Wait if another process is fetching a nonce
  while (nonceLock) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  try {
    nonceLock = true;
    
    if (currentNonce === null) {
      // Initial nonce fetch from the network
      currentNonce = await provider.getTransactionCount(walletAddress, "pending");
      logger.info(`Batch #${batchNumber}: Initial nonce from network: ${currentNonce}`);
    } else {
      // For subsequent requests, increment from our tracked nonce
      currentNonce++;
      logger.info(`Batch #${batchNumber}: Using incremented nonce: ${currentNonce}`);
    }
    
    // Ensure this nonce hasn't been used already
    while (nonceMonitor.has(currentNonce)) {
      logger.warn(`Batch #${batchNumber}: Nonce ${currentNonce} already used, incrementing`);
      currentNonce++;
    }
    
    // Mark this nonce as used
    nonceMonitor.set(currentNonce, true);
    
    return currentNonce;
  } catch (error) {
    logger.error(`Batch #${batchNumber}: Error getting nonce:`, error);
    // Fallback to direct provider query in case of error
    const networkNonce = await provider.getTransactionCount(walletAddress, "pending");
    nonceMonitor.set(networkNonce, true);
    return networkNonce;
  } finally {
    nonceLock = false;
  }
}

// Constants from environment variables
const ADMIN_PRIVATE_KEY = process.env.PRIVATE_KEY;
// Get the network from environment variables (defaulting to Sepolia if not set)
const NETWORK_KEY = (process.env.NEXT_PUBLIC_DEFAULT_NETWORK || 'worldChainSepolia') as 'worldChainSepolia' | 'worldChainMainnet';
// Use the appropriate RPC URL based on the network
const WORLDCHAIN_RPC_URL = RPC_URLS[NETWORK_KEY];
const TOKEN_DISPATCHER_ADDRESS = process.env.TOKEN_DISPATCHER_ADDRESS || '0xeafbbc700f25d5127721bb28886aa541319e72e0';
const BATCH_SIZE = process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE) : 50;
const MAX_RETRY_COUNT = process.env.MAX_RETRY_COUNT ? parseInt(process.env.MAX_RETRY_COUNT) : 3;
const PROCESSING_TIMEOUT_HOURS = process.env.PROCESSING_TIMEOUT_HOURS ? parseInt(process.env.PROCESSING_TIMEOUT_HOURS) : 1;
const BATCH_CONCURRENCY = process.env.BATCH_CONCURRENCY ? parseInt(process.env.BATCH_CONCURRENCY) : 2;

// Add this near the top of your batch-processor.ts file
logger.info(`Using network: ${NETWORK_KEY}, RPC URL: ${WORLDCHAIN_RPC_URL}`);

// Log important configuration details for debugging
logger.info(`Batch processor configuration:`);
logger.info(`- Network: ${NETWORK_KEY}`);
logger.info(`- RPC URL: ${WORLDCHAIN_RPC_URL}`);
logger.info(`- Dispatcher Address: ${TOKEN_DISPATCHER_ADDRESS}`);
logger.info(`- Batch Size: ${BATCH_SIZE}`);

// Validate the contract address to catch issues early
const validDispatcherAddress = cleanAddress(TOKEN_DISPATCHER_ADDRESS);
if (!validDispatcherAddress) {
  logger.error(`Invalid TOKEN_DISPATCHER_ADDRESS: "${TOKEN_DISPATCHER_ADDRESS}". Please check your environment variables.`);
}

// Add necessary database optimizations
async function ensureDatabaseOptimizations() {
  try {
    // Check and add retry_count column
    await ensureRetryColumnExists();
    
    // Create indexes for better performance - execute each statement separately
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_new_created" ON "TokenTransaction" (status_new, "createdAt")
      `);
    } catch (e) {
      logger.warn('Error creating status_new_created index:', e);
    }
    
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_new_retry" ON "TokenTransaction" (status_new, retry_count)
      `);
    } catch (e) {
      logger.warn('Error creating status_new_retry index:', e);
    }
  } catch (error) {
    logger.error('Error ensuring database optimizations:', error);
  }
}

// Add retry_count column if it doesn't exist (will run once on first execution)
async function ensureRetryColumnExists() {
  try {
    // Check if column exists
    const columnExists = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'retry_count'
    `;
    
    if (!Array.isArray(columnExists) || (columnExists as any[]).length === 0) {
      logger.info('Adding retry_count column to TokenTransaction table');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" 
        ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0
      `);
    }
  } catch (error) {
    logger.error('Error checking/adding retry column:', error);
  }
}

// Run database optimizations on module initialization
ensureDatabaseOptimizations().catch(err => {
  logger.error('Failed to initialize database optimizations:', err);
});

/**
 * Reset stuck PROCESSING transactions that have been in that state for too long
 */
async function resetStuckProcessingClaims() {
  try {
    logger.info(`Checking for stuck PROCESSING claims older than ${PROCESSING_TIMEOUT_HOURS} hours...`);
    const timeoutThreshold = new Date();
    timeoutThreshold.setHours(timeoutThreshold.getHours() - PROCESSING_TIMEOUT_HOURS);
    
    // First check if errorMessage column exists
    const columnExists = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'errorMessage'
    `;
    
    if (Array.isArray(columnExists) && (columnExists as any[]).length > 0) {
      // Use errorMessage column (camel case)
      const result = await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET 
          status_new = ${STATUS.QUEUED}::"ClaimStatus",
          "errorMessage" = CONCAT(COALESCE("errorMessage", ''), ' | Reset from stuck PROCESSING state')
        WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
        AND "updatedAt" < ${timeoutThreshold}
      `;
      
      if (typeof result === 'number' && result > 0) {
        logger.info(`Reset ${result} stuck processing claims to QUEUED status`);
      }
    } else {
      // No errorMessage column exists, just update status
      const result = await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET status_new = ${STATUS.QUEUED}::"ClaimStatus"
        WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
        AND "updatedAt" < ${timeoutThreshold}
      `;
      
      if (typeof result === 'number' && result > 0) {
        logger.info(`Reset ${result} stuck processing claims to QUEUED status`);
      }
    }
  } catch (error) {
    logger.error('Error resetting stuck processing claims:', error);
  }
}

/**
 * Mark invalid queued transactions as failed (missing walletAddress or amountWei)
 */
async function markInvalidQueuedTransactions() {
  try {
    logger.info("Checking for invalid queued transactions...");
    
    // Check if we can use errorMessage column
    const hasErrorMessageColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'errorMessage'
    `;
    
    const canUseErrorMessage = Array.isArray(hasErrorMessageColumn) && 
                             (hasErrorMessageColumn as any[]).length > 0;
    
    // Find and mark transactions that are missing critical data
    if (canUseErrorMessage) {
      const result = await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET 
          status_new = ${STATUS.FAILED}::"ClaimStatus",
          "errorMessage" = 'Missing wallet address or amount data required for processing'
        WHERE status_new = ${STATUS.QUEUED}::"ClaimStatus"
        AND (
          "walletAddress" IS NULL OR "walletAddress" = ''
          OR "amountWei" IS NULL OR "amountWei" = ''
        )
      `;
      
      if (typeof result === 'number' && result > 0) {
        logger.info(`Marked ${result} invalid queued transactions as FAILED`);
      }
    } else {
      const result = await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET status_new = ${STATUS.FAILED}::"ClaimStatus"
        WHERE status_new = ${STATUS.QUEUED}::"ClaimStatus"
        AND (
          "walletAddress" IS NULL OR "walletAddress" = ''
          OR "amountWei" IS NULL OR "amountWei" = ''
        )
      `;
      
      if (typeof result === 'number' && result > 0) {
        logger.info(`Marked ${result} invalid queued transactions as FAILED`);
      }
    }
  } catch (error) {
    logger.error('Error marking invalid queued transactions:', error);
  }
}

/**
 * Creates a contract instance with explicit address handling to avoid ENS resolution
 * @param address Contract address (must be a valid address string)
 * @param abi Contract ABI
 * @param signerOrProvider Signer or Provider
 * @returns Contract instance
 */
function createSafeContract(
  address: string,
  abi: any[],
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  // Ensure the address is valid and clean
  const cleanedAddress = cleanAddress(address);
  if (!cleanedAddress) {
    throw new Error(`Invalid contract address: ${address}`);
  }
  
  // Use the cleaned address to create the contract
  return new ethers.Contract(cleanedAddress, abi, signerOrProvider);
}

/**
 * Check if the wallet has enough gas to process a batch of given size
 * @param provider ethers provider
 * @param wallet wallet address
 * @param estimatedGasPerTransfer estimated gas needed per transfer
 * @param batchSize number of transfers in batch
 * @returns object with hasEnoughGas flag and recommended batch size
 */
async function checkGasBalance(
  provider: ethers.Provider,
  wallet: ethers.Wallet,
  estimatedGasPerTransfer: number = 60000, // Conservative estimate
  batchSize: number
): Promise<{ hasEnoughGas: boolean; recommendedBatchSize: number }> {
  try {
    // Get current gas price
    const gasPrice = await provider.getFeeData();
    const maxFeePerGas = gasPrice.maxFeePerGas || gasPrice.gasPrice;
    
    if (!maxFeePerGas) {
      logger.warn('Could not determine gas price, assuming sufficient gas');
      return { hasEnoughGas: true, recommendedBatchSize: batchSize };
    }
    
    // Get current wallet balance
    const balance = await provider.getBalance(wallet.address);
    
    // Estimate total gas cost (gas per transfer * batch size * gas price)
    // Add 20% buffer for contract execution overhead
    const estimatedGasCost = maxFeePerGas * BigInt(Math.floor(estimatedGasPerTransfer * batchSize * 1.2));
    
    // Check if we have enough gas
    if (balance > estimatedGasCost) {
      return { hasEnoughGas: true, recommendedBatchSize: batchSize };
    }
    
    // If not enough gas, calculate how many we could process
    // Use 80% of available balance to be safe
    const safeBalance = balance * BigInt(80) / BigInt(100);
    const maxPossibleTransfers = Number(safeBalance / (maxFeePerGas * BigInt(estimatedGasPerTransfer)));
    
    // Ensure at least 1 transaction, but no more than the original batch size
    const recommendedBatchSize = Math.max(1, Math.min(maxPossibleTransfers, batchSize));
    
    logger.warn(`Insufficient gas for batch of ${batchSize}. Balance: ${ethers.formatEther(balance)} ETH, ` +
                `Estimated cost: ${ethers.formatEther(estimatedGasCost)} ETH. ` +
                `Recommended reduced batch size: ${recommendedBatchSize}`);
    
    return { 
      hasEnoughGas: false,
      recommendedBatchSize: recommendedBatchSize
    };
  } catch (error) {
    logger.error('Error checking gas balance:', error);
    return { hasEnoughGas: true, recommendedBatchSize: batchSize }; // Assume it's okay in case of error
  }
}

/**
 * Process a single batch of token claims
 */
async function processSingleBatch(batchNumber: number) {
  logger.info(`Processing batch #${batchNumber}...`);
  
  // Set up blockchain connection with ENS disabled
  // Using our safe provider factory that always disables ENS
  const provider = createSafeProvider(WORLDCHAIN_RPC_URL);
  const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY!, provider);
  
  // Create contract with safe address handling
  const dispatcherContract = createSafeContract(
    TOKEN_DISPATCHER_ADDRESS!,
    TOKEN_DISPATCHER_ABI,
    adminWallet
  );
  
  // Get queued claims - prioritize older claims with exponential backoff for retries
  const queuedClaims = await prisma.$queryRaw<TokenTransaction[]>`
    SELECT * FROM "TokenTransaction"
    WHERE (status_new = ${STATUS.QUEUED}::"ClaimStatus"
      OR (status_new = ${STATUS.FAILED}::"ClaimStatus" AND 
        (retry_count IS NULL OR retry_count < ${MAX_RETRY_COUNT})))
    AND "walletAddress" IS NOT NULL
    AND "walletAddress" <> ''
    AND "amountWei" IS NOT NULL 
    AND "amountWei" <> ''
    ORDER BY 
      CASE WHEN status_new = ${STATUS.FAILED}::"ClaimStatus" THEN
        "createdAt" + INTERVAL '10 minutes' * POWER(2, COALESCE(retry_count, 0))
      ELSE 
        "createdAt" 
      END ASC
    LIMIT ${BATCH_SIZE}
  `;
  
  logger.info(`Batch #${batchNumber}: Found ${queuedClaims.length} claim(s) to process`);
  
  if (queuedClaims.length === 0) {
    return 0;
  }
  
  // Check gas balance and adjust batch size if needed
  const gasCheck = await checkGasBalance(provider, adminWallet, 60000, queuedClaims.length);
  
  // If we don't have enough gas for even one transaction, log and return
  if (gasCheck.recommendedBatchSize === 0) {
    logger.error(`Batch #${batchNumber}: Insufficient gas to process even a single transaction. Please add funds to the admin wallet.`);
    return 0;
  }
  
  // Adjust batch size if needed
  let batchClaimsToProcess = queuedClaims;
  if (gasCheck.recommendedBatchSize < queuedClaims.length) {
    logger.warn(`Batch #${batchNumber}: Reducing batch size from ${queuedClaims.length} to ${gasCheck.recommendedBatchSize} due to insufficient gas`);
    batchClaimsToProcess = queuedClaims.slice(0, gasCheck.recommendedBatchSize);
  }
  
  // Acquire a nonce early and hold it for this batch
  let nonce: number;
  try {
    // Get a nonce for this batch transaction
    nonce = await getNextNonce(provider, adminWallet.address, batchNumber);
    logger.info(`Batch #${batchNumber}: Reserved nonce ${nonce} for transaction`);
  } catch (nonceError) {
    logger.error(`Batch #${batchNumber}: Failed to acquire nonce: ${nonceError}`);
    return 0;
  }
  
  // Process the batch
  try {
    // Update status to PROCESSING and increment retry_count for failed claims
    // Handle the field based on which status field we're using
    await prisma.$transaction(
      batchClaimsToProcess.map(claim => 
        prisma.$executeRaw`
          UPDATE "TokenTransaction"
          SET 
            status_new = ${STATUS.PROCESSING}::"ClaimStatus",
            retry_count = CASE WHEN status_new = ${STATUS.FAILED}::"ClaimStatus" THEN COALESCE(retry_count, 0) + 1 ELSE COALESCE(retry_count, 0) END
          WHERE id = ${claim.id}
        `
      )
    );
    
    // Prepare batch data
    const recipients: string[] = [];
    const amounts: string[] = [];
    const claimIds: string[] = [];
    const invalidClaimIds: string[] = [];
    
    for (const claim of batchClaimsToProcess) {
      // Clean and validate the wallet address
      const cleanedAddress = cleanAddress(claim.walletAddress);
      
      // Skip claims with missing or invalid wallet addresses
      if (!cleanedAddress) {
        invalidClaimIds.push(claim.id);
        continue;
      }
      
      // Skip claims with missing amount in wei
      if (!claim.amountWei) {
        invalidClaimIds.push(claim.id);
        continue;
      }
      
      recipients.push(cleanedAddress);
      amounts.push(claim.amountWei);
      claimIds.push(claim.id);
    }
    
    // Check for errorMessage column
    const hasErrorMessageColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'errorMessage'
    `;
    
    const canUseErrorMessage = Array.isArray(hasErrorMessageColumn) && 
                              (hasErrorMessageColumn as any[]).length > 0;
    
    // Handle invalid claims separately
    if (invalidClaimIds.length > 0) {
      if (canUseErrorMessage) {
        await prisma.$executeRaw`
          UPDATE "TokenTransaction"
          SET 
            status_new = ${STATUS.FAILED}::"ClaimStatus",
            "errorMessage" = 'Missing wallet address or amount'
          WHERE id = ANY(${invalidClaimIds})
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "TokenTransaction"
          SET status_new = ${STATUS.FAILED}::"ClaimStatus"
          WHERE id = ANY(${invalidClaimIds})
        `;
      }
      logger.info(`Batch #${batchNumber}: Marked ${invalidClaimIds.length} claims as FAILED due to missing data`);
    }
    
    if (recipients.length === 0) {
      console.table(recipients)
      logger.info(`Batch #${batchNumber}: No valid recipients in this batch`);
      return 0;
    }
    
    // Execute batch transfer
    logger.info(`Batch #${batchNumber}: Executing batch transfer for ${recipients.length} recipients`);
    try {
      // Log the exact data being sent to the contract for debugging
      logger.info(`Batch #${batchNumber}: Contract address: ${dispatcherContract.target}`);
      logger.info(`Batch #${batchNumber}: First recipient: ${recipients[0]}`);
      logger.info(`Batch #${batchNumber}: First amount: ${amounts[0]}`);
      
      // Check that all recipients are valid Ethereum addresses
      const invalidAddresses = recipients.filter(addr => !ethers.isAddress(addr));
      if (invalidAddresses.length > 0) {
        throw new Error(`Invalid addresses found in batch: ${invalidAddresses.join(', ')}`);
      }
      
      // First estimate the gas to ensure we have enough
      try {
        const estimatedGas = await dispatcherContract.batchTransfer.estimateGas(
          recipients, 
          amounts
        );
        
        logger.info(`Batch #${batchNumber}: Estimated gas: ${estimatedGas.toString()}`);
        
        // Add 20% buffer to gas estimate
        const gasLimit = estimatedGas * BigInt(120) / BigInt(100);
        
        // Execute the transaction with explicit gas limit and our reserved nonce
        const tx = await dispatcherContract.batchTransfer(
          recipients, 
          amounts,
          { 
            gasLimit,
            nonce 
          }
        );
        
        logger.info(`Batch #${batchNumber}: Transaction sent: ${tx.hash} with nonce ${nonce}`);
        
        // Wait for transaction to be mined with exponential backoff retries for network congestion
        let receipt = null;
        let retries = 0;
        const maxRetries = 5;
        let waitTime = 10000; // Start with 10 seconds
        
        while (retries < maxRetries && !receipt) {
          try {
            receipt = await tx.wait();
          } catch (waitError: any) {
            // Check if this is a network congestion issue or timeout
            if (waitError.code === 'NETWORK_ERROR' || waitError.message?.includes('timeout')) {
              retries++;
              if (retries < maxRetries) {
                logger.warn(`Batch #${batchNumber}: Network congestion while waiting for receipt, retrying in ${waitTime/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                // Exponential backoff
                waitTime = waitTime * 2;
              } else {
                // After max retries, still try to fetch the transaction status
                logger.warn(`Batch #${batchNumber}: Max retries reached, checking transaction status by hash...`);
                const txFromChain = await provider.getTransaction(tx.hash);
                
                if (txFromChain) {
                  // If the transaction exists, try to get its receipt again
                  receipt = await provider.getTransactionReceipt(tx.hash);
                  
                  if (!receipt) {
                    throw new Error(`Could not get receipt after ${maxRetries} retries`);
                  }
                } else {
                  throw new Error(`Transaction not found on chain after ${maxRetries} retries`);
                }
              }
            } else {
              // This is not a network congestion issue, rethrow
              throw waitError;
            }
          }
        }
        
        if (!receipt) {
          throw new Error('Failed to get transaction receipt after multiple attempts');
        }
        
        logger.info(`Batch #${batchNumber}: Transaction confirmed: ${receipt.hash}`);
        
        // First check if batchTransactionHash column exists
        const hasBatchHashColumn = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'TokenTransaction' 
          AND column_name = 'batchTransactionHash'
        `;
        
        const canUseBatchHash = Array.isArray(hasBatchHashColumn) && 
                              (hasBatchHashColumn as any[]).length > 0;
        
        // Update claim status to COMPLETED
        if (canUseBatchHash) {
          await prisma.$executeRaw`
            UPDATE "TokenTransaction"
            SET 
              status_new = ${STATUS.COMPLETED}::"ClaimStatus",
              "batchTransactionHash" = ${receipt.hash}
            WHERE id = ANY(${claimIds})
          `;
        } else {
          // Just update status if the column doesn't exist
          await prisma.$executeRaw`
            UPDATE "TokenTransaction"
            SET status_new = ${STATUS.COMPLETED}::"ClaimStatus"
            WHERE id = ANY(${claimIds})
          `;
        }
        
        logger.info(`Batch #${batchNumber}: Completed successfully: ${claimIds.length} claims processed`);
        
        // Release our nonce tracking for this nonce as it's been successfully used
        releaseNonce(nonce, batchNumber);
        
        // Send notifications to users after successful transaction
        try {
          // Fetch user details for notification
          const successfulTransactions = await prisma.tokenTransaction.findMany({
            where: {
              id: {
                in: claimIds
              }
            },
            select: {
              id: true,
              amount: true,
              walletAddress: true,
              userId: true
            }
          });
          
          // Process each transaction for notification
          for (const tx of successfulTransactions) {
            // Clean and validate the wallet address
            const cleanedAddress = cleanAddress(tx.walletAddress);
            
            // Skip if no valid wallet address
            if (!cleanedAddress) continue;
            
            const amount = tx.amount;
            const title = "ROLU Token Transfer Success";
            const message = `Congratulations! You received ${amount.toFixed(2)} ROLU tokens in your wallet.`; // Max 200 chars
            
            // Log the notification intent
            logger.info(`Sending notification to user ${tx.userId} (${cleanedAddress}) for ${amount} ROLU tokens`);
            
            // Implement World App notification
            // This should be replaced with actual World App notification integration
            // when the API service is available
            try {
              // Check if there is a World App notification service environment variable
              const WORLD_APP_API_KEY = process.env.WORLD_APP_API_KEY;
              const WORLD_APP_ID = process.env.WORLD_APP_ID;
              const WORLD_APP_NOTIFICATION_URL = process.env.WORLD_APP_NOTIFICATION_URL || 'https://developer.worldcoin.org/api/v2/minikit/send-notification';
              
              if (WORLD_APP_API_KEY && WORLD_APP_ID) {
                // If environment variables exist, use fetch API to send notification
                const headers = {
                  'Authorization': `Bearer ${WORLD_APP_API_KEY}`,
                  'Content-Type': 'application/json'
                };
                
                // Format mini app path (URL encoded path for deep linking)
                const miniAppPath = `worldapp://mini-app?app_id=${WORLD_APP_ID}`;
                
                const body = JSON.stringify({
                  app_id: WORLD_APP_ID,
                  wallet_addresses: [cleanedAddress],
                  title,
                  message,
                  mini_app_path: miniAppPath
                });
                
                // Use global fetch API which is available in newer Node.js environments
                // Check if fetch is available (it is in Node.js 18+ and all modern browsers)
                if (typeof fetch === 'function') {
                  fetch(WORLD_APP_NOTIFICATION_URL, {
                    method: 'POST',
                    headers,
                    body
                  })
                  .then(response => {
                    if (!response.ok) {
                      logger.error(`Failed to send notification to ${cleanedAddress}: ${response.status} ${response.statusText}`);
                      return;
                    }
                    return response.json();
                  })
                  .then(data => {
                    if (data) {
                      if (data.success) {
                        logger.info(`Notification sent to ${cleanedAddress} successfully`);
                        
                        // Log delivery results if available
                        if (data.result && Array.isArray(data.result)) {
                          for (const delivery of data.result) {
                            if (delivery.sent) {
                              logger.info(`Delivery confirmed for ${delivery.walletAddress}`);
                            } else {
                              logger.warn(`Delivery failed for ${delivery.walletAddress}: ${delivery.reason || 'Unknown reason'}`);
                            }
                          }
                        }
                      } else {
                        logger.error(`Notification API returned error: ${JSON.stringify(data)}`);
                      }
                    }
                  })
                  .catch(error => {
                    logger.error(`Error sending notification to ${cleanedAddress}:`, error);
                  });
                } else {
                  // Fallback for environments where fetch is not available
                  logger.warn(`Fetch API not available for sending notification to ${cleanedAddress}`);
                  logger.info(`Would send notification to ${cleanedAddress}: ${message}`);
                }
              } else {
                logger.warn('World App notification API key or App ID not found. Skipping notification.');
                if (!WORLD_APP_API_KEY) logger.warn('Missing WORLD_APP_API_KEY environment variable');
                if (!WORLD_APP_ID) logger.warn('Missing WORLD_APP_ID environment variable');
              }
            } catch (notificationError) {
              logger.error(`Failed to send notification to ${cleanedAddress}:`, notificationError);
              // Continue processing other notifications
            }
          }
        } catch (notificationError) {
          // Don't fail the transaction if notifications fail
          logger.error(`Batch #${batchNumber}: Error sending notifications:`, notificationError);
        }
        
        return claimIds.length;
      } catch (estimateError: any) {
        // Handle gas estimation failures which often indicate insufficient funds
        if (estimateError.code === 'INSUFFICIENT_FUNDS' || 
            (estimateError.message && estimateError.message.includes('insufficient funds'))) {
          logger.error(`Batch #${batchNumber}: Insufficient funds for gas estimation: ${estimateError.message}`);
          
          // Release the nonce since we're not using it
          releaseNonce(nonce, batchNumber);
          
          // Mark transactions as FAILED but with specific error about gas
          const hasErrorMessageColumn = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'TokenTransaction' 
            AND column_name = 'errorMessage'
          `;
          
          const canUseErrorMessage = Array.isArray(hasErrorMessageColumn) && 
                                   (hasErrorMessageColumn as any[]).length > 0;
          
          // Update with descriptive error message about gas
          if (canUseErrorMessage) {
            await prisma.$executeRaw`
              UPDATE "TokenTransaction"
              SET 
                status_new = ${STATUS.FAILED}::"ClaimStatus",
                "errorMessage" = ${'Insufficient gas funds in admin wallet. Please try again later.'}
              WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
              AND id = ANY(${claimIds})
            `;
          } else {
            await prisma.$executeRaw`
              UPDATE "TokenTransaction"
              SET status_new = ${STATUS.FAILED}::"ClaimStatus"
              WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
              AND id = ANY(${claimIds})
            `;
          }
          
          // Return 0 to indicate no transactions were processed
          return 0;
        }
        
        // For other estimation errors, rethrow to be handled by regular error handler
        throw estimateError;
      }
    } catch (txError: any) {
      // Check for nonce-related errors
      const errorMessage = txError.message?.toLowerCase() || '';
      if (errorMessage.includes('nonce too low') || errorMessage.includes('nonce has already been used')) {
        logger.warn(`Batch #${batchNumber}: Nonce error detected during batch transfer. Attempting recovery...`);
        
        try {
          // Use our specialized handler for nonce errors
          const transaction = {
            to: TOKEN_DISPATCHER_ADDRESS,
            data: dispatcherContract.interface.encodeFunctionData('batchTransfer', [recipients, amounts]),
            gasLimit: BigInt(1000000), // Use a safe fixed value for recovery
            nonce: nonce
          };
          
          // Handle the nonce error and retry
          const tx = await handleNonceError(txError, adminWallet, transaction, batchNumber);
          logger.info(`Batch #${batchNumber}: Recovered transaction sent: ${tx.hash}`);
          
          // Wait for the recovered transaction
          const receipt = await tx.wait();
          if (!receipt) {
            throw new Error('Failed to get receipt for recovered transaction');
          }
          
          logger.info(`Batch #${batchNumber}: Recovered transaction confirmed: ${receipt.hash}`);
          
          // Update transaction status
          await prisma.$executeRaw`
            UPDATE "TokenTransaction"
            SET 
              status_new = ${STATUS.COMPLETED}::"ClaimStatus",
              "batchTransactionHash" = ${receipt.hash}
            WHERE id = ANY(${claimIds})
          `;
          
          logger.info(`Batch #${batchNumber}: Completed successfully after nonce recovery: ${claimIds.length} claims processed`);
          return claimIds.length;
        } catch (recoveryError) {
          logger.error(`Batch #${batchNumber}: Failed to recover from nonce error:`, recoveryError);
          throw recoveryError; // Let the outer catch block handle it
        }
      } else {
        // For other errors, throw to be handled by the outer catch block
        throw txError;
      }
    }
  } catch (error: any) {
    logger.error(`Batch #${batchNumber}: Error processing batch:`, error);
    
    // Release the nonce as we won't be using it
    if (typeof nonce !== 'undefined') {
      releaseNonce(nonce, batchNumber);
    }
    
    // Check if we can use errorMessage
    const hasErrorMessageColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'errorMessage'
    `;
    
    const canUseErrorMessage = Array.isArray(hasErrorMessageColumn) && 
                             (hasErrorMessageColumn as any[]).length > 0;
    
    // Mark all claims in this batch as FAILED
    if (canUseErrorMessage) {
      await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET 
          status_new = ${STATUS.FAILED}::"ClaimStatus",
          "errorMessage" = ${`Batch processing failed: ${error?.message || "Unknown error"}`}
        WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
        AND id = ANY(${batchClaimsToProcess.map(c => c.id)})
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET status_new = ${STATUS.FAILED}::"ClaimStatus"
        WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
        AND id = ANY(${batchClaimsToProcess.map(c => c.id)})
      `;
    }
    return 0;
  }
}

/**
 * Estimate the gas required for batch processing and check if we have enough
 */
async function checkAdminWalletGas(): Promise<{ 
  hasEnoughGas: boolean;
  balance: bigint; 
  minimumRequired: bigint;
  maxBatchSize: number;
}> {
  try {
    const provider = createSafeProvider(WORLDCHAIN_RPC_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY!, provider);
    
    // Get current gas price and balance
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;
    const balance = await provider.getBalance(adminWallet.address);
    
    if (!maxFeePerGas) {
      logger.warn('Could not determine gas price. Proceeding with caution.');
      return { 
        hasEnoughGas: true, 
        balance, 
        minimumRequired: BigInt(0), 
        maxBatchSize: BATCH_SIZE 
      };
    }
    
    // Estimate minimum gas required for a single batch (conservative)
    // We need about 60000 gas per recipient plus overhead
    const gasPerRecipient = 60000;
    const minimumBatchSize = 5; // At least process 5 transactions to make it worthwhile
    const minimumRequired = maxFeePerGas * BigInt(gasPerRecipient * minimumBatchSize);
    
    // If we don't even have enough for minimum batch, return false
    const hasEnoughGas = balance > minimumRequired;
    
    // Calculate maximum batch size based on current balance (use 80% to be safe)
    const safeBalance = balance * BigInt(80) / BigInt(100);
    let maxBatchSize = Number(safeBalance / (maxFeePerGas * BigInt(gasPerRecipient)));
    
    // Cap at configured BATCH_SIZE
    maxBatchSize = Math.min(maxBatchSize, BATCH_SIZE);
    
    if (!hasEnoughGas) {
      logger.error(`Insufficient gas in admin wallet. Balance: ${ethers.formatEther(balance)} ETH, ` +
                  `Minimum required: ${ethers.formatEther(minimumRequired)} ETH`);
    } else {
      logger.info(`Admin wallet has ${ethers.formatEther(balance)} ETH. ` +
                 `Can process up to ${maxBatchSize} transactions per batch.`);
    }
    
    return { hasEnoughGas, balance, minimumRequired, maxBatchSize };
  } catch (error) {
    logger.error('Error checking admin wallet gas:', error);
    // Assume we have enough in case of error
    return { 
      hasEnoughGas: true, 
      balance: BigInt(0), 
      minimumRequired: BigInt(0), 
      maxBatchSize: BATCH_SIZE 
    };
  }
}

/**
 * Process all queued token claims in batches
 */
export async function processBatchClaims() {
  logger.info("Starting batch claim processing...");
  
  try {
    // Ensure database optimizations
    await ensureDatabaseOptimizations();
    
    // Reset any stuck PROCESSING transactions
    await resetStuckProcessingClaims();
    
    // Mark invalid queued transactions as FAILED
    await markInvalidQueuedTransactions();
    
    // Process permanently failed transactions and refund users
    await cleanupFailedTransactions();
    
    // Check for transactions that succeeded on chain but failed in database
    await checkForSuccessfulTransactions();
    
    // Check if there are any claims to process
    const pendingCount = await getPendingClaimsCount();
    
    if (pendingCount === 0) {
      logger.info("No claims to process");
      return { processedCount: 0, batchesProcessed: 0 };
    }
    
    // Check admin wallet gas before attempting any batches
    const gasStatus = await checkAdminWalletGas();
    
    if (!gasStatus.hasEnoughGas) {
      logger.error(`Aborting batch processing due to insufficient gas. Please add funds to admin wallet.`);
      return { 
        processedCount: 0, 
        batchesProcessed: 0, 
        error: 'INSUFFICIENT_GAS',
        balance: ethers.formatEther(gasStatus.balance),
        minimumRequired: ethers.formatEther(gasStatus.minimumRequired)
      };
    }
    
    if(pendingCount < 100 && process.env.ENFORCE_MIN_BATCH_SIZE === 'true'){
      logger.info("The minimum limit of batch processing didn't meet the threshold");
      return {processedCount: 0, batchesProcessed: 0};
    }
    
    logger.info(`Found approximately ${pendingCount} claims to process in queue`);
    
    // Adjust batch size if necessary based on available gas
    const adjustedBatchSize = Math.min(BATCH_SIZE, gasStatus.maxBatchSize);
    
    if (adjustedBatchSize < BATCH_SIZE) {
      logger.warn(`Reducing batch size from ${BATCH_SIZE} to ${adjustedBatchSize} due to gas limitations`);
    }
    
    // Determine how many batches we can process based on gas
    const maxConcurrency = Math.min(
      BATCH_CONCURRENCY,
      5, // Cap at 5 to prevent overloading
      Math.floor(pendingCount / adjustedBatchSize) + 1
    );
    
    // Process batches concurrently based on adjusted concurrency
    const batchPromises = [];
    
    for (let i = 0; i < maxConcurrency; i++) {
      batchPromises.push(processSingleBatch(i + 1));
    }
    
    // Wait for all batches to complete
    const results = await Promise.all(batchPromises);
    const totalProcessed = results.reduce((sum, count) => sum + count, 0);
    
    logger.info(`Batch claim processing completed. Processed ${totalProcessed} claims in ${maxConcurrency} batches.`);
    
    return {
      processedCount: totalProcessed,
      batchesProcessed: maxConcurrency,
      gasLimited: adjustedBatchSize < BATCH_SIZE
    };
  } catch (error) {
    logger.error('Batch processing error:', error);
    throw error;
  }
}

/**
 * Get the count of pending claims (queued + retriable failed)
 */
async function getPendingClaimsCount() {
  // Only look for transactions with status_new set and required fields for processing
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "TokenTransaction"
    WHERE (status_new = ${STATUS.QUEUED}::"ClaimStatus"
      OR (status_new = ${STATUS.FAILED}::"ClaimStatus" AND 
         (retry_count IS NULL OR retry_count < ${MAX_RETRY_COUNT})))
    AND "walletAddress" IS NOT NULL
    AND "walletAddress" <> ''
    AND "amountWei" IS NOT NULL 
    AND "amountWei" <> ''
  `;
  
  return Number(result[0]?.count || 0);
}

/**
 * Get batch processing statistics
 */
export async function getBatchProcessingStats() {
  type BatchStats = {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    retriable_failed: number;
    total: number;
    invalid_data: number;
    oldest_queued_age: string;
  };
  
  const stats = await prisma.$queryRaw<BatchStats[]>`
    SELECT 
      COUNT(*) FILTER (
        WHERE status_new = ${STATUS.QUEUED}::"ClaimStatus"
        AND "walletAddress" IS NOT NULL AND "walletAddress" <> ''
        AND "amountWei" IS NOT NULL AND "amountWei" <> ''
      ) AS queued,
      
      COUNT(*) FILTER (
        WHERE status_new = ${STATUS.PROCESSING}::"ClaimStatus"
      ) AS processing,
      
      COUNT(*) FILTER (
        WHERE status_new = ${STATUS.COMPLETED}::"ClaimStatus"
      ) AS completed,
      
      COUNT(*) FILTER (
        WHERE status_new = ${STATUS.FAILED}::"ClaimStatus"
      ) AS failed,
      
      COUNT(*) FILTER (
        WHERE status_new = ${STATUS.FAILED}::"ClaimStatus" 
        AND (retry_count IS NULL OR retry_count < ${MAX_RETRY_COUNT})
        AND "walletAddress" IS NOT NULL AND "walletAddress" <> ''
        AND "amountWei" IS NOT NULL AND "amountWei" <> ''
      ) AS retriable_failed,
      
      COUNT(*) FILTER (
        WHERE status_new IS NOT NULL
      ) AS total,
      
      COUNT(*) FILTER (
        WHERE status_new = ${STATUS.QUEUED}::"ClaimStatus"
        AND ("walletAddress" IS NULL OR "walletAddress" = ''
             OR "amountWei" IS NULL OR "amountWei" = '')
      ) AS invalid_data,
      
      COALESCE(
        (SELECT age(now(), MIN("createdAt"))::text 
         FROM "TokenTransaction" 
         WHERE status_new = ${STATUS.QUEUED}::"ClaimStatus"
         AND "walletAddress" IS NOT NULL AND "walletAddress" <> ''
         AND "amountWei" IS NOT NULL AND "amountWei" <> ''
         LIMIT 1),
        'N/A'
      ) AS oldest_queued_age
    FROM "TokenTransaction"
    WHERE status_new IS NOT NULL
  `;
  
  return stats[0];
}

/**
 * Permanently fail transactions that have exceeded retry limit and refund users
 */
export async function cleanupFailedTransactions() {
  try {
    logger.info(`Cleaning up permanently failed transactions...`);
    
    // Check if we can use errorMessage column
    const hasErrorMessageColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'errorMessage'
    `;
    
    const canUseErrorMessage = Array.isArray(hasErrorMessageColumn) && 
                             (hasErrorMessageColumn as any[]).length > 0;
    
    // First, identify transactions that need to be permanently failed
    let failedTransactions: TokenTransaction[];
    
    if (canUseErrorMessage) {
      failedTransactions = await prisma.$queryRaw<TokenTransaction[]>`
        SELECT * FROM "TokenTransaction"
        WHERE status_new = ${STATUS.FAILED}::"ClaimStatus"
        AND retry_count >= ${MAX_RETRY_COUNT}
        AND ("errorMessage" IS NULL OR "errorMessage" NOT LIKE '%Permanently failed after%')
      `;
    } else {
      failedTransactions = await prisma.$queryRaw<TokenTransaction[]>`
        SELECT * FROM "TokenTransaction"
        WHERE status_new = ${STATUS.FAILED}::"ClaimStatus"
        AND retry_count >= ${MAX_RETRY_COUNT}
      `;
    }
    
    if (failedTransactions.length === 0) {
      logger.info('No transactions to permanently fail');
      return 0;
    }
    
    logger.info(`Found ${failedTransactions.length} transactions to mark as permanently failed`);
    
    // Process each transaction - mark as permanently failed and refund user
    let refundedCount = 0;
    for (const tx of failedTransactions) {
      try {
        // Start a transaction to ensure atomicity of both operations
        if (canUseErrorMessage) {
          await prisma.$transaction(async (prismaClient) => {
            // 1. Mark the transaction as permanently failed
            await prismaClient.$executeRaw`
              UPDATE "TokenTransaction"
              SET "errorMessage" = ${`${tx.errorMessage || ''} | Permanently failed after ${MAX_RETRY_COUNT} retries. Amount refunded to in-app balance.`}
              WHERE id = ${tx.id}
            `;
            
            // 2. Refund the user's in-app balance
            await prismaClient.$executeRaw`
              UPDATE "User"
              SET "roluBalance" = "roluBalance" + ${tx.amount}
              WHERE id = ${tx.userId}
            `;
          });
        } else {
          // Just refund without updating errorMessage
          await prisma.$executeRaw`
            UPDATE "User"
            SET "roluBalance" = "roluBalance" + ${tx.amount}
            WHERE id = ${tx.userId}
          `;
        }
        
        logger.info(`Refunded ${tx.amount} ROLU to user ${tx.userId} for failed transaction ${tx.id}`);
        refundedCount++;
      } catch (refundError) {
        logger.error(`Failed to process refund for transaction ${tx.id}:`, refundError);
      }
    }
    
    logger.info(`Successfully refunded ${refundedCount} of ${failedTransactions.length} failed transactions`);
    return failedTransactions.length;
  } catch (error) {
    logger.error('Error cleaning up failed transactions:', error);
    return 0;
  }
}

/**
 * Check for successful transactions that might not be marked properly in the database
 * This can happen due to nonce issues or chain reorganizations
 */
async function checkForSuccessfulTransactions() {
  logger.info('Checking for successful transactions that may not be marked correctly...');

  try {
    // Get transactions that are marked as failed
    const failedTransactions = await prisma.$queryRaw<TokenTransaction[]>`
      SELECT * FROM "TokenTransaction"
      WHERE status_new = ${STATUS.FAILED}::"ClaimStatus"
      AND "walletAddress" IS NOT NULL
      AND "amountWei" IS NOT NULL
      LIMIT 200
    `;

    if (failedTransactions.length === 0) {
      logger.info('No failed transactions to check');
      return 0;
    }

    logger.info(`Found ${failedTransactions.length} failed transactions to check`);

    // Create provider using factory to ensure proper configuration
    const provider = createSafeProvider(process.env.ETHEREUM_RPC_URL || Object.values(RPC_URLS)[0]);
    const adminAddress = process.env.ADMIN_WALLET_ADDRESS!;
    let recoveredCount = 0;

    // Get the current block number
    const currentBlock = await provider.getBlockNumber();
    
    // Check the last 1000 blocks (about 3-4 hours of blocks)
    const blocksToCheck = 1000;
    const startBlock = Math.max(currentBlock - blocksToCheck, 0);
    
    logger.info(`Checking blocks ${startBlock} to ${currentBlock} for successful transactions`);

    // Check each failed transaction
    for (const failedTx of failedTransactions) {
      const recipientAddress = failedTx.walletAddress;
      const amountWei = failedTx.amountWei;
      
      if (!recipientAddress || !amountWei) {
        continue; // Skip if missing required data
      }
      
      let foundMatch = false;
      
      // Check recent blocks for successful transactions from our admin wallet
      for (let blockNumber = currentBlock; blockNumber >= startBlock && !foundMatch; blockNumber -= 1) {
        // Get full block with transactions
        const block = await provider.getBlock(blockNumber, true);
        
        if (!block || !block.transactions || block.transactions.length === 0) {
          continue;
        }

        // Look for transactions from our admin wallet
        for (const transaction of block.transactions) {
          // In ethers v6, getBlock with true returns full TransactionResponse objects
          // Type this properly to ensure we have access to all fields
          const tx = transaction as unknown as ethers.TransactionResponse;
          
          // Only check transactions from our admin wallet to the token dispatcher contract
          if (tx.from?.toLowerCase() !== adminAddress.toLowerCase() || 
              !tx.to || tx.to.toLowerCase() !== TOKEN_DISPATCHER_ADDRESS!.toLowerCase()) {
            continue;
          }
          
          // Decode transaction input data to see if it's a batchTransfer call
          try {
            // Create a minimal interface for the batchTransfer function
            const batchTransferInterface = new ethers.Interface([
              "function batchTransfer(address[] calldata _addresses, uint256[] calldata _values)"
            ]);
            
            // Try to decode the function data
            const decodedData = batchTransferInterface.parseTransaction({
              data: tx.data,
              value: tx.value
            });
            
            // Check if this is a batchTransfer call
            if (decodedData && decodedData.name === 'batchTransfer') {
              const addresses = decodedData.args[0] as string[];
              const amounts = decodedData.args[1] as bigint[];
              
              // Check if our failed transaction's recipient and amount are in this batch
              for (let i = 0; i < addresses.length; i++) {
                if (addresses[i].toLowerCase() === recipientAddress.toLowerCase() && 
                    amounts[i].toString() === amountWei) {
                  logger.info(`Found matching transaction in block ${blockNumber}: ${tx.hash}`);
                  
                  // Mark the transaction as completed
                  await prisma.$executeRaw`
                    UPDATE "TokenTransaction"
                    SET 
                      status_new = ${STATUS.COMPLETED}::"ClaimStatus",
                      "batchTransactionHash" = ${tx.hash},
                      "errorMessage" = ${`Recovered transaction: ${tx.hash}`}
                    WHERE id = ${failedTx.id}
                  `;
                  
                  recoveredCount++;
                  foundMatch = true;
                  break;
                }
              }
            }
          } catch (decodeError) {
            // If we can't decode the transaction, skip it
            continue;
          }
        }
      }
    }

    logger.info(`Recovered ${recoveredCount} of ${failedTransactions.length} failed transactions`);
    return recoveredCount;
  } catch (error) {
    logger.error('Error checking for successful transactions:', error);
    return 0;
  }
}

/**
 * Find a transaction by wallet address and nonce
 * @param provider ethers provider
 * @param address wallet address
 * @param nonce transaction nonce
 * @returns transaction hash if found
 */
async function findTransactionByNonce(
  provider: ethers.JsonRpcProvider,
  address: string,
  nonce: number
): Promise<string | null> {
  try {
    // Get latest block
    const blockNumber = await provider.getBlockNumber();
    
    // Check last 1000 blocks max
    const startBlock = Math.max(1, blockNumber - 1000);
    
    // Check transactions in recent blocks
    for (let i = blockNumber; i >= startBlock; i--) {
      const block = await provider.getBlock(i, true);
      
      if (block && block.transactions) {
        // Check each transaction in the block
        for (const tx of block.transactions) {
          // Access transaction data in a type-safe way
          // ethers v6 returns either TransactionResponse objects or strings
          if (typeof tx === 'object' && tx !== null) {
            const txWithSender = tx as unknown as { from?: string; nonce?: number; hash?: string };
            
            if (txWithSender.from && txWithSender.from.toLowerCase() === address.toLowerCase()) {
              // If this is from our sender and has the right nonce
              if (txWithSender.nonce === nonce) {
                return txWithSender.hash || null;
              }
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding transaction by nonce:', error);
    return null;
  }
}

// Helper function to handle nonce errors and retry transactions
async function handleNonceError(
  error: any, 
  wallet: ethers.Wallet, 
  transaction: ethers.TransactionRequest,
  batchNumber: number,
  retryCount = 0
): Promise<ethers.TransactionResponse> {
  const maxRetries = 3;
  
  if (retryCount >= maxRetries) {
    logger.error(`Batch #${batchNumber}: Max retries reached for nonce errors`);
    throw error;
  }
  
  // Check if this is a nonce-related error
  const errorMessage = error.message?.toLowerCase() || '';
  if (errorMessage.includes('nonce too low') || errorMessage.includes('nonce has already been used')) {
    logger.warn(`Batch #${batchNumber}: Nonce error detected: ${errorMessage}. Retrying with new nonce...`);
    
    // Get a fresh nonce from the provider - cast provider to JsonRpcProvider
    const provider = wallet.provider as ethers.JsonRpcProvider;
    const newNonce = await getNextNonce(provider, wallet.address, batchNumber);
    
    // Update the transaction with the new nonce
    transaction.nonce = newNonce;
    
    logger.info(`Batch #${batchNumber}: Retrying transaction with new nonce: ${newNonce}`);
    
    try {
      return await wallet.sendTransaction(transaction);
    } catch (retryError) {
      // Recursive retry with incremented retry count
      return handleNonceError(retryError, wallet, transaction, batchNumber, retryCount + 1);
    }
  }
  
  // If it's not a nonce error, rethrow
  throw error;
}

/**
 * Release a nonce from tracking
 * Call this when a transaction is completed or failed
 */
function releaseNonce(nonce: number, batchNumber: number): void {
  if (nonceMonitor.has(nonce)) {
    logger.info(`Batch #${batchNumber}: Releasing nonce ${nonce}`);
    nonceMonitor.delete(nonce);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  processBatchClaims()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error("Fatal error in batch processing:", error);
      process.exit(1);
    });
}