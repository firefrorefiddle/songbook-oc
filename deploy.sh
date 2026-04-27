#!/bin/bash
set -e

# Load environment variables
if [ -f .envrc ]; then
  source .envrc
fi

if [ -z "${SERVER:-}" ]; then
  echo "Error: SERVER is not set. Define it in .envrc or your shell environment."
  exit 1
fi

DOMAIN="${DOMAIN:-liedermappe.upscale-automation.com}"
APP_DIR="/home/$USER/songbook-oc"
USER="${USER:-$USER}"

SSH_OPTS="-o StrictHostKeyChecking=no"
RSYNC_SSH="ssh $SSH_OPTS"

show_logs() {
  ssh "$USER@$SERVER" "journalctl -u songbook -n 50 --no-pager"
}

SEED_DB=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --logs)
      show_logs
      exit 0
      ;;
    --seed)
      SEED_DB="${2:-prisma/prod.db}"
      shift 2
      ;;
    --seed=*)
      SEED_DB="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--logs] [--seed[=db-path]]"
      exit 1
      ;;
  esac
done

if [ -n "$SEED_DB" ] && [ ! -f "$SEED_DB" ]; then
  echo "Error: Seed database not found: $SEED_DB"
  exit 1
fi

echo "=== Building app locally ==="
pnpm install
pnpm build

echo "=== Verifying PDF toolchain (songmaker + LaTeX templates) ==="
REQUIRED_PDF_FILES=(
  bin/songmaker-cli
  bin/songbook-backup
  src/lib/server/latex/songs.sty
  src/lib/server/latex/songbook-layout.sty
  src/lib/server/latex/layout.tex
  src/lib/server/latex/chorded.tex
  src/lib/server/latex/songbook-hyper-toc.tex
)
for f in "${REQUIRED_PDF_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Error: required PDF toolchain file missing: $f" >&2
    exit 1
  fi
done

echo "=== Syncing to server ==="
rsync -avz --delete -e "$RSYNC_SSH" \
  --exclude='node_modules' \
  --exclude='.svelte-kit' \
  --exclude='.git' \
  --exclude='*.db' \
  --exclude='tmp' \
  --exclude='seed_data' \
  --exclude='scripts' \
  --exclude='*.sh' \
  --exclude='*.md' \
  --exclude='.env' \
  --exclude='.envrc' \
  --exclude='build' \
  . "$USER@$SERVER:$APP_DIR/"

if [ -n "$SEED_DB" ]; then
  echo "=== Syncing seeded database ==="
  scp $SSH_OPTS "$SEED_DB" "$USER@$SERVER:$APP_DIR/data/songbook.db"
fi

echo "=== Syncing build folder ==="
rsync -avz -e "$RSYNC_SSH" build/ "$USER@$SERVER:$APP_DIR/build/"

# Always ship these explicitly so a future broad rsync --exclude cannot omit them.
echo "=== Syncing PDF toolchain (songmaker binary + server LaTeX tree) ==="
rsync -avz -e "$RSYNC_SSH" \
  bin/songmaker-cli \
  bin/songbook-backup \
  "$USER@$SERVER:$APP_DIR/bin/"
rsync -avz --delete -e "$RSYNC_SSH" \
  src/lib/server/latex/ \
  "$USER@$SERVER:$APP_DIR/src/lib/server/latex/"

echo "=== Syncing Prisma postinstall helper (postinstall runs scripts/link-pnpm-prisma-client.sh) ==="
ssh $SSH_OPTS "$USER@$SERVER" "mkdir -p $APP_DIR/scripts"
scp $SSH_OPTS scripts/link-pnpm-prisma-client.sh "$USER@$SERVER:$APP_DIR/scripts/link-pnpm-prisma-client.sh"
ssh $SSH_OPTS "$USER@$SERVER" "chmod +x $APP_DIR/scripts/link-pnpm-prisma-client.sh"

echo "=== Ensuring songmaker-cli is executable ==="
ssh $SSH_OPTS "$USER@$SERVER" \
  "chmod +x $APP_DIR/bin/songmaker-cli $APP_DIR/bin/songbook-backup"

echo "=== Syncing environment file ==="
scp $SSH_OPTS .env.production "$USER@$SERVER:$APP_DIR/.env"

echo "=== Running post-install on server ==="
ssh $SSH_OPTS "$USER@$SERVER" "cd $APP_DIR && pnpm install"

echo "=== Applying production database migrations ==="
ssh $SSH_OPTS "$USER@$SERVER" "cd $APP_DIR && pnpm prisma migrate deploy"

echo "=== Restarting app ==="
ssh $SSH_OPTS "$USER@$SERVER" "
  systemctl --user daemon-reload
  systemctl --user restart songbook
  sleep 2
  if systemctl --user is-active --quiet songbook; then
    echo 'App started successfully'
  else
    echo 'App failed to start'
    journalctl --user -u songbook --no-pager -n 10
  fi
"

echo "=== Deployment complete ==="
echo "App available at: http://$DOMAIN"
