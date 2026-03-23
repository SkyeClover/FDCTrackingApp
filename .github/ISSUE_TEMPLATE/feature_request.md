---
name: Feature request
about: Suggest an idea for this project
title: ''
labels: ''
assignees: ''

---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

<!-- APP_ALIGNMENT_START -->
## Application Alignment (2026-03-23)

This document is aligned to the active **FDC Tracking App (Walker Track)** implementation for `.github/ISSUE_TEMPLATE/feature_request.md`.

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
