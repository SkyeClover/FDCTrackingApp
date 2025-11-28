# FDC Tracker

A modern web application for tracking rounds, pods, and launchers. Designed for AFATDS Operators to manage ammunition tracking and report generation.

## Features

- **Dashboard**: Overview of all assets (BOCs, POCs, Launchers, Pods) with quick stats
- **Inventory**: Create and manage BOCs, POCs, Launchers, Pods, and Rounds
- **Management Panel**: Assign Pods to Launchers, Launchers to POCs, POCs to BOCs, and Tasks to Launchers
- **Logs**: Monitor all system activity and changes
- **Settings/Help**: Get started guide and terminology reference

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
FDCTrackingApp/
├── src/
│   ├── components/     # Reusable components (Sidebar, etc.)
│   ├── context/        # React context for app state
│   ├── pages/          # Page components (Dashboard, Inventory, etc.)
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Usage

1. **First Time Setup**: When you first open the app, you'll see a "Nothing to see here!" message on the Dashboard.

2. **Create Inventory**: Go to the Inventory page and start creating:
   - BOCs (Battery Operations Center)
   - POCs (Point of Control)
   - Launchers
   - Pods (with specified number of rounds)

3. **Manage Assignments**: Use the Management panel to:
   - Assign Pods to Launchers
   - Assign Launchers to POCs
   - Assign POCs to BOCs
   - Create and assign Tasks to Launchers

4. **Monitor Activity**: Check the Logs page to see all system activity and changes.

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Lucide React**: Icon library

## Version

1.0.0

