# FDC Simulator

Standalone WebSocket server for live exercise / training. It is **not** part of the Vite app bundle.

## Setup

```bash
cd fdc-simulator
npm install
npm start
```

Default URL: `ws://127.0.0.1:8765`  
Override port: `FDC_SIM_PORT=9000 npm start`

## Protocol

Matches `src/simulation/contracts.ts` in the FDCTrackingApp repo:

- `client.hello` — first bind; `client.rebind` — org/scenario/station id changed while connected
- `control.state` — **full merged map** of all scopes (multi-station handoffs)
- `server.ping` / `client.pong` / `server.pong` — keepalive
- `operator.command` — `take_control` / `release_control` (scope = `poc:…`, `boc:…`, etc.)
- `server.rebound` — ack after `client.rebind`

## Rules engine

Port or call policies from the app’s `src/simulation/reassignmentRules.ts` when you add scenario scripts here; keep behavior aligned across repos.

<!-- APP_ALIGNMENT_START -->
## Application Alignment (2026-03-23)

This document is aligned to the active **FDC Tracking App (Walker Track)** implementation for `fdc-simulator/README.md`.

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
