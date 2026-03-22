import type { AppState, TaskTemplate } from '../src/types'
import {
  mergeAppStateByBocId,
  reconcileAppStateIntegrity,
} from '../src/utils/mergeSyncSnapshot'

const defaultTemplates: TaskTemplate[] = [
  { id: 'reload-default', name: 'Reload', description: 'Reload launcher', duration: 900, type: 'reload' },
]

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

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

function run(): void {
  // Receiver (BOC) local DB with local IDs.
  const bocLocal = baseState()
  bocLocal.brigades = [{ id: 'bde-local', name: '1st Brigade' }]
  bocLocal.battalions = [{ id: 'bn-local', name: '1-27 FAR', brigadeId: 'bde-local' }]
  bocLocal.bocs = [{ id: 'boc-local', name: 'A Battery', pocs: [], battalionId: 'bn-local' }]
  bocLocal.pocs = [{ id: 'poc-local-a10', name: 'A10', launchers: [], bocId: 'boc-local' }]
  bocLocal.launchers = [{ id: 'L-A10-1', name: 'A10-L1', pocId: 'poc-local-a10', status: 'idle' }]
  // Existing local RSV with real name (different id than sender).
  bocLocal.rsvs = [{ id: 'rsv-local-a10-1', name: 'A10 RSV 1', pocId: 'poc-local-a10', bocId: 'boc-local' }]

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

  // Hop 1: POC -> BOC scoped merge.
  const mergedAtBoc = mergeAppStateByBocId(bocLocal, pocRemote, 'boc-local')
  const rsv = mergedAtBoc.rsvs.find((r) => r.id === 'rsv-local-a10-1')
  assert(Boolean(rsv), 'Expected local scoped RSV to remain present')
  assert(rsv?.name === 'A10 RSV 1', 'Expected RSV real name to be preserved')
  assert(!mergedAtBoc.rsvs.some((x) => x.name === x.id), 'Expected no synthetic fallback RSV labels')

  const launcher = mergedAtBoc.launchers.find((l) => l.id === 'L-A10-1')
  assert(Boolean(launcher?.podId), 'Expected launcher to carry reloaded pod assignment')
  const loadedPod = mergedAtBoc.pods.find((p) => p.id === launcher?.podId)
  assert(Boolean(loadedPod), 'Expected launcher podId to resolve to an existing pod')
  assert(loadedPod?.launcherId === 'L-A10-1', 'Expected loaded pod to point back to launcher')
  assert(loadedPod?.rsvId === 'rsv-local-a10-1', 'Expected pod RSV to resolve to local RSV id')

  // Hop 2/3: BOC -> Battalion -> Brigade behave like full-apply then integrity reconcile.
  const atBn = reconcileAppStateIntegrity({ ...mergedAtBoc })
  const atBde = reconcileAppStateIntegrity({ ...atBn })
  const endLauncher = atBde.launchers.find((l) => l.id === 'L-A10-1')
  const endPod = atBde.pods.find((p) => p.id === endLauncher?.podId)
  assert(Boolean(endPod), 'Expected launcher/pod link to survive upstream hops')
  assert(endPod?.rsvId === 'rsv-local-a10-1', 'Expected RSV resolution to survive upstream hops')

  console.log('SYNC_SMOKE_OK')
  console.log(
    JSON.stringify(
      {
        launchers: atBde.launchers.length,
        pods: atBde.pods.length,
        rsvs: atBde.rsvs.length,
        launcherPod: endLauncher?.podId ?? null,
        podRsv: endPod?.rsvId ?? null,
        rsvName: atBde.rsvs.find((x) => x.id === 'rsv-local-a10-1')?.name ?? null,
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

