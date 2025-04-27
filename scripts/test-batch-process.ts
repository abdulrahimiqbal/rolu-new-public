/**
 * Test script for token batch processing
 * This creates test token transactions and then processes them in a batch
 */
import { PrismaClient } from '@prisma/client';
import { processBatchClaims } from '../lib/blockchain/batch-processor';
import 'dotenv/config';

// Status values as constants
const STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

const TEST_WALLET_ADDRESSES = [
  '0xd3bde6b48eddbe7112c930d219b4fea534205be1', 
  '0xce6a26846976c6ada8180a7ff0abdf0886faae7e'
];

async function createTestClaims() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Creating test claims...');
    
    // Get first two users
    const users = await prisma.user.findMany({
      take: 2
    });
    
    if (users.length < 2) {
      console.error('Not enough users found in database');
      return;
    }
    
    // Create test claims for users using raw SQL to avoid type issues
    const claims = [];
    for (let i = 0; i < 2; i++) {
      const amount = (i + 1) * 100; // 100, 200
      const amountWei = (amount * 10**18).toString(); // Convert to wei
      
      // Insert using raw query
      await prisma.$executeRaw`
        INSERT INTO "TokenTransaction"
        ("id", "userId", "amount", "walletAddress", "amountWei", "status", "createdAt", "updatedAt")
        VALUES
        (gen_random_uuid(), ${users[i].id}, ${amount}, ${TEST_WALLET_ADDRESSES[i]}, ${amountWei}, ${STATUS.QUEUED}, NOW(), NOW())
      `;
      
      // Get the created claim
      const newClaims = await prisma.$queryRaw<any[]>`
        SELECT * FROM "TokenTransaction"
        WHERE "userId" = ${users[i].id}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;
      
      if (newClaims.length > 0) {
        claims.push(newClaims[0]);
      }
    }
    
    console.log(`Created ${claims.length} test claims:`);
    console.log(JSON.stringify(claims, null, 2));
    
    return claims;
  } catch (error) {
    console.error('Error creating test claims:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    // First create test claims
    await createTestClaims();
    
    // Then process them
    console.log('\nProcessing claims...\n');
    await processBatchClaims();
    
    // Show results
    const prisma = new PrismaClient();
    const processed = await prisma.$queryRaw`
      SELECT *
      FROM "TokenTransaction"
      WHERE "walletAddress" IN (${TEST_WALLET_ADDRESSES[0]}, ${TEST_WALLET_ADDRESSES[1]})
      ORDER BY "createdAt" DESC
      LIMIT 2
    `;
    
    console.log('\nResults:');
    console.log(JSON.stringify(processed, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main()
  .then(() => console.log('Test completed'))
  .catch(console.error); 