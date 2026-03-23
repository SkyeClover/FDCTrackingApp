import { describe, expect, it } from 'vitest'
import { mergeSimulationPatch } from './mergeSimulationPatch'
import type { AppState } from '../types'
import { getDefaultState } from '../utils/saveLoad'

/**
 * Implements minimal state for this module.
 */
function minimalState(): AppState {
  const s = getDefaultState()
  return {
    ...s,
    pocs: [{ id: 'p1', name: 'POC 1', launchers: [], bocId: 'b1' }],
    launchers: [{ id: 'L1', name: 'L1', pocId: 'p1', status: 'idle' }],
    tasks: [],
  }
}

describe('mergeSimulationPatch', () => {
  it('merges overlay unit states by entityRef', () => {
    const base = minimalState()
    const a = mergeSimulationPatch(base, {
      simulationOverlay: {
        protocolVersion: 1,
        unitStates: [
          {
            entityRef: 'poc:p1',
            unitRole: 'lineUnit',
            destructionLevel: 'degraded',
            mgrsGrid: '48R',
          },
        ],
      },
    })
    expect(a.simulationOverlay?.unitStates).toHaveLength(1)
    const b = mergeSimulationPatch(a, {
      simulationOverlay: {
        unitStates: [
          {
            entityRef: 'poc:p1',
            unitRole: 'lineUnit',
            destructionLevel: 'destroyed',
            mgrsGrid: '48R',
          },
        ],
      },
    })
    expect(b.simulationOverlay?.unitStates).toHaveLength(1)
    expect(b.simulationOverlay?.unitStates[0].destructionLevel).toBe('destroyed')
  })

  it('patches tasks by id', () => {
    const base = minimalState()
    const withTask = mergeSimulationPatch(base, {
      tasks: [
        {
          id: 't1',
          name: 'Fire',
          description: '',
          status: 'in-progress',
          progress: 50,
        },
      ],
    })
    expect(withTask.tasks.find((t) => t.id === 't1')?.progress).toBe(50)
    const updated = mergeSimulationPatch(withTask, {
      tasks: [{ id: 't1', progress: 80 }],
    })
    expect(updated.tasks.find((t) => t.id === 't1')?.progress).toBe(80)
  })

  it('removes tasks when removeTaskIds set', () => {
    const base = mergeSimulationPatch(minimalState(), {
      tasks: [{ id: 't1', name: 'x', description: '', status: 'pending', progress: 0 }],
    })
    expect(base.tasks).toHaveLength(1)
    const next = mergeSimulationPatch(base, { removeTaskIds: ['t1'] })
    expect(next.tasks).toHaveLength(0)
  })

  it('updates pod round availability from sim patches', () => {
    const base = minimalState()
    const withPod = {
      ...base,
      pods: [
        {
          id: 'L1-pod-1',
          uuid: 'L1-pod-1',
          name: 'Loaded Pod',
          launcherId: 'L1',
          rounds: Array.from({ length: 6 }).map((_, i) => ({
            id: `r-${i + 1}`,
            type: 'M31',
            status: 'available' as const,
          })),
        },
      ],
    }
    const next = mergeSimulationPatch(withPod, {
      pods: [
        {
          id: 'L1-pod-1',
          rounds: Array.from({ length: 6 }).map((_, i) => ({
            id: `L1-pod-1-sim-${i + 1}`,
            type: 'M31',
            status: i < 2 ? 'available' : 'used',
          })),
        },
      ],
    })
    const pod = next.pods.find((p) => p.id === 'L1-pod-1')
    expect(pod).toBeTruthy()
    expect(pod?.rounds.filter((r) => r.status === 'available').length).toBe(2)
  })
})
