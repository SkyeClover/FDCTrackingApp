# LAN sync: PC / tablet ↔ Raspberry Pi

This app pushes **snapshot JSON** to **`fdc-peer-server`** on the Pi (default **TCP 8787**). Each device keeps its own **Settings → View role** after a pull/push; the shared secret only authorizes the HTTP API.

## 1. On the Pi (once)

1. Copy the repo to the Pi (e.g. `~/FDCTrackingApp`) with a built **`dist/`** (`npm run build` on your dev machine, then upload — see README / `tools/pi-sync-upload.ps1`).
2. Install services:  
   `sudo bash ~/FDCTrackingApp/deploy/pi-install-all.sh`  
   (Or skip firewall: `--no-firewall`.)
3. Set the same passphrase the app uses:  
   `sudo nano /etc/default/fdc-peer-server` → set **`FDC_SYNC_SECRET=...`**  
   then:  
   `sudo systemctl restart fdc-peer-server.service`
4. Confirm firewall allows **8787** from your LAN (included in `pi-firewall-setup.sh` for private ranges). Tailscale: see **`PI-FIREWALL.md`**.

Health check from another machine:

```bash
curl -s "http://<PI_IP_OR_HOSTNAME>:8787/fdc/v1/health"
```

## 2. In the app (every client)

Open **Settings → Network** (or your **Sync** section).

1. **Shared secret** — same string as **`FDC_SYNC_SECRET`** on the Pi (and on every device that syncs).
2. **Peer roster** — add a row:
   - **Host**: Pi’s IP (e.g. `192.168.1.50`) or mDNS name (e.g. `fdc-tracker.local`).
   - **Port**: `8787` (unless you overrode `FDC_PEER_PORT`).
   - **Bearer**: IP / LAN (as offered by the UI).
3. Use **Ping** / **Pull** / **Push** to verify. Auto-push, if enabled, uses the same roster.

## 3. Deploy updates from Windows

From repo root (PuTTY **`pscp`/`plink`** in `tools/putty-bin/` — see script header):

```powershell
.\tools\pi-sync-upload.ps1 -PiPassword 'YOUR_SSH_PASSWORD' -PiHost fdc-tracker.local
# After upload, restart systemd units without opening SSH (sudo password must match SSH user unless NOPASSWD):
.\tools\pi-sync-upload.ps1 -PiPassword '...' -PiHost fdc-tracker.local -SkipBuild -RestartServices
# Full reboot:
.\tools\pi-sync-upload.ps1 -PiPassword '...' -PiHost fdc-tracker.local -SkipBuild -RebootPi
```

Or on the Pi after a manual copy, restart services so the new **`dist/`** and scripts load:

```bash
sudo systemctl restart fdc-tracker.service fdc-peer-server.service fdc-pi-sidecar.service
```

## 4. Reboot the Pi

```bash
ssh <user>@<pi-host>
sudo reboot
```

After reboot, **`pi-install-all`**-installed units start automatically (`fdc-tracker`, `fdc-peer-server`, `fdc-pi-sidecar`).

## Troubleshooting

| Symptom | Check |
|--------|--------|
| Connection refused | Pi reachable? `ufw status`, **`8787`** allowed from your subnet / VPN. |
| 401 / unauthorized | Shared secret in app matches **`/etc/default/fdc-peer-server`**; restart **`fdc-peer-server`**. |
| Hostname won’t resolve | Use IP, or install Avahi on Pi / use Tailscale DNS. |
