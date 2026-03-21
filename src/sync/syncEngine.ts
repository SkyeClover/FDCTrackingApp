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
    upsertNetworkRosterRow({
      ...row,
      status: health.ok ? 'green' : 'red',
      lastSeenMs: Date.now(),
      lastError: health.ok ? null : 'health check failed',
    })

    if (!health.ok && !skipAllowed) {
      targets.push({ row, result: 'unreachable', path: `${row.host}:${row.port}` })
      appendAuditLog('sync', `push skipped ${row.id}`, 'peer offline, skip-echelon off')
      continue
    }
    if (!health.ok && skipAllowed) {
      targets.push({ row, result: 'skipped (offline, skip mode — try next)', path: `${row.host}:${row.port}` })
      appendAuditLog('sync', `skip hop ${row.id}`, 'offline with skip enabled')
      continue
    }

    const pr = await pushSnapshotToPeer(row, meta, state, sv)
    const ok = pr.ok
    upsertNetworkRosterRow({
      ...row,
      status: ok ? 'green' : 'yellow',
      lastSeenMs: Date.now(),
      lastError: ok ? null : pr.detail ?? 'push failed',
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
