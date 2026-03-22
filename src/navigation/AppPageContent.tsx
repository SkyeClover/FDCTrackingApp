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
  let pageNode: JSX.Element | null = null
  switch (currentPage) {
    case 'dashboard':
      pageNode = <Dashboard />
      break
    case 'inventory':
      pageNode = <Inventory />
      break
    case 'management':
      pageNode = <Management />
      break
    case 'fire-missions':
      pageNode = <FireMissions />
      break
    case 'logs':
      pageNode = <Logs />
      break
    case 'settings':
      pageNode = <Settings />
      break
    case 'system-info':
      pageNode = <SystemInfo />
      break
    case 'network':
      pageNode = <Network />
      break
    default:
      pageNode = null
      break
  }

  return (
    <div key={currentPage} className="app-page-transition">
      {pageNode}
    </div>
  )
}
