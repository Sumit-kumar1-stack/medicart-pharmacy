# Project manifest

## Delivery scope

MediCart is a full-stack pharmacy commerce demo/reference implementation containing:

- customer storefront, search and product detail
- authentication and sessions
- cart and server-side stock validation
- private prescription upload and controlled review
- pharmacist/admin authorization of exact Rx products and quantities
- checkout with prescription coverage enforcement
- serializable FEFO inventory allocation
- order snapshots, tracking and admin fulfillment state machine
- inventory batch/expiry operations view
- audit logs and queued in-app notifications
- PostgreSQL migration and seed data
- Redis/BullMQ worker
- S3/R2 storage adapter
- Docker, CI, tests, health checks and setup documentation

## Offline verification performed when generated

- `package.json` JSON parse: pass
- Docker Compose YAML parse: pass
- GitHub Actions YAML parse: pass
- all local `@/` imports resolve: pass
- every Prisma model has a matching initial migration table: pass
- executable source contains no TODO/FIXME markers: pass
- TypeScript/TSX syntax transpilation: 56 files, 0 syntax diagnostics

## Verification that must run after dependency installation

```bash
npm install
npx prisma generate
npm run lint
npm run typecheck
npm test
npm run build
```

The generator environment did not have the project npm dependency tree installed, so these dependency-backed checks must be run locally or in CI.
