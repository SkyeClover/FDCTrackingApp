import type { AppState } from '../types'

/** Normalize arrays and launcher↔task consistency after load/import. */
export function normalizeLoadedAppState(base: AppState): AppState {
  const initialState: AppState = {
    ...base,
    rsvs: base.rsvs ?? [],
    brigades: base.brigades ?? [],
    battalions: base.battalions ?? [],
  }
  const cleanedLaunchers = initialState.launchers.map((l) => {
    if (l.currentTask) {
      const task = initialState.tasks.find((t) => t.id === l.currentTask?.id)
      if (!task || task.status === 'completed') {
        return {
          ...l,
          status: 'idle' as const,
          currentTask: undefined,
          lastIdleTime: l.lastIdleTime || new Date(),
        }
      }
    }
    return l
  })
  return {
    ...initialState,
    launchers: cleanedLaunchers,
  }
}
