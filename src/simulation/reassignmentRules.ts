/**
 * Layer A — deterministic survivor / reassignment policy (shared concept with fdc-simulator scenarios).
 */

export interface SurvivorGroupInput {
  id: string
  sourceUnitIds: string[]
  currentLocation?: string
}

export interface ReassignmentCandidate {
  unitId: string
  kind: 'poc' | 'boc' | 'battalion' | 'brigade'
  mgrs?: string
}

/**
 * Implements suggest reassignment target for this module.
 */
export function suggestReassignmentTarget(input: {
  survivorGroup: SurvivorGroupInput
  candidates: ReassignmentCandidate[]
}): { targetUnitId: string; reason: string } | null {
  const { candidates } = input
  if (!candidates?.length) return null
  const poc = candidates.find((c) => c.kind === 'poc')
  if (poc) return { targetUnitId: poc.unitId, reason: 'rules.nearest_poc_placeholder' }
  const boc = candidates.find((c) => c.kind === 'boc')
  if (boc) return { targetUnitId: boc.unitId, reason: 'rules.fallback_boc' }
  return { targetUnitId: candidates[0].unitId, reason: 'rules.first_candidate' }
}
