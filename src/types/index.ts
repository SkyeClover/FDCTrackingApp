export type RoundType = string // Allow any string for custom round types

export interface RoundTypeConfig {
  name: string
  enabled: boolean
}

export interface Round {
  id: string
  type: RoundType
  status: 'available' | 'used' | 'reserved'
}

export interface Pod {
  id: string
  uuid: string // Unique identifier for accurate round tracking
  name: string
  rounds: Round[]
  launcherId?: string
  pocId?: string // POC that owns this pod (for "POCs On Ground" tracking)
  rsvId?: string // RSV (Reload Supply Vehicle) that carries this pod
  ammoPltId?: string // Assigned to Ammo PLT
}

export interface RSV {
  id: string
  name: string
  pocId?: string // Assigned to POC
  bocId?: string // Assigned to BOC (Battery level slants)
  ammoPltId?: string // Assigned to Ammo PLT
}

export interface Launcher {
  id: string
  name: string
  podId?: string
  pocId?: string
  currentTask?: Task
  status: 'idle' | 'active' | 'maintenance'
  lastIdleTime?: Date // When launcher became idle (for standby tracking)
}

export interface Task {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  progress: number
  startTime?: Date
  duration?: number // in seconds
  launcherIds?: string[]
  pocIds?: string[] // POC-level task assignments (affects all launchers in POC)
  templateId?: string // Reference to task template
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  duration: number // in seconds
  type: 'reload' | 'fire' | 'maintenance' | 'jumping' | 'custom'
}

export interface POC {
  id: string
  name: string
  launchers: Launcher[]
  bocId?: string
}

export interface BOC {
  id: string
  name: string
  pocs: POC[]
}

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
}

export interface CurrentUserRole {
  type: 'boc' | 'poc'
  id: string
  name: string
}

export interface AppState {
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  rounds: Round[]
  tasks: Task[]
  taskTemplates: TaskTemplate[]
  logs: LogEntry[]
  roundTypes: Record<string, RoundTypeConfig> // Map of round type name to config
  version: string
  lastSaved?: Date
  currentUserRole?: CurrentUserRole
  hasSeenFirstTimeGuide?: boolean // Track if user has seen the first-time guide
}
