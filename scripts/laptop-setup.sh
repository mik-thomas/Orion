#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for cmd in node ruby docker git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "✗ $cmd not found — install it and re-run: npm run laptop-setup"
    exit 1
  fi
done

if [[ ! -f api/.env ]]; then
  cp api/.env.example api/.env
  echo "==> Created api/.env from api/.env.example"
fi

echo "==> Running npm run setup (deps, Docker Postgres, db:prepare)"
npm run setup

cat <<'EOF'

✓ Laptop setup complete.

  npm run dev                              → start API + client
  export ORION_IMPORT_ROOT=~/Desktop/Courts   → optional import path
  npm run import:south-yorkshire           → optional data import

See docs/laptop-setup.md for URLs and deploy.
EOF
