import { listNetworkRoster, upsertNetworkRosterRow, type NetworkRosterRow } from '../../persistence/sqlite'
import {
  echelonRoleValue,
  getParentUnitIdForEchelonRole,
  parseEchelonRole,
  type OrgUnitsSlice,
} from './echelonRoleUi'

export interface EnsureRosterFromOrgResult {
  added: number
  addedIds: string[]
}

/**
 * Ensures each Battery (BOC) and PLT FDC (POC) from Management has a network roster row.
 * Skips echelon roles that already exist. New rows use default host/port for you to edit (e.g. Pi LAN).
 */
export function ensureBocPocRosterFromOrg(
  org: OrgUnitsSlice,
  autoRollupParent: boolean
): EnsureRosterFromOrgResult {
  const existing = listNetworkRoster()
  const byRole = new Map(existing.map((r) => [r.echelonRole, r]))
  let maxSort = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0)

  const seeds: { role: string; name: string }[] = []
  for (const b of [...org.bocs].sort((a, b) => a.name.localeCompare(b.name))) {
    seeds.push({ role: echelonRoleValue('boc', b.id), name: b.name })
  }
  for (const p of [...org.pocs].sort((a, b) => a.name.localeCompare(b.name))) {
    seeds.push({ role: echelonRoleValue('poc', p.id), name: p.name })
  }

  const addedIds: string[] = []
  for (const { role, name } of seeds) {
    if (!parseEchelonRole(role)) continue
    if (byRole.has(role)) continue
    maxSort += 1
    const id = crypto.randomUUID()
    const parentUnitId = autoRollupParent ? getParentUnitIdForEchelonRole(role, org) : null
    const row: NetworkRosterRow = {
      id,
      displayName: name,
      echelonRole: role,
      parentUnitId,
      host: '127.0.0.1',
      port: 8787,
      useTls: false,
      bearer: 'ip',
      status: 'unknown',
      lastSeenMs: null,
      lastError: null,
      sortOrder: maxSort,
      peerUnitId: null,
      syncAlertsEnabled: true,
      autoAcceptSync: false,
      stationOfflineSinceMs: null,
      ingestMergeBocId: null,
      ingestMergePocId: null,
    }
    upsertNetworkRosterRow(row)
    byRole.set(role, row)
    addedIds.push(id)
  }
  return { added: addedIds.length, addedIds }
}
