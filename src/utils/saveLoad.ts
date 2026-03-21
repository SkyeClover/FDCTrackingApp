import { AppState } from '../types'
import { DEFAULT_ROUND_TYPES } from '../constants/roundTypes'

export const STORAGE_KEY = 'fdc-tracker-state'
/** Persisted when the user finishes first-run setup or when existing data is detected (migration). */
export const INITIAL_SETUP_KEY = 'fdc-initial-setup-done'
export const APP_VERSION = '1.1.12'

/** True if this browser has completed onboarding or already had unit data saved. */
export function readInitialSetupCompleteFromStorage(): boolean {
  if (typeof localStorage === 'undefined') return true
  if (localStorage.getItem(INITIAL_SETUP_KEY) === 'true') return true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    const n =
      ((p.brigades as unknown[] | undefined)?.length ?? 0) +
      ((p.battalions as unknown[] | undefined)?.length ?? 0) +
      ((p.bocs as unknown[] | undefined)?.length ?? 0) +
      ((p.pocs as unknown[] | undefined)?.length ?? 0) +
      ((p.launchers as unknown[] | undefined)?.length ?? 0)
    if (n > 0) {
      localStorage.setItem(INITIAL_SETUP_KEY, 'true')
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function writeInitialSetupComplete(): void {
  try {
    localStorage.setItem(INITIAL_SETUP_KEY, 'true')
  } catch {
    /* ignore */
  }
}

export function clearInitialSetupFlag(): void {
  try {
    localStorage.removeItem(INITIAL_SETUP_KEY)
  } catch {
    /* ignore */
  }
}

export function stateHasOrgEntities(state: {
  brigades: unknown[]
  battalions: unknown[]
  bocs: unknown[]
  pocs: unknown[]
  launchers: unknown[]
}): boolean {
  return (
    state.brigades.length +
      state.battalions.length +
      state.bocs.length +
      state.pocs.length +
      state.launchers.length >
    0
  )
}

// Convert Date objects to ISO strings for JSON serialization
export function serializeState(state: AppState): string {
  const serialized = {
    ...state,
    launchers: state.launchers.map((launcher) => ({
      ...launcher,
      lastIdleTime: launcher.lastIdleTime ? launcher.lastIdleTime.toISOString() : undefined,
      currentTask: launcher.currentTask ? {
        ...launcher.currentTask,
        startTime: launcher.currentTask.startTime ? launcher.currentTask.startTime.toISOString() : undefined,
      } : undefined,
    })),
    tasks: state.tasks.map((task) => ({
      ...task,
      startTime: task.startTime ? task.startTime.toISOString() : undefined,
      completedTime: task.completedTime ? task.completedTime.toISOString() : undefined,
      timeOfReceipt: task.timeOfReceipt ? task.timeOfReceipt.toISOString() : undefined,
      timeMsnSent: task.timeMsnSent ? task.timeMsnSent.toISOString() : undefined,
      timeMfrReceived: task.timeMfrReceived ? task.timeMfrReceived.toISOString() : undefined,
    })),
    logs: state.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    lastSaved: new Date().toISOString(),
  }
  return JSON.stringify(serialized, null, 2)
}

// Convert ISO strings back to Date objects
export function deserializeState(json: string): AppState {
  const parsed = JSON.parse(json)
  // Migrate pods to include UUID if missing
  const migratedPods = parsed.pods?.map((pod: any) => {
    if (!pod.uuid) {
      return {
        ...pod,
        uuid: crypto.randomUUID(),
      }
    }
    return pod
  }) || []
  
  // Migrate round types - merge with defaults if missing
  const migratedRoundTypes = parsed.roundTypes || {}
  const mergedRoundTypes = { ...DEFAULT_ROUND_TYPES, ...migratedRoundTypes }
  // Ensure all default types are present (in case new ones were added)
  Object.keys(DEFAULT_ROUND_TYPES).forEach((key) => {
    if (!mergedRoundTypes[key]) {
      mergedRoundTypes[key] = DEFAULT_ROUND_TYPES[key]
    }
  })
  
  return {
    ...parsed,
    brigades: parsed.brigades || [],
    battalions: parsed.battalions || [],
    pods: migratedPods,
    rsvs: parsed.rsvs || [], // Ensure rsvs array exists
    roundTypes: mergedRoundTypes, // Ensure roundTypes exist
    launchers: parsed.launchers?.map((launcher: any) => ({
      ...launcher,
      lastIdleTime: launcher.lastIdleTime ? new Date(launcher.lastIdleTime) : undefined,
      currentTask: launcher.currentTask ? {
        ...launcher.currentTask,
        startTime: launcher.currentTask.startTime ? new Date(launcher.currentTask.startTime) : undefined,
      } : undefined,
    })) || [],
    tasks: parsed.tasks?.map((task: any) => ({
      ...task,
      startTime: task.startTime ? new Date(task.startTime) : undefined,
      completedTime: task.completedTime ? new Date(task.completedTime) : undefined,
      timeOfReceipt: task.timeOfReceipt ? new Date(task.timeOfReceipt) : undefined,
      timeMsnSent: task.timeMsnSent ? new Date(task.timeMsnSent) : undefined,
      timeMfrReceived: task.timeMfrReceived ? new Date(task.timeMfrReceived) : undefined,
    })) || [],
    logs: parsed.logs?.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    })) || [],
    lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : undefined,
  }
}

export function saveToLocalStorage(state: AppState): void {
  try {
    const serialized = serializeState(state)
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    throw new Error('Failed to save data to browser storage')
  }
}

export function loadFromLocalStorage(): AppState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return deserializeState(stored)
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

export function exportToFile(state: AppState): void {
  try {
    const serialized = serializeState(state)
    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fdc-tracker-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export file:', error)
    throw new Error('Failed to export data to file')
  }
}

export function importFromFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const state = deserializeState(content)
        resolve(state)
      } catch (error) {
        reject(new Error('Invalid file format'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function getDefaultState(): AppState {
  return {
    brigades: [],
    battalions: [],
    bocs: [],
    pocs: [],
    launchers: [],
    pods: [],
    rsvs: [],
    rounds: [],
    tasks: [],
    taskTemplates: [
      {
        id: 'reload-default',
        name: 'Reload',
        description: 'Reload launcher with fresh rounds',
        duration: 900, // 15 minutes
        type: 'reload',
      },
      {
        id: 'fire-default',
        name: 'Fire Mission',
        description: 'Execute fire mission',
        duration: 120, // 2 minutes
        type: 'fire',
      },
      {
        id: 'maintenance-default',
        name: 'Maintenance',
        description: 'Perform maintenance on launcher',
        duration: 1800, // 30 minutes
        type: 'maintenance',
      },
      {
        id: 'jumping-default',
        name: 'Jumping',
        description: 'Jump to new location',
        duration: 2700, // 45 minutes
        type: 'jumping',
      },
    ],
    logs: [],
    roundTypes: { ...DEFAULT_ROUND_TYPES },
    version: APP_VERSION,
    currentUserRole: undefined,
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}

