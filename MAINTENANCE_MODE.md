# Maintenance Mode Guide

## How to Enable Maintenance Mode

The FDC Tracker now supports a maintenance mode that displays a banner instead of the app when enabled.

### For Vercel Deployment

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project: `FDCTrackingApp`
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Key:** `VITE_MAINTENANCE_MODE`
   - **Value:** `true`
   - **Environments:** Check all (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** tab
7. Click the three dots (⋯) on the latest deployment
8. Click **Redeploy**

The app will now show the maintenance banner instead of the login screen.

### To Disable Maintenance Mode

1. Go to **Settings** → **Environment Variables**
2. Either:
   - Delete the `VITE_MAINTENANCE_MODE` variable, OR
   - Change its value to `false`
3. Redeploy the app

### For Local Development

Create or update your `.env` file:

```env
VITE_MAINTENANCE_MODE=true
```

Then restart your dev server:

```bash
npm run dev
```

### For Raspberry Pi Deployment

Set the environment variable in your systemd service file or export it before running the app:

```bash
export VITE_MAINTENANCE_MODE=true
```

Or add it to your service file at `pi-setup/fdc-tracker.service`:

```ini
[Service]
Environment="VITE_MAINTENANCE_MODE=true"
```

Then restart the service:

```bash
sudo systemctl restart fdc-tracker.service
```

---

**Note:** The maintenance banner will completely replace the app interface. Users will not be able to access the application while maintenance mode is enabled.

