# Step-by-Step Deployment Guide

This guide will walk you through deploying your FDC Tracker app to Vercel with password protection.

## Prerequisites

- ✅ GitHub repository: `https://github.com/SkyeClover/FDCTrackingApp.git`
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com) if you don't have one)

---

## Step 1: Commit and Push Your Code

Before deploying, make sure all your changes are committed and pushed to GitHub:

```bash
# Check what files have changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Add password protection and Vercel deployment configuration"

# Push to GitHub
git push origin main
```

**Important**: Make sure you've committed the following files:
- `vercel.json`
- `src/components/PasswordProtection.tsx`
- `src/App.tsx` (with password protection wrapper)
- `src/vite-env.d.ts`
- `.gitignore` (updated to exclude .env files)

---

## Step 2: Connect Your GitHub Repo to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in (or create an account if needed)

2. **Import Your Project**
   - Click the **"Add New..."** button (top right)
   - Select **"Project"**
   - You'll see a list of your GitHub repositories
   - Find and click **"Import"** next to `SkyeClover/FDCTrackingApp`

3. **Configure Project Settings**
   - **Framework Preset**: Vercel should auto-detect "Vite"
   - **Root Directory**: Leave as `./` (default)
   - **Build Command**: Should be `npm run build` (auto-detected)
   - **Output Directory**: Should be `dist` (auto-detected)
   - **Install Command**: Should be `npm install` (auto-detected)

   ⚠️ **Don't click "Deploy" yet!** We need to set up environment variables first.

---

## Step 3: Set Up Password Protection (CRITICAL)

**This step is essential for password protection to work!**

1. **Before clicking "Deploy"**, scroll down to the **"Environment Variables"** section

2. **Add Your Credentials**:
   - Click **"Add"** or **"Add Environment Variable"**
   
   **Variable 1:**
   - **Key**: `VITE_AUTH_USERNAME`
   - **Value**: Your desired username (e.g., `admin` or `fdc_user`)
   - **Environments**: Check all three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   
   - Click **"Add"** or **"Save"**
   
   **Variable 2:**
   - **Key**: `VITE_AUTH_PASSWORD`
   - **Value**: Your desired password (choose a strong password!)
   - **Environments**: Check all three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   
   - Click **"Add"** or **"Save"**

3. **Verify Your Variables**
   - You should see both variables listed:
     - `VITE_AUTH_USERNAME` (Production, Preview, Development)
     - `VITE_AUTH_PASSWORD` (Production, Preview, Development)

---

## Step 4: Deploy!

1. **Click the "Deploy" button** (bottom of the page)

2. **Wait for Deployment**
   - Vercel will:
     - Install dependencies
     - Build your app
     - Deploy to a production URL
   - This usually takes 1-3 minutes

3. **Watch the Build Logs**
   - You'll see real-time build progress
   - If there are any errors, they'll be shown here

---

## Step 5: Verify Password Protection

1. **Get Your Deployment URL**
   - After deployment completes, you'll see a success message
   - Your app will be available at: `https://your-project-name.vercel.app`
   - (The exact URL will be shown in the Vercel dashboard)

2. **Test the Login**
   - Open the URL in a new incognito/private browser window
   - You should see the login screen
   - Enter the username and password you set in Step 3
   - Click "Login"
   - You should now see your FDC Tracker app!

3. **Share with Friends**
   - Share the Vercel URL with your friends
   - Give them the username and password
   - They'll see the login screen when they visit

---

## Step 6: Future Updates

Whenever you want to update your deployed app:

1. **Make your changes locally**

2. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```

3. **Vercel will automatically redeploy!**
   - Vercel watches your GitHub repo
   - Every push to `main` triggers a new deployment
   - Your friends will see the updated version automatically

---

## Troubleshooting

### Password Protection Not Working?

1. **Check Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Make sure both `VITE_AUTH_USERNAME` and `VITE_AUTH_PASSWORD` are set
   - Make sure they're enabled for "Production"

2. **Redeploy After Adding Variables**
   - If you add environment variables after deployment, you need to redeploy
   - Go to Deployments tab → Click the three dots on latest deployment → "Redeploy"

3. **Clear Browser Cache**
   - Try opening in an incognito/private window
   - Or clear your browser's cache and cookies

### Build Errors?

1. **Check Build Logs**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the failed deployment to see error logs

2. **Common Issues**:
   - TypeScript errors: Fix unused variable warnings
   - Missing dependencies: Make sure `package.json` has all required packages
   - Environment variables: Make sure they're set correctly

### Want to Change Password?

1. **Update Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Edit `VITE_AUTH_PASSWORD` with your new password
   - Save the changes

2. **Redeploy**
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger auto-deployment

---

## Security Notes

⚠️ **Important Security Information:**

- The current password protection is **client-side only**
- This is suitable for testing and sharing with friends
- For production use with sensitive data, consider:
  - Server-side authentication
  - Vercel's built-in password protection (Pro feature)
  - More robust authentication solutions

- **Never commit your `.env` file** to GitHub
- The `.gitignore` file is already configured to exclude `.env` files

---

## Quick Reference

**Your GitHub Repo**: `https://github.com/SkyeClover/FDCTrackingApp.git`

**Default Local Credentials** (when no .env file):
- Username: `admin`
- Password: `changeme`

**Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)

**Environment Variables to Set**:
- `VITE_AUTH_USERNAME`
- `VITE_AUTH_PASSWORD`

---

## Need Help?

If you run into issues:
1. Check the Vercel deployment logs
2. Verify environment variables are set correctly
3. Make sure all files are committed and pushed to GitHub
4. Try redeploying after making changes

