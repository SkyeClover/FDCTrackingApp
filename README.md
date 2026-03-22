# Walker Track

Personal web app for FDC-style ammunition and asset tracking (BOCs, POCs, launchers, pods, RSVs, tasks, fire missions, logs). Data stays in your browser (local database + saved site data). You can sync snapshots with another copy on your network or a hosted URL using the optional peer script in this repo.

Runs anywhere you have a modern browser (desktop, tablet, kiosk, etc.). On a Raspberry Pi kiosk, after syncing the repo (with **`dist/`** from `npm run build`), run **`sudo bash ~/FDCTrackingApp/deploy/pi-install-all.sh`** — installs **systemd** units for the **static app (:3000)**, **`fdc-peer-server` (:8787)**, **sidecar (127.0.0.1:3001)**, **UFW**, and **enables all on boot**. Set **`FDC_SYNC_SECRET`** in **`/etc/default/fdc-peer-server`** to match Network → Sync in the app. Sidecar-only install: **`deploy/pi-install-sidecar.sh --sudoers`**. From Windows: **`.\tools\pi-sync-upload.ps1`** then SSH and run **`pi-install-all.sh`**, or use **`-InstallSidecar`** for sidecar only.

**Pi firewall:** included in **`pi-install-all.sh`**; alone: **`deploy/pi-firewall-setup.sh`**. Details: **`deploy/PI-FIREWALL.md`**.

**LAN sync (roster, secret, ports, reboot):** **`deploy/SYNC-LAN.md`**.

**Author:** Jacob Walker  
**License:** Proprietary — see [LICENSE](LICENSE).
