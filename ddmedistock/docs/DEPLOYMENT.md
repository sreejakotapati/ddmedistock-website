# DDMediStock — Deployment Guide

This guide covers local development, the Docker Compose stack, and Kubernetes.

## Prerequisites

- Node.js 22+
- PostgreSQL 16 with the **pgvector** and **pg_trgm** extensions
- (Optional) Redis 7 — for queues/caching once Phase 1-Redis lands
- (Optional) `OPENAI_API_KEY` — enables the real LLM/embedding path; without it
  the app runs a deterministic offline fallback

## 1. Local development

```bash
cp .env.example .env            # then edit DATABASE_URL / JWT_SECRET
createdb ddmedistock            # or use a managed Postgres
npm ci
npx prisma migrate deploy       # apply migrations (creates vector + pg_trgm)
npx prisma db seed              # demo orgs, users, vendors, products
npm run dev                     # http://localhost:3000
```

Demo logins (all password `password123`):

| Role | Email |
|------|-------|
| Super Admin | superadmin@ddmedistock.com |
| Admin | admin@ddmedistock.com |
| Procurement Manager | manager@ddmedistock.com |
| Customer | procurement@cityhospital.in |
| Vendor | sales@medsupply.in |

### Useful scripts

```bash
npm test            # unit/integration suite (node:test)
npm run build       # production build (standalone output)
npm run ai:embed    # backfill product embeddings (requires OPENAI_API_KEY)
bash scripts/db-backup.sh      # compressed pg_dump (+ optional S3)
bash scripts/db-restore.sh <archive.dump>
```

## 2. Docker Compose (single host)

Brings up `app` + `db` (pgvector/pgvector:pg16) + `redis`:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export POSTGRES_PASSWORD="$(openssl rand -hex 16)"
docker compose up --build -d
# App applies `prisma migrate deploy` on startup, then serves on :3000
docker compose exec app npx prisma db seed   # optional demo data
```

Tear down (keep data): `docker compose down`
Wipe data too: `docker compose down -v`

## 3. Kubernetes

Manifests live in `k8s/`. They assume an image at
`ghcr.io/sreejakotapati/ddmedistock:latest` (built by CI) and an
ingress-nginx + cert-manager cluster. Managed Postgres (with pgvector) and
Redis are recommended over in-cluster stateful sets.

```bash
kubectl apply -f k8s/namespace.yaml
# Create real secrets (do NOT apply secret.example.yaml as-is):
kubectl -n ddmedistock create secret generic ddmedistock-secrets \
  --from-literal=DATABASE_URL='postgresql://USER:PASS@HOST:5432/ddmedistock?schema=public&sslmode=require' \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=OPENAI_API_KEY='sk-...'
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml   # initContainer runs migrate deploy
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml      # edit host first
```

Rollout / rollback:

```bash
kubectl -n ddmedistock rollout status deploy/ddmedistock-app
kubectl -n ddmedistock rollout undo   deploy/ddmedistock-app
```

## 4. Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Postgres connection string (pgvector + pg_trgm) |
| `JWT_SECRET` | yes | Long random string for session signing |
| `OPENAI_API_KEY` | no | Enables LLM extraction + embeddings |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini` |
| `REDIS_URL` | no | For queues/caching (future phase) |
| `BACKUP_DIR` / `BACKUP_S3_BUCKET` | no | Backup script targets |

## 5. Post-deploy checklist

1. `prisma migrate deploy` succeeded (extensions + tables present).
2. Seed only in non-production, or load the real catalogue.
3. If using AI, run `npm run ai:embed` to populate vectors.
4. Confirm `/login` returns 200 (used by the container/K8s health probes).
5. Schedule `scripts/db-backup.sh` (cron / K8s CronJob).
