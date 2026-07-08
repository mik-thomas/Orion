#!/usr/bin/env bash
# Configure staging React client on Railway (run from repo root).
set -euo pipefail

API_URL="${VITE_API_URL:-https://orion-staging.up.railway.app}"
CLIENT_ORIGIN="${CLIENT_ORIGIN:-https://orion-client-staging.up.railway.app}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

railway variable set \
  "VITE_API_URL=$API_URL" \
  -s orion-client -e staging

railway variable set \
  "CORS_ORIGINS=${CLIENT_ORIGIN},${API_URL},http://localhost:5173,http://127.0.0.1:5173" \
  -s orion -e staging

echo "Client VITE_API_URL=${API_URL} on staging / orion-client."
echo "Railway dashboard (orion-client): Root Directory = client"
