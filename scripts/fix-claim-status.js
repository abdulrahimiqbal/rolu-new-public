// Simple script to fix the TokenTransaction status column
// This can be run with just Node.js without TypeScript or other dependencies
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Starting TokenTransaction status fix...');
  const prisma = new PrismaClient();

  try {
    // First, create the enum type if it doesn't exist
    console.log('Creating ClaimStatus enum type...');
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        CREATE TYPE "ClaimStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN
        NULL;
      END $$;
    `);

    // Check if the status column already uses ClaimStatus enum
    const columnInfo = await prisma.$queryRaw`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'TokenTransaction'
      AND column_name = 'status';
    `;

    if (columnInfo.length === 0) {
      console.log('TokenTransaction table or status column not found');
      return;
    }

    const isStringType = columnInfo[0].data_type === 'character varying' || 
                         columnInfo[0].data_type === 'text' ||
                         columnInfo[0].data_type.includes('char');
    
    const isClaimStatusEnum = columnInfo[0].udt_name === 'claimstatus';

    if (isClaimStatusEnum) {
      console.log('Status column is already using ClaimStatus enum. No fix needed.');
      return;
    }

    if (!isStringType) {
      console.log(`Status column has unexpected type: ${columnInfo[0].data_type}`);
      return;
    }

    // Create temporary column with enum type
    console.log('Adding temporary column with enum type...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "TokenTransaction" ADD COLUMN "status_new" "ClaimStatus" DEFAULT 'QUEUED';
    `);

    // Map values from string to enum
    console.log('Mapping string values to enum values...');
    await prisma.$executeRawUnsafe(`
      UPDATE "TokenTransaction" 
      SET "status_new" = 
        CASE 
          WHEN status = 'pending' THEN 'QUEUED'::"ClaimStatus"
          WHEN status = 'processing' THEN 'PROCESSING'::"ClaimStatus"
          WHEN status = 'completed' THEN 'COMPLETED'::"ClaimStatus"
          WHEN status = 'failed' THEN 'FAILED'::"ClaimStatus"
          ELSE 'QUEUED'::"ClaimStatus"
        END;
    `);

    // Drop old column and rename new one
    console.log('Replacing old column with new enum column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "TokenTransaction" DROP COLUMN "status";
      ALTER TABLE "TokenTransaction" RENAME COLUMN "status_new" TO "status";
    `);

    // Re-create index
    console.log('Re-creating index on status column...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "TokenTransaction_status_idx" ON "TokenTransaction"("status");
    `);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Fix completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fix script failed:', error);
    process.exit(1);
  }); 