/**
 * Migration script to convert TokenTransaction.status from string to ClaimStatus enum
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting migration of TokenTransaction.status to ClaimStatus enum...');
    
    // First check the current schema
    console.log('Checking current schema...');
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'TokenTransaction'
      ) as exists;
    `;
    
    if (!Array.isArray(tableExists) || !tableExists[0] || !tableExists[0].exists) {
      console.log('TokenTransaction table does not exist, nothing to migrate');
      return;
    }
    
    // Create enum type
    console.log('Creating ClaimStatus enum if needed...');
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        CREATE TYPE "ClaimStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN
        NULL;
      END $$;
    `);
    
    // Check column type
    const columnCheck = await prisma.$queryRaw`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'TokenTransaction' 
      AND column_name = 'status'
    `;
    
    const isStringType = Array.isArray(columnCheck) && columnCheck.length > 0 && 
                        (columnCheck[0].data_type === 'character varying' || columnCheck[0].data_type === 'text');
    
    if (isStringType) {
      console.log('Converting status column from string to enum...');
      
      // Create temp column
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" ADD COLUMN "status_new" "ClaimStatus" DEFAULT 'QUEUED';
      `);
      
      // Map existing values
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
      
      // Replace old column
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "TokenTransaction" DROP COLUMN "status";
        ALTER TABLE "TokenTransaction" RENAME COLUMN "status_new" TO "status";
      `);
      
      console.log('Migration complete! Status column is now using ClaimStatus enum');
    } else {
      console.log('Status column is already using the correct type, no migration needed');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  }); 