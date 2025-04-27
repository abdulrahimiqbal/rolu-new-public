-- Fix script for database schema issues
-- This script should be run directly against the database

-- Create ClaimStatus enum if it doesn't exist
DO $$ 
BEGIN
    CREATE TYPE "ClaimStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN
    NULL;
END $$;

-- Add new columns
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "walletAddress" TEXT;
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "amountWei" TEXT;
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "batchTransactionHash" TEXT;
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

-- Check if status column needs conversion
DO $$
DECLARE
    column_type TEXT;
BEGIN
    -- Get current type of status column
    SELECT data_type INTO column_type
    FROM information_schema.columns 
    WHERE table_name = 'TokenTransaction' 
    AND column_name = 'status';
    
    IF column_type = 'character varying' THEN
        -- Create temporary column with enum type
        ALTER TABLE "TokenTransaction" ADD COLUMN "statusEnum" "ClaimStatus" DEFAULT 'QUEUED';
        
        -- Copy data with conversion
        UPDATE "TokenTransaction" 
        SET "statusEnum" = 
          CASE 
            WHEN "status" = 'pending' THEN 'QUEUED'::"ClaimStatus"
            WHEN "status" = 'completed' THEN 'COMPLETED'::"ClaimStatus"
            WHEN "status" = 'failed' THEN 'FAILED'::"ClaimStatus"
            ELSE 'QUEUED'::"ClaimStatus"
          END;
        
        -- Drop old column and rename new one
        ALTER TABLE "TokenTransaction" DROP COLUMN "status";
        ALTER TABLE "TokenTransaction" RENAME COLUMN "statusEnum" TO "status";
    ELSIF column_type IS NULL THEN
        -- Status column does not exist, create it
        ALTER TABLE "TokenTransaction" ADD COLUMN "status" "ClaimStatus" DEFAULT 'QUEUED';
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "TokenTransaction_status_idx" ON "TokenTransaction"("status");
CREATE INDEX IF NOT EXISTS "TokenTransaction_walletAddress_idx" ON "TokenTransaction"("walletAddress");

-- Create migrations table if needed
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

-- Fix migration records
DO $$
DECLARE
    migration_record RECORD;
    current_migration TEXT;
    migration_exists BOOLEAN;
BEGIN
    -- List of migration names to fix
    FOR current_migration IN 
        SELECT unnest(ARRAY[
            '20250411051809_add_notification_table',
            '20250411174854_add_notification_system',
            '20250411175000_add_notification_receipt',
            '20250415000000_add_token_transaction_fields',
            '20250415000001_update_token_transaction_for_batch',
            '20250415000003_fix_claim_status_conversion'
        ])
    LOOP
        -- Check if migration exists
        SELECT EXISTS (
            SELECT 1 FROM "_prisma_migrations" m WHERE m."migration_name" = current_migration
        ) INTO migration_exists;
        
        IF NOT migration_exists THEN
            -- Migration doesn't exist, add it
            INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "applied_steps_count")
            VALUES (gen_random_uuid(), 'manually-fixed', NOW(), current_migration, 'Applied manually through fix script', 1);
        ELSE
            -- Migration exists but might be in failed state, update it
            UPDATE "_prisma_migrations" m
            SET "finished_at" = NOW(),
                "rolled_back_at" = NULL,
                "applied_steps_count" = 1,
                "logs" = COALESCE(m."logs", '') || E'\nFixed by manual script'
            WHERE m."migration_name" = current_migration
            AND (m."finished_at" IS NULL OR m."rolled_back_at" IS NOT NULL);
        END IF;
    END LOOP;
END $$; 