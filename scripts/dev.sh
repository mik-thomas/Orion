#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

trap 'kill 0 2>/dev/null || true' EXIT

echo "Starting Orion API on http://127.0.0.1:3001"
npm run dev:api &
echo "Starting Orion client on http://localhost:5173"
npm run dev:client &
wait
