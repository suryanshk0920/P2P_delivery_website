# Quick Start Guide - Phase 1

## 1. Database Setup (Supabase)

1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to Project Settings → Database
4. Copy the "Connection string" (URI format)
5. Add to `.env` as `DATABASE_URL`

## 2. Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Enable "Google+ API" from APIs & Services
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Add Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env`

## 3. Cloudinary Setup

1. Go to https://cloudinary.com and create a free account
2. From Dashboard, copy:
   - Cloud Name
   - API Key
   - API Secret
3. Add these to `.env`

## 4. Generate NextAuth Secret

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Add the output to `.env` as `NEXTAUTH_SECRET`

## 5. Configure University Domain

In `.env`, set:
```
ALLOWED_EMAIL_DOMAIN=paruluniversity.ac.in
```

This will allow only Parul University emails (format: enrollment@paruluniversity.ac.in).

## 6. Install and Run

```bash
# Install dependencies
npm install

# Setup database
cd packages/db
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
cd ../..

# Install web app dependencies
cd apps/web
npm install
cd ../..

# Start development server
npm run dev
```

## 7. Test the Application

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Use a university email address
4. Complete the onboarding form
5. You should see the "Pending Verification" page

## 8. Verify a Test User

To test the full flow, manually verify your user:

```sql
-- Connect to your Supabase database and run:
UPDATE "User" SET "isVerified" = true WHERE email = 'your-enrollment@paruluniversity.ac.in';
```

Now when you log in, you should see the dashboard!

## Common Issues

### "Invalid redirect URI"
- Make sure `http://localhost:3000/api/auth/callback/google` is added in Google Console
- Check that NEXTAUTH_URL in .env is `http://localhost:3000`

### "Domain not allowed" error
- Verify ALLOWED_EMAIL_DOMAIN matches your email domain
- Make sure you're using a university email

### Database connection errors
- Check DATABASE_URL format is correct
- Ensure Supabase project is running
- Try using the "Connection pooling" URL from Supabase

### Module not found errors
- Run `npm install` in root directory
- Run `npm install` in apps/web
- Run `npm run db:generate` in packages/db

## What's Working in Phase 1

✅ Google OAuth authentication
✅ University email domain restriction
✅ User onboarding with hostel/room details
✅ Student ID photo upload
✅ Verification workflow
✅ Protected routes
✅ Basic dashboard

## Ready for Phase 2?

Once you can successfully:
1. Sign in with Google
2. Complete onboarding
3. See pending verification page
4. Access dashboard after manual verification

You're ready to move to Phase 2: Request Board!
