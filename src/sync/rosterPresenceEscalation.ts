/** After this long with yellow candidate while tab is treated offline, roster shows red (sync/ping use immediate red for tab-closed). */
export const STATION_OFFLINE_RED_AFTER_MS = 3 * 60 * 1000

/**
 * @param candidateStatus — immediate color from health/push (before timeout).
 * @param stationOfflineYellow — true only for tab-missing on a tracked ingest.
 */
export function applyStationOfflineEscalation(args: {
  candidateStatus: 'green' | 'yellow' | 'red'
  stationOfflineYellow: boolean
  prevOfflineSinceMs: number | null
  now?: number
}): { status: 'green' | 'yellow' | 'red'; stationOfflineSinceMs: number | null } {
  const now = args.now ?? Date.now()
  const { candidateStatus, stationOfflineYellow, prevOfflineSinceMs } = args

  if (candidateStatus === 'green') {
    return { status: 'green', stationOfflineSinceMs: null }
  }
  if (candidateStatus === 'red') {
    return { status: 'red', stationOfflineSinceMs: null }
  }
  if (!stationOfflineYellow) {
    return { status: 'yellow', stationOfflineSinceMs: null }
  }

  const since = prevOfflineSinceMs ?? now
  if (now - since >= STATION_OFFLINE_RED_AFTER_MS) {
    return { status: 'red', stationOfflineSinceMs: null }
  }
  return { status: 'yellow', stationOfflineSinceMs: since }
}
