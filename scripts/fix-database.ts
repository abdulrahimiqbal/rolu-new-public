import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

// Script to fix database directly using SQL
async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Starting database fix script...');
    
    // Execute SQL directly to fix the schema
    // Create ClaimStatus enum if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          CREATE TYPE "ClaimStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
      EXCEPTION
          WHEN duplicate_object THEN
          NULL;
      END $$;
    `);
    console.log('Created ClaimStatus enum type (if needed)');

    // Add new columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "walletAddress" TEXT;
      ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "amountWei" TEXT;
      ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "batchTransactionHash" TEXT;
      ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
    `);
    console.log('Added new columns');

    // Check if status column exists and its type
    const statusCheck = await prisma.$queryRaw`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'status'`;
    
    const statusExists = Array.isArray(statusCheck) && statusCheck.length > 0;
    const needsConversion = statusExists && statusCheck[0]?.data_type !== 'USER-DEFINED';
    
    if (needsConversion) {
      console.log('Converting status column from string to enum...');
      
      // Create temporary column with enum type
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" ADD COLUMN "statusEnum" "ClaimStatus" DEFAULT 'QUEUED';
      `);
      
      // Copy data with conversion
      await prisma.$executeRawUnsafe(`
        UPDATE "TokenTransaction" 
        SET "statusEnum" = 
          CASE 
            WHEN "status" = 'pending' THEN 'QUEUED'::"ClaimStatus"
            WHEN "status" = 'completed' THEN 'COMPLETED'::"ClaimStatus"
            WHEN "status" = 'failed' THEN 'FAILED'::"ClaimStatus"
            ELSE 'QUEUED'::"ClaimStatus"
          END;
      `);
      
      // Drop old column and rename new one
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" DROP COLUMN "status";
        ALTER TABLE "TokenTransaction" RENAME COLUMN "statusEnum" TO "status";
      `);
      console.log('Status column converted successfully');
    } else if (!statusExists) {
      console.log('Status column does not exist, creating it...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" ADD COLUMN "status" "ClaimStatus" DEFAULT 'QUEUED';
      `);
    } else {
      console.log('Status column is already the correct type, skipping conversion');
    }
    
    // Add indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "TokenTransaction_status_idx" ON "TokenTransaction"("status");
      CREATE INDEX IF NOT EXISTS "TokenTransaction_walletAddress_idx" ON "TokenTransaction"("walletAddress");
    `);
    console.log('Added indexes');
    
    // Fix Prisma migrations table
    // Create _prisma_migrations table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY ("id")
      );
    `);
    
    // Mark problematic migrations as applied
    const migrationNames = [
      '20250411051809_add_notification_table',
      '20250411174854_add_notification_system',
      '20250411175000_add_notification_receipt',
      '20250415000000_add_token_transaction_fields',
      '20250415000001_update_token_transaction_for_batch',
      '20250415000003_fix_claim_status_conversion'
    ];
    
    for (const migrationName of migrationNames) {
      // Check if migration exists
      const existsResult: { count: string }[] = await prisma.$queryRaw`
        SELECT COUNT(*) FROM "_prisma_migrations" WHERE "migration_name" = ${migrationName}
      `;
      
      const exists = existsResult.length > 0 ? Number(existsResult[0].count) : 0;
      
      if (exists === 0) {
        console.log(`Marking migration ${migrationName} as applied`);
        await prisma.$executeRawUnsafe(`
          INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "applied_steps_count")
          VALUES (gen_random_uuid(), 'manually-fixed', NOW(), '${migrationName}', 'Applied manually through fix script', 1)
        `);
      } else {
        console.log(`Migration ${migrationName} already exists in _prisma_migrations table`);
        
        // If migration is in failed state, mark it as complete
        await prisma.$executeRawUnsafe(`
          UPDATE "_prisma_migrations"
          SET "finished_at" = NOW(),
              "rolled_back_at" = NULL,
              "applied_steps_count" = 1,
              "logs" = COALESCE("logs", '') || E'\\nFixed by manual script'
          WHERE "migration_name" = '${migrationName}'
          AND ("finished_at" IS NULL OR "rolled_back_at" IS NOT NULL)
        `);
      }
    }
    
    console.log('Database fix completed successfully');
    
    // Write .env value for new contract
    if (process.env.TOKEN_DISPATCHER_ADDRESS) {
      console.log('Adding TokenDispatcher address to .env file');
      let envContent = '';
      try {
        envContent = fs.readFileSync('.env', 'utf8');
      } catch (error) {
        console.log('Could not read .env file, will create a new one');
      }
      
      if (!envContent.includes('TOKEN_DISPATCHER_ADDRESS=')) {
        fs.appendFileSync('.env', `\nTOKEN_DISPATCHER_ADDRESS=${process.env.TOKEN_DISPATCHER_ADDRESS}\n`);
        console.log('Added TOKEN_DISPATCHER_ADDRESS to .env file');
      } else {
        console.log('TOKEN_DISPATCHER_ADDRESS already exists in .env file');
      }
    }
    
  } catch (error) {
    console.error('Error fixing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Database fix script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database fix script failed:', error);
    process.exit(1);
  }); 