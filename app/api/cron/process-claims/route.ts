import { NextRequest, NextResponse } from 'next/server';
import { processBatchClaims, getBatchProcessingStats } from '@/lib/blockchain/batch-processor';
import { headers } from 'next/headers';
import logger from '@/lib/logger';

// Vercel cron authentication secret
const CRON_SECRET = process.env.CRON_SECRET;

// Environment variables for World App notifications:
// WORLD_APP_API_KEY: API key from World App Developer Portal
// WORLD_APP_ID: Application ID from World App Developer Portal
// WORLD_APP_NOTIFICATION_URL: Optional override for notification API URL 
//   Default: https://developer.worldcoin.org/api/v2/minikit/send-notification

// New configuration method for Next.js 14+
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes (maximum for Pro plan)
export const runtime = 'nodejs';

// Add a helper function to serialize BigInt values
function serializeStats(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeStats);
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeStats(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * API route for batch processing token claims
 * This route should be called by a CRON job every 24 hours
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const headersList = headers();
    const authHeader = headersList.get('authorization'); 
    
    // If the CRON_SECRET env var is set, enforce it
    // if (process.env.CRON_SECRET) {
    //   const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
      
    //   if (authHeader !== expectedToken) {
    //     logger.warn('Unauthorized CRON request attempt');
    //     return NextResponse.json({ 
    //       success: false, 
    //       error: 'Unauthorized' 
    //     }, { status: 401 });
    //   }
    // }
    
    // Log the network information
    const network = process.env.NEXT_PUBLIC_DEFAULT_NETWORK || 'worldChainSepolia';
    logger.info(`Starting batch processing via CRON API route on network: ${network}`);
    
    // Get current stats before processing
    let beforeStats;
    try {
      beforeStats = await getBatchProcessingStats();
    } catch (statsError) {
      logger.warn('Could not get before stats:', statsError);
    }
    
    // Process the batch claims
    const result = await processBatchClaims();
    
    // Check if processing was aborted due to insufficient gas
    if (result.error === 'INSUFFICIENT_GAS') {
      logger.error(`Batch processing aborted: Insufficient gas in admin wallet. ` +
                  `Balance: ${result.balance} ETH, required: ${result.minimumRequired} ETH`);
      
      return NextResponse.json({
        success: false,
        error: 'INSUFFICIENT_GAS',
        message: 'Batch processing aborted due to insufficient gas in admin wallet',
        data: serializeStats({
          balance: result.balance,
          minimumRequired: result.minimumRequired,
          beforeStats: beforeStats
        })
      }, { status: 400 });
    }
    
    // Get stats after processing
    let afterStats;
    try {
      afterStats = await getBatchProcessingStats();
    } catch (statsError) {
      logger.warn('Could not get after stats:', statsError);
    }

    return NextResponse.json({
      success: true,
      message: result.gasLimited 
        ? 'Batch processing completed with reduced batch size due to gas limitations'
        : 'Batch processing completed',
      data: serializeStats({
        processed: result.processedCount,
        batches: result.batchesProcessed,
        gasLimited: result.gasLimited,
        beforeStats: beforeStats,
        afterStats: afterStats
      })
    });
  } catch (error) {
    logger.error('Error in batch processing cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process batch claims',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 