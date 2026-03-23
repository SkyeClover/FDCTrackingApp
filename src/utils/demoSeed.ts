import type { AmmoPlatoon, AppState, BOC, Launcher, POC, Pod, Round, RSV } from '../types'
import { getDefaultState } from './saveLoad'

const ROUND_ROTATION = ['M28A1', 'M26', 'M31', 'M30', 'M57', 'M39'] as const

/**
 * Implements make rounds for this module.
 */
function makeRounds(prefix: string, count: number): Round[] {
  const out: Round[] = []
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: `${prefix}-rnd-${i + 1}`,
      type: ROUND_ROTATION[i % ROUND_ROTATION.length],
      status: 'available',
    })
  }
  return out
}

/**
 * Build a complete seeded force for simulation/training:
 * - 1 brigade, 1 battalion
 * - 1 BOC, 1 ammo platoon (ammo platoon belongs only to the BOC)
 * - 3 POCs
 * - 1-2 launchers per POC
 * - 1 RSV per POC
 * - ~4 reserve pods carried per RSV
 * - Pods loaded on launchers + reserve pods on RSVs with mixed round types
 */
export function buildDemoSeedState(): AppState {
  const base = getDefaultState()

  const brigadeId = 'bde-1'
  const battalionId = 'bn-1'
  const brigades = [{ id: brigadeId, name: '1st Fires Brigade' }]
  const battalions = [{ id: battalionId, name: '1st Rocket Battalion', brigadeId }]

  const bocs: BOC[] = []
  const pocs: POC[] = []
  const launchers: Launcher[] = []
  const ammoPlatoons: AmmoPlatoon[] = []
  const rsvs: RSV[] = []
  const pods: Pod[] = []

  for (let b = 1; b <= 1; b += 1) {
    const bocId = `boc-${b}`
    const bocName = `BOC ${b}`
    const bocPocs: POC[] = []

    const ammoPltId = `ammo-plt-${b}`
    ammoPlatoons.push({
      id: ammoPltId,
      name: `Ammo PLT ${b}`,
      bocId,
    })

    for (let p = 1; p <= 3; p += 1) {
      const pocId = `poc-${b}-${p}`
      const pocName = `POC ${b}-${p}`
      const poc: POC = {
        id: pocId,
        name: pocName,
        launchers: [],
        bocId,
      }
      pocs.push(poc)
      bocPocs.push(poc)

      // 1 RSV per POC, carrying ~4 reserve pods
      for (let r = 1; r <= 1; r += 1) {
        const rsvId = `${pocId}-rsv-${r}`
        rsvs.push({
          id: rsvId,
          name: `RSV P${b}-${p}-${r}`,
          pocId,
          bocId,
        })
        for (let pr = 1; pr <= 4; pr += 1) {
          const podId = `${rsvId}-pod-${pr}`
          pods.push({
            id: podId,
            uuid: podId,
            name: `Reserve Pod P${b}-${p}-${r}-${pr}`,
            rounds: makeRounds(podId, 6),
            rsvId,
            pocId,
            bocId,
            battalionId,
            brigadeId,
          })
        }
      }

      // 1-2 launchers per POC (alternating pattern: 1,2,1)
      const launcherCount = p % 2 === 0 ? 2 : 1
      for (let l = 1; l <= launcherCount; l += 1) {
        const launcherId = `${pocId}-ln-${l}`
        const podId = `${launcherId}-pod-1`
        launchers.push({
          id: launcherId,
          name: `HIMARS ${b}-${p}-${l}`,
          pocId,
          podId,
          status: 'idle',
        })
        pods.push({
          id: podId,
          uuid: podId,
          name: `Loaded Pod ${b}-${p}-${l}`,
          rounds: makeRounds(podId, 6),
          launcherId,
          pocId,
          bocId,
          battalionId,
          brigadeId,
        })
      }
    }

    bocs.push({
      id: bocId,
      name: bocName,
      pocs: bocPocs,
      battalionId,
    })
  }

  return {
    ...base,
    brigades,
    battalions,
    bocs,
    pocs,
    launchers,
    pods,
    rsvs,
    ammoPlatoons,
  }
}

