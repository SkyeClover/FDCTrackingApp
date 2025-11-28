import { AppState, BOC, POC, Launcher, Pod, Round, Task, TaskTemplate, LogEntry } from '../types'

const STORAGE_KEY = 'fdc-tracker-state'
const APP_VERSION = '1.0.0'

// Convert Date objects to ISO strings for JSON serialization
function serializeState(state: AppState): string {
  const serialized = {
    ...state,
    tasks: state.tasks.map((task) => ({
      ...task,
      startTime: task.startTime ? task.startTime.toISOString() : undefined,
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
function deserializeState(json: string): AppState {
  const parsed = JSON.parse(json)
  return {
    ...parsed,
    tasks: parsed.tasks.map((task: any) => ({
      ...task,
      startTime: task.startTime ? new Date(task.startTime) : undefined,
    })),
    logs: parsed.logs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    })),
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
    bocs: [],
    pocs: [],
    launchers: [],
    pods: [],
    rounds: [],
    tasks: [],
    taskTemplates: [
      {
        id: 'reload-default',
        name: 'Reload',
        description: 'Reload launcher with fresh rounds',
        duration: 120, // 2 minutes
        type: 'reload',
      },
      {
        id: 'fire-default',
        name: 'Fire Mission',
        description: 'Execute fire mission',
        duration: 168, // 2:48
        type: 'fire',
      },
      {
        id: 'maintenance-default',
        name: 'Maintenance',
        description: 'Perform maintenance on launcher',
        duration: 300, // 5 minutes
        type: 'maintenance',
      },
    ],
    logs: [],
    version: APP_VERSION,
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}

