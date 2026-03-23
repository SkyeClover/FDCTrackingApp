import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Package,
  Settings,
  FileText,
  HelpCircle,
  Rocket,
  Cpu,
  Network,
  Map,
} from 'lucide-react'

export type Page =
  | 'dashboard'
  | 'inventory'
  | 'management'
  | 'logs'
  | 'settings'
  | 'fire-missions'
  | 'system-info'
  | 'network'
  | 'simulation'

export type NavItem = {
  id: Page
  label: string
  /** Shorter label for mobile chrome where space is tight */
  labelMobile: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelMobile: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', labelMobile: 'Inventory', icon: Package },
  { id: 'management', label: 'Management', labelMobile: 'Management', icon: Settings },
  { id: 'fire-missions', label: 'Fire Missions', labelMobile: 'Fire Missions', icon: Rocket },
  { id: 'logs', label: 'Logs', labelMobile: 'Logs', icon: FileText },
  { id: 'system-info', label: 'System Info', labelMobile: 'System Info', icon: Cpu },
  { id: 'network', label: 'Network', labelMobile: 'Network', icon: Network },
  { id: 'simulation', label: 'Simulation', labelMobile: 'Simulation', icon: Map },
  { id: 'settings', label: 'Settings / Help', labelMobile: 'Settings', icon: HelpCircle },
]
