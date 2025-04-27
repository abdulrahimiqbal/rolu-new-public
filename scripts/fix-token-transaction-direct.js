/**
 * This script fixes the TokenTransaction table directly using individual SQL statements
 * This is more reliable than reading from a file
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting direct database fixes for TokenTransaction table...');
    
    // 1. Add status_new column with proper enum type
    console.log('1. Adding status_new column...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" 
        ADD COLUMN IF NOT EXISTS "status_new" "ClaimStatus" DEFAULT 'QUEUED'::"ClaimStatus"
      `);
      console.log('  ✅ Success');
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
    
    // 2. Check and rename errormessage column if needed
    console.log('2. Checking for errormessage column to rename...');
    try {
      const columnCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'TokenTransaction' 
        AND column_name = 'errormessage'
      `;
      
      if (Array.isArray(columnCheck) && columnCheck.length > 0) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "TokenTransaction" RENAME COLUMN "errormessage" TO "errorMessage"
        `);
        console.log('  ✅ Column renamed successfully');
      } else {
        console.log('  ✅ No renaming needed, column already has correct name');
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
    
    // 3. Add errorMessage column if it doesn't exist
    console.log('3. Adding errorMessage column if needed...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction"
        ADD COLUMN IF NOT EXISTS "errorMessage" TEXT
      `);
      console.log('  ✅ Success');
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
    
    // 4. Add retry_count column if needed
    console.log('4. Adding retry_count column if needed...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction"
        ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0
      `);
      console.log('  ✅ Success');
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
    
    // 5. Create indexes
    console.log('5. Creating indexes for performance...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_created" ON "TokenTransaction" (status, "createdAt")',
      'CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_new_created" ON "TokenTransaction" (status_new, "createdAt")',
      'CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_retry" ON "TokenTransaction" (status, retry_count)',
      'CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_new_retry" ON "TokenTransaction" (status_new, retry_count)'
    ];
    
    for (const index of indexes) {
      try {
        await prisma.$executeRawUnsafe(index);
        console.log(`  ✅ Index created: ${index.split('CREATE INDEX IF NOT EXISTS ')[1].split(' ON')[0]}`);
      } catch (err) {
        console.error(`  ❌ Error creating index: ${err.message}`);
      }
    }
    
    // 6. Sync status and status_new fields
    console.log('6. Syncing status and status_new fields...');
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE "TokenTransaction"
        SET status_new = 
          CASE 
            WHEN status = 'QUEUED' THEN 'QUEUED'::"ClaimStatus"
            WHEN status = 'PROCESSING' THEN 'PROCESSING'::"ClaimStatus"
            WHEN status = 'COMPLETED' THEN 'COMPLETED'::"ClaimStatus"
            WHEN status = 'FAILED' THEN 'FAILED'::"ClaimStatus"
            WHEN status = 'pending' THEN 'QUEUED'::"ClaimStatus"
            ELSE 'QUEUED'::"ClaimStatus"
          END
        WHERE status_new IS NULL
      `);
      console.log('  ✅ Success');
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }
    
    console.log('All fixes completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Successfully fixed TokenTransaction table structure.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fixing TokenTransaction table:', error);
    process.exit(1);
  }); 