#!/usr/bin/env bash
# Set staging API env vars on Railway (run from repo root after linking orion API service).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Export DATABASE_URL first (do not commit this value), e.g.:"
  echo '  export DATABASE_URL="postgresql://orion_admin:YOUR_PASSWORD@orion-staging-db.<id>.eu-north-1.rds.amazonaws.com:5432/orion_staging?sslmode=require"'
  exit 1
fi

SECRET_KEY_BASE="${SECRET_KEY_BASE:-$(cd api && bin/rails secret)}"
CLIENT_ORIGIN="${CLIENT_ORIGIN:-https://orion-client-staging.up.railway.app}"
API_ORIGIN="${API_ORIGIN:-https://orion-staging.up.railway.app}"

railway variable set \
  RAILS_ENV=production \
  SECRET_KEY_BASE="$SECRET_KEY_BASE" \
  WEB_CONCURRENCY=0 \
  RAILS_MAX_THREADS=5 \
  ORION_CLIENT_URL="$CLIENT_ORIGIN" \
  "CORS_ORIGINS=${CLIENT_ORIGIN},${API_ORIGIN},http://localhost:5173,http://127.0.0.1:5173" \
  -s orion -e staging

printf '%s' "$DATABASE_URL" | railway variable set DATABASE_URL --stdin -s orion -e staging

echo "Variables set on staging / orion."
echo "Push to main (or npm run deploy) to trigger a Railway deploy with db:prepare."
