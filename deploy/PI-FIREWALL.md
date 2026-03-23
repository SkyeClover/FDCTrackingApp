# Raspberry Pi firewall (Walker Track)

## Boot stack (app + peer + sidecar + firewall)

Use **`deploy/pi-install-all.sh`** once on the Pi (after `dist/` exists). It installs **`fdc-tracker.service`** (static UI on **3000**), **`fdc-peer-server.service`** (**8787**), **`fdc-pi-sidecar.service`** (**127.0.0.1:3001**), runs this firewall script, and **`systemctl enable`s** everything. **`pi-firewall-setup.sh`** is **safe to re-run**: it removes rules it previously created (comments **`fdc-wt`** / legacy **`Walker Track`** / old **`SSH rate limit`**) and adds them again. Pass **`--no-firewall`** to **`pi-install-all.sh`** if you do not want to touch UFW.

The kiosk **sidecar** (`fdc-pi-sidecar`) listens on **127.0.0.1:3001** only — it is **not** meant to be reachable from the LAN, so the firewall does not open that port.

You typically **do** want:

| Port | Service | Notes |
|------|---------|--------|
| **22/tcp** | SSH | Rate-limited to reduce password guessing |
| **3000/tcp** (or your app port) | Static UI / Chromium URL | Often `fdc-tracker` or similar |
| **8787/tcp** (default) | `fdc-peer-server` | Network → sync ingest (`/fdc/v1/*`) |

## Quick setup (UFW)

On the Pi, after you can SSH in:

```bash
sudo bash ~/FDCTrackingApp/deploy/pi-firewall-setup.sh
```

Defaults:

- **Deny** all incoming except what you allow; **allow** all outgoing (updates, NTP, DNS, `apt`).
- **SSH**: `ufw limit` on OpenSSH (or 22/tcp).
- **Web + peer**: only from **private networks** (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).  
  If your Pi is on another range (e.g. Tailscale `100.x`), add rules manually (see below).

### Custom ports

```bash
sudo FDC_WEB_PORT=8080 FDC_PEER_PORT=8787 bash ~/FDCTrackingApp/deploy/pi-firewall-setup.sh
```

### WAN exposure (discouraged)

Only if the Pi has a **public** IP and you intentionally want the internet to hit web/peer **without** HTTPS:

```bash
sudo FDC_UFW_MODE=any bash ~/FDCTrackingApp/deploy/pi-firewall-setup.sh
```

Prefer a **reverse proxy + TLS** or a **tunnel** (Cloudflare Tunnel, Tailscale, etc.) instead of raw `any`.

## After running the script

- **`sudo ufw status verbose`** — confirm rules.
- **Re-runs**: the script prunes its own rules first, so duplicates from repeating **`pi-firewall-setup.sh`** or **`pi-install-all.sh`** should not stack. Rules you added **manually** are left alone unless the line contains **`Walker Track`**, **`fdc-wt`**, or is a **`LIMIT`** rule whose comment is **`SSH rate limit`** (from an older version of this script).
- **Lockout**: always keep **SSH** allowed before `ufw enable`. If locked out, use console/keyboard on the Pi or SD card mount to fix `/etc/ufw/`.

## SSH hardening (recommended)

- Use **SSH keys**; disable password auth when ready (`PasswordAuthentication no` in `sshd_config`).
- Change default password for the kiosk user.
- Optional: **`fail2ban`** — `sudo apt-get install fail2ban` for extra SSH jail (beyond `ufw limit`).

## Tailscale / VPN

If you reach the Pi via Tailscale, allow the peer from **`100.64.0.0/10`** as well:

```bash
sudo ufw allow from 100.64.0.0/10 to any port 3000 proto tcp comment 'Walker Track web (Tailscale)'
sudo ufw allow from 100.64.0.0/10 to any port 8787 proto tcp comment 'Walker Track peer (Tailscale)'
```

## mDNS (`.local` hostnames)

If you rely on **Avahi** and need discovery from other LAN devices:

```bash
sudo ufw allow 5353/udp comment 'mDNS'
```

## Related files in this repo

- `deploy/pi-firewall-setup.sh` — applies the rules above  
- `fdc-pi-sidecar.cjs` — binds **127.0.0.1** by default (`FDC_SIDECAR_HOST`)

<!-- APP_ALIGNMENT_START -->
## Application Alignment (2026-03-23)

This document is aligned to the active **FDC Tracking App (Walker Track)** implementation for `deploy/PI-FIREWALL.md`.

- Primary app: `E:/Projects/Cursor/TrackingThing/FDCTrackingApp` (React + TypeScript + Vite).
- Core pages/routes: Dashboard, Inventory, Management, Fire Missions, Logs, System Info, Network, Simulation, Settings.
- Local persistence: SQL.js and IndexedDB/local browser storage via the persistence layer.
- Sync stack: peer sync controls in app, plus optional `fdc-peer-server` and kiosk sidecar workflows.
- Simulation stack: optional WebSocket simulator (`fdc-simulator`) feeding Network/Simulation workflows.
- Deployment baseline: Raspberry Pi scripts under `deploy/` and operational notes in repo docs.

Source-of-truth references used for this alignment:
- `README.md`
- `src/navigation/routes.ts`
- `src/context/AppDataContext.tsx`
- `src/pages/Network.tsx`
- `src/pages/Simulation.tsx`

<!-- APP_ALIGNMENT_END -->
