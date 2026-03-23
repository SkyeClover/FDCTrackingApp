---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Desktop (please complete the following information):**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Smartphone (please complete the following information):**
 - Device: [e.g. iPhone6]
 - OS: [e.g. iOS8.1]
 - Browser [e.g. stock browser, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.

<!-- APP_ALIGNMENT_START -->
## Application Alignment (2026-03-23)

This document is aligned to the active **FDC Tracking App (Walker Track)** implementation for `.github/ISSUE_TEMPLATE/bug_report.md`.

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
