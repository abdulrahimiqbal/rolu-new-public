/**
 * This script adds the missing batchTransactionHash column to the TokenTransaction table
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding missing batchTransactionHash column...');
    
    // Check if the column exists
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'batchTransactionHash'
    `;
    
    if (Array.isArray(columnCheck) && columnCheck.length > 0) {
      console.log('Column already exists, no action needed');
    } else {
      // Add the column
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction"
        ADD COLUMN "batchTransactionHash" TEXT
      `);
      console.log('Successfully added batchTransactionHash column');
      
      // Check for successful transactions that need to be marked as COMPLETED
      const recentTxs = await prisma.$queryRaw`
        SELECT id, status, status_new
        FROM "TokenTransaction"
        WHERE (status = 'FAILED' OR status_new = 'FAILED')
        AND "updatedAt" > NOW() - INTERVAL '1 hour'
      `;
      
      if (Array.isArray(recentTxs) && recentTxs.length > 0) {
        console.log(`Found ${recentTxs.length} recent failed transactions that might have been processed successfully.`);
        console.log('Please check your blockchain explorer to verify these transactions.');
        
        const tx = await prisma.$queryRaw`
          SELECT id FROM "TokenTransaction" 
          ORDER BY "updatedAt" DESC 
          LIMIT 5
        `;
        
        console.log('Recent transaction IDs for reference:', tx.map(t => t.id));
      }
    }
  } catch (error) {
    console.error('Error fixing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Database fix completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error in script execution:', error);
    process.exit(1);
  }); 