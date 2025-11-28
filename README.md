# FDC Tracker

A modern web application for tracking rounds, pods, and launchers. Designed for AFATDS Operators to manage ammunition tracking and report generation.

## Features

- **Dashboard**: Overview of all assets (BOCs, POCs, Launchers, Pods, RSVs, Ammo PLT) with quick stats
- **Inventory**: Create and manage BOCs, POCs, Launchers, Pods, RSVs, and Rounds
- **Management Panel**: 
  - Assign Pods to Launchers and RSVs
  - Assign RSVs to POCs, BOCs, or Ammo PLT
  - Assign Launchers to POCs
  - Assign POCs to BOCs
  - Create and assign Tasks to Launchers or POCs
- **Logs**: Monitor all system activity and changes
- **Settings/Help**: Get started guide and terminology reference
- **User Role Selection**: Set current user role (BOC or POC) for role-based views

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
│   │   ├── AmmoPltCard.tsx          # Ammo PLT card component
│   │   ├── AmmoPltDetailModal.tsx   # Ammo PLT detail modal
│   │   ├── DashboardHeader.tsx      # Dashboard header
│   │   ├── FireMissionModal.tsx     # Fire mission modal
│   │   ├── LauncherCard.tsx         # Launcher card component
│   │   ├── POCCard.tsx              # POC card component
│   │   ├── POCDetailModal.tsx       # POC detail modal
│   │   ├── PodsManagement.tsx       # Pods management component
│   │   ├── PodsToRSVAssignment.tsx  # Pod to RSV assignment
│   │   ├── ReloadModal.tsx          # Reload modal
│   │   ├── ReportModal.tsx          # Report modal
│   │   ├── RSVsManagement.tsx       # RSVs management component
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   └── StartupRoleModal.tsx     # User role selection modal
│   ├── context/        # React context for app state
│   │   ├── AppDataContext.tsx       # Main application context
│   │   └── ProgressContext.tsx      # Progress tracking context
│   ├── pages/          # Page components
│   │   ├── Dashboard.tsx            # Main dashboard
│   │   ├── Inventory.tsx            # Inventory management
│   │   ├── Logs.tsx                 # System logs
│   │   ├── Management.tsx           # Management panel
│   │   └── Settings.tsx             # Settings and help
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
   - RSVs (Reload Supply Vehicles)
   - Configure round types

3. **Manage Assignments**: Use the Management panel to:
   - Assign Pods to Launchers or RSVs
   - Assign RSVs to POCs, BOCs, or Ammo PLT
   - Assign Launchers to POCs
   - Assign POCs to BOCs
   - Create and assign Tasks to Launchers or POCs (POC-level tasks affect all launchers in the POC)

4. **Monitor Activity**: Check the Logs page to see all system activity and changes.

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Lucide React**: Icon library

## Key Concepts

### Organizational Units
- **BOC**: Battery Operations Center (FDC) - Top-level command unit
- **POC**: PLT Operations Center (PLT FDC) - Platoon-level command unit
- **Ammo PLT**: Ammunition Platoon - Manages ammunition supply

### Assets
- **Launcher**: Artillery launcher system
- **Pod**: Container for rounds
- **RSV**: Reload Supply Vehicle - Vehicle that carries pods
- **Round**: Individual ammunition unit

### Round Types
- Configurable round types (default: M28A1, M26, M31, M30)
- Custom round types can be added and enabled/disabled

## Version

1.0.0

