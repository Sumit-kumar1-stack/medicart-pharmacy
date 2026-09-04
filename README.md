# MediCart Pharmacy Commerce Demo

A production-oriented full-stack digital pharmacy commerce reference implementation built with Next.js, TypeScript, PostgreSQL/Prisma, Redis/BullMQ, and private file storage.

> **Important:** This repository is a software demo/reference implementation. It is not medical advice and is not, by itself, authorization to operate an online pharmacy. Before handling real prescriptions, dispensing medicines, or accepting real payments, validate the applicable pharmacy, prescription, privacy, tax, delivery, and payment requirements for every jurisdiction in which you operate.

## What is implemented

- Responsive pharmacy storefront and medicine/wellness catalog
- Search by product, generic name, composition, brand, and manufacturer
- Product pages with Rx/OTC distinction and stock availability
- Customer registration/login with bcrypt password hashing
- Opaque, hashed, database-backed sessions in HttpOnly cookies
- Redis-backed login/register rate limiting
- Cart quantity and stock validation
- Private JPG/PNG/PDF prescription upload with size + file-signature checks
- Role-gated pharmacist/admin prescription review
- Explicit prescription-to-product authorization and quantity limits
- Checkout that blocks uncovered Rx products
- Serializable checkout transaction with FEFO batch allocation
- Integer-paise money representation (avoids floating-point money errors)
- Order item and batch snapshots for traceability
- Forward-only fulfillment state machine and audit history
- Paid-order direct cancellation protection; refund workflow states
- Operations dashboard, Rx queue, orders, and batch inventory
- Notifications queue using BullMQ + Redis with a standalone worker
- PostgreSQL migration + deterministic demo seed
- Health endpoint checking PostgreSQL and Redis
- Security headers, same-origin mutation guard, server-side validation
- S3/R2-compatible private storage driver for production
- Dockerfile, Docker Compose for local infrastructure, CI workflow, unit tests

## Deliberately not faked

Two things require real business/provider configuration and therefore are intentionally not pretended to be production integrations:

1. **Payments:** checkout currently uses a clearly labeled demo payment path. Add a real payment provider adapter + signed webhook verification before accepting money.
2. **Prescription compliance:** software review controls are present, but pharmacist licensing, permitted medicine catalog, prescription validity rules, retention periods, controlled-drug policy, delivery constraints, and other legal rules depend on your jurisdiction and business license.

For production prescription files, set `STORAGE_DRIVER=s3`. With the default production guard, local prescription storage is blocked.

## Quick start (Windows PowerShell / CMD friendly)

Prerequisites: Node.js 22+, Docker Desktop, Git.

```bash
# 1) Enter the project
cd medicart-pharmacy

# 2) Create local environment file
# Windows CMD:
copy .env.example .env
# PowerShell:
# Copy-Item .env.example .env

# 3) Start PostgreSQL + Redis
docker compose up -d

# 4) Install dependencies
npm install

# 5) Generate Prisma client and apply migration
npx prisma generate
npx prisma migrate deploy

# 6) Seed demo catalog + accounts
npm run db:seed

# 7) Start web app
npm run dev
```

Open **http://localhost:3000**.

In a second terminal, start the notification worker:

```bash
cd medicart-pharmacy
npm run worker
```

Health check: **http://localhost:3000/api/health**

## Seeded demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | `customer@medicart.local` | `Customer@123` |
| Pharmacist | `pharmacist@medicart.local` | `Pharmacist@123` |
| Admin | `admin@medicart.local` | `Admin@123` |

These credentials are **development/demo only**. Never seed them into a real production database.

## Best demo flow

1. Sign in as `customer@medicart.local`.
2. Open **Medicines**, add `Dolo 650 Demo` or another Rx item to cart.
3. Go to **Prescription** and upload any valid demo JPG/PNG/PDF document you are allowed to use for testing.
4. Sign out; sign in as `pharmacist@medicart.local`.
5. Open **Admin → Prescriptions**, open the uploaded file, tick the matching Rx product, approve it.
6. Sign back in as the customer; open **Cart**, select the approved prescription, enter a demo address, place the demo order.
7. Sign in as `admin@medicart.local`; open **Admin → Orders** and advance `CONFIRMED → PICKING → PACKED → OUT FOR DELIVERY → DELIVERED`.
8. Inspect **Admin → Inventory** to see stock reduced from the allocated batch.

## Commands

```bash
npm run dev          # development web server
npm run worker       # BullMQ notification worker
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
npm test             # unit tests
npm run build        # production build
npm start            # run built app
npm run db:seed      # seed demo data
npm run db:studio    # Prisma Studio
```

## Architecture

```text
Browser
  │
  ▼
Next.js App Router (server + client UI)
  │
  ├── Auth/session layer
  ├── Customer APIs
  ├── Pharmacist/admin APIs
  ├── Checkout transaction / domain rules
  │
  ├──────────────► PostgreSQL / Prisma
  │                 users, products, sessions,
  │                 Rx review, batches, orders,
  │                 notifications, audit logs
  │
  ├──────────────► Redis / BullMQ ──► Worker
  │
  └──────────────► Private storage
                    local dev / S3-R2 production
```

## Production configuration

Use a managed PostgreSQL database, managed Redis, and private S3/R2-compatible object storage. Set at least:

```env
NODE_ENV=production
DATABASE_URL=...
REDIS_URL=...
APP_URL=https://your-domain.example
STORAGE_DRIVER=s3
S3_BUCKET=...
S3_REGION=...
S3_ENDPOINT=...          # optional for AWS; required for many S3-compatible providers
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
REQUIRE_REMOTE_STORAGE_IN_PRODUCTION=true
```

Do not commit `.env`.

### Deployment sequence

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Run `npm run worker` as a separate long-running process/service.

## Pre-live checklist

- Replace demo payment path with a real provider and verify webhook signatures + idempotency.
- Confirm medicines that legally require prescriptions and any products that cannot be sold/delivered online.
- Confirm pharmacist authorization workflow and prescription validity rules.
- Configure production S3/R2 bucket as private; use least-privilege credentials.
- Add malware scanning/CDR for uploaded documents if required by your threat model.
- Configure backup + restore drills for PostgreSQL and retention policy for prescription files.
- Put the app behind HTTPS and a trusted reverse proxy/CDN/WAF.
- Add observability (structured logs, error reporting, metrics, alerting).
- Add email/SMS provider adapters if customer messaging is needed beyond in-app notifications.
- Replace all seeded/demo product data with licensed/verified catalog data.
- Run load/security/accessibility testing and provider-specific integration tests.
- Rotate all seed credentials and secrets; do not create demo accounts in production.

## Folder structure

```text
src/app/                 Next.js pages and route handlers
src/components/          Reusable UI and client controls
src/lib/                 auth, storage, checkout, validation, domain rules
src/worker/              background notification worker
prisma/schema.prisma     data model
prisma/migrations/       deployable SQL migration
prisma/seed.ts           deterministic demo data
.github/workflows/ci.yml CI verification
```

## License

Use/modify this starter for your own project. Third-party package licenses still apply.
