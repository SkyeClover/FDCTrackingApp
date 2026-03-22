# Walker Track

Personal web app for FDC-style ammunition and asset tracking (BOCs, POCs, launchers, pods, RSVs, tasks, fire missions, logs). Data stays in your browser (local database + saved site data). You can sync snapshots with another copy on your network or a hosted URL using the optional peer script in this repo.

Runs anywhere you have a modern browser (desktop, tablet, kiosk, etc.). On a Raspberry Pi kiosk, install the **sidecar** so it listens on **127.0.0.1:3001** (Network / System info / Settings / Onboard keyboard): after syncing the repo to the Pi, run **`sudo bash ~/FDCTrackingApp/deploy/pi-install-sidecar.sh --sudoers`**, or from Windows **`.\tools\pi-sync-upload.ps1 -PiPassword '…' -InstallSidecar`** (interactive sudo prompt). Template unit: **`deploy/fdc-pi-sidecar.service`**.

**Author:** Jacob Walker  
**License:** Proprietary — see [LICENSE](LICENSE).
