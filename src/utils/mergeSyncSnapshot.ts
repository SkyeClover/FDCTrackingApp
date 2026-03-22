import type { AppState, Launcher, Pod, Task } from '../types'
import { listNetworkRoster } from '../persistence/sqlite'
import { normalizePeerUnitId } from '../lib/syncAlertStyle'
import { parseEchelonRole } from '../components/network/echelonRoleUi'

type WithId = { id: string }

function upsertById<T extends WithId>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return existing
  const existingIds = new Set(existing.map((x) => x.id))
  const incomingById = new Map(incoming.map((x) => [x.id, x]))
  const merged = existing.map((x) => incomingById.get(x.id) ?? x)
  for (const x of incoming) {
    if (!existingIds.has(x.id)) merged.push(x)
  }
  return merged
}

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
  remotePocIdsInBattery: Set<string>,
  remotePocById: Map<string, AppState['pocs'][number]>
): boolean {
  if (!remoteL.pocId || !remotePocIdsInBattery.has(remoteL.pocId)) return false
  const remoteAssignPoc = remotePocById.get(remoteL.pocId)
  if (remoteAssignPoc?.bocId && remoteAssignPoc.bocId !== bocId) return false

  const existing = local.launchers.find((l) => l.id === remoteL.id)
  if (!existing) return true
  if (!existing.pocId) return true
  return true
}

function remoteLauncherAllowedForPocMerge(local: AppState, remoteL: Launcher, mergePocId: string): boolean {
  if (remoteL.pocId !== mergePocId) return false

  const existing = local.launchers.find((l) => l.id === remoteL.id)
  if (!existing) return true
  if (!existing.pocId) return true
  return existing.pocId === mergePocId
}

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
}

function resolveRemotePocIdForMerge(local: AppState, remote: AppState, mergePocId: string): string | null {
  if (remote.pocs.some((p) => p.id === mergePocId)) return mergePocId

  const localPoc = local.pocs.find((p) => p.id === mergePocId)
  const localPocName = normalizeName(localPoc?.name)
  if (localPocName) {
    const matchByName = remote.pocs.find((p) => normalizeName(p.name) === localPocName)
    if (matchByName) return matchByName.id
  }

  if (remote.pocs.length === 1) return remote.pocs[0].id
  return null
}

function resolveRemoteBocIdForMerge(local: AppState, remote: AppState, mergeBocId: string): string | null {
  if (remote.bocs.some((b) => b.id === mergeBocId)) return mergeBocId

  const localBoc = local.bocs.find((b) => b.id === mergeBocId)
  const localBocName = normalizeName(localBoc?.name)
  if (localBocName) {
    const matchByName = remote.bocs.find((b) => normalizeName(b.name) === localBocName)
    if (matchByName) return matchByName.id
  }

  if (remote.bocs.length === 1) return remote.bocs[0].id
  return null
}

/**
 * Merges operational data for one battery (`bocId`) from `remote` into `local`, leaving all other BOCs unchanged.
 * Launchers are applied only when local org assigns them to a POC under this battery and `pocId` matches remote.
 */
export function mergeAppStateByBocId(local: AppState, remote: AppState, bocId: string): AppState {
  const sourceRemoteBocId = resolveRemoteBocIdForMerge(local, remote, bocId) ?? bocId

  const inferredPocIds = new Set<string>()
  for (const l of remote.launchers) {
    if (l.pocId) inferredPocIds.add(l.pocId)
  }
  for (const r of remote.rsvs) {
    if (r.pocId) inferredPocIds.add(r.pocId)
  }
  for (const p of remote.pods) {
    if (p.pocId) inferredPocIds.add(p.pocId)
  }
  for (const t of remote.tasks) {
    for (const pid of t.pocIds ?? []) inferredPocIds.add(pid)
  }

  const sourceRemotePocs = remote.pocs.filter(
    (p) => p.bocId === sourceRemoteBocId || inferredPocIds.has(p.id)
  )
  const remotePocIds = new Set<string>([...sourceRemotePocs.map((p) => p.id), ...inferredPocIds])
  const remotePocById = new Map(sourceRemotePocs.map((p) => [p.id, p]))
  const localPocsInBoc = local.pocs.filter((p) => p.bocId === bocId)
  const localPocByName = new Map(localPocsInBoc.map((p) => [normalizeName(p.name), p.id]))
  const remoteToLocalPocId = new Map<string, string>()
  for (const remotePocId of remotePocIds) {
    const remotePoc = sourceRemotePocs.find((p) => p.id === remotePocId)
    const localById = local.pocs.find((p) => p.id === remotePocId && p.bocId === bocId)
    if (localById) {
      remoteToLocalPocId.set(remotePocId, localById.id)
      continue
    }
    const localByName = remotePoc ? localPocByName.get(normalizeName(remotePoc.name)) : undefined
    if (localByName) {
      remoteToLocalPocId.set(remotePocId, localByName)
      continue
    }
    if (localPocsInBoc.length === 1) {
      remoteToLocalPocId.set(remotePocId, localPocsInBoc[0].id)
      continue
    }
    remoteToLocalPocId.set(remotePocId, remotePocId)
  }

  const remotePocsKnown = sourceRemotePocs.map((p) => ({
    ...p,
    id: remoteToLocalPocId.get(p.id) ?? p.id,
    bocId,
  }))
  const existingPocIds = new Set(remotePocsKnown.map((p) => p.id))
  const remotePocsFallback = [...remotePocIds]
    .map((id) => remoteToLocalPocId.get(id) ?? id)
    .filter((id) => !existingPocIds.has(id))
    .map((id) => ({ id, name: id, launchers: [], bocId }))
  const remotePocs = [...remotePocsKnown, ...remotePocsFallback]

  const remoteLaunchers = remote.launchers
    .filter((l) =>
      remoteLauncherAllowedForBocMerge(local, l, sourceRemoteBocId, remotePocIds, remotePocById)
    )
    .map((l) => ({
      ...l,
      pocId: l.pocId ? (remoteToLocalPocId.get(l.pocId) ?? l.pocId) : l.pocId,
    }))
    .filter((l) => {
      const existing = local.launchers.find((x) => x.id === l.id)
      if (!existing) return true
      if (!existing.pocId) return true
      const existingPoc = local.pocs.find((p) => p.id === existing.pocId)
      if (existingPoc && existingPoc.bocId !== bocId) return false
      return existing.pocId === l.pocId
    })
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const remoteAmmo = remote.ammoPlatoons
    .filter((a) => a.bocId === sourceRemoteBocId)
    .map((a) => ({ ...a, bocId }))
  const ammoIds = new Set(remoteAmmo.map((a) => a.id))

  const remoteRsvs = remote.rsvs
    .filter(
      (r) => r.bocId === sourceRemoteBocId || (r.pocId != null && remotePocIds.has(r.pocId))
    )
    .map((r) => ({
      ...r,
      bocId: r.bocId === sourceRemoteBocId ? bocId : r.bocId,
      pocId: r.pocId ? (remoteToLocalPocId.get(r.pocId) ?? r.pocId) : r.pocId,
    }))
  const rsvIds = new Set(remoteRsvs.map((r) => r.id))

  const remotePods = remote.pods
    .filter((p) => podInBatteryScope(p, remotePocIds, launcherIds, rsvIds, ammoIds))
    .map((p) => ({
      ...p,
      bocId: p.bocId === sourceRemoteBocId ? bocId : p.bocId,
      pocId: p.pocId ? (remoteToLocalPocId.get(p.pocId) ?? p.pocId) : p.pocId,
    }))

  // Non-destructive merge: update incoming ids, keep local entities that sender didn't include.
  const mergedPocs = upsertById(local.pocs, remotePocs)
  const mergedLaunchers = upsertById(local.launchers, remoteLaunchers)
  const mergedAmmo = upsertById(local.ammoPlatoons, remoteAmmo)
  const mergedRsvs = upsertById(local.rsvs, remoteRsvs)
  const mergedPods = upsertById(local.pods, remotePods)
  const mergedTasks = upsertById(
    local.tasks,
    remote.tasks
      .filter((t) => taskInScope(t, remotePocIds, launcherIds))
      .map((t) => ({
        ...t,
        pocIds: t.pocIds?.map((id) => (remoteToLocalPocId.get(id) ?? id)),
      }))
  )

  const remoteBoc = remote.bocs.find((b) => b.id === sourceRemoteBocId)
  const mergedBocs = remoteBoc ? upsertById(local.bocs, [{ ...remoteBoc, id: bocId }]) : local.bocs

  let ammoPltBocId = local.ammoPltBocId
  if (local.ammoPltBocId === bocId && remote.ammoPltBocId !== undefined) {
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
  const sourceRemotePocId = resolveRemotePocIdForMerge(local, remote, pocId)
  if (!sourceRemotePocId) return local

  const remoteScopePocIds = new Set<string>([sourceRemotePocId])
  const oldAmmoIds = new Set<string>()

  const localPoc = local.pocs.find((p) => p.id === pocId)
  const remotePocs = remote.pocs
    .filter((p) => p.id === sourceRemotePocId)
    .map((p) => ({
      ...p,
      id: pocId,
      bocId: localPoc?.bocId ?? p.bocId,
    }))
  const remotePoc = remotePocs[0]
  const remoteLaunchers = remote.launchers
    .filter((l) => remoteLauncherAllowedForPocMerge(local, l, sourceRemotePocId))
    .map((l) => ({ ...l, pocId }))
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const remoteRsvs = remote.rsvs
    .filter((r) => r.pocId === sourceRemotePocId)
    .map((r) => ({ ...r, pocId }))
  const rsvIds = new Set(remoteRsvs.map((r) => r.id))

  const remotePods = remote.pods
    .filter((p) => podInBatteryScope(p, remoteScopePocIds, launcherIds, rsvIds, oldAmmoIds))
    .map((p) => (p.pocId === sourceRemotePocId ? { ...p, pocId } : p))

  // Non-destructive merge for this PLT: update only known incoming ids.
  const mergedPocs = upsertById(local.pocs, remotePocs)
  const mergedLaunchers = upsertById(local.launchers, remoteLaunchers)
  const mergedRsvs = upsertById(local.rsvs, remoteRsvs)
  const mergedPods = upsertById(local.pods, remotePods)
  const mergedTasks = upsertById(
    local.tasks,
    remote.tasks
      .filter((t) => taskInScope(t, remoteScopePocIds, launcherIds))
      .map((t) => ({
        ...t,
        pocIds: t.pocIds?.map((id) => (id === sourceRemotePocId ? pocId : id)),
      }))
  )
  const mergedBocs =
    remotePoc?.bocId && remote.bocs.some((b) => b.id === remotePoc.bocId)
      ? upsertById(local.bocs, remote.bocs.filter((b) => b.id === remotePoc.bocId))
      : local.bocs

  return {
    ...local,
    bocs: mergedBocs,
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
    // Scope is automatic from roster echelon role (no per-row merge selectors).
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
