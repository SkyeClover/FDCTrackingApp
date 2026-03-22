#!/usr/bin/env bash
# Walker Track — install everything for a Pi kiosk (boot auto-start):
#   • fdc-tracker.service  — static app on :3000 (deploy/pi-static-server.mjs → dist/)
#   • fdc-peer-server.service — sync ingest on :8787 (reads /etc/default/fdc-peer-server)
#   • fdc-pi-sidecar.service — localhost :3001 (same as pi-install-sidecar.sh)
#   • UFW rules (same as pi-firewall-setup.sh) unless --no-firewall
#
# Run on the Pi (from repo root or deploy/):
#   sudo bash ~/FDCTrackingApp/deploy/pi-install-all.sh
#
# Options:
#   --no-firewall   skip UFW (you manage firewall yourself)
#   --no-sudoers    skip /etc/sudoers.d/fdc-pi-sidecar (no passwordless restart-app)
#
# After install, set the sync secret on the Pi (must match the app):
#   sudo nano /etc/default/fdc-peer-server   # FDC_SYNC_SECRET=...
#   sudo systemctl restart fdc-peer-server.service

set -euo pipefail

DO_FIREWALL=true
INSTALL_SUDOERS=true
for arg in "$@"; do
  case "$arg" in
    --no-firewall) DO_FIREWALL=false ;;
    --no-sudoers) INSTALL_SUDOERS=false ;;
    -h|--help)
      echo "Usage: sudo bash $0 [--no-firewall] [--no-sudoers]"
      exit 0
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

APP_USER="${SUDO_USER:-}"
if [[ -z "$APP_USER" ]]; then
  APP_USER="$(logname 2>/dev/null || true)"
fi
if [[ -z "$APP_USER" ]]; then
  echo "Could not detect app user. Use: sudo -u walker-ranger sudo bash $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

for need in "$ROOT/deploy/pi-static-server.mjs" "$ROOT/fdc-peer-server.mjs" "$ROOT/fdc-pi-sidecar.cjs" "$ROOT/dist/index.html"; do
  if [[ ! -e "$need" ]]; then
    echo "Missing $need — sync the repo to the Pi and run npm run build (for dist/)."
    exit 1
  fi
done

NODE_BIN="$(sudo -u "$APP_USER" -H bash -lc 'command -v node' 2>/dev/null || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi
if [[ -z "$NODE_BIN" ]]; then
  echo "node not found. Install Node.js for $APP_USER."
  exit 1
fi

DEFAULT_FILE=/etc/default/fdc-peer-server
EXAMPLE="$SCRIPT_DIR/fdc-peer-server.default.example"
if [[ ! -f "$DEFAULT_FILE" ]]; then
  if [[ -f "$EXAMPLE" ]]; then
    install -m 600 -o root -g root "$EXAMPLE" "$DEFAULT_FILE"
    echo "Created $DEFAULT_FILE — edit and set FDC_SYNC_SECRET=... to match Network → Sync in the app, then:"
    echo "  sudo systemctl restart fdc-peer-server.service"
  else
    echo "FDC_SYNC_SECRET=" >"$DEFAULT_FILE"
    chmod 600 "$DEFAULT_FILE"
    chown root:root "$DEFAULT_FILE"
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

if [[ "$DO_FIREWALL" == "true" ]] && [[ -x "$SCRIPT_DIR/pi-firewall-setup.sh" || -f "$SCRIPT_DIR/pi-firewall-setup.sh" ]]; then
  # pi-firewall-setup.sh prunes its own fdc-wt / Walker Track rules before re-adding (idempotent).
  bash "$SCRIPT_DIR/pi-firewall-setup.sh"
elif [[ "$DO_FIREWALL" == "true" ]]; then
  echo "Optional: $SCRIPT_DIR/pi-firewall-setup.sh not found — skip UFW."
fi

SIDE_ARGS=()
if [[ "$INSTALL_SUDOERS" == "true" ]]; then
  SIDE_ARGS+=(--sudoers)
fi
bash "$SCRIPT_DIR/pi-install-sidecar.sh" "${SIDE_ARGS[@]}"

mkdir -p /etc/systemd/system/fdc-pi-sidecar.service.d
cat >/etc/systemd/system/fdc-pi-sidecar.service.d/10-after-tracker.conf <<DROPIN_EOF
[Unit]
After=network-online.target fdc-tracker.service
Wants=network-online.target fdc-tracker.service
DROPIN_EOF
chmod 644 /etc/systemd/system/fdc-pi-sidecar.service.d/10-after-tracker.conf

systemctl daemon-reload
systemctl enable fdc-tracker.service fdc-peer-server.service
systemctl restart fdc-tracker.service fdc-peer-server.service
systemctl restart fdc-pi-sidecar.service

echo ""
echo ">>> Walker Track Pi stack installed (enabled on boot)."
systemctl --no-pager is-active fdc-tracker.service fdc-peer-server.service fdc-pi-sidecar.service || true
echo ""
echo "URLs:  http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000   peer http://...:8787/fdc/v1/health"
echo "Sidecar (Pi only):  curl -s http://127.0.0.1:3001/health"
