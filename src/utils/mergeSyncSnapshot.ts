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

function mapRemotePodsToLocalIds(localPods: Pod[], incomingPods: Pod[]): {
  mappedPods: Pod[]
  remotePodIdToLocalPodId: Map<string, string>
} {
  if (incomingPods.length === 0) {
    return { mappedPods: incomingPods, remotePodIdToLocalPodId: new Map() }
  }

  const byUuid = new Map<string, Pod>()
  const byId = new Map<string, Pod>()
  const usedIds = new Set(localPods.map((p) => p.id))
  for (const p of localPods) {
    byId.set(p.id, p)
    if (p.uuid) byUuid.set(p.uuid, p)
  }

  const remotePodIdToLocalPodId = new Map<string, string>()
  const mappedPods: Pod[] = []

  for (const remotePod of incomingPods) {
    let targetId: string | null = null
    const localByUuid = remotePod.uuid ? byUuid.get(remotePod.uuid) : undefined
    if (localByUuid) {
      targetId = localByUuid.id
    } else {
      const localById = byId.get(remotePod.id)
      if (!localById || localById.uuid === remotePod.uuid) {
        targetId = remotePod.id
      } else {
        const seed = remotePod.uuid ? `${remotePod.id}-${remotePod.uuid.slice(0, 8)}` : `${remotePod.id}-SYNC`
        let candidate = seed
        let n = 2
        while (usedIds.has(candidate)) {
          candidate = `${seed}-${n}`
          n += 1
        }
        targetId = candidate
      }
    }

    remotePodIdToLocalPodId.set(remotePod.id, targetId)
    usedIds.add(targetId)
    mappedPods.push({ ...remotePod, id: targetId })
  }

  return { mappedPods, remotePodIdToLocalPodId }
}

function inferRemotePocIds(remote: AppState): Set<string> {
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
  return inferredPocIds
}

function sanitizePods(
  pods: Pod[],
  validLauncherIds: Set<string>,
  validRsvIds: Set<string>,
  validPocIds: Set<string>
): Pod[] {
  return pods.map((p) => ({
    ...p,
    launcherId: p.launcherId && validLauncherIds.has(p.launcherId) ? p.launcherId : undefined,
    rsvId: p.rsvId && validRsvIds.has(p.rsvId) ? p.rsvId : undefined,
    pocId: p.pocId && validPocIds.has(p.pocId) ? p.pocId : undefined,
  }))
}

function reconcileLauncherPodLinks(launchers: Launcher[], pods: Pod[]): { launchers: Launcher[]; pods: Pod[] } {
  const nextLaunchers = launchers.map((l) => ({ ...l }))
  const nextPods = pods.map((p) => ({ ...p }))
  const launcherById = new Map(nextLaunchers.map((l, i) => [l.id, i]))
  const podById = new Map(nextPods.map((p, i) => [p.id, i]))

  for (const l of nextLaunchers) {
    if (l.podId && !podById.has(l.podId)) l.podId = undefined
  }
  for (const p of nextPods) {
    if (p.launcherId && !launcherById.has(p.launcherId)) p.launcherId = undefined
  }

  const claimedPods = new Set<string>()
  for (const l of nextLaunchers) {
    if (!l.podId) continue
    if (claimedPods.has(l.podId)) {
      l.podId = undefined
      continue
    }
    claimedPods.add(l.podId)
  }

  const podAssignedToLauncher = new Map<string, string>()
  for (const l of nextLaunchers) {
    if (l.podId) podAssignedToLauncher.set(l.podId, l.id)
  }

  for (const p of nextPods) {
    const fromLauncher = podAssignedToLauncher.get(p.id)
    if (fromLauncher) {
      p.launcherId = fromLauncher
      continue
    }
    if (!p.launcherId) continue
    const li = launcherById.get(p.launcherId)
    if (li == null) {
      p.launcherId = undefined
      continue
    }
    if (!nextLaunchers[li].podId) {
      nextLaunchers[li].podId = p.id
      podAssignedToLauncher.set(p.id, p.launcherId)
    } else {
      p.launcherId = undefined
    }
  }

  return { launchers: nextLaunchers, pods: nextPods }
}

function sanitizeTasks(tasks: Task[], validLauncherIds: Set<string>, validPocIds: Set<string>): Task[] {
  return tasks.map((t) => {
    const launcherIds = t.launcherIds?.filter((id) => validLauncherIds.has(id)) ?? []
    const pocIds = t.pocIds?.filter((id) => validPocIds.has(id)) ?? []
    return {
      ...t,
      launcherIds: launcherIds.length ? launcherIds : undefined,
      pocIds: pocIds.length ? pocIds : undefined,
    }
  })
}

export function reconcileAppStateIntegrity(state: AppState): AppState {
  const validPocIds = new Set(state.pocs.map((p) => p.id))
  const validRsvIds = new Set(state.rsvs.map((r) => r.id))
  const launchersWithValidPoc = state.launchers.map((l) => ({
    ...l,
    pocId: l.pocId && validPocIds.has(l.pocId) ? l.pocId : undefined,
  }))
  const validLauncherIds = new Set(launchersWithValidPoc.map((l) => l.id))
  const podsWithValidRefs = sanitizePods(state.pods, validLauncherIds, validRsvIds, validPocIds)
  const linked = reconcileLauncherPodLinks(launchersWithValidPoc, podsWithValidRefs)
  const tasks = sanitizeTasks(state.tasks, new Set(linked.launchers.map((l) => l.id)), validPocIds)
  const rsvs = state.rsvs.map((r) => ({
    ...r,
    pocId: r.pocId && validPocIds.has(r.pocId) ? r.pocId : undefined,
  }))

  return {
    ...state,
    launchers: linked.launchers,
    pods: linked.pods,
    tasks,
    rsvs,
  }
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

function mapRemoteRsvsToLocalIds(
  localRsvs: AppState['rsvs'],
  incomingRsvs: AppState['rsvs']
): {
  mappedRsvs: AppState['rsvs']
  remoteRsvIdToLocalRsvId: Map<string, string>
} {
  if (incomingRsvs.length === 0) {
    return { mappedRsvs: incomingRsvs, remoteRsvIdToLocalRsvId: new Map() }
  }

  const byId = new Map(localRsvs.map((r) => [r.id, r]))
  const byName = new Map<string, AppState['rsvs'][number]>()
  for (const r of localRsvs) {
    const k = normalizeName(r.name)
    if (!k) continue
    if (!byName.has(k)) byName.set(k, r)
  }
  const usedIds = new Set(localRsvs.map((r) => r.id))
  const remoteRsvIdToLocalRsvId = new Map<string, string>()
  const mappedRsvs: AppState['rsvs'] = []

  for (const remoteRsv of incomingRsvs) {
    let targetId: string
    const localById = byId.get(remoteRsv.id)
    if (localById) {
      targetId = localById.id
    } else {
      const localByName = byName.get(normalizeName(remoteRsv.name))
      if (localByName) {
        targetId = localByName.id
      } else if (!usedIds.has(remoteRsv.id)) {
        targetId = remoteRsv.id
      } else {
        const seed = `${remoteRsv.id}-RSV`
        let candidate = seed
        let n = 2
        while (usedIds.has(candidate)) {
          candidate = `${seed}-${n}`
          n += 1
        }
        targetId = candidate
      }
    }

    remoteRsvIdToLocalRsvId.set(remoteRsv.id, targetId)
    usedIds.add(targetId)
    mappedRsvs.push({ ...remoteRsv, id: targetId })
  }

  return { mappedRsvs, remoteRsvIdToLocalRsvId }
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
  const inferredPocIds = [...inferRemotePocIds(remote)]
  if (inferredPocIds.length === 1) return inferredPocIds[0]
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

  const inferredPocIds = inferRemotePocIds(remote)

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

  let remoteLaunchers = remote.launchers
    .filter((l) =>
      remoteLauncherAllowedForBocMerge(local, l, sourceRemoteBocId, remotePocIds, remotePocById)
    )
    .map((l) => ({
      ...l,
      pocId: l.pocId ? (remoteToLocalPocId.get(l.pocId) ?? l.pocId) : l.pocId,
    }))
    .map((l) => {
      const existing = local.launchers.find((x) => x.id === l.id)
      if (!existing?.pocId) return l
      const existingPoc = local.pocs.find((p) => p.id === existing.pocId)
      if (existingPoc?.bocId !== bocId) return l
      // Keep local launcher-to-POC assignment as source of truth in battery merges.
      return { ...l, pocId: existing.pocId }
    })
    .filter((l) => {
      const existing = local.launchers.find((x) => x.id === l.id)
      if (!existing) return true
      if (!existing.pocId) return true
      const existingPoc = local.pocs.find((p) => p.id === existing.pocId)
      if (existingPoc && existingPoc.bocId !== bocId) return false
      return true
    })
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const remoteAmmo = remote.ammoPlatoons
    .filter((a) => a.bocId === sourceRemoteBocId)
    .map((a) => ({ ...a, bocId }))
  const ammoIds = new Set(remoteAmmo.map((a) => a.id))

  const inferredRsvIds = new Set<string>()
  for (const p of remote.pods) {
    if (p.rsvId) inferredRsvIds.add(p.rsvId)
  }

  const remoteRsvsKnown = remote.rsvs
    .filter(
      (r) =>
        r.bocId === sourceRemoteBocId ||
        (r.pocId != null && remotePocIds.has(r.pocId)) ||
        inferredRsvIds.has(r.id)
    )
    .map((r) => ({
      ...r,
      bocId: r.bocId === sourceRemoteBocId ? bocId : r.bocId,
      pocId: r.pocId ? (remoteToLocalPocId.get(r.pocId) ?? r.pocId) : r.pocId,
    }))
  const knownRsvIds = new Set(remoteRsvsKnown.map((r) => r.id))
  const localRsvIds = new Set(local.rsvs.map((r) => r.id))
  const remoteRsvsFallback = [...inferredRsvIds]
    .filter((id) => !knownRsvIds.has(id) && !localRsvIds.has(id))
    .map((id) => ({ id, name: id, bocId }))
  const remoteRsvs = [...remoteRsvsKnown, ...remoteRsvsFallback]
  const localPocIdsInBoc = new Set(localPocsInBoc.map((p) => p.id))
  const localRsvsInScope = local.rsvs.filter(
    (r) => r.bocId === bocId || (r.pocId != null && localPocIdsInBoc.has(r.pocId))
  )
  const { mappedRsvs: mappedRemoteRsvs, remoteRsvIdToLocalRsvId } = mapRemoteRsvsToLocalIds(
    localRsvsInScope,
    remoteRsvs
  )
  const rsvIds = new Set(
    [...mappedRemoteRsvs.map((r) => r.id), ...[...inferredRsvIds].map((id) => remoteRsvIdToLocalRsvId.get(id) ?? id)]
  )

  const scopedRemotePods = remote.pods
    .filter(
      (p) =>
        p.bocId === sourceRemoteBocId ||
        podInBatteryScope(p, remotePocIds, launcherIds, rsvIds, ammoIds)
    )
    .map((p) => ({
      ...p,
      bocId: p.bocId === sourceRemoteBocId ? bocId : p.bocId,
      pocId: p.pocId ? (remoteToLocalPocId.get(p.pocId) ?? p.pocId) : p.pocId,
      rsvId: p.rsvId ? (remoteRsvIdToLocalRsvId.get(p.rsvId) ?? p.rsvId) : p.rsvId,
    }))
  const { mappedPods: remotePods, remotePodIdToLocalPodId } = mapRemotePodsToLocalIds(
    local.pods,
    scopedRemotePods
  )
  remoteLaunchers = remoteLaunchers.map((l) => ({
    ...l,
    podId: l.podId ? (remotePodIdToLocalPodId.get(l.podId) ?? l.podId) : l.podId,
  }))

  // Non-destructive merge: update incoming ids, keep local entities that sender didn't include.
  const mergedPocs = upsertById(local.pocs, remotePocs)
  const mergedLaunchers = upsertById(local.launchers, remoteLaunchers)
  const mergedAmmo = upsertById(local.ammoPlatoons, remoteAmmo)
  const mergedRsvs = upsertById(local.rsvs, mappedRemoteRsvs)
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

  return reconcileAppStateIntegrity({
    ...local,
    bocs: mergedBocs,
    pocs: mergedPocs,
    launchers: mergedLaunchers,
    pods: mergedPods,
    rsvs: mergedRsvs,
    ammoPlatoons: mergedAmmo,
    tasks: mergedTasks,
    ammoPltBocId,
  })
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
  const remotePocsKnown = remote.pocs
    .filter((p) => p.id === sourceRemotePocId)
    .map((p) => ({
      ...p,
      id: pocId,
      bocId: localPoc?.bocId ?? p.bocId,
    }))
  const remotePocs =
    remotePocsKnown.length > 0
      ? remotePocsKnown
      : [{ id: pocId, name: localPoc?.name ?? pocId, launchers: [], bocId: localPoc?.bocId }]
  const remotePoc = remotePocs[0]
  let remoteLaunchers = remote.launchers
    .filter((l) => remoteLauncherAllowedForPocMerge(local, l, sourceRemotePocId))
    .map((l) => ({ ...l, pocId }))
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const inferredRsvIds = new Set<string>()
  for (const p of remote.pods) {
    if (p.rsvId) inferredRsvIds.add(p.rsvId)
  }
  const remoteRsvsKnown = remote.rsvs
    .filter((r) => r.pocId === sourceRemotePocId)
    .map((r) => ({ ...r, pocId }))
  const knownRsvIds = new Set(remoteRsvsKnown.map((r) => r.id))
  const localRsvIds = new Set(local.rsvs.map((r) => r.id))
  const remoteRsvsFallback = [...inferredRsvIds]
    .filter((id) => !knownRsvIds.has(id) && !localRsvIds.has(id))
    .map((id) => ({ id, name: id, pocId }))
  const remoteRsvs = [...remoteRsvsKnown, ...remoteRsvsFallback]
  const localRsvsInScope = local.rsvs.filter((r) => r.pocId === pocId)
  const { mappedRsvs: mappedRemoteRsvs, remoteRsvIdToLocalRsvId } = mapRemoteRsvsToLocalIds(
    localRsvsInScope,
    remoteRsvs
  )
  const rsvIds = new Set(
    [...mappedRemoteRsvs.map((r) => r.id), ...[...inferredRsvIds].map((id) => remoteRsvIdToLocalRsvId.get(id) ?? id)]
  )

  const scopedRemotePods = remote.pods
    .filter((p) => podInBatteryScope(p, remoteScopePocIds, launcherIds, rsvIds, oldAmmoIds))
    .map((p) => ({
      ...(p.pocId === sourceRemotePocId ? { ...p, pocId } : p),
      rsvId: p.rsvId ? (remoteRsvIdToLocalRsvId.get(p.rsvId) ?? p.rsvId) : p.rsvId,
    }))
  const { mappedPods: remotePods, remotePodIdToLocalPodId } = mapRemotePodsToLocalIds(
    local.pods,
    scopedRemotePods
  )
  remoteLaunchers = remoteLaunchers.map((l) => ({
    ...l,
    podId: l.podId ? (remotePodIdToLocalPodId.get(l.podId) ?? l.podId) : l.podId,
  }))

  // Non-destructive merge for this PLT: update only known incoming ids.
  const mergedPocs = upsertById(local.pocs, remotePocs)
  const mergedLaunchers = upsertById(local.launchers, remoteLaunchers)
  const mergedRsvs = upsertById(local.rsvs, mappedRemoteRsvs)
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

  return reconcileAppStateIntegrity({
    ...local,
    bocs: mergedBocs,
    pocs: mergedPocs,
    launchers: mergedLaunchers,
    pods: mergedPods,
    rsvs: mergedRsvs,
    tasks: mergedTasks,
  })
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
