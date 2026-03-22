import type {
  AppState,
  AmmoPlatoon,
  BOC,
  Battalion,
  Brigade,
  CurrentUserRole,
  Launcher,
  POC,
  Pod,
  RSV,
  Task,
} from '../types'

export type ViewDensity = 'compact' | 'detailed'

export interface OrgForScope {
  brigades: Brigade[]
  battalions: Battalion[]
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  ammoPlatoons: AmmoPlatoon[]
}

export interface ScopedForceResult {
  viewDensity: ViewDensity
  isScoped: boolean
  scopedBOCs: BOC[]
  scopedPOCs: POC[]
  scopedLaunchers: Launcher[]
  scopedPods: Pod[]
  scopedRSVs: RSV[]
}

function pocIdsUnderBocIds(org: OrgForScope, bocIds: Set<string>): Set<string> {
  return new Set(org.pocs.filter((p) => p.bocId && bocIds.has(p.bocId)).map((p) => p.id))
}

function ammoPltIdsUnderBocIds(org: OrgForScope, bocIds: Set<string>): Set<string> {
  return new Set(
    org.ammoPlatoons.filter((ap) => ap.bocId && bocIds.has(ap.bocId)).map((ap) => ap.id)
  )
}

function bocIdsUnderBattalionIds(org: OrgForScope, battalionIds: Set<string>): Set<string> {
  return new Set(
    org.bocs.filter((b) => b.battalionId && battalionIds.has(b.battalionId)).map((b) => b.id)
  )
}

/** BOC ids whose battalion is under this brigade. */
function bocIdsUnderBrigade(org: OrgForScope, brigadeId: string): Set<string> {
  const bnIds = new Set(
    org.battalions.filter((b) => b.brigadeId === brigadeId).map((b) => b.id)
  )
  return bocIdsUnderBattalionIds(org, bnIds)
}

export function getScopedForce(org: OrgForScope, role: CurrentUserRole | undefined): ScopedForceResult {
  if (!role) {
    return {
      viewDensity: 'detailed',
      isScoped: false,
      scopedBOCs: org.bocs,
      scopedPOCs: org.pocs,
      scopedLaunchers: org.launchers,
      scopedPods: org.pods,
      scopedRSVs: org.rsvs,
    }
  }

  if (role.type === 'brigade') {
    const bnIds = new Set(
      org.battalions.filter((b) => b.brigadeId === role.id).map((b) => b.id)
    )
    const bocIds = bocIdsUnderBrigade(org, role.id)
    const pocIds = pocIdsUnderBocIds(org, bocIds)
    const ammoPltIds = ammoPltIdsUnderBocIds(org, bocIds)
    const launchers = org.launchers.filter((l) => l.pocId && pocIds.has(l.pocId))
    const launcherIds = new Set(launchers.map((l) => l.id))
    const rsvs = org.rsvs.filter(
      (r) =>
        (r.pocId && pocIds.has(r.pocId)) ||
        (r.bocId && bocIds.has(r.bocId)) ||
        (!!r.ammoPltId && ammoPltIds.has(r.ammoPltId))
    )
    const rsvIds = new Set(rsvs.map((r) => r.id))
    const pods = org.pods.filter(
      (p) =>
        (p.pocId && pocIds.has(p.pocId)) ||
        (p.launcherId && launcherIds.has(p.launcherId)) ||
        (p.rsvId && rsvIds.has(p.rsvId)) ||
        (!!p.ammoPltId && ammoPltIds.has(p.ammoPltId)) ||
        (!!p.bocId && bocIds.has(p.bocId)) ||
        (!!p.battalionId && bnIds.has(p.battalionId)) ||
        (!!p.brigadeId && p.brigadeId === role.id)
    )
    return {
      viewDensity: 'compact',
      isScoped: true,
      scopedBOCs: org.bocs.filter((b) => bocIds.has(b.id)),
      scopedPOCs: org.pocs.filter((p) => pocIds.has(p.id)),
      scopedLaunchers: launchers,
      scopedPods: pods,
      scopedRSVs: rsvs,
    }
  }

  if (role.type === 'battalion') {
    const bocIds = bocIdsUnderBattalionIds(org, new Set([role.id]))
    const pocIds = pocIdsUnderBocIds(org, bocIds)
    const ammoPltIds = ammoPltIdsUnderBocIds(org, bocIds)
    const launchers = org.launchers.filter((l) => l.pocId && pocIds.has(l.pocId))
    const launcherIds = new Set(launchers.map((l) => l.id))
    const rsvs = org.rsvs.filter(
      (r) =>
        (r.pocId && pocIds.has(r.pocId)) ||
        (r.bocId && bocIds.has(r.bocId)) ||
        (!!r.ammoPltId && ammoPltIds.has(r.ammoPltId))
    )
    const rsvIds = new Set(rsvs.map((r) => r.id))
    const pods = org.pods.filter(
      (p) =>
        (p.pocId && pocIds.has(p.pocId)) ||
        (p.launcherId && launcherIds.has(p.launcherId)) ||
        (p.rsvId && rsvIds.has(p.rsvId)) ||
        (!!p.ammoPltId && ammoPltIds.has(p.ammoPltId)) ||
        (!!p.bocId && bocIds.has(p.bocId)) ||
        p.battalionId === role.id
    )
    return {
      viewDensity: 'compact',
      isScoped: true,
      scopedBOCs: org.bocs.filter((b) => bocIds.has(b.id)),
      scopedPOCs: org.pocs.filter((p) => pocIds.has(p.id)),
      scopedLaunchers: launchers,
      scopedPods: pods,
      scopedRSVs: rsvs,
    }
  }

  if (role.type === 'poc') {
    const pid = role.id
    const plaunchers = org.launchers.filter((l) => l.pocId === pid)
    const plauncherIds = new Set(plaunchers.map((l) => l.id))
    const pocRow = org.pocs.find((p) => p.id === pid)
    const parentBocIdSet = new Set(
      pocRow?.bocId ? [pocRow.bocId] : ([] as string[])
    )
    const ammoPltIds = ammoPltIdsUnderBocIds(org, parentBocIdSet)
    const prsvs = org.rsvs.filter(
      (r) =>
        r.pocId === pid ||
        (!!pocRow?.bocId && r.bocId === pocRow.bocId) ||
        (!!r.ammoPltId && ammoPltIds.has(r.ammoPltId))
    )
    const prsvIds = new Set(prsvs.map((r) => r.id))
    const ppods = org.pods.filter(
      (p) =>
        p.pocId === pid ||
        (p.launcherId && plauncherIds.has(p.launcherId)) ||
        (p.rsvId && prsvIds.has(p.rsvId)) ||
        (!!p.ammoPltId && ammoPltIds.has(p.ammoPltId))
    )
    const ppoc = org.pocs.filter((p) => p.id === pid)
    const parentBocIds = new Set(ppoc.map((p) => p.bocId).filter(Boolean) as string[])
    const scopedBocs = org.bocs.filter((b) => parentBocIds.has(b.id))

    return {
      viewDensity: 'detailed',
      isScoped: true,
      scopedBOCs: scopedBocs,
      scopedPOCs: ppoc,
      scopedLaunchers: plaunchers,
      scopedPods: ppods,
      scopedRSVs: prsvs,
    }
  }

  // BOC
  const bid = role.id
  const bpocs = org.pocs.filter((p) => p.bocId === bid)
  const bpocIds = new Set(bpocs.map((p) => p.id))
  const bAmmoPltIds = ammoPltIdsUnderBocIds(org, new Set([bid]))
  const blaunchers = org.launchers.filter((l) => l.pocId && bpocIds.has(l.pocId))
  const blauncherIds = new Set(blaunchers.map((l) => l.id))
  const brsvs = org.rsvs.filter(
    (r) =>
      r.bocId === bid ||
      (r.pocId && bpocIds.has(r.pocId)) ||
      (!!r.ammoPltId && bAmmoPltIds.has(r.ammoPltId))
  )
  const brsvIds = new Set(brsvs.map((r) => r.id))
  const bpods = org.pods.filter(
    (p) =>
      (p.pocId && bpocIds.has(p.pocId)) ||
      (p.launcherId && blauncherIds.has(p.launcherId)) ||
      (p.rsvId && brsvIds.has(p.rsvId)) ||
      (!!p.ammoPltId && bAmmoPltIds.has(p.ammoPltId)) ||
      p.bocId === bid
  )

  return {
    viewDensity: 'compact',
    isScoped: true,
    scopedBOCs: org.bocs.filter((b) => b.id === bid),
    scopedPOCs: bpocs,
    scopedLaunchers: blaunchers,
    scopedPods: bpods,
    scopedRSVs: brsvs,
  }
}

export function isLauncherInRoleScope(org: OrgForScope, role: CurrentUserRole | undefined, launcherId: string): boolean {
  const launcher = org.launchers.find((l) => l.id === launcherId)
  if (!launcher) return false
  if (!role) return true

  if (role.type === 'poc') return launcher.pocId === role.id

  if (role.type === 'boc') {
    if (!launcher.pocId) return false
    const poc = org.pocs.find((p) => p.id === launcher.pocId)
    return poc?.bocId === role.id
  }

  if (role.type === 'battalion') {
    if (!launcher.pocId) return false
    const poc = org.pocs.find((p) => p.id === launcher.pocId)
    if (!poc?.bocId) return false
    const boc = org.bocs.find((b) => b.id === poc.bocId)
    return boc?.battalionId === role.id
  }

  if (role.type === 'brigade') {
    if (!launcher.pocId) return false
    const poc = org.pocs.find((p) => p.id === launcher.pocId)
    if (!poc?.bocId) return false
    const boc = org.bocs.find((b) => b.id === poc.bocId)
    if (!boc?.battalionId) return false
    const bn = org.battalions.find((b) => b.id === boc.battalionId)
    return bn?.brigadeId === role.id
  }

  return false
}

export function isPocInRoleScope(org: OrgForScope, role: CurrentUserRole | undefined, pocId: string): boolean {
  const poc = org.pocs.find((p) => p.id === pocId)
  if (!poc) return false
  if (!role) return true

  if (role.type === 'poc') return poc.id === role.id

  if (role.type === 'boc') return poc.bocId === role.id

  if (role.type === 'battalion') {
    if (!poc.bocId) return false
    const boc = org.bocs.find((b) => b.id === poc.bocId)
    return boc?.battalionId === role.id
  }

  if (role.type === 'brigade') {
    if (!poc.bocId) return false
    const boc = org.bocs.find((b) => b.id === poc.bocId)
    if (!boc?.battalionId) return false
    const bn = org.battalions.find((b) => b.id === boc.battalionId)
    return bn?.brigadeId === role.id
  }

  return false
}

export function isTaskInRoleScope(org: OrgForScope, role: CurrentUserRole | undefined, task: Task): boolean {
  if (!role) return true
  if (task.pocIds?.length) {
    return task.pocIds.every((pid) => isPocInRoleScope(org, role, pid))
  }
  if (task.launcherIds?.length) {
    return task.launcherIds.every((lid) => isLauncherInRoleScope(org, role, lid))
  }
  return true
}

export function orgSliceFromState(state: {
  brigades: Brigade[]
  battalions: Battalion[]
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  ammoPlatoons?: AmmoPlatoon[]
}): OrgForScope {
  return {
    brigades: state.brigades,
    battalions: state.battalions,
    bocs: state.bocs,
    pocs: state.pocs,
    launchers: state.launchers,
    pods: state.pods,
    rsvs: state.rsvs,
    ammoPlatoons: state.ammoPlatoons ?? [],
  }
}

/** True if the brigade / battalion / BOC / PLT (POC) for the view role still exists in this org. */
export function viewRoleReferencedUnitExists(state: AppState, role: CurrentUserRole): boolean {
  const { type, id } = role
  return type === 'brigade'
    ? state.brigades.some((b) => b.id === id)
    : type === 'battalion'
      ? state.battalions.some((b) => b.id === id)
      : type === 'boc'
        ? state.bocs.some((b) => b.id === id)
        : state.pocs.some((p) => p.id === id)
}

/**
 * After applying a remote snapshot, keep this device’s view role when that unit still exists.
 * Peer pushes should omit `currentUserRole` (serializeStateForPeerSync); legacy snapshots may still include it.
 */
export function mergePreservedViewRoleAfterSync(
  snapshot: AppState,
  preserved: CurrentUserRole | undefined
): AppState {
  if (!preserved) return snapshot
  if (!viewRoleReferencedUnitExists(snapshot, preserved)) return snapshot
  return { ...snapshot, currentUserRole: preserved }
}
