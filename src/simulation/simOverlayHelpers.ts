import type { SimulationOverlay, SimDestructionLevel, SimUnitState } from '../types'

/**
 * Implements entity ref poc for this module.
 */
export function entityRefPoc(id: string): string {
  return `poc:${id}`
}

/**
 * Implements entity ref boc for this module.
 */
export function entityRefBoc(id: string): string {
  return `boc:${id}`
}

/**
 * Implements entity ref launcher for this module.
 */
export function entityRefLauncher(id: string): string {
  return `launcher:${id}`
}

/**
 * Returns sim unit state for downstream consumers.
 */
export function getSimUnitState(
  overlay: SimulationOverlay | undefined,
  entityRef: string
): SimUnitState | undefined {
  return overlay?.unitStates.find((u) => u.entityRef === entityRef)
}

/**
 * Implements destruction level of for this module.
 */
export function destructionLevelOf(
  overlay: SimulationOverlay | undefined,
  entityRef: string
): SimDestructionLevel {
  return getSimUnitState(overlay, entityRef)?.destructionLevel ?? 'intact'
}

/**
 * Implements survivor groups for poc for this module.
 */
export function survivorGroupsForPoc(overlay: SimulationOverlay | undefined, pocId: string): number {
  if (!overlay?.survivorGroups.length) return 0
  const pref = entityRefPoc(pocId)
  return overlay.survivorGroups.filter(
    (g) =>
      g.proposedTargetUnitId === pocId ||
      g.sourceUnitIds.some((s) => s === pref || s === pocId)
  ).length
}
