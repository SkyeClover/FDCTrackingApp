import type { AppState, TaskTemplate } from '../src/types'
import {
  mergeAppStateByBocId,
  mergeAppStateByBattalionId,
  mergeAppStateByBrigadeId,
  reconcileAppStateIntegrity,
} from '../src/utils/mergeSyncSnapshot'

const defaultTemplates: TaskTemplate[] = [
  { id: 'reload-default', name: 'Reload', description: 'Reload launcher', duration: 900, type: 'reload' },
]

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
    version: '1.1.13',
    ammoPlatoons: [],
  }
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

function cloneState<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

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
  boc1A = mergeAppStateByBocId(boc1A, pocSnaps.BN1_A_A10, 'local-boc-1a')
  boc1A = mergeAppStateByBocId(boc1A, pocSnaps.BN1_A_A20, 'local-boc-1a')
  boc1A = reconcileAppStateIntegrity(boc1A)

  let boc1B = makeLocalBocState('local-boc-1b', 'local-bn-1', 'local-bde-1', 'B Battery', ['B10', 'B20'])
  boc1B = mergeAppStateByBocId(boc1B, pocSnaps.BN1_B_B10, 'local-boc-1b')
  boc1B = mergeAppStateByBocId(boc1B, pocSnaps.BN1_B_B20, 'local-boc-1b')
  boc1B = reconcileAppStateIntegrity(boc1B)

  let boc2A = makeLocalBocState('local-boc-2a', 'local-bn-2', 'local-bde-1', 'A Battery', ['C10', 'C20'])
  boc2A = mergeAppStateByBocId(boc2A, pocSnaps.BN2_A_C10, 'local-boc-2a')
  boc2A = mergeAppStateByBocId(boc2A, pocSnaps.BN2_A_C20, 'local-boc-2a')
  boc2A = reconcileAppStateIntegrity(boc2A)

  let boc2B = makeLocalBocState('local-boc-2b', 'local-bn-2', 'local-bde-1', 'B Battery', ['D10', 'D20'])
  boc2B = mergeAppStateByBocId(boc2B, pocSnaps.BN2_B_D10, 'local-boc-2b')
  boc2B = mergeAppStateByBocId(boc2B, pocSnaps.BN2_B_D20, 'local-boc-2b')
  boc2B = reconcileAppStateIntegrity(boc2B)

  // Battalion receiver clients (ingesting from BOC clients).
  let bn1 = emptyState()
  bn1.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn1.battalions = [{ id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' }]
  bn1 = mergeAppStateByBattalionId(bn1, boc1A, 'local-bn-1')
  bn1 = mergeAppStateByBattalionId(bn1, boc1B, 'local-bn-1')

  let bn2 = emptyState()
  bn2.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn2.battalions = [{ id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' }]
  bn2 = mergeAppStateByBattalionId(bn2, boc2A, 'local-bn-2')
  bn2 = mergeAppStateByBattalionId(bn2, boc2B, 'local-bn-2')

  // Brigade receiver client (ingesting from battalion clients).
  let bde = emptyState()
  bde.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bde.battalions = [
    { id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' },
    { id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' },
  ]
  bde = mergeAppStateByBrigadeId(bde, bn1, 'local-bde-1')
  bde = mergeAppStateByBrigadeId(bde, bn2, 'local-bde-1')
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
  assert(bde.pods.length >= 48, `expected >=48 pods, got ${bde.pods.length}`)
  assert(bde.rsvs.filter((r) => r.name === r.id).length === 0, 'expected no synthetic RSV display names')

  // Update wave: simulate additional reloads + cross-echelon reassignments + name updates.
  const updateA10 = cloneState(pocSnaps.BN1_A_A10)
  const a10RsvId = 'rsv-A10'
  const a10L1 = 'L-A10-1'
  const podLoaded = updateA10.pods.find((p) => p.id === 'POD-A10-L1')
  const podReserve = updateA10.pods.find((p) => p.id === 'POD-A10-RSV')
  const podAmmo = updateA10.pods.find((p) => p.id === 'POD-A10-AMMO')
  const podBoc = updateA10.pods.find((p) => p.id === 'POD-A10-BOC')
  const rsvA10 = updateA10.rsvs.find((r) => r.id === a10RsvId)
  const launchA10 = updateA10.launchers.find((l) => l.id === a10L1)
  if (!podLoaded || !podReserve || !podAmmo || !podBoc || !rsvA10 || !launchA10) {
    throw new Error('seed update A10 missing expected entities')
  }
  // Rename RSV and rotate pods:
  rsvA10.name = 'RSV A10 RENAMED'
  launchA10.podId = podReserve.id
  podReserve.name = 'RELOAD_A10_PRIMARY'
  podReserve.launcherId = a10L1
  podReserve.rsvId = undefined
  podReserve.pocId = 'rpoc-a10'
  podLoaded.name = 'BACKUP_A10_STOWED'
  podLoaded.launcherId = undefined
  podLoaded.pocId = undefined
  podLoaded.rsvId = undefined
  podLoaded.bocId = 'rboc-a'
  // Reassign one pod to RSV and one to battalion-level holding.
  podAmmo.name = 'A10_AMMO_TO_RSV'
  podAmmo.ammoPltId = undefined
  podAmmo.rsvId = a10RsvId
  podAmmo.pocId = 'rpoc-a10'
  podBoc.name = 'A10_BOC_TO_BN_HOLD'
  podBoc.bocId = 'rboc-a'

  const updateB20 = cloneState(pocSnaps.BN1_B_B20)
  const podB20 = updateB20.pods.find((p) => p.id === 'POD-B20-POC')
  if (!podB20) throw new Error('seed update B20 missing expected pod')
  podB20.name = 'B20_POC_TO_BRIGADE_HOLD'
  podB20.pocId = 'rpoc-b20'

  boc1A = mergeAppStateByBocId(boc1A, updateA10, 'local-boc-1a')
  boc1B = mergeAppStateByBocId(boc1B, updateB20, 'local-boc-1b')
  boc1A = reconcileAppStateIntegrity(boc1A)
  boc1B = reconcileAppStateIntegrity(boc1B)

  // Rebuild upstream with updated BOC snapshots.
  bn1 = emptyState()
  bn1.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn1.battalions = [{ id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' }]
  bn1 = mergeAppStateByBattalionId(bn1, boc1A, 'local-bn-1')
  bn1 = mergeAppStateByBattalionId(bn1, boc1B, 'local-bn-1')
  bn2 = emptyState()
  bn2.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bn2.battalions = [{ id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' }]
  bn2 = mergeAppStateByBattalionId(bn2, boc2A, 'local-bn-2')
  bn2 = mergeAppStateByBattalionId(bn2, boc2B, 'local-bn-2')

  // Reassign at battalion echelon (authoritative stage for battalion/brigade holding pools).
  const bnHoldTarget = bn1.pods.find((p) => p.name === 'A10_BOC_TO_BN_HOLD')
  if (!bnHoldTarget) throw new Error('missing battalion hold target pod in bn1')
  bnHoldTarget.name = 'A10_TO_BN_HOLD_FINAL'
  bnHoldTarget.launcherId = undefined
  bnHoldTarget.pocId = undefined
  bnHoldTarget.rsvId = undefined
  bnHoldTarget.bocId = undefined
  bnHoldTarget.battalionId = 'local-bn-1'

  const bdeHoldTarget = bn1.pods.find((p) => p.name === 'B20_POC_TO_BRIGADE_HOLD')
  if (!bdeHoldTarget) throw new Error('missing brigade hold target pod in bn1')
  bdeHoldTarget.name = 'B20_TO_BDE_HOLD_FINAL'
  bdeHoldTarget.launcherId = undefined
  bdeHoldTarget.pocId = undefined
  bdeHoldTarget.rsvId = undefined
  bdeHoldTarget.bocId = undefined
  bdeHoldTarget.brigadeId = 'local-bde-1'
  bde = emptyState()
  bde.brigades = [{ id: 'local-bde-1', name: '1st Brigade' }]
  bde.battalions = [
    { id: 'local-bn-1', name: '1-27 FAR', brigadeId: 'local-bde-1' },
    { id: 'local-bn-2', name: '2-27 FAR', brigadeId: 'local-bde-1' },
  ]
  bde = mergeAppStateByBrigadeId(bde, bn1, 'local-bde-1')
  bde = mergeAppStateByBrigadeId(bde, bn2, 'local-bde-1')
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
  assert(stowed?.bocId === 'local-boc-1a', 'expected stowed pod to be in local BOC holding')
  const ammoToRsv = bde.pods.find((p) => p.name === 'A10_AMMO_TO_RSV')
  assert(Boolean(ammoToRsv?.rsvId), 'expected ammo-to-RSV reassignment to persist')
  const renamedRsv = bde.rsvs.find((r) => r.name === 'RSV A10 RENAMED')
  assert(Boolean(renamedRsv), 'expected RSV rename to propagate')
  assert(ammoToRsv?.rsvId === renamedRsv?.id, 'expected reassigned pod to resolve to renamed RSV')
  const bnHold = bde.pods.find((p) => p.name === 'A10_TO_BN_HOLD_FINAL')
  assert(Boolean(bnHold), 'expected battalion-hold pod rename to propagate')
  assert(bnHold?.battalionId === 'local-bn-1', 'expected battalion-level assignment to map to local battalion')
  const bdeHold = bde.pods.find((p) => p.name === 'B20_TO_BDE_HOLD_FINAL')
  assert(Boolean(bdeHold), 'expected brigade-hold pod rename to propagate')
  assert(bdeHold?.brigadeId === 'local-bde-1', 'expected brigade-level assignment to map to local brigade')

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
        updatedBnHoldPod: bnHold?.name ?? null,
        updatedBdeHoldPod: bdeHold?.name ?? null,
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

