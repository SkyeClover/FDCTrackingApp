#!/usr/bin/env bash
# Install systemd unit for fdc-pi-sidecar (auto-start on boot).
# Full Pi kiosk (web + peer + sidecar + UFW): use deploy/pi-install-all.sh instead.
# Run on the Pi:   sudo bash deploy/pi-install-sidecar.sh [--sudoers]
# --sudoers  also installs /etc/sudoers.d/fdc-pi-sidecar (edit template if your kiosk unit is not fdc-tracker.service).

set -euo pipefail

INSTALL_SUDOERS=false
for arg in "$@"; do
  case "$arg" in
    --sudoers) INSTALL_SUDOERS=true ;;
    -h|--help)
      echo "Usage: sudo bash $0 [--sudoers]"
      exit 0
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0 [--sudoers]"
  exit 1
fi

APP_USER="${SUDO_USER:-}"
if [[ -z "$APP_USER" ]]; then
  APP_USER="$(logname 2>/dev/null || true)"
fi
if [[ -z "$APP_USER" ]]; then
  echo "Set SUDO_USER (e.g. sudo -u walker-ranger true; export SUDO_USER=walker-ranger) or run: sudo -E bash $0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SIDECAR_JS="$ROOT/fdc-pi-sidecar.cjs"

if [[ ! -f "$SIDECAR_JS" ]]; then
  echo "Missing $SIDECAR_JS"
  exit 1
fi

NODE_BIN="$(sudo -u "$APP_USER" -H bash -lc 'command -v node' 2>/dev/null || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi
if [[ -z "$NODE_BIN" ]]; then
  echo "node not found. Install Node for $APP_USER or add it to PATH."
  exit 1
fi

SERVICE_NAME="${FDC_APP_SERVICE:-fdc-tracker.service}"
UNIT=/etc/systemd/system/fdc-pi-sidecar.service

cat >"$UNIT" <<UNIT_EOF
[Unit]
Description=Walker Track kiosk sidecar (127.0.0.1:3001)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$ROOT
Environment=FDC_APP_ROOT=$ROOT
Environment=FDC_APP_SERVICE=$SERVICE_NAME
ExecStart=$NODE_BIN $ROOT/fdc-pi-sidecar.cjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT_EOF

chmod 644 "$UNIT"
systemctl daemon-reload
systemctl enable fdc-pi-sidecar.service
systemctl restart fdc-pi-sidecar.service

echo "fdc-pi-sidecar: installed and started."
systemctl --no-pager -l status fdc-pi-sidecar.service || true

if [[ "$INSTALL_SUDOERS" == "true" ]]; then
  SRC="$SCRIPT_DIR/fdc-pi-sidecar.sudoers"
  if [[ ! -f "$SRC" ]]; then
    echo "No $SRC — skip sudoers."
    exit 0
  fi
  if ! command -v visudo >/dev/null 2>&1; then
    echo "visudo not found; install sudo package. Skipping sudoers."
    exit 0
  fi
  TMP="$(mktemp)"
  sed "s/walker-ranger/$APP_USER/g" "$SRC" >"$TMP"
  if visudo -c -f "$TMP" 2>/dev/null; then
    install -m 440 "$TMP" /etc/sudoers.d/fdc-pi-sidecar
    echo "Installed /etc/sudoers.d/fdc-pi-sidecar (edit if your app unit is not fdc-tracker.service)."
  else
    echo "visudo -c failed on generated file; not installing sudoers (you can add rules manually)."
    rm -f "$TMP"
  fi
  rm -f "$TMP"
fi
