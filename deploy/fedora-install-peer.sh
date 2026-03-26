#!/usr/bin/env bash
# Walker Track — Fedora (ThinkPad): systemd units for static app + peer ingest + optional radio tunnel.
# Uses firewalld for TCP 3000 (web) and 8787 (peer). Tunnel is localhost-only — no extra port.
#
#   sudo bash ~/FDCTrackingApp/deploy/fedora-install-peer.sh
#
# Set sync secret: sudo nano /etc/default/fdc-peer-server  then  sudo systemctl restart fdc-peer-server.service
#
# Radio tunnel (optional): deploy/pi-install-radio-tunnel.sh logic is the same on Fedora — run
#   sudo bash deploy/pi-install-radio-tunnel.sh
# after npm install (same unit name).

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

APP_USER="${SUDO_USER:-}"
if [[ -z "$APP_USER" ]]; then
  APP_USER="$(logname 2>/dev/null || true)"
fi
if [[ -z "$APP_USER" ]]; then
  echo "Could not detect app user."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

for need in "$ROOT/deploy/pi-static-server.mjs" "$ROOT/fdc-peer-server.mjs" "$ROOT/dist/index.html"; do
  if [[ ! -e "$need" ]]; then
    echo "Missing $need — sync repo and run npm run build (for dist/)."
    exit 1
  fi
done

NODE_BIN="$(sudo -u "$APP_USER" -H bash -lc 'command -v node' 2>/dev/null || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi
if [[ -z "$NODE_BIN" ]]; then
  echo "Install Node.js 18+ for $APP_USER (dnf install nodejs or NodeSource)."
  exit 1
fi

PEER_DEFAULT=/etc/default/fdc-peer-server
EXAMPLE="$SCRIPT_DIR/fdc-peer-server.default.example"
if [[ ! -f "$PEER_DEFAULT" ]]; then
  if [[ -f "$EXAMPLE" ]]; then
    install -m 600 -o root -g root "$EXAMPLE" "$PEER_DEFAULT"
    echo "Created $PEER_DEFAULT — set FDC_SYNC_SECRET to match Network → Sync."
  else
    echo "FDC_SYNC_SECRET=" >"$PEER_DEFAULT"
    chmod 600 "$PEER_DEFAULT"
    chown root:root "$PEER_DEFAULT"
  fi
fi

TRACKER_UNIT=/etc/systemd/system/fdc-tracker.service
PEER_UNIT=/etc/systemd/system/fdc-peer-server.service

cat >"$TRACKER_UNIT" <<UNIT_EOF
[Unit]
Description=Walker Track web (static app on port 3000)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$ROOT
ExecStart=$NODE_BIN $ROOT/deploy/pi-static-server.mjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT_EOF

cat >"$PEER_UNIT" <<UNIT_EOF
[Unit]
Description=Walker Track peer ingest (fdc-peer-server on port 8787)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$ROOT
EnvironmentFile=-/etc/default/fdc-peer-server
ExecStart=$NODE_BIN $ROOT/fdc-peer-server.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT_EOF

chmod 644 "$TRACKER_UNIT" "$PEER_UNIT"

WEB_PORT="${FDC_WEB_PORT:-3000}"
PEER_PORT="${FDC_PEER_PORT:-8787}"

if command -v firewall-cmd >/dev/null 2>&1; then
  echo ">>> firewalld: opening $WEB_PORT/tcp and $PEER_PORT/tcp (permanent)"
  firewall-cmd --permanent --add-port="${WEB_PORT}/tcp" >/dev/null
  firewall-cmd --permanent --add-port="${PEER_PORT}/tcp" >/dev/null
  firewall-cmd --reload
else
  echo "firewall-cmd not found — open $WEB_PORT and $PEER_PORT/tcp manually if needed."
fi

systemctl daemon-reload
systemctl enable fdc-tracker.service fdc-peer-server.service
systemctl restart fdc-tracker.service fdc-peer-server.service

echo ""
echo ">>> Fedora stack installed (fdc-tracker + fdc-peer-server)."
echo "URLs:  http://127.0.0.1:${WEB_PORT}   peer http://127.0.0.1:${PEER_PORT}/fdc/v1/health"
echo "Optional radio tunnel: sudo bash $ROOT/deploy/pi-install-radio-tunnel.sh"
