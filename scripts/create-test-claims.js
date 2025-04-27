// Script to create test claims for batch processing
const { PrismaClient, ClaimStatus } = require('@prisma/client');

// Test wallet addresses to receive tokens
const TEST_ADDRESSES = [
  '0xd3bde6b48eddbe7112c930d219b4fea534205be1', // Replace with real addresses if needed
  '0xce6a26846976c6ada8180a7ff0abdf0886faae7e'
];

const TOKEN_AMOUNT = 500; // 500 ROLU tokens per claim

async function createTestClaims() {
  console.log('Creating test claims for batch processing...');
  const prisma = new PrismaClient();
  
  try {
    // Get the first two users from the database
    const users = await prisma.user.findMany({
      take: 2,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (users.length < 2) {
      console.error('Not enough users in database. Need at least 2 users.');
      return;
    }
    
    // Create claims for each user
    const claims = [];
    for (let i = 0; i < 2; i++) {
      const user = users[i];
      
      // Convert tokens to Wei (10^18)
      const amountWei = (TOKEN_AMOUNT * 10**18).toString();
      
      const claim = await prisma.tokenTransaction.create({
        data: {
          userId: user.id,
          amount: TOKEN_AMOUNT,
          walletAddress: TEST_ADDRESSES[i], // Use test address
          amountWei: amountWei,
          status: ClaimStatus.QUEUED // Use the enum
        }
      });
      
      claims.push(claim);
      console.log(`Created claim for user ${user.id} with ${TOKEN_AMOUNT} tokens to address ${TEST_ADDRESSES[i]}`);
    }
    
    console.log('\nCreated claims:');
    console.log(JSON.stringify(claims, null, 2));
    
    return claims;
  } catch (error) {
    console.error('Error creating test claims:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createTestClaims()
  .then(() => {
    console.log('\nTest claims created successfully!');
    console.log('Run the batch processor with: ./scripts/run-batch-job.sh http://localhost:3000');
  })
  .catch(console.error); 