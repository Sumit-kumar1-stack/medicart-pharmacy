# Windows local setup

## 1. Verify tools

Open **Command Prompt**:

```cmd
node -v
npm -v
docker --version
git --version
```

Node should be 22 or newer. Docker Desktop must be running before `docker compose up -d`.

## 2. Prepare the project

Extract the ZIP, then:

```cmd
cd path\to\medicart-pharmacy
copy .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

## 3. Run it

Terminal 1:

```cmd
npm run dev
```

Terminal 2:

```cmd
cd path\to\medicart-pharmacy
npm run worker
```

Open `http://localhost:3000`.

## 4. Verify infrastructure

```cmd
docker compose ps
```

Both `postgres` and `redis` should be healthy.

Open `http://localhost:3000/api/health`; expected result contains:

```json
{"status":"ok","database":"ok","redis":"ok"}
```

## 5. Verify code before any deployment

```cmd
npm run lint
npm run typecheck
npm test
npm run build
```

If all pass, the source, types, tests, and production build agree in your local environment.

## 6. Reset demo database (destructive)

Only for local development:

```cmd
docker compose down -v
docker compose up -d
npx prisma migrate deploy
npm run db:seed
```

This deletes local PostgreSQL/Redis volumes.
