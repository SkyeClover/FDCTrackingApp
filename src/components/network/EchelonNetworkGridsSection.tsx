import { useMemo, type CSSProperties } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { listNetworkRoster, type NetworkRosterRow } from '../../persistence/sqlite'
import { RADIO_BEARER_ID } from '../../sync/radioPlaceholder'
import {
  echelonRoleValue,
  formatEchelonRoleForDisplay,
  type OrgUnitsSlice,
} from './echelonRoleUi'
import { CollapsibleCard } from './CollapsibleCard'

function bearerShort(b: string): string {
  if (b === RADIO_BEARER_ID) return 'RT-1523'
  if (b === 'ip') return 'IP/LAN'
  return b
}

function rosterLine(row: NetworkRosterRow | undefined): string {
  if (!row) return '—'
  const b = bearerShort(row.bearer)
  const hp = row.host && row.port != null ? `${row.host}:${row.port}` : '—'
  return `${row.displayName} · ${b} · ${hp} · ${row.status}`
}

function findRoster(rows: NetworkRosterRow[], echelonRole: string): NetworkRosterRow | undefined {
  return rows.find((r) => r.echelonRole === echelonRole)
}

function battalionName(bocId: string | undefined, org: OrgUnitsSlice): string {
  if (!bocId) return '—'
  const boc = org.bocs.find((x) => x.id === bocId)
  const bid = boc?.battalionId
  if (!bid) return '—'
  return org.battalions.find((x) => x.id === bid)?.name ?? bid
}

/**
 * Read-only grids: BOC / POC / POD / RSV with network roster linkage (SQLite).
 */
export function EchelonNetworkGridsSection({
  isMobile,
  refreshKey,
}: {
  isMobile: boolean
  refreshKey: number
}) {
  const { brigades, battalions, bocs, pocs, pods, rsvs } = useAppData()

  const org: OrgUnitsSlice = useMemo(
    () => ({ brigades, battalions, bocs, pocs }),
    [brigades, battalions, bocs, pocs]
  )

  const roster = useMemo(() => listNetworkRoster(), [refreshKey])

  const bocRows = useMemo(() => {
    return [...bocs]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((boc) => {
        const row = findRoster(roster, echelonRoleValue('boc', boc.id))
        return { boc, row }
      })
  }, [bocs, roster, org])

  const pocRows = useMemo(() => {
    return [...pocs]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((poc) => {
        const row = findRoster(roster, echelonRoleValue('poc', poc.id))
        const bocName = poc.bocId ? org.bocs.find((b) => b.id === poc.bocId)?.name ?? poc.bocId : '—'
        return { poc, row, bocName }
      })
  }, [pocs, roster, org])

  const podRows = useMemo(() => {
    return [...pods]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((pod) => {
        const poc = pod.pocId ? org.pocs.find((p) => p.id === pod.pocId) : undefined
        const pocRole = poc ? echelonRoleValue('poc', poc.id) : ''
        const row = pocRole ? findRoster(roster, pocRole) : undefined
        const rounds = pod.rounds?.length ?? 0
        return { pod, pocName: poc?.name ?? '—', row, rounds }
      })
  }, [pods, roster, org])

  const rsvRows = useMemo(() => {
    return [...rsvs]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((rsv) => {
        const poc = rsv.pocId ? org.pocs.find((p) => p.id === rsv.pocId) : undefined
        const pocRole = poc ? echelonRoleValue('poc', poc.id) : ''
        const row = pocRole ? findRoster(roster, pocRole) : undefined
        const bocName =
          rsv.bocId ? org.bocs.find((b) => b.id === rsv.bocId)?.name ?? rsv.bocId : '—'
        return { rsv, pocName: poc?.name ?? '—', row, bocName }
      })
  }, [rsvs, roster, org])

  const th: CSSProperties = {
    textAlign: 'left',
    padding: '0.35rem 0.45rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  }
  const td: CSSProperties = {
    padding: '0.3rem 0.45rem',
    fontSize: '0.78rem',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'top',
  }
  const wrap: CSSProperties = {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  }

  return (
    <CollapsibleCard title="Echelon units & network linkage" defaultOpen={!isMobile}>
      <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
        Data comes from Management / Inventory (same DB as the rest of the app). Roster rows match{' '}
        <code style={{ fontSize: '0.72rem' }}>boc:…</code> / <code style={{ fontSize: '0.72rem' }}>poc:…</code> in{' '}
        <strong>Network roster</strong>. PODs and RSVs follow their PLT’s POC roster entry for sync status.
        RT-1523 peers use compact snapshots and automatic retries on push/ping.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Batteries (BOC)</div>
          <div style={wrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 520 : 0 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Battalion</th>
                  <th style={th}>Roster / sync</th>
                </tr>
              </thead>
              <tbody>
                {bocRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ ...td, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No batteries — add units in Management.
                    </td>
                  </tr>
                ) : (
                  bocRows.map(({ boc, row }) => (
                    <tr key={boc.id}>
                      <td style={td}>{boc.name}</td>
                      <td style={td}>{battalionName(boc.id, org)}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{rosterLine(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>Platoon FDC (POC)</div>
          <div style={wrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 520 : 0 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Battery</th>
                  <th style={th}>Role</th>
                  <th style={th}>Roster / sync</th>
                </tr>
              </thead>
              <tbody>
                {pocRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...td, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No platoon FDCs — add units in Management.
                    </td>
                  </tr>
                ) : (
                  pocRows.map(({ poc, row, bocName }) => (
                    <tr key={poc.id}>
                      <td style={td}>{poc.name}</td>
                      <td style={td}>{bocName}</td>
                      <td style={td}>{formatEchelonRoleForDisplay(echelonRoleValue('poc', poc.id), org)}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{rosterLine(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>PODs</div>
          <div style={wrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 0 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>PLT</th>
                  <th style={th}>Rounds</th>
                  <th style={th}>POC roster</th>
                </tr>
              </thead>
              <tbody>
                {podRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...td, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No PODs in inventory.
                    </td>
                  </tr>
                ) : (
                  podRows.map(({ pod, pocName, row, rounds }) => (
                    <tr key={pod.id}>
                      <td style={td}>{pod.name}</td>
                      <td style={td}>{pocName}</td>
                      <td style={td}>{rounds}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{rosterLine(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>RSVs</div>
          <div style={wrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 0 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>PLT</th>
                  <th style={th}>Battery</th>
                  <th style={th}>POC roster</th>
                </tr>
              </thead>
              <tbody>
                {rsvRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ ...td, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No RSVs in inventory.
                    </td>
                  </tr>
                ) : (
                  rsvRows.map(({ rsv, pocName, bocName, row }) => (
                    <tr key={rsv.id}>
                      <td style={td}>{rsv.name}</td>
                      <td style={td}>{pocName}</td>
                      <td style={td}>{bocName}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: '0.72rem' }}>{rosterLine(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CollapsibleCard>
  )
}
