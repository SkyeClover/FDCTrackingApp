import type { AppState, TaskTemplate } from '../src/types'
import {
  mergeAppStateByPocId,
  mergeAppStateByBattalionId,
  mergeAppStateByBrigadeId,
  reconcileAppStateIntegrity,
} from '../src/utils/mergeSyncSnapshot'

const defaultTemplates: TaskTemplate[] = [
  { id: 'reload-default', name: 'Reload', description: 'Reload launcher', duration: 900, type: 'reload' },
]

/**
 * Implements empty state for this module.
 */
function emptyState(): AppState {
  return {
    brigades: [],
    battalions: [],
    bocs: [],
    pocs: [],
    launchers: [],
    pods: [],
    rsvs: [],
    rounds: [],
    tasks: [],
    taskTemplates: defaultTemplates.map((t) => ({ ...t })),
    logs: [],
    roundTypes: {},
    version: '1.1.2',
    ammoPlatoons: [],
  }
}

/**
 * Implements assert for this module.
 */
function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

/**
 * Implements clone state for this module.
 */
function cloneState<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/**
 * Implements combine by id for this module.
 */
function combineById<T extends { id: string }>(...lists: T[][]): T[] {
  const byId = new Map<string, T>()
  for (const list of lists) {
    for (const row of list) byId.set(row.id, row)
  }
  return [...byId.values()]
}

/**
 * Implements combine states for this module.
 */
function combineStates(...parts: AppState[]): AppState {
  const base = emptyState()
  if (!parts.length) return base
  return {
    ...base,
    brigades: combineById(...parts.map((s) => s.brigades)),
    battalions: combineById(...parts.map((s) => s.battalions)),
    bocs: combineById(...parts.map((s) => s.bocs)),
    pocs: combineById(...parts.map((s) => s.pocs)),
    launchers: combineById(...parts.map((s) => s.launchers)),
    pods: combineById(...parts.map((s) => s.pods)),
    rsvs: combineById(...parts.map((s) => s.rsvs)),
    rounds: combineById(...parts.map((s) => s.rounds)),
    tasks: combineById(...parts.map((s) => s.tasks)),
    taskTemplates: combineById(...parts.map((s) => s.taskTemplates)),
    logs: combineById(...parts.map((s) => s.logs)),
    ammoPlatoons: combineById(...parts.map((s) => s.ammoPlatoons)),
  }
}

/**
 * Implements count invalid refs for this module.
 */
function countInvalidRefs(s: AppState): { launcherPod: number; podLauncher: number; podRsv: number } {
  const podIds = new Set(s.pods.map((p) => p.id))
  const launcherIds = new Set(s.launchers.map((l) => l.id))
  const rsvIds = new Set(s.rsvs.map((r) => r.id))
  return {
    launcherPod: s.launchers.filter((l) => l.podId && !podIds.has(l.podId)).length,
    podLauncher: s.pods.filter((p) => p.launcherId && !launcherIds.has(p.launcherId)).length,
    podRsv: s.pods.filter((p) => p.rsvId && !rsvIds.has(p.rsvId)).length,
  }
}

type NodeIds = {
  bde: string
  bn: string
  boc: string
  poc: string
  bnName: string
  bocName: string
}

/**
 * Implements make poc snapshot for this module.
 */
function makePocSnapshot(label: string, ids: NodeIds): AppState {
  const s = emptyState()
  s.brigades = [{ id: ids.bde, name: '1st Brigade' }]
  s.battalions = [{ id: ids.bn, name: ids.bnName, brigadeId: ids.bde }]
  s.bocs = [{ id: ids.boc, name: ids.bocName, pocs: [], battalionId: ids.bn }]
  s.pocs = [{ id: ids.poc, name: label, launchers: [], bocId: ids.boc }]
  s.rsvs = [{ id: `rsv-${label}`, name: `RSV ${label}`, pocId: ids.poc, bocId: ids.boc }]
  s.ammoPlatoons = [{ id: `ammo-${label}`, name: `Ammo ${label}`, bocId: ids.boc }]

  const l1 = `L-${label}-1`
  const l2 = `L-${label}-2`
  const pLoad1 = `POD-${label}-L1`
  const pLoad2 = `POD-${label}-L2`
  const pRsv = `POD-${label}-RSV`
  const pPoc = `POD-${label}-POC`
  const pBoc = `POD-${label}-BOC`
  const pAmmo = `POD-${label}-AMMO`

  s.launchers = [
    { id: l1, name: `${label}-L1`, pocId: ids.poc, podId: pLoad1, status: 'active' },
    { id: l2, name: `${label}-L2`, pocId: ids.poc, podId: pLoad2, status: 'idle' },
  ]
  s.pods = [
    {
      id: pLoad1,
      uuid: `uuid-${pLoad1}`,
      name: `LOAD_${label}_1`,
      rounds: [{ id: `${pLoad1}-r1`, type: 'M31', status: 'available' }],
      launcherId: l1,
      pocId: ids.poc,
      rsvId: `rsv-${label}`,
    },
    {
      id: pLoad2,
      uuid: `uuid-${pLoad2}`,
      name: `LOAD_${label}_2`,
      rounds: [{ id: `${pLoad2}-r1`, type: 'M31', status: 'available' }],
      launcherId: l2,
      pocId: ids.poc,
    },
    {
      id: pRsv,
      uuid: `uuid-${pRsv}`,
      name: `RSV_${label}_1`,
      rounds: [{ id: `${pRsv}-r1`, type: 'M31', status: 'available' }],
      pocId: ids.poc,
      rsvId: `rsv-${label}`,
    },
    {
      id: pPoc,
      uuid: `uuid-${pPoc}`,
      name: `POC_${label}_1`,
      rounds: [{ id: `${pPoc}-r1`, type: 'M31', status: 'available' }],
      pocId: ids.poc,
    },
    {
      id: pBoc,
      uuid: `uuid-${pBoc}`,
      name: `BOC_${label}_1`,
      rounds: [{ id: `${pBoc}-r1`, type: 'M31', status: 'available' }],
      bocId: ids.boc,
    },
    {
      id: pAmmo,
      uuid: `uuid-${pAmmo}`,
      name: `AMMO_${label}_1`,
      rounds: [{ id: `${pAmmo}-r1`, type: 'M31', status: 'available' }],
      ammoPltId: `ammo-${label}`,
    },
  ]
  s.tasks = [
    {
      id: `task-${label}-reload`,
      name: `Reload ${label}`,
      description: `Reload launcher ${l1}`,
      status: 'in-progress',
      progress: 35,
      launcherIds: [l1],
      pocIds: [ids.poc],
    },
  ]
  return s
}

/**
 * Implements make local boc state for this module.
 */
function makeLocalBocState(
  localBocId: string,
  localBnId: string,
  localBdeId: string,
  bocName: string,
  pocNames: string[]
): AppState {
  const s = emptyState()
  s.brigades = [{ id: localBdeId, name: '1st Brigade' }]
  s.battalions = [{ id: localBnId, name: localBnId.includes('bn1') ? '1-27 FAR' : '2-27 FAR', brigadeId: localBdeId }]
  s.bocs = [{ id: localBocId, name: bocName, pocs: [], battalionId: localBnId }]
  s.pocs = pocNames.map((n) => ({ id: `local-${n}`, name: n, launchers: [], bocId: localBocId }))
  s.rsvs = pocNames.map((n) => ({ id: `local-rsv-${n}`, name: `RSV ${n}`, pocId: `local-${n}`, bocId: localBocId }))
  s.ammoPlatoons = [{ id: `local-ammo-${localBocId}`, name: `Ammo ${localBocId}`, bocId: localBocId }]
  return s
}

/**
 * Implements run for this module.
 */
function run(): void {
  // POC snapshots (different ids from receivers).
  const pocSnaps = {
    BN1_A_A10: makePocSnapshot('A10', { bde: 'rbde-1', bn: 'rbn-1', bnName: '1-27 FAR', boc: 'rboc-a', bocName: 'A Battery', poc: 'rpoc-a10' }),
    BN1_A_A20: makePocSnapshot('A20', { bde: 'rbde-1', bn: 'rbn-1', bnName: '1-27 FAR', boc: 'rboc-a', bocName: 'A Battery', poc: 'rpoc-a20' }),
    BN1_B_B10: makePocSnapshot('B10', { bde: 'rbde-1', bn: 'rbn-1', bnName: '1-27 FAR', boc: 'rboc-b', bocName: 'B Battery', poc: 'rpoc-b10' }),
    BN1_B_B20: makePocSnapshot('B20', { bde: 'rbde-1', bn: 'rbn-1', bnName: '1-27 FAR', boc: 'rboc-b', bocName: 'B Battery', poc: 'rpoc-b20' }),
    BN2_A_C10: makePocSnapshot('C10', { bde: 'rbde-1', bn: 'rbn-2', bnName: '2-27 FAR', boc: 'rboc-c', bocName: 'A Battery', poc: 'rpoc-c10' }),
    BN2_A_C20: makePocSnapshot('C20', { bde: 'rbde-1', bn: 'rbn-2', bnName: '2-27 FAR', boc: 'rboc-c', bocName: 'A Battery', poc: 'rpoc-c20' }),
    BN2_B_D10: makePocSnapshot('D10', { bde: 'rbde-1', bn: 'rbn-2', bnName: '2-27 FAR', boc: 'rboc-d', bocName: 'B Battery', poc: 'rpoc-d10' }),
    BN2_B_D20: makePocSnapshot('D20', { bde: 'rbde-1', bn: 'rbn-2', bnName: '2-27 FAR', boc: 'rboc-d', bocName: 'B Battery', poc: 'rpoc-d20' }),
  }

  // BOC receiver clients.
  let boc1A = makeLocalBocState('local-boc-1a', 'local-bn-1', 'local-bde-1', 'A Battery', ['A10', 'A20'])
  boc1A = mergeAppStateByPocId(boc1A, pocSnaps.BN1_A_A10, 'rpoc-a10')
  boc1A = mergeAppStateByPocId(boc1A, pocSnaps.BN1_A_A20, 'rpoc-a20')
  boc1A = reconcileAppStateIntegrity(boc1A)

  let boc1B = makeLocalBocState('local-boc-1b', 'local-bn-1', 'local-bde-1', 'B Battery', ['B10', 'B20'])
  boc1B = mergeAppStateByPocId(boc1B, pocSnaps.BN1_B_B10, 'rpoc-b10')
  boc1B = mergeAppStateByPocId(boc1B, pocSnaps.BN1_B_B20, 'rpoc-b20')
  boc1B = reconcileAppStateIntegrity(boc1B)

  let boc2A = makeLocalBocState('local-boc-2a', 'local-bn-2', 'local-bde-1', 'A Battery', ['C10', 'C20'])
  boc2A = mergeAppStateByPocId(boc2A, pocSnaps.BN2_A_C10, 'rpoc-c10')
  boc2A = mergeAppStateByPocId(boc2A, pocSnaps.BN2_A_C20, 'rpoc-c20')
  boc2A = reconcileAppStateIntegrity(boc2A)

  let boc2B = makeLocalBocState('local-boc-2b', 'local-bn-2', 'local-bde-1', 'B Battery', ['D10', 'D20'])
  boc2B = mergeAppStateByPocId(boc2B, pocSnaps.BN2_B_D10, 'rpoc-d10')
  boc2B = mergeAppStateByPocId(boc2B, pocSnaps.BN2_B_D20, 'rpoc-d20')
  boc2B = reconcileAppStateIntegrity(boc2B)

  // Battalion receiver clients (ingesting full battalion-scoped snapshots).
  let bn1 = emptyState()
  bn1.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn1.battalions = [{ id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' }]
  const bn1Remote = combineStates(boc1A, boc1B)
  bn1 = mergeAppStateByBattalionId(bn1, bn1Remote, 'local-bn-1')

  let bn2 = emptyState()
  bn2.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn2.battalions = [{ id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' }]
  const bn2Remote = combineStates(boc2A, boc2B)
  bn2 = mergeAppStateByBattalionId(bn2, bn2Remote, 'local-bn-2')

  // Brigade receiver client (ingesting full brigade-scoped snapshot).
  let bde = emptyState()
  bde.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bde.battalions = [
    { id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' },
    { id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' },
  ]
  const bdeRemote = combineStates(bn1, bn2)
  bde = mergeAppStateByBrigadeId(bde, bdeRemote, 'local-bde-1')
  bde = reconcileAppStateIntegrity(bde)

  const refs = countInvalidRefs(bde)
  assert(refs.launcherPod === 0, `launcher->pod invalid refs: ${refs.launcherPod}`)
  assert(refs.podLauncher === 0, `pod->launcher invalid refs: ${refs.podLauncher}`)
  assert(refs.podRsv === 0, `pod->rsv invalid refs: ${refs.podRsv}`)
  assert(bde.pocs.length >= 8, `expected >=8 POCs, got ${bde.pocs.length}`)
  assert(bde.bocs.length >= 4, `expected >=4 BOCs, got ${bde.bocs.length}`)
  assert(bde.battalions.length >= 2, `expected >=2 battalions, got ${bde.battalions.length}`)
  assert(bde.brigades.length >= 1, `expected >=1 brigade, got ${bde.brigades.length}`)
  assert(bde.launchers.length >= 16, `expected >=16 launchers, got ${bde.launchers.length}`)
  assert(
    bde.rsvs.length >= 8,
    `expected >=8 rsvs, got ${bde.rsvs.length}; ids=${bde.rsvs.map((r) => `${r.id}:${r.name}`).join(',')}`
  )
  assert(bde.ammoPlatoons.length >= 4, `expected >=4 ammo platoons, got ${bde.ammoPlatoons.length}`)
  assert(bde.pods.length >= 32, `expected >=32 pods, got ${bde.pods.length}`)
  assert(bde.rsvs.filter((r) => r.name === r.id).length === 0, 'expected no synthetic RSV display names')
  assert(bde.tasks.length >= 8, `expected >=8 tasks, got ${bde.tasks.length}`)
  assert(
    bde.pods.filter((p) => p.launcherId).length >= 16,
    `expected >=16 pods on launchers, got ${bde.pods.filter((p) => p.launcherId).length}`
  )
  assert(
    bde.pods.filter((p) => p.pocId).length >= 16,
    `expected >=16 POC-stock pods, got ${bde.pods.filter((p) => p.pocId).length}`
  )

  // Update wave: simulate additional reloads + cross-echelon reassignments + name updates.
  const updateA10 = cloneState(pocSnaps.BN1_A_A10)
  const a10RsvId = 'rsv-A10'
  const a10L1 = 'L-A10-1'
  const podLoaded = updateA10.pods.find((p) => p.id === 'POD-A10-L1')
  const podReserve = updateA10.pods.find((p) => p.id === 'POD-A10-RSV')
  const rsvA10 = updateA10.rsvs.find((r) => r.id === a10RsvId)
  const launchA10 = updateA10.launchers.find((l) => l.id === a10L1)
  if (!podLoaded || !podReserve || !rsvA10 || !launchA10) {
    throw new Error('seed update A10 missing expected entities')
  }
  const taskA10 = updateA10.tasks.find((t) => t.id === 'task-A10-reload')
  if (!taskA10) throw new Error('seed update A10 missing expected task')
  // Rename RSV and rotate pods:
  rsvA10.name = 'RSV A10 RENAMED'
  launchA10.podId = podReserve.id
  podReserve.name = 'RELOAD_A10_PRIMARY'
  podReserve.launcherId = a10L1
  podReserve.rsvId = undefined
  podReserve.pocId = 'rpoc-a10'
  podLoaded.name = 'BACKUP_A10_STOWED'
  podLoaded.launcherId = undefined
  podLoaded.pocId = 'rpoc-a10'
  podLoaded.rsvId = undefined
  podLoaded.bocId = undefined
  taskA10.progress = 87
  taskA10.status = 'in-progress'
  boc1A = mergeAppStateByPocId(boc1A, updateA10, 'rpoc-a10')
  boc1A = reconcileAppStateIntegrity(boc1A)

  // Rebuild upstream with updated full-scope snapshots.
  bn1 = emptyState()
  bn1.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn1.battalions = [{ id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' }]
  const bn1RemoteUpdate = combineStates(boc1A, boc1B)
  bn1 = mergeAppStateByBattalionId(bn1, bn1RemoteUpdate, 'local-bn-1')
  bn2 = emptyState()
  bn2.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn2.battalions = [{ id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' }]
  const bn2RemoteUpdate = combineStates(boc2A, boc2B)
  bn2 = mergeAppStateByBattalionId(bn2, bn2RemoteUpdate, 'local-bn-2')

  bde = emptyState()
  bde.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bde.battalions = [
    { id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' },
    { id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' },
  ]
  const bdeRemoteUpdate = combineStates(bn1, bn2)
  bde = mergeAppStateByBrigadeId(bde, bdeRemoteUpdate, 'local-bde-1')
  bde = reconcileAppStateIntegrity(bde)

  // Name and assignment invariants after reload/reassignment wave.
  const lA10 = bde.launchers.find((l) => l.id === a10L1)
  assert(Boolean(lA10?.podId), 'expected A10 launcher to keep loaded pod after update wave')
  const loadedAfter = bde.pods.find((p) => p.id === lA10?.podId)
  assert(loadedAfter?.name === 'RELOAD_A10_PRIMARY', 'expected updated reload pod name to propagate')
  assert(loadedAfter?.launcherId === a10L1, 'expected updated reload pod assignment to launcher')
  const stowed = bde.pods.find((p) => p.name === 'BACKUP_A10_STOWED')
  assert(Boolean(stowed), 'expected stowed pod rename to propagate')
  assert(!stowed?.launcherId, 'expected stowed pod to be off launcher')
  assert(stowed?.pocId === 'local-A10', 'expected stowed pod to remain in local POC holding')
  const renamedRsv = bde.rsvs.find((r) => r.name === 'RSV A10 RENAMED')
  assert(Boolean(renamedRsv), 'expected RSV rename to propagate')
  const taskAfter = bde.tasks.find((t) => t.id === 'task-A10-reload')
  assert(Boolean(taskAfter), 'expected A10 task to propagate')
  assert(taskAfter?.progress === 87, 'expected updated A10 task progress to propagate')
  assert(taskAfter?.pocIds?.includes('local-A10') === true, 'expected A10 task pocIds to map to local POC id')

  console.log('SYNC_FULL_CHAIN_OK')
  console.log(
    JSON.stringify(
      {
        brigades: bde.brigades.length,
        battalions: bde.battalions.length,
        bocs: bde.bocs.length,
        pocs: bde.pocs.length,
        launchers: bde.launchers.length,
        rsvs: bde.rsvs.length,
        ammoPlatoons: bde.ammoPlatoons.length,
        pods: bde.pods.length,
        tasks: bde.tasks.length,
        updatedRsvName: renamedRsv?.name ?? null,
        updatedA10LoadedPod: loadedAfter?.name ?? null,
        updatedStowedPod: stowed?.name ?? null,
      },
      null,
      2
    )
  )
}

try {
  run()
} catch (e) {
  console.error('SYNC_FULL_CHAIN_FAIL')
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}

