#!/bin/bash
set -e

if [ -f .envrc ]; then
  source .envrc
fi

if [ -z "${SERVER:-}" ]; then
  echo "Error: SERVER is not set. Define it in .envrc or your shell environment."
  exit 1
fi

USER="root"
APP_DIR="/opt/songbook-oc"

echo "=== Creating app directory ==="
ssh "$USER@$SERVER" "mkdir -p $APP_DIR/data $APP_DIR/bin"

echo "=== Installing songmaker-cli ==="
scp bin/songmaker-cli "$USER@$SERVER:$APP_DIR/bin/"
ssh "$USER@$SERVER" "chmod +x $APP_DIR/bin/songmaker-cli"

echo "=== Creating systemd service ==="
ssh "$USER@$SERVER" sudo tee /etc/systemd/system/songbook.service > /dev/null <<'EOF'
[Unit]
Description=Songbook-OC SvelteKit App
After=network.target

[Service]
Type=exec
WorkingDirectory=/opt/songbook-oc
Environment=NODE_ENV=production
Environment=PORT=3000
Environment="PATH=/opt/songbook-oc/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "=== Reloading systemd ==="
ssh "$USER@$SERVER" sudo systemctl daemon-reload

echo "=== Enabling service ==="
ssh "$USER@$SERVER" sudo systemctl enable songbook

echo "=== Setup complete ==="
echo "Next steps:"
echo "1. Create $APP_DIR/.env with production values"
echo "2. Run ./deploy.sh to deploy the app"
echo "3. sudo systemctl start songbook to start the app"
