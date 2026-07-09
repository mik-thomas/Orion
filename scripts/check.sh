#!/usr/bin/env bash
# Run the same checks as .github/workflows/ci.yml before pushing or opening a PR.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Smoke tests"
npm test

echo "==> API role serialization tests"
(cd api && bin/rails test test/controllers/api/v1/magistrate_role_serialization_test.rb)

echo "==> Client production build"
npm run test:client

echo "==> All checks passed"
