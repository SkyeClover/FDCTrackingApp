import type { AmmoPlatoon, AppState } from '../types'
import { LEGACY_AMMO_PLT_ID } from '../constants/ammoPlatoon'

function migrateAmmoPlatoons(base: AppState): AmmoPlatoon[] {
  const existing = base.ammoPlatoons
  if (Array.isArray(existing) && existing.length > 0) return existing

  const ids = new Set<string>()
  for (const p of base.pods ?? []) {
    if (p.ammoPltId) ids.add(p.ammoPltId)
  }
  for (const r of base.rsvs ?? []) {
    if (r.ammoPltId) ids.add(r.ammoPltId)
  }
  if (ids.size === 0 && base.ammoPltBocId) {
    ids.add(LEGACY_AMMO_PLT_ID)
  }
  if (ids.size === 0) return []

  return [...ids]
    .sort()
    .map((id) => ({
      id,
      name: id === LEGACY_AMMO_PLT_ID ? 'Ammo PLT' : `Ammo PLT (${id})`,
      bocId: id === LEGACY_AMMO_PLT_ID ? base.ammoPltBocId : undefined,
    }))
}

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
  const withLaunchers = { ...initialState, launchers: cleanedLaunchers }
  return {
    ...withLaunchers,
    ammoPlatoons: migrateAmmoPlatoons(withLaunchers),
  }
}
