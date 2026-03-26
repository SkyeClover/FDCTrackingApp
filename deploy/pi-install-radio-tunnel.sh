#!/usr/bin/env bash
# Optional: install fdc-radio-tunnel.service on Raspberry Pi / Debian (systemd).
# Requires: repo at ROOT with npm install (serialport native build), Node 18+.
#
#   sudo bash ~/FDCTrackingApp/deploy/pi-install-radio-tunnel.sh
#
# Then edit /etc/default/fdc-radio-tunnel (set FDC_RADIO_SERIAL_PATH), then:
#   sudo systemctl enable --now fdc-radio-tunnel.service
#
# The tunnel binds 127.0.0.1 only — no extra UFW rule. Run after fdc-peer-server.

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

for need in "$ROOT/fdc-radio-tunnel.mjs" "$ROOT/node_modules/serialport/package.json"; do
  if [[ ! -e "$need" ]]; then
    echo "Missing $need — run npm install in $ROOT (needs serialport)."
    exit 1
  fi
done

NODE_BIN="$(sudo -u "$APP_USER" -H bash -lc 'command -v node' 2>/dev/null || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi
if [[ -z "$NODE_BIN" ]]; then
  echo "node not found."
  exit 1
fi

DEFAULT_FILE=/etc/default/fdc-radio-tunnel
EXAMPLE="$SCRIPT_DIR/fdc-radio-tunnel.default.example"
if [[ ! -f "$DEFAULT_FILE" ]]; then
  if [[ -f "$EXAMPLE" ]]; then
    install -m 600 -o root -g root "$EXAMPLE" "$DEFAULT_FILE"
    echo "Created $DEFAULT_FILE — set FDC_RADIO_SERIAL_PATH, then: sudo systemctl enable --now fdc-radio-tunnel.service"
  else
    echo "FDC_RADIO_TUNNEL_PORT=8789" >"$DEFAULT_FILE"
    echo "FDC_RADIO_SERIAL_PATH=" >>"$DEFAULT_FILE"
    chmod 600 "$DEFAULT_FILE"
    chown root:root "$DEFAULT_FILE"
  fi
fi

UNIT=/etc/systemd/system/fdc-radio-tunnel.service
cat >"$UNIT" <<UNIT_EOF
[Unit]
Description=Walker Track radio HTTP tunnel (serial to fdc-peer-server)
After=network-online.target fdc-peer-server.service
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$ROOT
EnvironmentFile=-/etc/default/fdc-radio-tunnel
ExecStart=$NODE_BIN $ROOT/fdc-radio-tunnel.mjs
Restart=on-failure
RestartSec=4

[Install]
WantedBy=multi-user.target
UNIT_EOF

chmod 644 "$UNIT"
systemctl daemon-reload
echo "Installed $UNIT (disabled by default). After configuring $DEFAULT_FILE:"
echo "  sudo systemctl enable --now fdc-radio-tunnel.service"
