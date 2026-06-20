# HosRunner - Peer Delivery Platform

A real-time peer delivery marketplace for university hostels where students can post delivery requests and other students can accept and deliver for a fee.

## Phase 1 - Foundation & Auth ✅

This phase sets up the core authentication infrastructure with Google OAuth restricted to university emails.

## Project Structure

```
hosrunner/
├── apps/
│   ├── web/          # Next.js frontend (Port 3000)
│   └── server/       # Express backend (Port 4000) - Coming in Phase 2
├── packages/
│   ├── db/           # Prisma schema + migrations
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL database (Supabase recommended)
- Google OAuth credentials
- Cloudinary account (for image uploads)

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required for Phase 1:
- `DATABASE_URL` - PostgreSQL connection string from Supabase
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - http://localhost:3000
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `ALLOWED_EMAIL_DOMAIN` - Your university domain (e.g., university.edu)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - From Cloudinary

### 3. Database Setup

```bash
# Navigate to db package
cd packages/db

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 4. Install Dependencies

```bash
# From root directory
npm install

# Install web app dependencies
cd apps/web
npm install
```

### 5. Run Development Server

```bash
# From root directory
npm run dev
```

The app will be available at http://localhost:3000

## Phase 1 Features

- ✅ Monorepo structure with Turborepo
- ✅ Next.js 14 with App Router
- ✅ PostgreSQL database with Prisma ORM
- ✅ Google OAuth authentication via NextAuth.js
- ✅ Email domain restriction (@university.edu only)
- ✅ User onboarding flow (hostel, room, phone)
- ✅ Student ID photo upload to Cloudinary
- ✅ Protected routes with middleware
- ✅ Pending verification page for new users
- ✅ Basic dashboard shell

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

## Database Schema

The complete Prisma schema includes:
- User (with hostel info, verification status)
- Hostel (university hostels)
- Shop (campus shops)
- Request (delivery requests)
- RunnerProfile (for delivery runners)
- Rating, Dispute, Notification models

## Testing Phase 1

1. Visit http://localhost:3000
2. Click "Sign in with Google"
3. Sign in with a university email (@university.edu)
4. Complete onboarding form (hostel, block, room, phone, student ID)
5. See "Pending Verification" page
6. Admin can verify users by updating `isVerified` in database
7. Verified users land on dashboard

## Next Steps - Phase 2

Phase 2 will add:
- Express backend with Socket.io
- Real-time request feed
- Request lifecycle (OPEN → ACCEPTED → PICKED_UP → DELIVERED)
- Redis caching
- BullMQ job queue
- Photo uploads at pickup/delivery

## Troubleshooting

### Database connection issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- For Supabase, use the connection pooler URL

### OAuth errors
- Verify redirect URI matches exactly in Google Console
- Check NEXTAUTH_URL matches your local URL
- Ensure NEXTAUTH_SECRET is set

### Module not found errors
- Run `npm install` in root and apps/web
- Run `npm run db:generate` in packages/db
- Restart dev server

## Tech Stack

- Frontend: Next.js 14, Tailwind CSS, NextAuth.js
- Database: PostgreSQL (Supabase), Prisma ORM
- Storage: Cloudinary
- Auth: Google OAuth with domain restriction
