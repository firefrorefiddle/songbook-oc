#!/bin/bash
set -e

# Load environment variables
if [ -f .envrc ]; then
  source .envrc
fi

SERVER="${SERVER:-152.53.251.51}"
DOMAIN="${DOMAIN:-liedermappe.upscale-automation.com}"
APP_DIR="/opt/songbook-oc"
USER="${USER:-$USER}"

SSH_OPTS="-o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=no"
RSYNC_SSH="sshpass -e ssh $SSH_OPTS"

show_logs() {
  ssh "$USER@$SERVER" "journalctl -u songbook -n 50 --no-pager"
}

if [ "$1" = "--logs" ]; then
  show_logs
  exit 0
fi

echo "=== Building app locally ==="
pnpm install
pnpm build

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

echo "=== Syncing build folder ==="
rsync -avz -e "$RSYNC_SSH" build/ "$USER@$SERVER:$APP_DIR/build/"

echo "=== Ensuring songmaker-cli is executable ==="
sshpass -e ssh $SSH_OPTS "$USER@$SERVER" "chmod +x $APP_DIR/bin/songmaker-cli"

echo "=== Syncing environment file ==="
sshpass -e scp $SSH_OPTS .env.production.example "$USER@$SERVER:$APP_DIR/.env"

echo "=== Running post-install on server ==="
sshpass -e ssh $SSH_OPTS "$USER@$SERVER" "cd $APP_DIR && pnpm install"

echo "=== Restarting service ==="
sshpass -e ssh $SSH_OPTS "$USER@$SERVER" "sudo systemctl restart songbook"

echo "=== Waiting for service to start ==="
sleep 3

echo "=== Checking service status ==="
sshpass -e ssh $SSH_OPTS "$USER@$SERVER" "sudo systemctl status songbook --no-pager"

echo "=== Deployment complete ==="
echo "App available at: http://$DOMAIN"
