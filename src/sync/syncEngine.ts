import type { AppState } from '../types'
import {
  appendAuditLog,
  getStateVersion,
  getSyncMeta,
  listNetworkRoster,
  upsertNetworkRosterRow,
  type NetworkRosterRow,
} from '../persistence/sqlite'
import { fetchPeerHealth, pushSnapshotToPeer } from './peerClient'
import { isSyncSharedSecretConfigured } from './syncGuards'
import {
  applyStationOfflineEscalation,
  STATION_OFFLINE_RED_AFTER_MS,
} from './rosterPresenceEscalation'

export interface SyncRunSummary {
  targets: { row: NetworkRosterRow; result: string; path: string }[]
  usedSkip: boolean
}

/**
 * Determines whether can use skip is true in the current context.
 */
function canUseSkip(meta: ReturnType<typeof getSyncMeta>): boolean {
  return meta.skipEchelonEnabled && meta.skipEchelonVerified
}

/**
 * Implements tab down message for this module.
 */
function tabDownMessage(health: Awaited<ReturnType<typeof fetchPeerHealth>>): string {
  return health.browserOfflineKind === 'clean'
    ? 'Walker Track tab signed off (clean)'
    : health.browserOfflineKind === 'stale'
      ? 'no tab heartbeat (unclean)'
      : 'Walker Track tab offline'
}

/**
 * Push snapshot to roster peers in order; optionally skip unreachable parents (MVP: sequential try all with host).
 */
export async function runSnapshotPush(state: AppState, forceLabel: string): Promise<SyncRunSummary> {
  const meta = getSyncMeta()
  if (!isSyncSharedSecretConfigured(meta)) {
    if (forceLabel !== 'auto') {
      appendAuditLog('sync', `${forceLabel} skipped`, 'shared secret not set')
    }
    return { targets: [], usedSkip: false }
  }

  const roster = listNetworkRoster()
  const sv = getStateVersion()
  const targets: SyncRunSummary['targets'] = []
  const skipAllowed = canUseSkip(meta)

  appendAuditLog('sync', `${forceLabel} started`, `stateVersion=${sv}, peers=${roster.length}, skip=${skipAllowed}`)

  for (const row of roster) {
    if (!row.host || row.port == null) {
      targets.push({ row, result: 'skipped (no host)', path: row.displayName })
      continue
    }

    const health = await fetchPeerHealth(row, { localStateVersion: sv })
    const tabDown =
      health.transportOk && health.stationSessionTracked && !health.browserPresent
    const stationOfflineYellow = tabDown

    if (!health.transportOk && skipAllowed) {
      const esc = applyStationOfflineEscalation({
        candidateStatus: 'red',
        stationOfflineYellow: false,
        prevOfflineSinceMs: row.stationOfflineSinceMs,
      })
      upsertNetworkRosterRow({
        ...row,
        status: esc.status,
        stationOfflineSinceMs: esc.stationOfflineSinceMs,
        lastSeenMs: Date.now(),
        lastError: 'ingest unreachable',
      })
      targets.push({ row, result: 'skipped (offline, skip mode — try next)', path: `${row.host}:${row.port}` })
      appendAuditLog('sync', `skip hop ${row.id}`, 'offline with skip enabled')
      continue
    }

    if (!health.transportOk && !skipAllowed) {
      appendAuditLog(
        'sync',
        `health failed ${row.id}, push anyway`,
        'GET /fdc/v1/health failed or non-OK — still attempting POST /fdc/v1/push'
      )
    }

    const pr = await pushSnapshotToPeer(row, meta, state, sv)
    const ok = pr.ok

    let candidate: 'green' | 'yellow' | 'red'
    let stationMsg: string | null

    if (!health.transportOk) {
      candidate = 'red'
      stationMsg = 'ingest unreachable'
    } else if (!ok) {
      candidate = 'yellow'
      stationMsg = pr.detail ?? 'push failed'
    } else if (tabDown) {
      candidate = 'red'
      stationMsg = tabDownMessage(health)
    } else if (health.snapshotUnitMismatch) {
      candidate = 'yellow'
      stationMsg = 'snapshot fromUnitId ≠ Peer unit ID on roster'
    } else {
      candidate = 'green'
      stationMsg = null
    }

    const esc = applyStationOfflineEscalation({
      candidateStatus: candidate,
      stationOfflineYellow,
      prevOfflineSinceMs: row.stationOfflineSinceMs,
    })

    let lastError = stationMsg
    if (
      esc.status === 'red' &&
      candidate === 'yellow' &&
      stationOfflineYellow &&
      health.transportOk
    ) {
      const mins = STATION_OFFLINE_RED_AFTER_MS / 60_000
      lastError = `${stationMsg ?? 'Walker Track station offline'} — no recovery in ${mins}+ min`
    }

    upsertNetworkRosterRow({
      ...row,
      status: esc.status,
      stationOfflineSinceMs: esc.stationOfflineSinceMs,
      lastSeenMs: Date.now(),
      lastError,
    })

    targets.push({
      row,
      result: ok ? `ok ack=${pr.ackVersion ?? '?'}` : (pr.detail ?? 'failed'),
      path: pr.path,
    })
    appendAuditLog('sync', `push ${row.id}`, `${ok ? 'ok' : 'fail'} ${pr.path} ${pr.detail ?? ''}`)
  }

  return { targets, usedSkip: skipAllowed }
}
