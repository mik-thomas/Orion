#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Node dependencies (root + client)"
npm install
(cd client && npm install)

echo "==> Ruby gems (api/)"
(cd api && bundle install)

echo "==> Postgres via Docker"
npm run db:up
sleep 2

echo "==> Database prepare + seed"
npm run db:setup

cat <<'EOF'

Local setup complete.

  npm run dev          → API http://127.0.0.1:3001 + client http://localhost:5173
  npm run check        → same checks as GitHub CI (run before opening a PR)

Deploy: merge an approved PR to main → GitHub CI → Railway (staging) auto-deploy.

EOF
