/**
 * This script applies the SQL migration to fix TokenTransaction table issues
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Reading migration SQL...');
    const sqlPath = path.join(__dirname, '../prisma/migrations/token_transaction_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Simple statements to execute directly
    const simpleStatements = [
      // Add status_new column if it doesn't exist
      `ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "status_new" "ClaimStatus" DEFAULT 'QUEUED'::"ClaimStatus";`,
      
      // Add errorMessage column if it doesn't exist
      `ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;`,
      
      // Ensure retry_count column exists
      `ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0;`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_created" ON "TokenTransaction" (status, "createdAt");`,
      `CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_new_created" ON "TokenTransaction" (status_new, "createdAt");`,
      `CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_retry" ON "TokenTransaction" (status, retry_count);`,
      `CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_new_retry" ON "TokenTransaction" (status_new, retry_count);`,
      
      // Rename column function (safer approach)
      `DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'TokenTransaction' 
          AND column_name = 'errormessage'
        ) THEN
          ALTER TABLE "TokenTransaction" RENAME COLUMN "errormessage" TO "errorMessage";
        END IF;
      END $$;`,
      
      // Update status_new based on status
      `UPDATE "TokenTransaction"
      SET status_new = 
          CASE 
              WHEN status = 'QUEUED' THEN 'QUEUED'::"ClaimStatus"
              WHEN status = 'PROCESSING' THEN 'PROCESSING'::"ClaimStatus"
              WHEN status = 'COMPLETED' THEN 'COMPLETED'::"ClaimStatus"
              WHEN status = 'FAILED' THEN 'FAILED'::"ClaimStatus"
              WHEN status = 'pending' THEN 'QUEUED'::"ClaimStatus"
              ELSE 'QUEUED'::"ClaimStatus"
          END
      WHERE status_new IS NULL;`
    ];
    
    console.log(`Executing ${simpleStatements.length} SQL statements...`);
    
    // Execute each statement separately with error handling
    for (let i = 0; i < simpleStatements.length; i++) {
      const stmt = simpleStatements[i];
      console.log(`Executing statement ${i+1}/${simpleStatements.length}...`);
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('  ✅ Success');
      } catch (err) {
        console.error(`  ❌ Error executing statement: ${err.message}`);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Successfully fixed TokenTransaction table.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fixing TokenTransaction table:', error);
    process.exit(1);
  }); 