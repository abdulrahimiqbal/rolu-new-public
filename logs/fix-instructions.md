# ROLU Token Batch Processing Fix

## Issue Summary

The batch processing system for ROLU tokens is encountering several issues:

1. **Column name case sensitivity**: The code was looking for `errormessage` but the database has `errorMessage`
2. **SQL syntax errors**: Multiple commands in prepared statements
3. **Status field confusion**: Conflict between old `status` text field and new `status_new` enum field
4. **Error handling issues**: Not enough checks for column existence and error recovery

## Implemented Fixes

### 1. Fixed the batch-processor.ts file to:

- Handle both `status` and `status_new` columns dynamically
- Fix case sensitivity issues with the `errorMessage` column 
- Split multiple SQL commands into separate statements
- Add dynamic column checking to work with different database schemas
- Add better error handling and transaction management

### 2. Updated the process-claims API route to:

- Use proper logging with the logger module
- Add better error handling with try/catch blocks
- Include statistics before and after processing
- Fix authentication logic for Vercel cron jobs

### 3. Created migration scripts to:

- Fix the database schema with proper column naming
- Add missing columns if they don't exist
- Create necessary indexes for performance
- Synchronize data between old and new status fields

## How to Deploy the Fix

1. **Apply the database schema fix**:
   ```bash
   npm run fix:token-transaction
   ```

2. **Deploy updated code to Vercel**, ensuring these files are updated:
   - `lib/blockchain/batch-processor.ts`
   - `app/api/cron/process-claims/route.ts`
   - `scripts/apply-token-transaction-fix.js`
   - `prisma/migrations/token_transaction_fix.sql`

3. **Test the batch processing**:
   - Visit the `/api/cron/process-claims` endpoint directly in a browser
   - Or enable the Vercel cron job in the Vercel dashboard

4. **Monitor the logs** to ensure there are no more errors related to:
   - Column names or SQL syntax
   - Status field handling
   - Error messages during batch processing

## Technical Details

### Column Name Case Sensitivity Fix

PostgreSQL is case-sensitive with quoted column names. We fixed all instances where column names were accessed, ensuring proper casing:

```typescript
// Before (problematic)
errorMessage = CONCAT(COALESCE(errorMessage, ''), ' | Reset from stuck PROCESSING state')

// After (fixed)
"errorMessage" = CONCAT(COALESCE("errorMessage", ''), ' | Reset from stuck PROCESSING state')
```

### Multiple SQL Commands Split

PostgreSQL doesn't allow multiple commands in a single prepared statement. All multiple command SQL statements have been split:

```typescript
// Before (problematic)
await prisma.$executeRawUnsafe(`
  CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_created" ON "TokenTransaction" (status, "createdAt");
  CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_retry" ON "TokenTransaction" (status, retry_count);
`);

// After (fixed)
try {
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_created" ON "TokenTransaction" (status, "createdAt")
  `);
} catch (e) {
  logger.warn('Error creating status_created index:', e);
}

try {
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_token_transaction_status_retry" ON "TokenTransaction" (status, retry_count)
  `);
} catch (e) {
  logger.warn('Error creating status_retry index:', e);
}
```

### Status Field Handling

We added dynamic detection of which status field to use:

```typescript
// Check if we should use status_new column
const hasStatusNewColumn = await prisma.$queryRaw`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'TokenTransaction' 
  AND column_name = 'status_new'
`;

const useStatusNew = Array.isArray(hasStatusNewColumn) && 
                    (hasStatusNewColumn as any[]).length > 0;

// Then use the appropriate field in queries
if (useStatusNew) {
  // Use status_new with enum casting
  queuedClaims = await prisma.$queryRaw<TokenTransaction[]>`
    SELECT * FROM "TokenTransaction"
    WHERE status_new = ${STATUS.QUEUED}:::"ClaimStatus"
    ...
  `;
} else {
  // Use regular status field
  queuedClaims = await prisma.$queryRaw<TokenTransaction[]>`
    SELECT * FROM "TokenTransaction"
    WHERE status = ${STATUS.QUEUED}
    ...
  `;
}
```

## After Deployment Verification

After deploying the fix, verify that:

1. The database has all required columns properly named
2. The batch processing runs without SQL errors
3. Claims are being processed from QUEUED to COMPLETED status
4. Errors are properly handled and logged

## Troubleshooting

If issues persist after applying the fix:

1. **Check database schema**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'TokenTransaction';
   ```

2. **Verify transaction statuses**:
   ```sql
   SELECT status, status_new, COUNT(*) 
   FROM "TokenTransaction" 
   GROUP BY status, status_new;
   ```

3. **Review logs** for any new errors that might have been introduced.

4. **Run a small test batch** by temporarily reducing the `BATCH_SIZE` environment variable to 5-10 claims. 