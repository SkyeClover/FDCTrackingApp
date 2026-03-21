import { useMemo, useState, useCallback, useEffect } from 'react'
import { useAppData } from '../../context/AppDataContext'
import {
  listNetworkRoster,
  upsertNetworkRosterRow,
  deleteNetworkRosterRow,
  appendAuditLog,
  getSyncMeta,
  updateSyncMeta,
  type NetworkRosterRow,
} from '../../persistence/sqlite'
import { RADIO_BEARER_ID } from '../../sync/radioPlaceholder'
import {
  buildEchelonSelectGroups,
  firstEchelonRoleValue,
  formatEchelonRoleForDisplay,
  getParentUnitIdForEchelonRole,
  parseEchelonRole,
  type EchelonSelectGroup,
  type OrgUnitsSlice,
} from './echelonRoleUi'
import { ensureBocPocRosterFromOrg } from './rosterFromOrg'

function statusColor(status: string): string {
  if (status === 'green') return 'var(--success, #2a8)'
  if (status === 'yellow') return 'var(--warning, #c90)'
  if (status === 'red') return 'var(--danger, #c44)'
  return 'var(--text-secondary)'
}

function NetworkRosterSectionInner({
  isMobile,
  refreshKey = 0,
  onChanged,
  onEditingChange,
}: {
  isMobile: boolean
  refreshKey?: number
  onChanged?: () => void
  /** True while a roster row is in edit mode — parent can pause agent polling. */
  onEditingChange?: (editing: boolean) => void
}) {
  const { brigades, battalions, bocs, pocs } = useAppData()
  const [rows, setRows] = useState<NetworkRosterRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const org = useMemo<OrgUnitsSlice>(
    () => ({ brigades, battalions, bocs, pocs }),
    [brigades, battalions, bocs, pocs]
  )

  const echelonGroups = useMemo(() => buildEchelonSelectGroups(org), [org])

  const hasEchelonUnits = useMemo(
    () => echelonGroups.some((g) => g.options.length > 0),
    [echelonGroups]
  )

  const [autoRollup, setAutoRollup] = useState(() => getSyncMeta().autoRollupFromOrg)

  useEffect(() => {
    setAutoRollup(getSyncMeta().autoRollupFromOrg)
  }, [refreshKey])

  const reload = useCallback(() => {
    setRows(listNetworkRoster())
  }, [])

  useEffect(() => {
    reload()
  }, [reload, refreshKey])

  useEffect(() => {
    onEditingChange?.(editingId !== null)
  }, [editingId, onEditingChange])

  const applyParentIdsFromTree = useCallback(() => {
    const rollup = getSyncMeta().autoRollupFromOrg
    const ensured = ensureBocPocRosterFromOrg(org, rollup)
    const list = listNetworkRoster()
    let updated = 0
    let skippedLegacy = 0
    for (const row of list) {
      if (!parseEchelonRole(row.echelonRole)) {
        skippedLegacy++
        continue
      }
      const parentId = getParentUnitIdForEchelonRole(row.echelonRole, org)
      upsertNetworkRosterRow({ ...row, parentUnitId: parentId })
      updated++
    }
    appendAuditLog(
      'network',
      'Parent IDs applied from Management org tree',
      `addedFromOrg=${ensured.added}, applied=${updated}, skippedLegacy=${skippedLegacy}`
    )
    reload()
    onChanged?.()
  }, [org, onChanged, reload])

  const addRow = useCallback(() => {
    const id = crypto.randomUUID()
    const row: NetworkRosterRow = {
      id,
      displayName: 'New unit',
      echelonRole: firstEchelonRoleValue(org),
      parentUnitId: null,
      host: '127.0.0.1',
      port: 8787,
      useTls: false,
      bearer: 'ip',
      status: 'unknown',
      lastSeenMs: null,
      lastError: null,
      sortOrder: rows.length,
      peerUnitId: null,
      syncAlertsEnabled: true,
      autoAcceptSync: false,
    }
    upsertNetworkRosterRow(row)
    appendAuditLog('network', 'Roster row added', id)
    onChanged?.()
    reload()
    setEditingId(id)
  }, [rows.length, reload, onChanged, org])

  const saveRow = useCallback(
    (r: NetworkRosterRow) => {
      let next = { ...r }
      if (getSyncMeta().autoRollupFromOrg) {
        const pid = getParentUnitIdForEchelonRole(next.echelonRole, org)
        next = { ...next, parentUnitId: pid }
      }
      upsertNetworkRosterRow(next)
      appendAuditLog('network', 'Roster row saved', r.id)
      onChanged?.()
      reload()
      setEditingId(null)
    },
    [reload, onChanged, org]
  )

  const removeRow = useCallback(
    (id: string) => {
      if (!confirm('Remove this unit from the roster?')) return
      deleteNetworkRosterRow(id)
      appendAuditLog('network', 'Roster row removed', id)
      onChanged?.()
      reload()
    },
    [reload, onChanged]
  )

  const tableStyle = useMemo(
    () => ({
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: isMobile ? '0.8rem' : '0.9rem',
    }),
    [isMobile]
  )

  return (
    <section
      style={{
        marginBottom: '0.65rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '0.55rem 0.65rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.35rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Echelon roster &amp; reachability</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={autoRollup}
              onChange={(e) => {
                const v = e.target.checked
                setAutoRollup(v)
                updateSyncMeta({ autoRollupFromOrg: v })
                if (v) {
                  const r = ensureBocPocRosterFromOrg(org, true)
                  if (r.added > 0) {
                    appendAuditLog(
                      'network',
                      'Auto roll-up: roster rows from Management',
                      `added ${r.added} BOC/PLT FDC row(s)`
                    )
                  }
                  reload()
                  onChanged?.()
                }
              }}
            />
            Auto roll-up parent IDs
          </label>
          <button
            type="button"
            onClick={() => applyParentIdsFromTree()}
            title="Add missing BOC / PLT FDC rows from Management, then set parent IDs from hierarchy"
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Apply parents from tree
          </button>
          <button
            type="button"
            onClick={addRow}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Add unit
          </button>
        </div>
      </div>
      <p style={{ margin: '0 0 0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.35 }}>
        <strong>Role</strong> = echelon from <strong>Management</strong> (Bde → Bn → BOC → PLT FDC). When{' '}
        <strong>Auto roll-up</strong> is on, turning it on adds a roster row for each <strong>Battery (BOC)</strong> and{' '}
        <strong>PLT FDC (POC)</strong> you created, and saving a row fills <strong>Parent ID</strong> from that tree.{' '}
        <strong>Apply parents from tree</strong> adds any missing BOC/POC rows, then updates all parents (legacy text roles
        skipped). Edit <strong>Host</strong>/<strong>Port</strong> per node (e.g. Pi at <code style={{ fontSize: '0.7rem' }}>192.168.1.10:8787</code> for sync).{' '}
        <strong>Peer unit ID</strong> = sender’s Local unit ID for ingest alerts / auto-accept.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.35rem' }}>Name</th>
              <th style={{ padding: '0.35rem' }}>Role</th>
              <th style={{ padding: '0.35rem' }}>Parent ID</th>
              <th style={{ padding: '0.35rem' }}>Host</th>
              <th style={{ padding: '0.35rem' }}>Port</th>
              <th style={{ padding: '0.35rem' }}>TLS</th>
              <th style={{ padding: '0.35rem' }}>Bearer</th>
              <th style={{ padding: '0.35rem' }} title="Sender’s localUnitId (HMAC identity)">
                Peer unit ID
              </th>
              <th style={{ padding: '0.35rem' }}>Alerts</th>
              <th style={{ padding: '0.35rem' }}>Auto-accept</th>
              <th style={{ padding: '0.35rem' }}>Status</th>
              <th style={{ padding: '0.35rem' }}>Last seen</th>
              <th style={{ padding: '0.35rem' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={13} style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                  No units yet. Add BOC / BN / BDE endpoints your node syncs with.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <RosterRowEditor
                key={r.id}
                row={r}
                org={org}
                echelonGroups={echelonGroups}
                hasEchelonUnits={hasEchelonUnits}
                isEditing={editingId === r.id}
                onEdit={() => setEditingId(r.id)}
                onCancel={() => setEditingId(null)}
                onSave={saveRow}
                onDelete={() => removeRow(r.id)}
                statusColor={statusColor}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export const NetworkRosterSection = NetworkRosterSectionInner

function RosterRowEditor({
  row,
  org,
  echelonGroups,
  hasEchelonUnits,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  statusColor,
}: {
  row: NetworkRosterRow
  org: OrgUnitsSlice
  echelonGroups: EchelonSelectGroup[]
  hasEchelonUnits: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (r: NetworkRosterRow) => void
  onDelete: () => void
  statusColor: (s: string) => string
}) {
  const [draft, setDraft] = useState(row)
  useEffect(() => {
    setDraft(row)
  }, [row])

  const roleSelectValue = parseEchelonRole(draft.echelonRole) ? draft.echelonRole : ''
  const legacyRole = draft.echelonRole && !parseEchelonRole(draft.echelonRole)

  if (!isEditing) {
    const seen = row.lastSeenMs ? new Date(row.lastSeenMs).toLocaleString() : '—'
    return (
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '0.35rem' }}>{row.displayName}</td>
        <td style={{ padding: '0.35rem' }}>{formatEchelonRoleForDisplay(row.echelonRole, org)}</td>
        <td style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {row.parentUnitId ?? '—'}
        </td>
        <td style={{ padding: '0.35rem' }}>{row.host ?? '—'}</td>
        <td style={{ padding: '0.35rem' }}>{row.port ?? '—'}</td>
        <td style={{ padding: '0.35rem' }}>{row.useTls ? 'yes' : 'no'}</td>
        <td style={{ padding: '0.35rem' }}>{row.bearer === RADIO_BEARER_ID ? '1523 (placeholder)' : row.bearer}</td>
        <td style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>{row.peerUnitId ?? '—'}</td>
        <td style={{ padding: '0.35rem' }}>{row.syncAlertsEnabled ? 'on' : 'off'}</td>
        <td style={{ padding: '0.35rem' }}>{row.autoAcceptSync ? 'on' : 'off'}</td>
        <td style={{ padding: '0.35rem', color: statusColor(row.status), fontWeight: 600 }}>{row.status}</td>
        <td style={{ padding: '0.35rem', whiteSpace: 'nowrap' }}>{seen}</td>
        <td style={{ padding: '0.35rem', whiteSpace: 'nowrap' }}>
          <button type="button" onClick={onEdit} style={{ marginRight: '0.25rem' }}>
            Edit
          </button>
          <button type="button" onClick={onDelete}>
            Del
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
      <td style={{ padding: '0.35rem' }}>
        <input
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
          style={{ width: '100%', minWidth: '80px' }}
        />
      </td>
      <td style={{ padding: '0.35rem', verticalAlign: 'top' }}>
        <select
          value={roleSelectValue}
          onChange={(e) => setDraft({ ...draft, echelonRole: e.target.value })}
          style={{ width: '100%', minWidth: '120px', maxWidth: 'min(240px, 100%)' }}
          disabled={!hasEchelonUnits}
        >
          <option value="">
            {hasEchelonUnits ? 'Select echelon…' : 'Add units in Inventory / Management'}
          </option>
          {echelonGroups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {legacyRole ? (
          <div style={{ fontSize: '0.65rem', color: 'var(--warning)', marginTop: '0.2rem', maxWidth: '14rem' }}>
            Legacy role “{draft.echelonRole}” — pick an echelon above to save.
          </div>
        ) : null}
      </td>
      <td style={{ padding: '0.35rem' }}>
        <input
          value={draft.parentUnitId ?? ''}
          onChange={(e) => setDraft({ ...draft, parentUnitId: e.target.value || null })}
          placeholder="optional"
          style={{ width: '100%', minWidth: '72px' }}
        />
      </td>
      <td style={{ padding: '0.35rem' }}>
        <input
          value={draft.host ?? ''}
          onChange={(e) => setDraft({ ...draft, host: e.target.value || null })}
          style={{ width: '100%', minWidth: '90px' }}
        />
      </td>
      <td style={{ padding: '0.35rem' }}>
        <input
          type="number"
          value={draft.port ?? ''}
          onChange={(e) =>
            setDraft({ ...draft, port: e.target.value ? parseInt(e.target.value, 10) : null })
          }
          style={{ width: '64px' }}
        />
      </td>
      <td style={{ padding: '0.35rem' }}>
        <input
          type="checkbox"
          checked={draft.useTls}
          onChange={(e) => setDraft({ ...draft, useTls: e.target.checked })}
        />
      </td>
      <td style={{ padding: '0.35rem' }}>
        <select
          value={draft.bearer}
          onChange={(e) => setDraft({ ...draft, bearer: e.target.value })}
        >
          <option value="ip">IP / LAN</option>
          <option value={RADIO_BEARER_ID}>RT-1523 (placeholder)</option>
        </select>
      </td>
      <td style={{ padding: '0.35rem' }}>
        <input
          value={draft.peerUnitId ?? ''}
          onChange={(e) => setDraft({ ...draft, peerUnitId: e.target.value.trim() || null })}
          placeholder="Their local unit ID"
          title="Must match sender’s Local unit ID for alerts / auto-accept"
          style={{ width: '100%', minWidth: '56px', fontSize: '0.75rem' }}
        />
      </td>
      <td style={{ padding: '0.35rem', textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={draft.syncAlertsEnabled}
          onChange={(e) => setDraft({ ...draft, syncAlertsEnabled: e.target.checked })}
          title="Show ingest banner for this peer"
        />
      </td>
      <td style={{ padding: '0.35rem', textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={draft.autoAcceptSync}
          onChange={(e) => setDraft({ ...draft, autoAcceptSync: e.target.checked })}
          title="Auto-apply snapshot when ingest matches this peer"
        />
      </td>
      <td style={{ padding: '0.35rem', color: statusColor(draft.status) }}>{draft.status}</td>
      <td style={{ padding: '0.35rem' }}>—</td>
      <td style={{ padding: '0.35rem', whiteSpace: 'nowrap' }}>
        <button type="button" onClick={() => onSave(draft)}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{ marginLeft: '0.25rem' }}>
          Cancel
        </button>
      </td>
    </tr>
  )
}
