# CI/CD Setup

This repository uses one GitHub Actions workflow:

- `Deploy` (`.github/workflows/deploy.yml`)

## 1. Deploy workflow

`Deploy` runs on:

- Push to `main`
- Manual trigger from GitHub Actions (`workflow_dispatch`)

What it does:

- Validation stage before deploy:
	- Frontend: install dependencies, lint (non-blocking), build
	- Backend: install dependencies, syntax check `server.js`
	- Validate Docker build for `backend/Dockerfile` and `frontend/Dockerfile`
- Deploy stage:
	- SSH into VPS
	- Pull latest code from branch `main`
	- Start services using `docker compose` (including PostgreSQL)
	- Auto-import `backend/cuahangpizza.sql` when DB is empty (`db-seed` service)
	- Wait for DB health, then run `prisma migrate deploy`

## 2. Required GitHub Secrets

In your GitHub repository, open:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Create these secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_DIR`

Optional:

- `VPS_PORT` (default `22`)
- `VPS_REPO_URL` (required only when app folder is not yet cloned on VPS)

If required secrets are missing, `Deploy` fails early with clear logs.

## 3. Recommended branch flow

- Open PR into `main` for review
- Merge into `main` -> `Deploy` workflow validates and deploys automatically

## 4. Notes

- Backend `npm test` is not used because the current script is placeholder and always fails.
- Frontend is deployed as static files behind Nginx (no SSR runtime).
- Deployment runtime uses `docker-compose.yml` at repo root with `db`, `db-seed`, `backend`, and `frontend` services.