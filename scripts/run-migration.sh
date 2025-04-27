#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Get the DATABASE_URL from .env file if it exists
if [ -f .env ]; then
  source .env
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in .env file"
  exit 1
fi

# Run the SQL migration using Prisma
echo "Running SQL migration for TokenTransaction status..."
npx prisma migrate dev --name status_enum_migration --create-only

# This will create a new migration file, but we'll replace its contents
MIGRATION_DIR=$(find prisma/migrations -type d -name "*_status_enum_migration" | sort -r | head -n 1)

if [ -n "$MIGRATION_DIR" ]; then
  echo "Created migration in $MIGRATION_DIR"
  # Replace the migration SQL with our custom SQL
  cp scripts/migrate-status.sql "$MIGRATION_DIR/migration.sql"
  echo "Replaced migration SQL with our custom script"
  
  # Apply the migration
  echo "Applying migration..."
  npx prisma migrate deploy
else
  echo "Error: Failed to create migration directory"
  exit 1
fi

# Generate Prisma client
echo "Generating updated Prisma client..."
npx prisma generate

echo "Migration complete!" 