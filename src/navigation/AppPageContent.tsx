import type { Page } from './routes'
import Dashboard from '../pages/Dashboard'
import Inventory from '../pages/Inventory'
import Management from '../pages/Management'
import Logs from '../pages/Logs'
import Settings from '../pages/Settings'
import FireMissions from '../pages/FireMissions'
import SystemInfo from '../pages/SystemInfo'
import Network from '../pages/Network'

export interface AppPageContentProps {
  currentPage: Page
}

export default function AppPageContent({ currentPage }: AppPageContentProps) {
  switch (currentPage) {
    case 'dashboard':
      return <Dashboard />
    case 'inventory':
      return <Inventory />
    case 'management':
      return <Management />
    case 'fire-missions':
      return <FireMissions />
    case 'logs':
      return <Logs />
    case 'settings':
      return <Settings />
    case 'system-info':
      return <SystemInfo />
    case 'network':
      return <Network />
    default:
      return null
  }
}
