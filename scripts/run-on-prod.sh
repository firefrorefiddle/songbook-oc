#!/usr/bin/env bash
# Run a repo TypeScript script on the production host against the production DB.
# The script is copied into the app tree, then executed with pnpm/tsx after
# loading the same env files the deployed app uses (.env.production or .env).
#
# Prerequisites: SSH key access; SERVER (and optional SSH_USER) in .envrc or env;
# remote ~/songbook-oc with node_modules (normal deploy).
#
# Usage:
#   ./scripts/run-on-prod.sh <path-from-repo-root> [args to script...]
# Example:
#   ./scripts/run-on-prod.sh scripts/patch-song-syllable-carets.ts

set -euo pipefail

SCRIPT_REL="${1:?Usage: $0 <path-from-repo-root> [args...]}"

shift || true

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_SCRIPT="$REPO_ROOT/$SCRIPT_REL"

if [ ! -f "$LOCAL_SCRIPT" ]; then
  echo "Not found: $LOCAL_SCRIPT" >&2
  exit 1
fi

if [ -f "$REPO_ROOT/.envrc" ]; then
  # shellcheck source=/dev/null
  source "$REPO_ROOT/.envrc"
fi

: "${SERVER:?Set SERVER (e.g. in .envrc)}"

SSH_OPTS="${SSH_OPTS:--o StrictHostKeyChecking=no}"
SSH_USER="${SSH_USER:-$USER}"

REMOTE_DIR=$(dirname "$SCRIPT_REL")

echo "=== Copying $SCRIPT_REL to $SSH_USER@$SERVER ==="
ssh $SSH_OPTS "$SSH_USER@$SERVER" "mkdir -p \"\$HOME/songbook-oc/$REMOTE_DIR\""
scp $SSH_OPTS "$LOCAL_SCRIPT" "$SSH_USER@$SERVER:~/songbook-oc/$SCRIPT_REL"

echo "=== Running on server (tsx $SCRIPT_REL) ==="
ssh $SSH_OPTS "$SSH_USER@$SERVER" bash -s -- "$SCRIPT_REL" "$@" <<'EOS'
set -euo pipefail
REMOTE_SCRIPT="$1"
shift || true
cd "$HOME/songbook-oc" || {
  echo "Missing ~/songbook-oc on server" >&2
  exit 1
}
if [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
elif [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo "No .env.production or .env in ~/songbook-oc" >&2
  exit 1
fi
exec pnpm exec tsx "$REMOTE_SCRIPT" "$@"
EOS

echo "=== Done ==="
