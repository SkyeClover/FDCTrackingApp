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

export interface SyncRunSummary {
  targets: { row: NetworkRosterRow; result: string; path: string }[]
  usedSkip: boolean
}

function canUseSkip(meta: ReturnType<typeof getSyncMeta>): boolean {
  return meta.skipEchelonEnabled && meta.skipEchelonVerified
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
    const health = await fetchPeerHealth(row)
    const tabDown =
      health.transportOk && health.stationSessionTracked && !health.browserPresent
    const rosterStatus = !health.transportOk
      ? 'red'
      : health.snapshotUnitMismatch || tabDown
        ? 'yellow'
        : 'green'
    const stationMsg = !health.transportOk
      ? 'ingest unreachable'
      : health.snapshotUnitMismatch
        ? 'snapshot fromUnitId ≠ Peer unit ID on roster'
        : tabDown
          ? health.browserOfflineKind === 'clean'
            ? 'Walker Track tab signed off (clean)'
            : health.browserOfflineKind === 'stale'
              ? 'no tab heartbeat (unclean)'
              : 'Walker Track tab offline'
          : !health.stationSessionTracked && health.transportOk
            ? 'ingest up — set Peer unit ID or update peer server for tab presence'
            : null
    upsertNetworkRosterRow({
      ...row,
      status: rosterStatus,
      lastSeenMs: Date.now(),
      lastError: stationMsg,
    })

    if (!health.transportOk && skipAllowed) {
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
    upsertNetworkRosterRow({
      ...row,
      status: ok ? (tabDown ? 'yellow' : 'green') : 'yellow',
      lastSeenMs: Date.now(),
      lastError: ok ? (tabDown ? stationMsg : null) : pr.detail ?? 'push failed',
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
