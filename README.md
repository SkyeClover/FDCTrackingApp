# FDC Tracker

A modern web application for tracking rounds, pods, and launchers. Designed for AFATDS Operators to manage ammunition tracking and report generation.

## Features

- **Dashboard**: 
  - Overview of all assets (BOCs, POCs, Launchers, Pods) with quick stats
  - Fire Mission initiation
  - Report generation
  - Data export/import
  - POC detail views
  - Launcher reload functionality
- **Inventory**: Create and manage BOCs, POCs, Launchers, Pods, and Rounds
- **Management Panel**: 
  - Task template creation and management
  - Assign Pods to Launchers
  - Assign Launchers to POCs (PLT Operations Center / PLT FDC)
  - Assign POCs to BOCs (Battery Operations Center / FDC)
  - Start tasks on launchers with real-time progress tracking
- **Logs**: Monitor all system activity and changes with timestamped entries
- **Settings/Help**: Getting started guide and terminology reference

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
│   ├── components/     # Reusable UI components
│   │   ├── DashboardHeader.tsx    # Dashboard header with actions
│   │   ├── FireMissionModal.tsx   # Modal for initiating fire missions
│   │   ├── LauncherCard.tsx       # Card component for launchers
│   │   ├── POCCard.tsx            # Card component for POCs
│   │   ├── POCDetailModal.tsx     # Modal for POC details
│   │   ├── ReloadModal.tsx        # Modal for reloading launchers
│   │   ├── ReportModal.tsx        # Modal for generating reports
│   │   └── Sidebar.tsx            # Navigation sidebar
│   ├── context/        # React context for app state
│   │   ├── AppDataContext.tsx     # Main application data context
│   │   └── ProgressContext.tsx    # Task progress tracking context
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── Inventory.tsx          # Inventory management
│   │   ├── Logs.tsx               # System activity logs
│   │   ├── Management.tsx         # Management panel
│   │   └── Settings.tsx           # Settings and help
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── constants/      # Application constants
│   │   └── roundTypes.ts
│   ├── utils/          # Utility functions
│   │   └── saveLoad.ts
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
   - POCs (PLT Operations Center / PLT FDC)
   - Launchers
   - Pods (with specified number of rounds)

3. **Manage Assignments**: Use the Management panel to:
   - Create task templates (Reload, Fire, Maintenance, Custom)
   - Assign Pods to Launchers
   - Assign Launchers to POCs (PLT Operations Center / PLT FDC)
   - Assign POCs to BOCs (Battery Operations Center / FDC)
   - Start tasks on launchers from templates

4. **Operate**: Use the Dashboard to:
   - Initiate fire missions with multiple launchers
   - Reload launchers with pod selection
   - View detailed POC information
   - Generate reports
   - Export/import data

5. **Monitor Activity**: Check the Logs page to see all system activity and changes.

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Lucide React**: Icon library

## Key Features

### Task System
- **Task Templates**: Create reusable task definitions with customizable durations
- **Task Types**: Reload, Fire, Maintenance, and Custom tasks
- **Real-time Progress**: Visual progress bars with 500ms update intervals
- **Fire Missions**: Multi-launcher fire missions with configurable rounds per launcher

### Data Management
- **Auto-save**: Automatic saving to browser local storage (500ms debounce)
- **Export/Import**: JSON file-based data backup and restore
- **Data Versioning**: Version tracking for app state

### Performance
- Memoized components for optimized rendering
- Separate progress context to minimize re-renders
- Efficient state management with React Context

## Terminology

- **BOC**: Battery Operations Center (FDC)
- **POC**: PLT Operations Center (PLT FDC)
- **Launcher**: Artillery launcher system
- **Pod**: Container for rounds
- **Round**: Individual ammunition unit (M28A1, M26, M31, M30)

## Version

1.0.0

