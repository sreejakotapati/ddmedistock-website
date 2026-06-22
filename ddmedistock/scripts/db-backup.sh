#!/usr/bin/env bash
# DDMediStock — PostgreSQL backup.
#
# Creates a compressed custom-format pg_dump archive (restorable with
# scripts/db-restore.sh), prunes old archives, and optionally uploads to S3.
#
#   ./scripts/db-backup.sh
#
# Env (see .env.example):
#   DATABASE_URL          required — postgres connection string
#   BACKUP_DIR            optional — local output dir (default ./backups)
#   BACKUP_RETENTION_DAYS optional — prune archives older than N days (default 14)
#   BACKUP_S3_BUCKET      optional — also copy archive to this s3:// location
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Prisma appends params like ?schema=public&connection_limit=… that libpq's
# pg_dump rejects. Keep only sslmode (the one libpq understands) for the dump.
pg_url() {
  local url="$1" base="${1%%\?*}" qs=""
  [[ "$url" == *\?* ]] && qs="${url#*\?}"
  local keep=""
  IFS='&' read -ra parts <<< "$qs"
  for p in "${parts[@]}"; do [[ "$p" == sslmode=* ]] && keep="${keep:+$keep&}$p"; done
  [[ -n "$keep" ]] && echo "$base?$keep" || echo "$base"
}
PG_URL="$(pg_url "$DATABASE_URL")"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/ddmedistock-$STAMP.dump"

echo "▶ Backing up database → $OUT"
# Custom format (-Fc): compressed, parallelizable, selective restore.
pg_dump --dbname "$PG_URL" --format=custom --no-owner --no-privileges --file "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "✔ Backup complete ($SIZE)"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "▶ Uploading to $BACKUP_S3_BUCKET/"
  aws s3 cp "$OUT" "$BACKUP_S3_BUCKET/$(basename "$OUT")"
  echo "✔ Uploaded"
fi

echo "▶ Pruning local archives older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name 'ddmedistock-*.dump' -type f -mtime "+$RETENTION_DAYS" -print -delete || true
echo "✔ Done"
