#!/usr/bin/env bash
# Import South Yorkshire spreadsheet data into Orion (run from repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PRODUCTION=false
RESUME="${RESUME:-0}"
ADDITIVE="${ADDITIVE:-0}"

usage() {
  cat <<'EOF'
Usage: npm run import:south-yorkshire [-- [--production] [--resume] [--additive]]

Imports South Yorkshire court data from ORION_IMPORT_ROOT into the database.

Local (default):
  Uses Docker Postgres on localhost:5434 when DATABASE_URL is unset.
  Ensure spreadsheets are in ORION_IMPORT_ROOT (default: ~/Desktop/Courts).

Additive (append / upsert into existing data — no truncate):
  npm run import:south-yorkshire -- --additive
  Runs all import phases without clearing tables. Sitting rows upsert by
  import_key (duplicates skipped). Summary-only roots are supported; missing
  vacancy/vacated/cancelled/rota packs are skipped with a log line.

Resume after failure or cancel (Ctrl+C):
  npm run import:south-yorkshire -- --resume
  Skips table truncation. Uses api/tmp/orion_import_checkpoint.json when present;
  if missing, infers completed phases from the database (no truncate, import_key dedup).
  Sitting rows use import_key upserts — re-processing the same batch is safe.

Fresh start (truncates and re-imports everything):
  npm run import:south-yorkshire

Typical duration: ~5–15 min local, ~15–45 min on Railway (13k sitting rows).

Production:
  Option A — export DATABASE_URL from Railway (orion service), then run:
    export DATABASE_URL='postgresql://...'
    npm run import:south-yorkshire -- --additive

  Option B — fetch DATABASE_PUBLIC_URL via Railway CLI:
    npm run import:south-yorkshire -- --production --additive

Progress lines look like: [Orion Import] [████████░░░░░░░░░░░░] 42% (100/240) — step name
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --production) PRODUCTION=true ;;
    --resume) RESUME=1 ;;
    --additive) ADDITIVE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

export ORION_IMPORT_ROOT="${ORION_IMPORT_ROOT:-/Users/michaelthomas/Desktop/Courts}"
export RESUME
export ADDITIVE

if [[ "$PRODUCTION" == true ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    if ! command -v railway &>/dev/null; then
      echo "railway CLI is required for --production when DATABASE_URL is unset." >&2
      echo "Install: https://docs.railway.com/guides/cli" >&2
      exit 1
    fi
    RAILWAY_ENV="${RAILWAY_ENVIRONMENT:-production}"
    # Prefer DATABASE_PUBLIC_URL from the Postgres plugin (TCP proxy), then orion.
    fetch_railway_db_url() {
      local svc="$1"
      local kv url
      kv="$(railway variables -s "$svc" -e "$RAILWAY_ENV" -k 2>/dev/null || true)"
      url="$(printf '%s\n' "$kv" | grep -E '^DATABASE_PUBLIC_URL=' | head -1 | cut -d= -f2- || true)"
      if [[ -z "$url" ]]; then
        url="$(printf '%s\n' "$kv" | grep -E '^DATABASE_URL=' | head -1 | cut -d= -f2- || true)"
      fi
      printf '%s' "$url"
    }
    DATABASE_URL="$(fetch_railway_db_url Postgres)"
    if [[ -z "$DATABASE_URL" || "$DATABASE_URL" == *".railway.internal"* ]]; then
      DATABASE_URL="$(fetch_railway_db_url orion)"
    fi
    if [[ -z "$DATABASE_URL" ]]; then
      echo "Could not fetch DATABASE_PUBLIC_URL from Railway (Postgres or orion / $RAILWAY_ENV)." >&2
      echo "Export a public DATABASE_URL manually, or enable TCP proxy on the Postgres service." >&2
      exit 1
    fi
    if [[ "$DATABASE_URL" == *".railway.internal"* ]]; then
      echo "Railway only exposed an internal DATABASE_URL (*.railway.internal)." >&2
      echo "Enable TCP proxy on the Postgres service (exposes DATABASE_PUBLIC_URL), or export:" >&2
      echo "  export DATABASE_URL='postgresql://...'" >&2
      exit 1
    fi
    export DATABASE_URL
    echo "==> Using Railway public Postgres ($RAILWAY_ENV)"
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

CHECKPOINT="$ROOT/api/tmp/orion_import_checkpoint.json"

echo ""
echo "Importing from: $ORION_IMPORT_ROOT"
if [[ "$ADDITIVE" == "1" ]]; then
  echo "Additive mode: no truncate; all phases run; duplicates skipped via import_key"
elif [[ "$RESUME" == "1" ]]; then
  echo "Resume mode: skipping clear and completed import phases"
  if [[ ! -f "$CHECKPOINT" ]]; then
    echo ""
    echo "Note: no checkpoint file at api/tmp/orion_import_checkpoint.json"
    echo "      Import will infer progress from the database (no truncate)."
    echo "      Duplicate sittings are skipped via import_key."
    echo "      For a fresh start instead: npm run import:south-yorkshire"
    echo "      To add a new pack without skipping phases: --additive"
    echo ""
  fi
fi
echo "Watch for progress: [Orion Import] [████░░░░] X% (done/total) ~rows/s ETA — step"
echo ""

cd api
bundle exec rails orion:import_south_yorkshire
