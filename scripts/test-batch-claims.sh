#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/.."
BASE_URL=${1:-"http://localhost:3000"}

echo "Step 1: Creating test claims with 500 tokens each..."
node scripts/create-test-claims.js

echo ""
echo "Step 2: Triggering batch processing on $BASE_URL..."
echo ""
./scripts/run-batch-job.sh $BASE_URL

echo ""
echo "Step 3: Checking results..."
echo ""

# Use our new check script instead of inline code
node scripts/check-transactions.js

echo ""
echo "Test completed! Check the output above to see if claims were processed successfully." 