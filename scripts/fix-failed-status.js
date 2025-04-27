// Script to fix lowercase 'failed' status to uppercase 'FAILED'
const { PrismaClient } = require('@prisma/client');

async function fixFailedStatus() {
  console.log('Fixing failed status records...');
  const prisma = new PrismaClient();
  
  try {
    // Find all lowercase 'failed' records
    const failedRecords = await prisma.$queryRaw`
      SELECT id FROM "TokenTransaction"
      WHERE status = 'failed'
    `;
    
    console.log(`Found ${failedRecords.length} records with lowercase 'failed' status`);
    
    if (failedRecords.length === 0) {
      console.log('No records to fix');
      return;
    }
    
    // Update each record
    for (const record of failedRecords) {
      await prisma.$executeRaw`
        UPDATE "TokenTransaction"
        SET status = 'FAILED'::"ClaimStatus"
        WHERE id = ${record.id}
      `;
      console.log(`Fixed record ${record.id}`);
    }
    
    console.log('All failed status records fixed!');
  } catch (error) {
    console.error('Error fixing failed status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFailedStatus()
  .then(() => console.log('Done'))
  .catch(console.error); 