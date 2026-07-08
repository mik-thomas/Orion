#!/usr/bin/env bash
# Import South Yorkshire spreadsheet data into Orion (run from repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PRODUCTION=false
RESUME="${RESUME:-0}"

usage() {
  cat <<'EOF'
Usage: npm run import:south-yorkshire [-- [--production] [--resume]]

Imports South Yorkshire court data from ORION_IMPORT_ROOT into the database.

Local (default):
  Uses Docker Postgres on localhost:5434 when DATABASE_URL is unset.
  Ensure spreadsheets are in ORION_IMPORT_ROOT (default: ~/Desktop/Courts).

Resume after failure:
  npm run import:south-yorkshire -- --resume
  Skips table truncation and phases already recorded in api/tmp/orion_import_checkpoint.json.
  Sitting rows use import_key upserts — re-processing the same batch is safe.

Production:
  Option A — export DATABASE_URL from Railway (orion service, staging), then run:
    export DATABASE_URL='postgresql://...'
    npm run import:south-yorkshire

  Option B — fetch DATABASE_PUBLIC_URL via Railway CLI:
    npm run import:south-yorkshire -- --production

Progress lines look like: [Orion Import] [████████░░░░░░░░░░░░] 42% (100/240) — step name
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --production) PRODUCTION=true ;;
    --resume) RESUME=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

export ORION_IMPORT_ROOT="${ORION_IMPORT_ROOT:-/Users/michaelthomas/Desktop/Courts}"
export RESUME

if [[ "$PRODUCTION" == true ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    if ! command -v railway &>/dev/null; then
      echo "railway CLI is required for --production when DATABASE_URL is unset." >&2
      echo "Install: https://docs.railway.com/guides/cli" >&2
      exit 1
    fi
    kv="$(railway variable list -s orion -e staging -k 2>/dev/null || true)"
    DATABASE_URL="$(printf '%s\n' "$kv" | grep -E '^DATABASE_PUBLIC_URL=' | head -1 | cut -d= -f2- || true)"
    if [[ -z "$DATABASE_URL" ]]; then
      DATABASE_URL="$(printf '%s\n' "$kv" | grep -E '^DATABASE_URL=' | head -1 | cut -d= -f2- || true)"
    fi
    if [[ -z "$DATABASE_URL" ]]; then
      echo "Could not fetch DATABASE_PUBLIC_URL from Railway (orion/staging)." >&2
      echo "Export DATABASE_URL manually from the Railway orion service variables." >&2
      exit 1
    fi
    export DATABASE_URL
  fi
  export RAILS_ENV=production
elif [[ -n "${DATABASE_URL:-}" ]]; then
  export RAILS_ENV="${RAILS_ENV:-production}"
else
  echo "==> Local database: Docker Postgres on localhost:5434"
  npm run db:up >/dev/null
  export POSTGRES_PORT="${POSTGRES_PORT:-5434}"
  export RAILS_ENV="${RAILS_ENV:-development}"
fi

echo ""
echo "Importing from: $ORION_IMPORT_ROOT"
if [[ "$RESUME" == "1" ]]; then
  echo "Resume mode: skipping clear and completed import phases"
fi
echo "Watch for progress: [Orion Import] [████░░░░] X% (done/total) — step"
echo ""

cd api
bundle exec rails orion:import_south_yorkshire
