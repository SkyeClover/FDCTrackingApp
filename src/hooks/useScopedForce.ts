import { useMemo } from 'react'
import { useAppData } from '../context/AppDataContext'
import type { BOC, POC, Launcher, Pod, RSV, CurrentUserRole } from '../types'
import { getScopedForce, orgSliceFromState, type ViewDensity } from '../utils/roleScope'

export type { ViewDensity }

export interface ScopedForce {
  viewDensity: ViewDensity
  /** When false, UI shows full org (no role filter). */
  isScoped: boolean
  currentUserRole: CurrentUserRole | undefined
  scopedBOCs: BOC[]
  scopedPOCs: POC[]
  scopedLaunchers: Launcher[]
  scopedPods: Pod[]
  scopedRSVs: RSV[]
}

/**
 * Filters force entities to the subtree implied by `currentUserRole`.
 * Brigade / Battalion → batteries and PLTs under that echelon; BOC / POC as before.
 */
export function useScopedForce(): ScopedForce {
  const { brigades, battalions, bocs, pocs, launchers, pods, rsvs, currentUserRole } = useAppData()

  return useMemo(() => {
    const scoped = getScopedForce(
      orgSliceFromState({ brigades, battalions, bocs, pocs, launchers, pods, rsvs }),
      currentUserRole
    )
    return {
      ...scoped,
      currentUserRole,
    }
  }, [brigades, battalions, bocs, pocs, launchers, pods, rsvs, currentUserRole])
}
