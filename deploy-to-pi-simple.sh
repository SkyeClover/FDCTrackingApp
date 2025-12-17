#!/bin/bash

# Simple deployment script using SSH with password
# Usage: ./deploy-to-pi-simple.sh [PI_IP_OR_HOSTNAME]

set -e

PI_HOST="${1:-fdc-tracker.local}"
PI_USER="walker-ranger"
PI_PASS="58559"
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================="
echo "Deploying FDC Tracking App to Pi"
echo "=========================================="
echo ""
echo "Target: $PI_USER@$PI_HOST"
echo ""

# Build the app first
echo "Building the app..."
cd "$APP_DIR"
npm run build

# Transfer files using rsync (will prompt for password)
echo ""
echo "Transferring files to Pi..."
echo "You will be prompted for the password: $PI_PASS"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.vercel' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    --exclude 'dist' \
    "$APP_DIR/" "$PI_USER@$PI_HOST:~/FDCTrackingApp/"

# Transfer dist folder separately
echo ""
echo "Transferring built files..."
rsync -avz --progress \
    "$APP_DIR/dist/" "$PI_USER@$PI_HOST:~/FDCTrackingApp/dist/"

# Run update commands on Pi
echo ""
echo "Running update commands on Pi..."
echo "You will be prompted for the password again"
ssh "$PI_USER@$PI_HOST" << 'ENDSSH'
cd ~/FDCTrackingApp
npm install
npm run build
sudo systemctl restart fdc-tracker.service
ENDSSH

# Reboot
echo ""
echo "Rebooting the Pi..."
ssh "$PI_USER@$PI_HOST" "sudo reboot"

echo ""
echo "=========================================="
echo "Deployment complete! Pi is rebooting..."
echo "=========================================="

