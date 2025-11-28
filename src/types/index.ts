export type RoundType = 'M28A1' | 'M26' | 'M31' | 'M30'

export interface Round {
  id: string
  type: RoundType
  status: 'available' | 'used' | 'reserved'
}

export interface Pod {
  id: string
  name: string
  rounds: Round[]
  launcherId?: string
}

export interface Launcher {
  id: string
  name: string
  podId?: string
  pocId?: string
  currentTask?: Task
  status: 'idle' | 'active' | 'maintenance'
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
  templateId?: string // Reference to task template
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  duration: number // in seconds
  type: 'reload' | 'fire' | 'maintenance' | 'custom'
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

export interface AppState {
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rounds: Round[]
  tasks: Task[]
  taskTemplates: TaskTemplate[]
  logs: LogEntry[]
  version: string
  lastSaved?: Date
}
