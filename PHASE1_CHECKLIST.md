# Phase 1 - Foundation & Auth Checklist

## Setup Tasks

- [x] Monorepo initialized with Turborepo
- [x] Next.js app structure created
- [x] Express server directory created (will be implemented in Phase 2)
- [x] Prisma schema defined with all models
- [x] Shared packages created (db, types, utils)
- [x] Environment variables template created

## Database Tasks

- [ ] Supabase PostgreSQL database created
- [ ] DATABASE_URL added to .env
- [ ] Prisma migrations run (`npm run db:migrate` in packages/db)
- [ ] Database seeded with initial hostel data (`npm run db:seed`)
- [ ] Prisma client generated (`npm run db:generate`)

## Authentication Tasks

- [ ] Google Cloud project created
- [ ] Google OAuth credentials obtained
- [ ] GOOGLE_CLIENT_ID added to .env
- [ ] GOOGLE_CLIENT_SECRET added to .env
- [ ] NEXTAUTH_SECRET generated and added to .env
- [ ] ALLOWED_EMAIL_DOMAIN configured in .env
- [ ] Authorized redirect URI added in Google Console: http://localhost:3000/api/auth/callback/google

## Storage Tasks

- [ ] Cloudinary account created
- [ ] CLOUDINARY_CLOUD_NAME added to .env
- [ ] CLOUDINARY_API_KEY added to .env
- [ ] CLOUDINARY_API_SECRET added to .env

## Testing Tasks

- [ ] Next.js app boots at localhost:3000
- [ ] Google OAuth login works
- [ ] Email domain restriction working (non-university emails rejected)
- [ ] Onboarding flow accessible after first login
- [ ] Hostel dropdown populated from database
- [ ] Student ID photo upload works
- [ ] User redirected to pending-verification page after onboarding
- [ ] Protected routes redirect unauthenticated users to login
- [ ] Verified users can access dashboard

## Verification Tasks

- [ ] Test with university email - should succeed
- [ ] Test with non-university email - should show error
- [ ] Verify user data saved correctly in database
- [ ] Verify student ID photo uploaded to Cloudinary
- [ ] Manually set isVerified=true in database for test user
- [ ] Verify verified user can access dashboard

## Definition of Done

✅ Auth works end-to-end. A student can sign in with university Google account, fill their room details, upload their ID, and land on a blank dashboard. Non-university emails are rejected. Unverified users see a holding page.

## Next Steps

Once all checklist items are complete, you're ready for Phase 2: Request Board (Core Feature)
