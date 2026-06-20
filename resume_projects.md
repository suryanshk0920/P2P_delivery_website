# Resume-Ready Project Descriptions

---

### HosRunner — Peer Delivery Platform
**Type:** Full-stack (Backend-heavy)
**Tech Stack:** TypeScript, Node.js, Express.js, Next.js 16, Prisma ORM, PostgreSQL (Supabase), Socket.io, Redis (Upstash), BullMQ, Zod, NextAuth.js (Google OAuth), Cloudinary, Turborepo
**One-line summary:** Built a real-time peer-to-peer delivery marketplace for university hostels with Express REST API, WebSocket-driven live feed, Redis-cached request board, BullMQ job queue for escrow lifecycle, and Google OAuth with domain-restricted access.

**Resume bullet points:**
- Designed and implemented a RESTful API with 10+ endpoints managing a delivery request lifecycle through 7 state transitions (OPEN → ACCEPTED → PICKED_UP → DELIVERED → CANCELLED/EXPIRED/DISPUTED), with Zod-validated request schemas and role-aware authorization (requester vs runner)
- Engineered a real-time delivery feed using Socket.io with room-based event routing per hostel, enabling instant push of new requests, status updates, and runner announcements to the correct user groups without polling
- Implemented Redis-based feed caching (15s TTL, cache-aside pattern) reducing redundant database queries for the open requests feed, and a Redis distributed lock to prevent race conditions when multiple runners simultaneously accept the same request
- Built a BullMQ background job queue over Upstash Redis for delayed task execution — scheduled request expiry (3-hour TTL) and auto-confirm payment release (2-hour delay after delivery), with production TLS configuration for cloud Redis connectivity
- Designed a PostgreSQL schema with 8 models, 7 enums, and 6 relations (User, Request, RunnerProfile, Hostel, Shop, Rating, Dispute, Notification) supporting delivery escrow, runner tiering (Probationary → Trusted → Verified), and dispute resolution workflow

#### Technical Workflow Deep-Dive

- **Request lifecycle:** A complete request flows through: (1) Frontend `CreateRequestModal.tsx` posts to `POST /api/requests` → (2) `authenticate` middleware (`middleware/auth.ts:14`) extracts user context from `x-user-id`/`x-hostel-id` headers → (3) `createRequest` controller (`controller.ts:106`) validates body with Zod schema → (4) Prisma inserts into PostgreSQL → (5) redis cache key `hostel:{hostelId}:open_requests` is busted via `redis.del()` → (6) BullMQ `addExpiryJob()` schedules `expire-request` in 3 hours → (7) `io.to('hostel:...')` emits `new_request` event to all connected runners in that hostel's Socket.io room. Status transitions follow a state machine in `updateStatus` (`controller.ts:224`) enforcing ACCEPTED→PICKED_UP→DELIVERED, with photo proof required at pickup and delivery.

- **Database/data modeling:** Prisma schema (`schema.prisma`) uses PostgreSQL with 8 models. `Request` is the central entity with foreign keys to `User` (requester + runner), `Hostel`, and `Shop`. Status modeled as a `RequestStatus` enum with 7 values. `EscrowStatus` enum tracks payment lifecycle (PENDING→HELD→RELEASED→REFUNDED). `RunnerTier` enum gates runner reputation. `Rating` has a 1:1 relation with `Request` via `requestId` unique. `Dispute` has evidence as `String[]` array. Prisma client is generated to `packages/db/generated/client/` and shared across apps via the `@hosrunner/db` package.

- **Caching:** Upstash Redis REST client (`lib/redis.ts`) implements cache-aside for the open requests feed. `getOpenRequests` (`controller.ts:12`) checks cache key `hostel:{hostelId}:open_requests` first; on miss, queries DB and sets with 15s TTL (`redis.setex`). Key factory (`keys` object, `lib/redis.ts:38`) centralizes key naming. Cache is proactively busted on `createRequest` and `acceptRequest`. A separate Upstash Redis URL with TLS enabled is used for BullMQ via `ioredis` (`lib/queue.ts`).

- **Queues/async/background jobs:** BullMQ (`lib/queue.ts`) runs two job types: `expire-request` — checks if request is still OPEN after 3 hours and transitions to EXPIRED; `auto-confirm` — after 2-hour delay on DELIVERED+HELD status, releases escrow to RELEASED. Connection uses Upstash Redis with explicit TLS `servername` config to resolve SSL certificate verification. Worker processes jobs in the same process, with event handlers for `failed`, `completed`, and `error` logging. Queue is only initialized when `UPSTASH_REDIS_URL` is configured, with graceful fallback.

- **Auth/security:** Google OAuth via NextAuth.js (`lib/auth.ts`) with JWT session strategy. Domain restriction enforces `@university.edu` (configured via `ALLOWED_EMAIL_DOMAIN` env var) at sign-in callback. Server API uses a custom header-based auth middleware (`middleware/auth.ts`) extracting user identity from `x-user-id`, `x-hostel-id` headers set by the frontend — a simplified approach suitable for internal-first deployment. Protected routes in Next.js via `middleware.ts` using `withAuth`. Admin users set via hardcoded test emails (development convenience). Student ID photos uploaded to Cloudinary (`lib/cloudinary.ts`) with auto-format/quality transformations.

- **Scalability/performance:** Feed caching reduces DB load for the most-read endpoint. Redis distributed lock (`requestLock` key with NX+EX 30s) prevents double-accept race condition. Prisma connection is singletons (global cache pattern) in both web (`prisma.ts`) and server (`prisma.ts`). Pagination is not yet implemented (bulk `findMany` with no `take`/`skip`).

- **Real-time communication:** Socket.io server (`index.ts:13`) uses room-based routing: `join_hostel` event joins `user:{userId}` and `hostel:{hostelId}` rooms; `runner_going_out` joins `route:{hostelId}:{destination}` rooms. Events emitted: `new_request`, `request_accepted`, `request_removed`, `request_status_update`, `runner_going_out`, `runner_stopped`. Client uses singleton socket with lazy connection (`socket.ts`).

#### Backend-specific highlights
- **API design:** 10+ REST endpoints under `/api/requests` and `/api/runner` with consistent error response format and HTTP status codes (400/401/403/404/409). State machine transition validation ensures data integrity.
- **Database schema decisions:** Composite role modeling (user is both requester and runner), escrow status as separate lifecycle, runner tiering with delivery/rating thresholds, evidence arrays for disputes.
- **Concurrency:** Redis-based pessimistic locking for request acceptance to handle concurrent runner claims — a classic "buy it now" race pattern solved with atomic `SET NX`.
- **Monorepo design:** 6 shared packages (`db`, `types`, `utils`, `ui`, `eslint-config`, `typescript-config`) with Turborepo orchestration, enabling type-safe cross-package imports.

**Suggested resume keywords:** Express.js, REST API, Prisma, PostgreSQL, Socket.io, WebSocket, Redis, BullMQ, Job Queue, NextAuth.js, Google OAuth, Zod, TypeScript, Node.js, Turborepo, Monorepo, Real-time, Caching, Cloudinary, Supabase, State Machine, Distributed Locking, RBAC, Background Jobs, JWT, ESLint, Prettier

---

## Overall Skill Summary

### Backend
- **Languages & Runtimes:** TypeScript, Node.js (ESNext modules, ES2022 target)
- **Frameworks:** Express.js 4, Next.js 16 (App Router)
- **API Layer:** REST API (10+ endpoints), Zod schema validation, custom header-based auth middleware
- **Databases:** PostgreSQL (Supabase), Prisma ORM (client generation, migrations, seeding)
- **Caching:** Redis (Upstash REST API + ioredis), cache-aside pattern, TTL management
- **Message Queues:** BullMQ (Redis-backed job queue), delayed jobs, worker/consumer pattern
- **Real-time:** Socket.io (WebSocket, room-based event routing, pub/sub)
- **Auth & Security:** Google OAuth (NextAuth.js), JWT session strategy, domain-restricted email, role-aware authorization (requester/runner), route protection middleware
- **Architecture:** Turborepo monorepo, shared packages, Express + Next.js hybrid, modular monolith
- **Concurrency:** Redis distributed locks (NX+EX), singleton Prisma connections, SAA
- **DevOps Readiness:** Environment-based configuration, graceful degradation for missing services (Redis/Queue)
- **Testing:** Redis connectivity testing scripts (test-ioredis.js, test-redis.js)

### AI/ML
- No AI/ML components present in this project.
