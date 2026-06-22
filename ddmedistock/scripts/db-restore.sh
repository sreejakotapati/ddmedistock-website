#!/usr/bin/env bash
# DDMediStock — restore a PostgreSQL backup produced by scripts/db-backup.sh.
#
#   ./scripts/db-restore.sh ./backups/ddmedistock-20260531T050000Z.dump
#
# WARNING: --clean drops and recreates objects in the target database. Never
# point this at production without an explicit, reviewed runbook.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
ARCHIVE="${1:?usage: db-restore.sh <archive.dump>}"
[[ -f "$ARCHIVE" ]] || { echo "✖ archive not found: $ARCHIVE" >&2; exit 1; }

# Strip Prisma-only query params (keep sslmode) — libpq rejects ?schema=.
pg_url() {
  local url="$1" base="${1%%\?*}" qs=""
  [[ "$url" == *\?* ]] && qs="${url#*\?}"
  local keep=""
  IFS='&' read -ra parts <<< "$qs"
  for p in "${parts[@]}"; do [[ "$p" == sslmode=* ]] && keep="${keep:+$keep&}$p"; done
  [[ -n "$keep" ]] && echo "$base?$keep" || echo "$base"
}
PG_URL="$(pg_url "$DATABASE_URL")"

echo "▶ Restoring $ARCHIVE → $PG_URL"
pg_restore --dbname "$PG_URL" --clean --if-exists --no-owner --no-privileges "$ARCHIVE"
echo "✔ Restore complete"
