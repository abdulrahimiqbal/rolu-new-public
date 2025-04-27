-- Migration script for TokenTransaction.status to ClaimStatus enum

-- Create the ClaimStatus enum type if it doesn't exist
DO $$ 
BEGIN
    CREATE TYPE "ClaimStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN
    NULL;
END $$;

-- Create temp column with enum type
ALTER TABLE "TokenTransaction" ADD COLUMN IF NOT EXISTS "status_new" "ClaimStatus" DEFAULT 'QUEUED';

-- Map existing values
UPDATE "TokenTransaction" 
SET "status_new" = 
  CASE 
    WHEN status = 'pending' THEN 'QUEUED'::"ClaimStatus"
    WHEN status = 'processing' THEN 'PROCESSING'::"ClaimStatus"
    WHEN status = 'completed' THEN 'COMPLETED'::"ClaimStatus"
    WHEN status = 'failed' THEN 'FAILED'::"ClaimStatus"
    ELSE 'QUEUED'::"ClaimStatus"
  END;

-- Replace old column if needed
DO $$
DECLARE
    column_type TEXT;
BEGIN
    -- Get current type of status column
    SELECT data_type INTO column_type
    FROM information_schema.columns 
    WHERE table_name = 'TokenTransaction' 
    AND column_name = 'status';
    
    IF column_type = 'character varying' OR column_type = 'text' THEN
        -- Drop old column and rename new one
        ALTER TABLE "TokenTransaction" DROP COLUMN "status";
        ALTER TABLE "TokenTransaction" RENAME COLUMN "status_new" TO "status";
        
        -- Re-create any indexes on the status column
        CREATE INDEX IF NOT EXISTS "TokenTransaction_status_idx" ON "TokenTransaction"("status");
    ELSE
        -- If already converted or doesn't exist, clean up temp column
        ALTER TABLE "TokenTransaction" DROP COLUMN IF EXISTS "status_new";
    END IF;
END $$; 