# PI5 System Info Proxy Setup

This guide explains how to connect the app to a remote PI5 to view system statistics.

## Overview

The app now supports connecting to a PI5 via SSH to fetch system information. The proxy server (`pi-proxy-server.cjs`) connects to the PI5 and executes system commands remotely.

## Quick Start

1. **Start the proxy server:**
   ```bash
   npm run pi-proxy
   ```

2. **Configure PI5 connection (if needed):**
   ```bash
   export PI5_HOST=192.168.1.100  # Replace with your PI5's IP address
   export PI5_USER=WalkerRanger    # Your PI5 username
   export PI5_SSH_PORT=22          # SSH port (default: 22)
   npm run pi-proxy
   ```

3. **For SSH key authentication:**
   ```bash
   export PI5_SSH_KEY=~/.ssh/id_rsa
   npm run pi-proxy
   ```

## Configuration Options

The proxy server uses environment variables for configuration:

- `PI5_HOST` - PI5 hostname or IP address (default: `fdc-tracker.local`)
- `PI5_USER` - SSH username (default: `WalkerRanger`)
- `PI5_SSH_PORT` - SSH port (default: `22`)
- `PI5_SSH_KEY` - Path to SSH private key (optional, for key-based auth)

## How It Works

1. The proxy server runs on `localhost:3002`
2. The app tries to connect to the proxy first
3. If the proxy is not available, it falls back to direct connection on `localhost:3001` (for when running on the PI5 itself)
4. The proxy uses SSH to execute system commands on the PI5

## Troubleshooting

### Connection Issues

**Problem:** "Connection refused" or "Host key verification failed"

**Solution:** 
- Ensure SSH is enabled on the PI5
- Test SSH connection manually: `ssh WalkerRanger@<PI5_IP>`
- If using hostname, ensure it resolves: `ping fdc-tracker.local`
- For first-time connections, you may need to manually accept the host key first

**Problem:** "Permission denied"

**Solution:**
- Ensure your SSH key is set up: `ssh-copy-id WalkerRanger@<PI5_IP>`
- Or use password authentication (requires `sshpass` package)
- Check that the user has permission to run system commands

### Finding PI5 IP Address

If you don't know the PI5's IP address:

1. **On the PI5:**
   ```bash
   hostname -I
   ```

2. **From your computer (if on same network):**
   ```bash
   nmap -sn 192.168.1.0/24 | grep -B 2 "fdc-tracker"
   ```

3. **Check router admin panel** for connected devices

### Using mDNS (Bonjour/Avahi)

If your PI5 is configured with mDNS, you can use:
- `fdc-tracker.local` (default)
- Or the hostname configured during setup

Make sure mDNS is working:
```bash
ping fdc-tracker.local
```

## Running Both Servers

If you want to run both the proxy (for remote PI5) and the direct API (for local PI5):

1. **Terminal 1 - Proxy server:**
   ```bash
   npm run pi-proxy
   ```

2. **Terminal 2 - Direct API (on PI5 only):**
   ```bash
   node pi-setup/system-info-api.cjs
   ```

The app will automatically try the proxy first, then fall back to direct connection.

