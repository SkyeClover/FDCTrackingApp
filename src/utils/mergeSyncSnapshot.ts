import type { AppState, Launcher, Pod, Task } from '../types'
import { listNetworkRoster } from '../persistence/sqlite'
import { normalizePeerUnitId } from '../lib/syncAlertStyle'
import { parseEchelonRole } from '../components/network/echelonRoleUi'

function taskInScope(t: Task, pocIds: Set<string>, launcherIds: Set<string>): boolean {
  if (t.pocIds?.some((id) => pocIds.has(id))) return true
  if (t.launcherIds?.some((id) => launcherIds.has(id))) return true
  return false
}

function podInBatteryScope(
  pod: Pod,
  pocIds: Set<string>,
  launcherIds: Set<string>,
  rsvIds: Set<string>,
  ammoPltIds: Set<string>
): boolean {
  if (pod.launcherId && launcherIds.has(pod.launcherId)) return true
  if (pod.pocId && pocIds.has(pod.pocId)) return true
  if (pod.rsvId && rsvIds.has(pod.rsvId)) return true
  if (pod.ammoPltId && ammoPltIds.has(pod.ammoPltId)) return true
  return false
}

/**
 * Local org is authoritative for which POC owns a launcher. Ignore remote rows that would move or overwrite
 * another PLT’s launchers (e.g. A10 snapshot wrongly including A20’s A12).
 */
function remoteLauncherAllowedForBocMerge(
  local: AppState,
  remoteL: Launcher,
  bocId: string,
  remotePocIdsInBattery: Set<string>
): boolean {
  if (!remoteL.pocId || !remotePocIdsInBattery.has(remoteL.pocId)) return false
  const assignPoc = local.pocs.find((p) => p.id === remoteL.pocId)
  if (!assignPoc || assignPoc.bocId !== bocId) return false

  const existing = local.launchers.find((l) => l.id === remoteL.id)
  if (!existing) return true
  if (!existing.pocId) return remoteL.pocId === assignPoc.id
  const existingPoc = local.pocs.find((p) => p.id === existing.pocId)
  if (existingPoc?.bocId !== bocId) return false
  return existing.pocId === remoteL.pocId
}

function remoteLauncherAllowedForPocMerge(local: AppState, remoteL: Launcher, mergePocId: string): boolean {
  if (remoteL.pocId !== mergePocId) return false
  const assignPoc = local.pocs.find((p) => p.id === mergePocId)
  if (!assignPoc) return false

  const existing = local.launchers.find((l) => l.id === remoteL.id)
  if (!existing) return true
  if (!existing.pocId) return true
  return existing.pocId === mergePocId
}

/**
 * Merges operational data for one battery (`bocId`) from `remote` into `local`, leaving all other BOCs unchanged.
 * Launchers are applied only when local org assigns them to a POC under this battery and `pocId` matches remote.
 */
export function mergeAppStateByBocId(local: AppState, remote: AppState, bocId: string): AppState {
  const remotePocs = remote.pocs.filter((p) => p.bocId === bocId)
  const remotePocIds = new Set(remotePocs.map((p) => p.id))

  const oldLocalPocIds = new Set(local.pocs.filter((p) => p.bocId === bocId).map((p) => p.id))
  const oldLocalLaunchers = local.launchers.filter((l) => l.pocId && oldLocalPocIds.has(l.pocId))
  const oldLauncherIds = new Set(oldLocalLaunchers.map((l) => l.id))
  const oldAmmo = local.ammoPlatoons.filter((a) => a.bocId === bocId)
  const oldAmmoIds = new Set(oldAmmo.map((a) => a.id))
  const oldRsvs = local.rsvs.filter(
    (r) => r.bocId === bocId || (r.pocId != null && oldLocalPocIds.has(r.pocId))
  )
  const oldRsvIds = new Set(oldRsvs.map((r) => r.id))

  const remoteLaunchers = remote.launchers.filter((l) =>
    remoteLauncherAllowedForBocMerge(local, l, bocId, remotePocIds)
  )
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const remoteAmmo = remote.ammoPlatoons.filter((a) => a.bocId === bocId)
  const ammoIds = new Set(remoteAmmo.map((a) => a.id))

  const remoteRsvs = remote.rsvs.filter(
    (r) => r.bocId === bocId || (r.pocId != null && remotePocIds.has(r.pocId))
  )
  const rsvIds = new Set(remoteRsvs.map((r) => r.id))

  const mergedPocIds = new Set(remotePocs.map((p) => p.id))
  const remotePods = remote.pods.filter((p) =>
    podInBatteryScope(p, mergedPocIds, launcherIds, rsvIds, ammoIds)
  )

  const mergedPocs = [...local.pocs.filter((p) => p.bocId !== bocId), ...remotePocs]

  const mergedLaunchers = [
    ...local.launchers.filter((l) => !(l.pocId && oldLocalPocIds.has(l.pocId))),
    ...remoteLaunchers,
  ]

  const mergedAmmo = [...local.ammoPlatoons.filter((a) => a.bocId !== bocId), ...remoteAmmo]

  const mergedRsvs = [
    ...local.rsvs.filter((r) => !(r.bocId === bocId || (r.pocId != null && oldLocalPocIds.has(r.pocId)))),
    ...remoteRsvs,
  ]

  const mergedPods = [
    ...local.pods.filter(
      (p) =>
        !podInBatteryScope(p, oldLocalPocIds, oldLauncherIds, oldRsvIds, oldAmmoIds)
    ),
    ...remotePods,
  ]

  const mergedTasks = [
    ...local.tasks.filter((t) => !taskInScope(t, oldLocalPocIds, oldLauncherIds)),
    ...remote.tasks.filter((t) => taskInScope(t, mergedPocIds, launcherIds)),
  ]

  const remoteBoc = remote.bocs.find((b) => b.id === bocId)
  const mergedBocs = local.bocs.map((b) => (b.id === bocId && remoteBoc ? remoteBoc : b))

  let ammoPltBocId = local.ammoPltBocId
  if (local.ammoPltBocId === bocId) {
    ammoPltBocId = remote.ammoPltBocId
  }

  return {
    ...local,
    bocs: mergedBocs,
    pocs: mergedPocs,
    launchers: mergedLaunchers,
    pods: mergedPods,
    rsvs: mergedRsvs,
    ammoPlatoons: mergedAmmo,
    tasks: mergedTasks,
    ammoPltBocId,
  }
}

/**
 * Merges operational data for a single PLT FDC (`pocId`) from `remote` into `local`.
 * Only launchers (and their pods) that local org assigns to this POC are updated; other PLTs’ launchers are untouched.
 */
export function mergeAppStateByPocId(local: AppState, remote: AppState, pocId: string): AppState {
  const pocIds = new Set<string>([pocId])

  const oldLocalLaunchers = local.launchers.filter((l) => l.pocId === pocId)
  const oldLauncherIds = new Set(oldLocalLaunchers.map((l) => l.id))

  const oldRsvs = local.rsvs.filter((r) => r.pocId === pocId)
  const oldRsvIds = new Set(oldRsvs.map((r) => r.id))

  const oldAmmoIds = new Set<string>()

  const remotePocs = remote.pocs.filter((p) => p.id === pocId)
  const remoteLaunchers = remote.launchers.filter((l) => remoteLauncherAllowedForPocMerge(local, l, pocId))
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const remoteRsvs = remote.rsvs.filter((r) => r.pocId === pocId)
  const rsvIds = new Set(remoteRsvs.map((r) => r.id))

  const remotePods = remote.pods.filter((p) =>
    podInBatteryScope(p, pocIds, launcherIds, rsvIds, oldAmmoIds)
  )

  const mergedPocs = [...local.pocs.filter((p) => p.id !== pocId), ...remotePocs]

  const mergedLaunchers = [...local.launchers.filter((l) => l.pocId !== pocId), ...remoteLaunchers]

  const mergedRsvs = [...local.rsvs.filter((r) => r.pocId !== pocId), ...remoteRsvs]

  const mergedPods = [
    ...local.pods.filter(
      (p) => !podInBatteryScope(p, pocIds, oldLauncherIds, oldRsvIds, oldAmmoIds)
    ),
    ...remotePods,
  ]

  const mergedTasks = [
    ...local.tasks.filter((t) => !taskInScope(t, pocIds, oldLauncherIds)),
    ...remote.tasks.filter((t) => taskInScope(t, pocIds, launcherIds)),
  ]

  return {
    ...local,
    pocs: mergedPocs,
    launchers: mergedLaunchers,
    pods: mergedPods,
    rsvs: mergedRsvs,
    tasks: mergedTasks,
  }
}

/** When ingest `fromUnitId` matches a roster row’s Peer unit ID, optional merge scope applies (battery / PLT). */
export function rosterMergeScopeForFromUnitId(fromUnitId: string | null | undefined): {
  ingestMergeBocId: string | null
  ingestMergePocId: string | null
} | null {
  if (!fromUnitId?.trim()) return null
  const key = normalizePeerUnitId(fromUnitId)
  for (const r of listNetworkRoster()) {
    if (!r.peerUnitId?.trim()) continue
    if (normalizePeerUnitId(r.peerUnitId) !== key) continue
    const boc = r.ingestMergeBocId?.trim() || null
    const poc = r.ingestMergePocId?.trim() || null
    if (boc || poc) {
      return { ingestMergeBocId: boc, ingestMergePocId: poc }
    }
    // Default scope to roster role when explicit merge columns are empty.
    const role = parseEchelonRole(r.echelonRole || '')
    if (role?.type === 'boc') {
      return { ingestMergeBocId: role.id, ingestMergePocId: null }
    }
    if (role?.type === 'poc') {
      return { ingestMergeBocId: null, ingestMergePocId: role.id }
    }
    return null
  }
  return null
}
