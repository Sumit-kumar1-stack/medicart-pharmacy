# Vercel Deployment

MediCart's Next.js application can be deployed on Vercel, but production dependencies must be external services.

## Vercel project

- Repository: `medicart-pharmacy`
- Root Directory: `./`
- Framework: Next.js / auto-detect
- Production branch: `main`
- Node.js: 22+

The existing build command already runs `prisma generate && next build`.

## Required production services

Use network-accessible managed services for:

- PostgreSQL
- Redis
- S3-compatible object storage

Do not use localhost URLs or local filesystem storage in production.

## Environment variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
APP_URL=https://<medicart-domain>
SESSION_COOKIE_NAME=medicart_session
SESSION_TTL_DAYS=14

STORAGE_DRIVER=s3
S3_BUCKET=<bucket>
S3_REGION=<region-or-auto>
S3_ENDPOINT=<endpoint>
S3_ACCESS_KEY_ID=<secret>
S3_SECRET_ACCESS_KEY=<secret>
REQUIRE_REMOTE_STORAGE_IN_PRODUCTION=true

PAYMENT_PROVIDER=demo
ALLOW_DEMO_PAYMENTS_IN_PRODUCTION=false
```

If a real payment provider is enabled, configure its credentials only in Vercel environment variables.

## Database

Apply the checked-in Prisma migrations to the production database before first use:

```bash
npx prisma migrate deploy
```

## Background worker

The application has a BullMQ worker started locally with:

```bash
npm run worker
```

Treat that worker as a separate runtime from the Vercel web deployment. It needs access to the same `DATABASE_URL` and `REDIS_URL`.

The public portfolio deployment should not claim background processing is operational until that worker is running.

## Verification

1. Next.js deployment builds successfully.
2. Login/session cookies work on the production HTTPS domain.
3. PostgreSQL writes persist across deployments.
4. Redis-backed queues connect.
5. Uploads use remote object storage rather than local disk.
6. Demo payments remain disabled in production unless intentionally enabled for a non-financial showcase.
7. Worker jobs are actually processed by the separate worker runtime.
