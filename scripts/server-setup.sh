#!/bin/bash
set -euo pipefail

if [ -f .envrc ]; then
  source .envrc
fi

if [ -z "${SERVER:-}" ]; then
  echo "Error: SERVER is not set. Define it in .envrc or your shell environment."
  exit 1
fi

REMOTE_USER="${REMOTE_USER:-${USER}}"
APP_DIR="/home/$REMOTE_USER/songbook-oc"
SYSTEMD_DIR=".config/systemd/user"

echo "=== Creating app directory ==="
ssh "$REMOTE_USER@$SERVER" "mkdir -p $APP_DIR/data $APP_DIR/bin ~/$SYSTEMD_DIR"

echo "=== Installing executable scripts ==="
scp bin/songmaker-cli bin/songbook-backup "$REMOTE_USER@$SERVER:$APP_DIR/bin/"
ssh "$REMOTE_USER@$SERVER" \
  "chmod +x $APP_DIR/bin/songmaker-cli $APP_DIR/bin/songbook-backup"

echo "=== Installing systemd user units ==="
scp systemd/user/songbook.service \
  systemd/user/songbook-backup.service \
  systemd/user/songbook-backup.timer \
  "$REMOTE_USER@$SERVER:~/$SYSTEMD_DIR/"

echo "=== Reloading systemd ==="
ssh "$REMOTE_USER@$SERVER" "systemctl --user daemon-reload"

echo "=== Enabling timer and app service ==="
ssh "$REMOTE_USER@$SERVER" \
  "systemctl --user enable songbook && systemctl --user enable --now songbook-backup.timer"

echo "=== Setup complete ==="
echo "Next steps:"
echo "1. Create $APP_DIR/.env with production values"
echo "2. Run ./deploy.sh to deploy the app"
echo "3. systemctl --user start songbook to start the app"
echo "4. systemctl --user list-timers songbook-backup.timer to confirm the backup schedule"
