#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/.."

echo "Running database fix script..."
node scripts/fix-claim-status.js

echo "Generating updated Prisma client..."
npx prisma generate

echo "Fix completed! The TokenTransaction.status field is now using ClaimStatus enum." 