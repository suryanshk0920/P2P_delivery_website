# Database Setup Guide

## Issue: Can't reach database server

If you're seeing `Error: P1001: Can't reach database server`, follow these steps:

## Step 1: Check Supabase Project Status

1. Go to https://supabase.com/dashboard
2. Find your project: `wzfbjgfdakkeuvvgvupc`
3. Check if it shows "Paused" or "Inactive"
4. If paused, click "Resume" or "Restore project"
5. Wait for it to become active (green status)

## Step 2: Get the Correct Connection String

### For Prisma Migrations (Direct Connection):

1. In Supabase Dashboard → Project Settings → Database
2. Scroll to "Connection string" section
3. Select "URI" tab
4. Copy the connection string
5. It should look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.wzfbjgfdakkeuvvgvupc.supabase.co:5432/postgres
   ```

### Important: URL Encode Special Characters

If your password contains special characters like `:`, `@`, `#`, etc., you need to URL encode them:

- `:` becomes `%3A`
- `@` becomes `%40`
- `#` becomes `%23`
- `/` becomes `%2F`

Example:
- Original: `W:HcaqStBTZ6-gn`
- Encoded: `W%3AHcaqStBTZ6-gn`

## Step 3: Update .env File

Update the `DATABASE_URL` in `hosrunner/.env`:

```env
DATABASE_URL="postgresql://postgres:W%3AHcaqStBTZ6-gn@db.wzfbjgfdakkeuvvgvupc.supabase.co:5432/postgres"
```

## Step 4: Test Connection

```bash
cd packages/db
npm run db:push
```

If this works, you'll see:
```
✔ Generated Prisma Client
🚀 Your database is now in sync with your Prisma schema.
```

## Step 5: Run Migrations

Once connection works:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# OR run migrations (for production-like workflow)
npm run db:migrate

# Seed initial data
npm run db:seed
```

## Alternative: Use Connection Pooler

For better reliability, use Supabase's connection pooler:

1. In Supabase Dashboard → Project Settings → Database
2. Find "Connection Pooling" section
3. Copy the "Transaction" mode connection string
4. Update .env:

```env
DATABASE_URL="postgresql://postgres.wzfbjgfdakkeuvvgvupc:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

## Troubleshooting

### Still can't connect?

1. Check your internet connection
2. Try pinging the database:
   ```bash
   ping db.wzfbjgfdakkeuvvgvupc.supabase.co
   ```

3. Check if your firewall is blocking port 5432

4. Verify the password is correct in Supabase dashboard

5. Try resetting the database password:
   - Supabase Dashboard → Project Settings → Database
   - Click "Reset database password"
   - Update .env with new password

### Using a local PostgreSQL instead?

If you want to use a local database for development:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hosrunner"
```

Then create the database:
```bash
createdb hosrunner
```

## Next Steps

Once the database connection works, continue with:
1. `npm run db:generate` - Generate Prisma client
2. `npm run db:push` - Sync schema to database
3. `npm run db:seed` - Add initial hostel data
4. Start the dev server: `npm run dev` (from root)
