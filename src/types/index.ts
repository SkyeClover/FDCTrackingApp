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
  /** PLT FDC holding area (on hand for the platoon, not on a launcher or RSV). */
  pocId?: string
  rsvId?: string
  ammoPltId?: string
  /** Battery-level pool (not yet issued to a PLT). */
  bocId?: string
  /** Battalion ammunition holding. */
  battalionId?: string
  /** Brigade ammunition holding. */
  brigadeId?: string
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
  // DA Form 7232 fields
  targetNumber?: string // (a) Target Number
  grid?: string // (b/c) Grid (combined Easting/Northing)
  unitAssigned?: string // (d) Unit Assigned
  timeOfReceipt?: Date // (e) Time of Receipt
  numberOfRoundsToFire?: number // (f) Number of Rounds to Fire
  ammoTypeToFire?: string // (g) Ammo Type to Fire
  methodOfControl?: string // (h) Method of Control
  totTime?: string // (h) TOT Time
  timeMsnSent?: Date // (i) Time Mission Sent
  missionStatus?: string // (j) Mission Status
  timeMfrReceived?: Date // (k) Time MFR Received
  numberOfRoundsFired?: number // (l) Number of Rounds Fired
  remarks?: string // (m) Remarks
  // Legacy fields for backwards compatibility
  target?: string // Target/Recipient (legacy)
  canceled?: boolean // Whether the fire mission was canceled
  completedTime?: Date // When the fire mission was completed (for stats)
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  duration: number // in seconds
  type: 'reload' | 'fire' | 'maintenance' | 'jumping' | 'custom'
}

export interface Brigade {
  id: string
  name: string
}

export interface Battalion {
  id: string
  name: string
  brigadeId?: string
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
  /** Optional higher-echelon link (battalion the battery belongs to). */
  battalionId?: string
}

/** Logistics-only platoon: holds pods/RSVs under a battery; no launchers / no firing. */
export interface AmmoPlatoon {
  id: string
  name: string
  bocId?: string
}

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
}

/** View / acting-as role. Echelon: Brigade → Battalion → BOC → POC (highest → lowest). */
export interface CurrentUserRole {
  type: 'brigade' | 'battalion' | 'boc' | 'poc'
  id: string
  name: string
}

export interface AppState {
  brigades: Brigade[]
  battalions: Battalion[]
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
  /** @deprecated Legacy single-platoon battery link; use ammoPlatoons[].bocId. Kept for migration. */
  ammoPltBocId?: string
  ammoPlatoons: AmmoPlatoon[]
}
