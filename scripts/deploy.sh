#!/usr/bin/env bash
# Ship to Railway staging via git: check → commit → push → PR → CI → merge main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMIT_MSG=""
SKIP_COMMIT=false
NO_MERGE=false

usage() {
  cat <<'EOF'
Usage: npm run deploy -- [-m "commit message"] [--skip-commit] [--no-merge]

  -m, --message     Commit message (required if there are uncommitted changes)
  --skip-commit     Fail instead of committing when the tree is dirty
  --no-merge        Open/update PR and wait for CI, but do not merge to main

Without flags on main: runs checks and pushes main (CI + Railway deploy).
On a feature branch: pushes, opens PR if needed, waits for CI, merges to main.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)
      COMMIT_MSG="${2:-}"
      shift 2
      ;;
    --skip-commit)
      SKIP_COMMIT=true
      shift
      ;;
    --no-merge)
      NO_MERGE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login" >&2
  exit 1
fi

echo "==> CI checks (local)"
npm run check

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Detached HEAD — checkout a branch first." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "$SKIP_COMMIT" == true ]]; then
    echo "Uncommitted changes. Commit first or pass -m \"message\"." >&2
    exit 1
  fi
  if [[ -z "$COMMIT_MSG" ]]; then
    echo "Uncommitted changes. Pass: npm run deploy -- -m \"describe the change\"" >&2
    exit 1
  fi
  git add -A
  git commit -m "$COMMIT_MSG"
elif [[ -z "$COMMIT_MSG" ]]; then
  COMMIT_MSG="$(git log -1 --pretty=%s 2>/dev/null || echo "Deploy")"
fi

echo "==> Push $BRANCH"
git push -u origin HEAD

STAGING_API="https://orion-staging.up.railway.app"
STAGING_CLIENT="https://orion-client-staging.up.railway.app"

if [[ "$BRANCH" == "main" ]]; then
  echo ""
  echo "Pushed main. GitHub CI will run; Railway deploys staging after CI (if Wait for CI is on)."
  echo "  API:    $STAGING_API"
  echo "  Client: $STAGING_CLIENT"
  gh run list --branch main --limit 3 2>/dev/null || true
  exit 0
fi

echo "==> Pull request to main"
if ! gh pr view --json url >/dev/null 2>&1; then
  gh pr create --base main --head "$BRANCH" --title "$COMMIT_MSG" --body "Automated deploy from \`npm run deploy\`."
fi

PR_URL="$(gh pr view --json url -q .url)"
echo "PR: $PR_URL"

echo "==> Wait for GitHub CI"
if ! gh pr checks --watch; then
  echo "CI failed or timed out. Fix checks on the PR before merging." >&2
  exit 1
fi

if [[ "$NO_MERGE" == true ]]; then
  echo ""
  echo "CI passed. PR is ready to merge: $PR_URL"
  exit 0
fi

echo "==> Merge to main"
if gh pr merge --merge --delete-branch; then
  git checkout main
  git pull origin main
  echo ""
  echo "Merged to main. Railway will deploy staging (usually within a few minutes)."
  echo "  API:    $STAGING_API"
  echo "  Client: $STAGING_CLIENT"
else
  echo ""
  echo "Could not merge automatically (approval or branch rules may be required)."
  echo "Open the PR and merge when ready: $PR_URL"
  exit 1
fi
