#!/usr/bin/env bash
# Walker Track — sensible UFW rules for a Pi kiosk (SSH + LAN web + peer ingest).
# Run on the Pi:   sudo bash ~/FDCTrackingApp/deploy/pi-firewall-setup.sh
#
# Env (optional):
#   FDC_WEB_PORT=3000       — static app / kiosk HTTP port
#   FDC_PEER_PORT=8787      — fdc-peer-server ingest (Network sync)
#   FDC_UFW_MODE=lan|any    — default lan: only private RFC1918 ranges reach web+peer
#                             any: allow web+peer from anywhere (only if you know why)
#   FDC_UFW_SKIP_APT=1      — do not apt-get install ufw (you already have it)
#
# Sidecar (127.0.0.1:3001) is not exposed by design — no UFW rule needed.
#
# Safe to re-run: drops rules this script manages (see prune_ufw_fdc_rules), then re-adds them.
# Prune matches: comment/tag "fdc-wt", legacy "Walker Track", or LIMIT rules with "SSH rate limit" (old script).

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

WEB_PORT="${FDC_WEB_PORT:-3000}"
PEER_PORT="${FDC_PEER_PORT:-8787}"
MODE="${FDC_UFW_MODE:-lan}"

if ! command -v ufw >/dev/null 2>&1; then
  if [[ "${FDC_UFW_SKIP_APT:-}" == "1" ]]; then
    echo "ufw not found. Install: sudo apt-get install -y ufw"
    exit 1
  fi
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq ufw
fi

# Remove rules from earlier runs of this script (or legacy comments) so we do not stack duplicates.
prune_ufw_fdc_rules() {
  local max=100
  local i=0
  while (( i < max )); do
    local line num
    line=$(ufw status numbered 2>/dev/null | grep -E 'Walker Track|fdc-wt|LIMIT.*SSH rate limit' | head -n1 || true)
    [[ -z "${line:-}" ]] && break
    num=$(sed -n 's/^\[[[:space:]]*\([0-9]*\)\].*/\1/p' <<<"$line")
    [[ -z "${num:-}" ]] && break
    echo ">>> UFW: removing previous managed rule [$num]"
    ufw --force delete "$num" || true
    ((i++)) || true
  done
}

echo ">>> UFW: default policy (deny incoming, allow outgoing)"
ufw default deny incoming
ufw default allow outgoing

echo ">>> UFW: prune old Walker Track / fdc-wt / legacy SSH rate-limit rules (if any)"
prune_ufw_fdc_rules

echo ">>> UFW: SSH (rate-limited)"
if ufw app info OpenSSH >/dev/null 2>&1; then
  ufw limit OpenSSH comment 'fdc-wt ssh'
else
  ufw limit 22/tcp comment 'fdc-wt ssh'
fi

add_lan_ports() {
  local port=$1
  local label=$2
  for src in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16; do
    ufw allow from "$src" to any port "$port" proto tcp comment "$label"
  done
}

if [[ "$MODE" == "any" ]]; then
  echo ">>> UFW: web + peer — ANYWHERE (FDC_UFW_MODE=any) — use only if you need WAN without a tunnel"
  ufw allow "${WEB_PORT}/tcp" comment 'fdc-wt web any'
  ufw allow "${PEER_PORT}/tcp" comment 'fdc-wt peer any'
else
  echo ">>> UFW: web + peer — private LAN ranges only (10/8, 172.16/12, 192.168/16)"
  add_lan_ports "$WEB_PORT" 'fdc-wt web LAN'
  add_lan_ports "$PEER_PORT" 'fdc-wt peer LAN'
fi

echo ">>> Enabling firewall (existing SSH session should stay up if OpenSSH rule applied)"
ufw --force enable

echo ""
echo "Current rules:"
ufw status verbose

echo ""
echo "Done. If you use other services (VNC, Samba, mDNS), add rules: sudo ufw allow ..."
