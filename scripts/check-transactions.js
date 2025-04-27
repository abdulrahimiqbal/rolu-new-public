// Simple script to check recent token transactions
const { PrismaClient } = require('@prisma/client');

async function checkResults() {
  const prisma = new PrismaClient();
  try {
    // Raw query to avoid enum issues
    const claims = await prisma.$queryRaw`
      SELECT * FROM "TokenTransaction"
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;
    
    console.log('Recent token transactions:');
    claims.forEach(claim => {
      const walletAddress = claim.walletAddress ? 
        claim.walletAddress.substring(0, 10) + '...' : 'none';
      
      const txHash = claim.batchTransactionHash ? 
        claim.batchTransactionHash.substring(0, 10) + '...' : 'none';
      
      console.log(
        'ID:', claim.id, 
        '| Status:', claim.status, 
        '| Amount:', claim.amount, 
        '| Wallet:', walletAddress, 
        '| Hash:', txHash
      );
    });
  } catch (error) {
    console.error('Error checking results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkResults()
  .then(() => console.log('Done'))
  .catch(console.error); 