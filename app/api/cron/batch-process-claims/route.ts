import { NextRequest, NextResponse } from 'next/server';
import { processBatchClaims, getBatchProcessingStats } from '@/lib/blockchain/batch-processor';
import logger from '@/lib/logger';

// New configuration method for Next.js 14+
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

/**
 * CRON endpoint to process token claim batches
 * This should be called periodically by a scheduler service (e.g., cron-job.org)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization header for simple security
    const authHeader = request.headers.get('Authorization');
    
    // If the CRON_SECRET env var is set, enforce it
    if (process.env.CRON_SECRET) {
      const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
      
      if (authHeader !== expectedToken) {
        logger.warn('Unauthorized CRON request attempt');
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    logger.info('Starting batch claims processing via CRON');
    
    // Get current stats before processing
    const beforeStats = await getBatchProcessingStats();
    
    // Process the claims
    const result = await processBatchClaims();
    
    // Get stats after processing
    const afterStats = await getBatchProcessingStats();
    
    return NextResponse.json({
      success: true,
      message: 'Batch processing completed',
      data: {
        processed: result.processedCount,
        batches: result.batchesProcessed,
        before: beforeStats,
        after: afterStats
      }
    });
  } catch (error) {
    logger.error('Error in batch processing CRON:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Batch processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 