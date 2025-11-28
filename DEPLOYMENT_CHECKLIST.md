# Deployment Checklist

Use this checklist when deploying to Vercel:

## Pre-Deployment

- [ ] All code changes committed to git
- [ ] Code pushed to GitHub (`git push origin main`)
- [ ] `vercel.json` exists in project root
- [ ] `src/components/PasswordProtection.tsx` exists
- [ ] `.gitignore` includes `.env` files
- [ ] Tested locally with password protection

## Vercel Setup

- [ ] Created/Logged into Vercel account
- [ ] Imported GitHub repository `SkyeClover/FDCTrackingApp`
- [ ] Verified build settings (auto-detected Vite)
- [ ] **Added environment variable**: `VITE_AUTH_USERNAME` (all environments)
- [ ] **Added environment variable**: `VITE_AUTH_PASSWORD` (all environments)
- [ ] Clicked "Deploy"

## Post-Deployment

- [ ] Deployment completed successfully
- [ ] Tested login screen appears at deployment URL
- [ ] Tested login with credentials works
- [ ] Tested in incognito/private browser window
- [ ] Shared URL and credentials with friends

## Future Updates

- [ ] Made changes locally
- [ ] Committed and pushed to GitHub
- [ ] Verified auto-deployment triggered
- [ ] Tested updated version works

---

**Quick Commands:**
```bash
# Check git status
git status

# Commit and push
git add .
git commit -m "Your message"
git push origin main
```

**Environment Variables to Set in Vercel:**
- `VITE_AUTH_USERNAME` = (your username)
- `VITE_AUTH_PASSWORD` = (your password)

