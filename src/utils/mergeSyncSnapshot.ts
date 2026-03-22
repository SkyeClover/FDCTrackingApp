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

function replaceByScope<T extends WithId>(
  existing: T[],
  incoming: T[],
  inScope: (row: T) => boolean
): T[] {
  const incomingById = new Map(incoming.map((x) => [x.id, x]))
  const keptOutsideScope = existing.filter((x) => !inScope(x) && !incomingById.has(x.id))
  return [...keptOutsideScope, ...incoming]
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

function remoteLauncherAllowedForPocMerge(
  local: AppState,
  remoteL: Launcher,
  sourceRemotePocId: string,
  targetLocalPocId: string
): boolean {
  if (remoteL.pocId !== sourceRemotePocId) return false

  const existing = local.launchers.find((l) => l.id === remoteL.id)
  if (!existing) return true
  if (!existing.pocId) return true
  return existing.pocId === targetLocalPocId
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
  const unmappedLocalIds = new Set(localRsvs.map((r) => r.id))
  const remoteRsvIdToLocalRsvId = new Map<string, string>()
  const mappedRsvs: AppState['rsvs'] = []

  const pickScopedLocalCandidate = (remoteRsv: AppState['rsvs'][number]): string | null => {
    const candidates = localRsvs.filter((r) => {
      if (!unmappedLocalIds.has(r.id)) return false
      if (remoteRsv.pocId && r.pocId === remoteRsv.pocId) return true
      if (remoteRsv.bocId && r.bocId === remoteRsv.bocId) return true
      return false
    })
    if (candidates.length === 1) return candidates[0].id
    return null
  }

  for (const remoteRsv of incomingRsvs) {
    let targetId: string
    const localById = byId.get(remoteRsv.id)
    if (localById) {
      targetId = localById.id
    } else {
      const localByName = byName.get(normalizeName(remoteRsv.name))
      if (localByName) {
        targetId = localByName.id
      } else {
        if (remoteRsv.name === remoteRsv.id) {
          // Synthetic fallback row from ingest: prefer a unique unclaimed local RSV in same scope.
          const scoped = pickScopedLocalCandidate(remoteRsv)
          if (scoped) {
            targetId = scoped
          } else {
            if (unmappedLocalIds.size === 1) {
              targetId = [...unmappedLocalIds][0]
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
        } else if (unmappedLocalIds.size === 1) {
          targetId = [...unmappedLocalIds][0]
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
    unmappedLocalIds.delete(targetId)
    const localTarget = byId.get(targetId)
    const syntheticFallbackName = normalizeName(remoteRsv.name) === normalizeName(remoteRsv.id)
    if (localTarget && syntheticFallbackName) {
      // Do not let a synthetic placeholder ("name === id") clobber real local metadata.
      mappedRsvs.push({ ...localTarget })
    } else {
      mappedRsvs.push({ ...remoteRsv, id: targetId })
    }
  }
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

function resolveLocalPocIdForMerge(local: AppState, remote: AppState, requestedPocId: string): string {
  if (local.pocs.some((p) => p.id === requestedPocId)) return requestedPocId

  const requestedAsName = local.pocs.filter((p) => normalizeName(p.name) === normalizeName(requestedPocId))
  if (requestedAsName.length === 1) return requestedAsName[0].id

  const remotePocByRequestedId = remote.pocs.find((p) => p.id === requestedPocId)
  if (remotePocByRequestedId) {
    const byRemoteName = local.pocs.filter(
      (p) => normalizeName(p.name) === normalizeName(remotePocByRequestedId.name)
    )
    if (byRemoteName.length === 1) return byRemoteName[0].id
  }

  if (local.pocs.length === 1 && remote.pocs.length === 1) return local.pocs[0].id
  return requestedPocId
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

function resolveRemoteBattalionIdForMerge(
  local: AppState,
  remote: AppState,
  mergeBattalionId: string
): string | null {
  if (remote.battalions.some((b) => b.id === mergeBattalionId)) return mergeBattalionId
  const localBn = local.battalions.find((b) => b.id === mergeBattalionId)
  const localBnName = normalizeName(localBn?.name)
  if (localBnName) {
    const byName = remote.battalions.find((b) => normalizeName(b.name) === localBnName)
    if (byName) return byName.id
  }
  if (remote.battalions.length === 1) return remote.battalions[0].id
  return null
}

function resolveRemoteBrigadeIdForMerge(local: AppState, remote: AppState, mergeBrigadeId: string): string | null {
  if (remote.brigades.some((b) => b.id === mergeBrigadeId)) return mergeBrigadeId
  const localBde = local.brigades.find((b) => b.id === mergeBrigadeId)
  const localBdeName = normalizeName(localBde?.name)
  if (localBdeName) {
    const byName = remote.brigades.find((b) => normalizeName(b.name) === localBdeName)
    if (byName) return byName.id
  }
  if (remote.brigades.length === 1) return remote.brigades[0].id
  return null
}

function buildRemoteScopeForBoc(remote: AppState, remoteBocId: string, localBocId: string): AppState {
  const scopedPocs = remote.pocs.filter((p) => p.bocId === remoteBocId).map((p) => ({ ...p, bocId: localBocId }))
  const scopedPocIds = new Set(scopedPocs.map((p) => p.id))
  const scopedLaunchers = remote.launchers.filter((l) => l.pocId != null && scopedPocIds.has(l.pocId))
  const scopedLauncherIds = new Set(scopedLaunchers.map((l) => l.id))
  const scopedAmmo = remote.ammoPlatoons.filter((a) => a.bocId === remoteBocId).map((a) => ({ ...a, bocId: localBocId }))
  const scopedAmmoIds = new Set(scopedAmmo.map((a) => a.id))
  const scopedRsvs = remote.rsvs
    .filter((r) => r.bocId === remoteBocId || (r.pocId != null && scopedPocIds.has(r.pocId)))
    .map((r) => ({ ...r, bocId: r.bocId === remoteBocId ? localBocId : r.bocId }))
  const scopedRsvIds = new Set(scopedRsvs.map((r) => r.id))
  const scopedPods = remote.pods
    .filter((p) => p.bocId === remoteBocId || podInBatteryScope(p, scopedPocIds, scopedLauncherIds, scopedRsvIds, scopedAmmoIds))
    .map((p) => ({ ...p, bocId: p.bocId === remoteBocId ? localBocId : p.bocId }))
  const scopedTasks = remote.tasks.filter((t) => taskInScope(t, scopedPocIds, scopedLauncherIds))

  return {
    ...remote,
    bocs: remote.bocs.filter((b) => b.id === remoteBocId).map((b) => ({ ...b, id: localBocId })),
    pocs: scopedPocs,
    launchers: scopedLaunchers,
    pods: scopedPods,
    rsvs: scopedRsvs,
    ammoPlatoons: scopedAmmo,
    tasks: scopedTasks,
    ammoPltBocId: remote.ammoPltBocId === remoteBocId ? localBocId : remote.ammoPltBocId,
  }
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

  const localLauncherIdsInBoc = new Set(
    local.launchers.filter((l) => l.pocId != null && localPocIdsInBoc.has(l.pocId)).map((l) => l.id)
  )
  const localAmmoIdsInBoc = new Set(local.ammoPlatoons.filter((a) => a.bocId === bocId).map((a) => a.id))
  const localRsvIdsInBoc = new Set(localRsvsInScope.map((r) => r.id))
  const incomingTasksInScope = remote.tasks
    .filter((t) => taskInScope(t, remotePocIds, launcherIds))
    .map((t) => ({
      ...t,
      pocIds: t.pocIds?.map((id) => (remoteToLocalPocId.get(id) ?? id)),
    }))

  // Authoritative battery merge: sender scope replaces local scope.
  const mergedPocs = replaceByScope(local.pocs, remotePocs, (p) => p.bocId === bocId)
  const mergedLaunchers = replaceByScope(
    local.launchers,
    remoteLaunchers,
    (l) => l.pocId != null && localPocIdsInBoc.has(l.pocId)
  )
  const mergedAmmo = replaceByScope(local.ammoPlatoons, remoteAmmo, (a) => a.bocId === bocId)
  const mergedRsvs = replaceByScope(
    local.rsvs,
    mappedRemoteRsvs,
    (r) => r.bocId === bocId || (r.pocId != null && localPocIdsInBoc.has(r.pocId))
  )
  const mergedPods = replaceByScope(
    local.pods,
    remotePods,
    (p) =>
      p.bocId === bocId ||
      podInBatteryScope(p, localPocIdsInBoc, localLauncherIdsInBoc, localRsvIdsInBoc, localAmmoIdsInBoc)
  )
  const mergedTasks = replaceByScope(
    local.tasks,
    incomingTasksInScope,
    (t) => taskInScope(t, localPocIdsInBoc, localLauncherIdsInBoc)
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
 * Merges all battery/PLT operational data for one battalion from `remote` into `local`.
 */
export function mergeAppStateByBattalionId(local: AppState, remote: AppState, battalionId: string): AppState {
  const sourceRemoteBattalionId = resolveRemoteBattalionIdForMerge(local, remote, battalionId)
  if (!sourceRemoteBattalionId) return local

  const localBn = local.battalions.find((b) => b.id === battalionId)
  const remoteBn = remote.battalions.find((b) => b.id === sourceRemoteBattalionId)
  let working: AppState = {
    ...local,
    battalions:
      remoteBn != null
        ? upsertById(local.battalions, [{ ...remoteBn, id: battalionId, brigadeId: localBn?.brigadeId ?? remoteBn.brigadeId }])
        : local.battalions,
  }

  let remoteBocsInBn = remote.bocs.filter((b) => b.battalionId === sourceRemoteBattalionId)
  if (remoteBocsInBn.length === 0 && remote.bocs.length > 0) {
    // Some sender snapshots carry thin/mismatched parent ids; treat sender payload as battalion-scoped.
    remoteBocsInBn = [...remote.bocs]
  }
  const localBocsInBn = working.bocs.filter((b) => b.battalionId === battalionId)
  const localBocByName = new Map(localBocsInBn.map((b) => [normalizeName(b.name), b.id]))

  const authoritativeBocIds = new Set<string>()
  for (const remoteBoc of remoteBocsInBn) {
    const localById = localBocsInBn.find((b) => b.id === remoteBoc.id)
    const localByName = localBocByName.get(normalizeName(remoteBoc.name))
    const targetLocalBocId = localById?.id ?? localByName ?? remoteBoc.id
    authoritativeBocIds.add(targetLocalBocId)
    const remoteScopeForBoc = buildRemoteScopeForBoc(remote, remoteBoc.id, targetLocalBocId)
    working = mergeAppStateByBocId(working, remoteScopeForBoc, targetLocalBocId)
    if (!working.bocs.some((b) => b.id === targetLocalBocId)) {
      working = {
        ...working,
        bocs: upsertById(working.bocs, [{ ...remoteBoc, id: targetLocalBocId, battalionId }]),
      }
    } else {
      working = {
        ...working,
        bocs: upsertById(
          working.bocs,
          working.bocs
            .filter((b) => b.id === targetLocalBocId)
            .map((b) => ({ ...b, battalionId }))
        ),
      }
    }
  }

  const remoteBattalionPods = remote.pods
    .filter((p) => p.battalionId === sourceRemoteBattalionId)
    .map((p) => ({ ...p, battalionId }))
  const mergedBocs = replaceByScope(
    working.bocs,
    working.bocs
      .filter((b) => authoritativeBocIds.has(b.id))
      .map((b) => ({ ...b, battalionId })),
    (b) => b.battalionId === battalionId
  )
  const removedBocIds = new Set(
    local.bocs.filter((b) => b.battalionId === battalionId).map((b) => b.id).filter((id) => !authoritativeBocIds.has(id))
  )
  const removedPocIds = new Set(working.pocs.filter((p) => p.bocId && removedBocIds.has(p.bocId)).map((p) => p.id))
  const removedLauncherIds = new Set(
    working.launchers.filter((l) => l.pocId && removedPocIds.has(l.pocId)).map((l) => l.id)
  )
  const removedRsvIds = new Set(
    working.rsvs
      .filter((r) => (r.bocId && removedBocIds.has(r.bocId)) || (r.pocId && removedPocIds.has(r.pocId)))
      .map((r) => r.id)
  )
  working = {
    ...working,
    bocs: mergedBocs,
    pocs: working.pocs.filter((p) => !(p.bocId && removedBocIds.has(p.bocId))),
    ammoPlatoons: working.ammoPlatoons.filter((a) => !(a.bocId && removedBocIds.has(a.bocId))),
    rsvs: working.rsvs.filter(
      (r) => !((r.bocId && removedBocIds.has(r.bocId)) || (r.pocId && removedPocIds.has(r.pocId)))
    ),
    launchers: working.launchers.filter((l) => !(l.pocId && removedPocIds.has(l.pocId))),
    pods: replaceByScope(
      working.pods.filter(
        (p) =>
          !(
            (p.bocId && removedBocIds.has(p.bocId)) ||
            (p.pocId && removedPocIds.has(p.pocId)) ||
            (p.launcherId && removedLauncherIds.has(p.launcherId)) ||
            (p.rsvId && removedRsvIds.has(p.rsvId))
          )
      ),
      remoteBattalionPods,
      (p) => p.battalionId === battalionId
    ),
    tasks: working.tasks.filter((t) => !taskInScope(t, removedPocIds, removedLauncherIds)),
  }

  return reconcileAppStateIntegrity(working)
}

/**
 * Merges all subordinate operational data for one brigade from `remote` into `local`.
 */
export function mergeAppStateByBrigadeId(local: AppState, remote: AppState, brigadeId: string): AppState {
  const sourceRemoteBrigadeId = resolveRemoteBrigadeIdForMerge(local, remote, brigadeId)
  if (!sourceRemoteBrigadeId) return local

  const remoteBde = remote.brigades.find((b) => b.id === sourceRemoteBrigadeId)
  let working: AppState = remoteBde
    ? { ...local, brigades: upsertById(local.brigades, [{ ...remoteBde, id: brigadeId }]) }
    : local

  let remoteBattalions = remote.battalions.filter((b) => b.brigadeId === sourceRemoteBrigadeId)
  if (remoteBattalions.length === 0 && remote.battalions.length > 0) {
    // Same thin-parent fallback as battalion merge.
    remoteBattalions = [...remote.battalions]
  }
  const localBattalions = working.battalions.filter((b) => b.brigadeId === brigadeId)
  const localBnByName = new Map(localBattalions.map((b) => [normalizeName(b.name), b.id]))

  const authoritativeBattalionIds = new Set<string>()
  for (const remoteBn of remoteBattalions) {
    const localById = localBattalions.find((b) => b.id === remoteBn.id)
    const localByName = localBnByName.get(normalizeName(remoteBn.name))
    const targetLocalBnId = localById?.id ?? localByName ?? remoteBn.id
    authoritativeBattalionIds.add(targetLocalBnId)

    const remoteScopeForBn: AppState = {
      ...remote,
      battalions: remote.battalions
        .filter((b) => b.id === remoteBn.id)
        .map((b) => ({ ...b, id: targetLocalBnId, brigadeId })),
      bocs: remote.bocs.filter((b) => b.battalionId === remoteBn.id),
      pocs: remote.pocs,
      launchers: remote.launchers,
      pods: remote.pods
        .map((p) => (p.battalionId === remoteBn.id ? { ...p, battalionId: targetLocalBnId, brigadeId } : p)),
      rsvs: remote.rsvs,
      ammoPlatoons: remote.ammoPlatoons,
      tasks: remote.tasks,
    }

    working = mergeAppStateByBattalionId(working, remoteScopeForBn, targetLocalBnId)
    if (!working.battalions.some((b) => b.id === targetLocalBnId)) {
      working = {
        ...working,
        battalions: upsertById(working.battalions, [{ ...remoteBn, id: targetLocalBnId, brigadeId }]),
      }
    } else {
      working = {
        ...working,
        battalions: upsertById(
          working.battalions,
          working.battalions
            .filter((b) => b.id === targetLocalBnId)
            .map((b) => ({ ...b, brigadeId }))
        ),
      }
    }
  }

  const remoteBrigadePods = remote.pods
    .filter((p) => p.brigadeId === sourceRemoteBrigadeId)
    .map((p) => ({ ...p, brigadeId }))
  const mergedBattalions = replaceByScope(
    working.battalions,
    working.battalions
      .filter((b) => authoritativeBattalionIds.has(b.id))
      .map((b) => ({ ...b, brigadeId })),
    (b) => b.brigadeId === brigadeId
  )
  const removedBattalionIds = new Set(
    local.battalions
      .filter((b) => b.brigadeId === brigadeId)
      .map((b) => b.id)
      .filter((id) => !authoritativeBattalionIds.has(id))
  )
  const removedBocIds = new Set(working.bocs.filter((b) => b.battalionId && removedBattalionIds.has(b.battalionId)).map((b) => b.id))
  const removedPocIds = new Set(working.pocs.filter((p) => p.bocId && removedBocIds.has(p.bocId)).map((p) => p.id))
  const removedLauncherIds = new Set(
    working.launchers.filter((l) => l.pocId && removedPocIds.has(l.pocId)).map((l) => l.id)
  )
  const removedRsvIds = new Set(
    working.rsvs
      .filter((r) => (r.bocId && removedBocIds.has(r.bocId)) || (r.pocId && removedPocIds.has(r.pocId)))
      .map((r) => r.id)
  )
  working = {
    ...working,
    battalions: mergedBattalions,
    bocs: working.bocs.filter((b) => !(b.battalionId && removedBattalionIds.has(b.battalionId))),
    pocs: working.pocs.filter((p) => !(p.bocId && removedBocIds.has(p.bocId))),
    ammoPlatoons: working.ammoPlatoons.filter((a) => !(a.bocId && removedBocIds.has(a.bocId))),
    rsvs: working.rsvs.filter(
      (r) => !((r.bocId && removedBocIds.has(r.bocId)) || (r.pocId && removedPocIds.has(r.pocId)))
    ),
    launchers: working.launchers.filter((l) => !(l.pocId && removedPocIds.has(l.pocId))),
    pods: replaceByScope(
      working.pods.filter(
        (p) =>
          !(
            (p.battalionId && removedBattalionIds.has(p.battalionId)) ||
            (p.bocId && removedBocIds.has(p.bocId)) ||
            (p.pocId && removedPocIds.has(p.pocId)) ||
            (p.launcherId && removedLauncherIds.has(p.launcherId)) ||
            (p.rsvId && removedRsvIds.has(p.rsvId))
          )
      ),
      remoteBrigadePods,
      (p) => p.brigadeId === brigadeId
    ),
    tasks: working.tasks.filter((t) => !taskInScope(t, removedPocIds, removedLauncherIds)),
  }

  return reconcileAppStateIntegrity(working)
}

/**
 * Merges operational data for a single PLT FDC (`pocId`) from `remote` into `local`.
 * Only launchers (and their pods) that local org assigns to this POC are updated; other PLTs’ launchers are untouched.
 */
export function mergeAppStateByPocId(local: AppState, remote: AppState, pocId: string): AppState {
  const targetLocalPocId = resolveLocalPocIdForMerge(local, remote, pocId)
  const sourceRemotePocId = resolveRemotePocIdForMerge(local, remote, targetLocalPocId)
  if (!sourceRemotePocId) return local

  const remoteScopePocIds = new Set<string>([sourceRemotePocId])
  const oldAmmoIds = new Set<string>()

  const localPoc = local.pocs.find((p) => p.id === targetLocalPocId)
  const remotePocsKnown = remote.pocs
    .filter((p) => p.id === sourceRemotePocId)
    .map((p) => ({
      ...p,
      id: targetLocalPocId,
      bocId: localPoc?.bocId ?? p.bocId,
    }))
  const remotePocs =
    remotePocsKnown.length > 0
      ? remotePocsKnown
      : [{ id: targetLocalPocId, name: localPoc?.name ?? targetLocalPocId, launchers: [], bocId: localPoc?.bocId }]
  const remotePoc = remotePocs[0]
  let remoteLaunchers = remote.launchers
    .filter((l) => remoteLauncherAllowedForPocMerge(local, l, sourceRemotePocId, targetLocalPocId))
    .map((l) => ({ ...l, pocId: targetLocalPocId }))
  const launcherIds = new Set(remoteLaunchers.map((l) => l.id))

  const inferredRsvIds = new Set<string>()
  for (const p of remote.pods) {
    if (p.rsvId) inferredRsvIds.add(p.rsvId)
  }
  const remoteRsvsKnown = remote.rsvs
    .filter((r) => r.pocId === sourceRemotePocId)
    .map((r) => ({ ...r, pocId: targetLocalPocId }))
  const knownRsvIds = new Set(remoteRsvsKnown.map((r) => r.id))
  const localRsvIds = new Set(local.rsvs.map((r) => r.id))
  const remoteRsvsFallback = [...inferredRsvIds]
    .filter((id) => !knownRsvIds.has(id) && !localRsvIds.has(id))
    .map((id) => ({ id, name: id, pocId: targetLocalPocId }))
  const remoteRsvs = [...remoteRsvsKnown, ...remoteRsvsFallback]
  const localRsvsInScope = local.rsvs.filter((r) => r.pocId === targetLocalPocId)
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
      ...(p.pocId === sourceRemotePocId ? { ...p, pocId: targetLocalPocId } : p),
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

  const localLauncherIdsInPoc = new Set(
    local.launchers.filter((l) => l.pocId != null && l.pocId === targetLocalPocId).map((l) => l.id)
  )
  const localRsvIdsInPoc = new Set(local.rsvs.filter((r) => r.pocId === targetLocalPocId).map((r) => r.id))
  const incomingTasksInScope = remote.tasks
    .filter((t) => taskInScope(t, remoteScopePocIds, launcherIds))
    .map((t) => ({
      ...t,
      pocIds: t.pocIds?.map((id) => (id === sourceRemotePocId ? targetLocalPocId : id)),
    }))

  // Authoritative PLT merge: sender scope replaces local scope.
  const mergedPocs = replaceByScope(local.pocs, remotePocs, (p) => p.id === targetLocalPocId)
  const mergedLaunchers = replaceByScope(local.launchers, remoteLaunchers, (l) => l.pocId === targetLocalPocId)
  const mergedRsvs = replaceByScope(local.rsvs, mappedRemoteRsvs, (r) => r.pocId === targetLocalPocId)
  const mergedPods = replaceByScope(
    local.pods,
    remotePods,
    (p) =>
      podInBatteryScope(p, new Set([targetLocalPocId]), localLauncherIdsInPoc, localRsvIdsInPoc, oldAmmoIds)
  )
  const mergedTasks = replaceByScope(
    local.tasks,
    incomingTasksInScope,
    (t) => taskInScope(t, new Set([targetLocalPocId]), localLauncherIdsInPoc)
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
  ingestMergeBrigadeId: string | null
  ingestMergeBattalionId: string | null
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
    if (role?.type === 'brigade') {
      return {
        ingestMergeBrigadeId: role.id,
        ingestMergeBattalionId: null,
        ingestMergeBocId: null,
        ingestMergePocId: null,
      }
    }
    if (role?.type === 'battalion') {
      return {
        ingestMergeBrigadeId: null,
        ingestMergeBattalionId: role.id,
        ingestMergeBocId: null,
        ingestMergePocId: null,
      }
    }
    if (role?.type === 'boc') {
      return {
        ingestMergeBrigadeId: null,
        ingestMergeBattalionId: null,
        ingestMergeBocId: role.id,
        ingestMergePocId: null,
      }
    }
    if (role?.type === 'poc') {
      return {
        ingestMergeBrigadeId: null,
        ingestMergeBattalionId: null,
        ingestMergeBocId: null,
        ingestMergePocId: role.id,
      }
    }
    return null
  }
  return null
}
