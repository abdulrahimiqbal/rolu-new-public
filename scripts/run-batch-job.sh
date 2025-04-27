#!/bin/bash

# Script to manually trigger the batch processing job
# Usage: ./scripts/run-batch-job.sh [api_base_url]

# Default to localhost:3000 if no URL provided
API_BASE_URL=${1:-"http://localhost:3000"}
CRON_SECRET_KEY=$(grep CRON_SECRET_KEY .env | cut -d '=' -f2)

if [ -z "$CRON_SECRET_KEY" ]; then
  echo "Error: CRON_SECRET_KEY not found in .env file"
  echo "Add CRON_SECRET_KEY=your_secret_key to .env file"
  exit 1
fi

echo "Triggering batch processing job at $API_BASE_URL/api/cron/process-claims"
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET_KEY" \
  "$API_BASE_URL/api/cron/process-claims"

echo -e "\nJob triggered. Check server logs for details." 