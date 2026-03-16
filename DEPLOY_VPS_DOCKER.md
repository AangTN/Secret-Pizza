# Deploy To VPS With Docker

## 1. Prepare environment files

1. Copy and edit backend env:

```bash
cp backend/.env.example backend/.env
```

2. Copy and edit root env for compose/build args:

```bash
cp .env.example .env
```

Important values:

- `backend/.env`: JWT secrets, `FRONTEND_URL`, `CORS_ORIGINS`, email/oauth keys
- `.env`: `FRONTEND_PORT`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Optional in `.env`: `DATABASE_URL` (if you need a custom DB connection string)
- Frontend build values in `.env`: `VITE_API_BASE_URL`, optional map/google client variables

## 2. Run locally or on VPS

```bash
docker compose build --pull
docker compose up -d --remove-orphans
```

When `db` is empty, service `db-seed` automatically imports `backend/cuahangpizza.sql`.
If DB already has tables, import is skipped.

## 3. Verify

- Frontend: `http://YOUR_HOST_OR_DOMAIN`
- Backend health: `http://YOUR_HOST_OR_DOMAIN/api/health`
- DB container: `docker compose ps db`
- DB seed logs: `docker compose logs --tail 50 db-seed`

Apply database migrations (recommended after first deploy or schema changes):

```bash
docker compose exec -T db sh -c 'until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do sleep 2; done'
docker compose run --rm backend npx prisma migrate deploy
```

## 4. Update after new push

```bash
git pull --ff-only origin main
docker compose build --pull
docker compose up -d --remove-orphans
docker compose exec -T db sh -c 'until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do sleep 2; done'
docker compose run --rm backend npx prisma migrate deploy
```

## 5. Stop services

```bash
docker compose down
```

PostgreSQL data is persisted in Docker volume `postgres_data`.