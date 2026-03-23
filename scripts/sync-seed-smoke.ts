import type { AppState, TaskTemplate } from '../src/types'
import {
  mergeAppStateByPocId,
  reconcileAppStateIntegrity,
} from '../src/utils/mergeSyncSnapshot'

const defaultTemplates: TaskTemplate[] = [
  { id: 'reload-default', name: 'Reload', description: 'Reload launcher', duration: 900, type: 'reload' },
]

/**
 * Implements base state for this module.
 */
function baseState(): AppState {
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

/**
 * Implements assert for this module.
 */
function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

/**
 * Implements run for this module.
 */
function run(): void {
  // Receiver (BOC) local DB with local IDs.
  const bocLocal = baseState()
  bocLocal.brigades = [{ id: 'bde-local', name: '1st Brigade' }]
  bocLocal.battalions = [{ id: 'bn-local', name: '1-27 FAR', brigadeId: 'bde-local' }]
  bocLocal.bocs = [{ id: 'boc-local', name: 'A Battery', pocs: [], battalionId: 'bn-local' }]
  bocLocal.pocs = [{ id: 'poc-local-a10', name: 'A10', launchers: [], bocId: 'boc-local' }]
  bocLocal.launchers = [
    { id: 'L-A10-1', name: 'A10-L1', pocId: 'poc-local-a10', status: 'idle' },
    { id: 'L-A10-2', name: 'A10-L2', pocId: 'poc-local-a10', status: 'idle' },
  ]
  // Existing local RSV with real name (different id than sender).
  bocLocal.rsvs = [{ id: 'rsv-local-a10-1', name: 'A10 RSV 1', pocId: 'poc-local-a10', bocId: 'boc-local' }]
  bocLocal.pods = [
    {
      id: 'pod-local-stale-l2',
      uuid: 'uuid-local-stale-l2',
      name: 'STALE_POD_L2',
      rounds: [{ id: 's1', type: 'M31', status: 'available' }],
      launcherId: 'L-A10-2',
      pocId: 'poc-local-a10',
    },
  ]
  bocLocal.tasks = [
    {
      id: 'reload-stale-l2',
      name: 'Reload stale',
      description: 'Stale local task should be pruned by authoritative merge',
      status: 'in-progress',
      progress: 5,
      launcherIds: ['L-A10-2'],
      pocIds: ['poc-local-a10'],
    },
  ]

  // Sender (POC) snapshot with different hierarchy IDs and RSV omitted (only referenced by pods).
  const pocRemote = baseState()
  pocRemote.brigades = [{ id: 'bde-remote', name: '1st Brigade' }]
  pocRemote.battalions = [{ id: 'bn-remote', name: '1-27 FAR', brigadeId: 'bde-remote' }]
  pocRemote.bocs = [{ id: 'boc-remote', name: 'A Battery', pocs: [], battalionId: 'bn-remote' }]
  pocRemote.pocs = [{ id: 'poc-remote-a10', name: 'A10', launchers: [], bocId: 'boc-remote' }]
  pocRemote.launchers = [
    {
      id: 'L-A10-1',
      name: 'A10-L1',
      pocId: 'poc-remote-a10',
      podId: 'pod-remote-loaded-1',
      status: 'active',
    },
  ]
  pocRemote.pods = [
    {
      id: 'pod-remote-loaded-1',
      uuid: 'uuid-loaded-1',
      name: 'INITLOAD_M31_3',
      rounds: [
        { id: 'r1', type: 'M31', status: 'available' },
        { id: 'r2', type: 'M31', status: 'available' },
      ],
      launcherId: 'L-A10-1',
      pocId: 'poc-remote-a10',
      rsvId: '1774203479692',
    },
    {
      id: 'pod-remote-stock-2',
      uuid: 'uuid-stock-2',
      name: 'INITLOAD_M31_4',
      rounds: [{ id: 'r3', type: 'M31', status: 'available' }],
      pocId: 'poc-remote-a10',
      rsvId: '1774203479692',
    },
  ]
  pocRemote.tasks = [
    {
      id: 'reload-1',
      name: 'Reload: INITLOAD_M31_3',
      description: 'Reload launcher with pod "INITLOAD_M31_3"',
      status: 'in-progress',
      progress: 10,
      launcherIds: ['L-A10-1'],
      pocIds: ['poc-remote-a10'],
    },
  ]

  // Hop 1: POC -> BOC scoped merge (POC scoped path, with remote/local POC ID mismatch).
  const mergedAtBoc = mergeAppStateByPocId(bocLocal, pocRemote, 'poc-remote-a10')
  const pocScopedRsvs = mergedAtBoc.rsvs.filter((r) => r.pocId === 'poc-local-a10')
  assert(pocScopedRsvs.length === 1, `Expected exactly one RSV in POC scope, got ${pocScopedRsvs.length}`)
  const rsv = pocScopedRsvs[0]
  assert(rsv.name === 'A10 RSV 1', 'Expected RSV real name to be preserved')
  assert(!mergedAtBoc.rsvs.some((x) => x.name === x.id), 'Expected no synthetic fallback RSV labels')

  const launcher = mergedAtBoc.launchers.find((l) => l.id === 'L-A10-1')
  assert(Boolean(launcher?.podId), 'Expected launcher to carry reloaded pod assignment')
  const loadedPod = mergedAtBoc.pods.find((p) => p.id === launcher?.podId)
  assert(Boolean(loadedPod), 'Expected launcher podId to resolve to an existing pod')
  assert(loadedPod?.launcherId === 'L-A10-1', 'Expected loaded pod to point back to launcher')
  assert(loadedPod?.rsvId === rsv.id, 'Expected pod RSV to resolve to local RSV id')
  assert(!mergedAtBoc.launchers.some((l) => l.id === 'L-A10-2'), 'Expected stale launcher to be pruned')
  assert(
    !mergedAtBoc.pods.some((p) => p.id === 'pod-local-stale-l2'),
    'Expected stale pod to be pruned with stale launcher'
  )
  assert(
    !mergedAtBoc.tasks.some((t) => t.id === 'reload-stale-l2'),
    'Expected stale task to be pruned with stale launcher scope'
  )
  const reloadTask = mergedAtBoc.tasks.find((t) => t.id === 'reload-1')
  assert(Boolean(reloadTask), 'Expected incoming launcher task to be present')
  assert(
    reloadTask?.launcherIds?.includes('L-A10-1') === true,
    'Expected incoming task to reference updated launcher scope'
  )

  // Hop 2/3: BOC -> Battalion -> Brigade behave like full-apply then integrity reconcile.
  const atBn = reconcileAppStateIntegrity({ ...mergedAtBoc })
  const atBde = reconcileAppStateIntegrity({ ...atBn })
  const endLauncher = atBde.launchers.find((l) => l.id === 'L-A10-1')
  const endPod = atBde.pods.find((p) => p.id === endLauncher?.podId)
  assert(Boolean(endPod), 'Expected launcher/pod link to survive upstream hops')
  assert(endPod?.rsvId === rsv.id, 'Expected RSV resolution to survive upstream hops')

  console.log('SYNC_SMOKE_OK')
  console.log(
    JSON.stringify(
      {
        launchers: atBde.launchers.length,
        pods: atBde.pods.length,
        rsvs: atBde.rsvs.length,
        tasks: atBde.tasks.length,
        launcherPod: endLauncher?.podId ?? null,
        podRsv: endPod?.rsvId ?? null,
        rsvName: rsv.name,
      },
      null,
      2
    )
  )
}

try {
  run()
} catch (e) {
  console.error('SYNC_SMOKE_FAIL')
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}

