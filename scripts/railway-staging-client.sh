#!/usr/bin/env bash
# Configure production React client on Railway.
# Kept as railway-staging-client.sh for older docs; delegates to railway-production-client.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/railway-production-client.sh" "$@"
