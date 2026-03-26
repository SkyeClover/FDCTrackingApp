import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
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
import { CollapsibleCard } from './CollapsibleCard'
import { useSimulation } from '../../simulation/SimulationContext'
import type { SimUnitState } from '../../types'

/**
 * Implements status color for this module.
 */
function statusColor(status: string): string {
  if (status === 'green') return 'var(--success, #2a8)'
  if (status === 'yellow') return 'var(--warning, #c90)'
  if (status === 'red') return 'var(--danger, #c44)'
  return 'var(--text-secondary)'
}

/**
 * Implements status tooltip text for this module.
 */
function statusTooltipText(row: NetworkRosterRow, org: OrgUnitsSlice): string {
  const role = formatEchelonRoleForDisplay(row.echelonRole, org)
  const when = row.lastSeenMs ? new Date(row.lastSeenMs).toLocaleString() : 'never'
  if (row.status === 'green') {
    return `${row.displayName}: online and reachable (${role}). Last seen ${when}.`
  }
  if (row.status === 'yellow') {
    return `${row.displayName}: degraded / warning (${role}). ${row.lastError ?? 'Check peer config or station state.'}`
  }
  if (row.status === 'red') {
    const reason = row.lastError ?? 'Station offline or ingest unreachable.'
    return `${row.displayName}: offline (${role}). ${reason} Last seen ${when}.`
  }
  return `${row.displayName}: status unknown (${role}). Run "Send test message" to update reachability.`
}

/**
 * Implements sim status for unit for this module.
 */
function simStatusForUnit(unit: { destructionLevel?: string; commsStatus?: string }): 'green' | 'yellow' | 'red' {
  const destruction = String(unit.destructionLevel ?? '').toLowerCase()
  const comms = String(unit.commsStatus ?? '').toLowerCase()
  if (destruction === 'destroyed' || destruction === 'struck_off') return 'red'
  if (comms === 'down' || comms === 'offline' || comms === 'lost') return 'red'
  if (destruction === 'degraded') return 'yellow'
  if (comms === 'degraded' || comms === 'intermittent') return 'yellow'
  return 'green'
}

/**
 * Implements sim tooltip text for this module.
 */
function simTooltipText(
  row: NetworkRosterRow,
  org: OrgUnitsSlice,
  simUnit: { destructionLevel?: string; commsStatus?: string; lastHeartbeat?: string } | undefined
): string {
  const role = formatEchelonRoleForDisplay(row.echelonRole, org)
  if (!simUnit) return statusTooltipText(row, org)
  const when = simUnit.lastHeartbeat ? new Date(simUnit.lastHeartbeat).toLocaleString() : 'now'
  const state = simStatusForUnit(simUnit)
  if (state === 'green') {
    return `${row.displayName}: online in simulation (${role}). Unit intact/comms up. Last heartbeat ${when}.`
  }
  if (state === 'yellow') {
    return `${row.displayName}: degraded in simulation (${role}). Unit/comms degraded. Last heartbeat ${when}.`
  }
  return `${row.displayName}: offline in simulation (${role}). Unit destroyed/struck-off or comms down. Last heartbeat ${when}.`
}

/**
 * Implements sim entity ref for roster row for this module.
 */
function simEntityRefForRosterRow(row: NetworkRosterRow): string | null {
  const peer = row.peerUnitId?.trim()
  if (peer) return peer
  const parsed = parseEchelonRole(row.echelonRole)
  if (!parsed) return null
  return `${parsed.type}:${parsed.id}`
}

/**
 * Renders the Network Roster Section Inner UI section.
 */
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
  const { brigades, battalions, bocs, pocs, simulationOverlay } = useAppData()
  const sim = useSimulation()
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

  // --- Local state and callbacks ---
  const [autoRollup, setAutoRollup] = useState(() => getSyncMeta().autoRollupFromOrg)

  const simUnitsByRef = useMemo(() => {
    const map = new Map<string, SimUnitState>()
    for (const u of simulationOverlay?.unitStates ?? []) {
      map.set(u.entityRef, u)
    }
    return map
  }, [simulationOverlay?.unitStates])

  const deriveDisplayedStatus = useCallback(
    (row: NetworkRosterRow) => {
      const simRef = simEntityRefForRosterRow(row)
      const simUnit = simRef ? simUnitsByRef.get(simRef) : undefined
      if (sim.connectionStatus === 'connected' && simUnit) {
        const status = simStatusForUnit(simUnit)
        const seen = simUnit.lastHeartbeat ? new Date(simUnit.lastHeartbeat).toLocaleString() : '—'
        return {
          status,
          seen,
          tooltip: simTooltipText(row, org, simUnit),
        }
      }
      if (sim.connectionStatus === 'connected' && simRef) {
        return {
          status: 'green',
          seen: 'live',
          tooltip: `${row.displayName}: connected to simulator (${formatEchelonRoleForDisplay(
            row.echelonRole,
            org
          )}) via ${simRef}. Waiting for next heartbeat.`,
        }
      }
      return {
        status: row.status,
        seen: row.lastSeenMs ? new Date(row.lastSeenMs).toLocaleString() : '—',
        tooltip: statusTooltipText(row, org),
      }
    },
    [sim.connectionStatus, simUnitsByRef, org]
  )

  // --- Side effects ---
  useEffect(() => {
    setAutoRollup(getSyncMeta().autoRollupFromOrg)
  }, [refreshKey])

  const reload = useCallback(() => {
    const raw = listNetworkRoster()
    const next = raw.map((row) => {
      const peer = row.peerUnitId?.trim()
      if (peer) return row
      const parsed = parseEchelonRole(row.echelonRole)
      if (!parsed) return row
      return { ...row, peerUnitId: `${parsed.type}:${parsed.id}` }
    })
    for (let i = 0; i < raw.length; i += 1) {
      if ((raw[i].peerUnitId ?? null) !== (next[i].peerUnitId ?? null)) {
        upsertNetworkRosterRow(next[i])
      }
    }
    setRows(next)
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
    const role = firstEchelonRoleValue(org)
    const parsed = parseEchelonRole(role)
    const row: NetworkRosterRow = {
      id,
      displayName: 'New unit',
      echelonRole: role,
      parentUnitId: null,
      host: '127.0.0.1',
      port: 8787,
      useTls: false,
      bearer: 'ip',
      status: 'unknown',
      lastSeenMs: null,
      lastError: null,
      sortOrder: rows.length,
      peerUnitId: parsed ? `${parsed.type}:${parsed.id}` : null,
      syncAlertsEnabled: true,
      autoAcceptSync: false,
      stationOfflineSinceMs: null,
    }
    upsertNetworkRosterRow(row)
    appendAuditLog('network', 'Roster row added', id)
    onChanged?.()
    reload()
    setEditingId(id)
  }, [rows.length, reload, onChanged, org])

  const normalizeRowForSave = useCallback(
    (r: NetworkRosterRow): NetworkRosterRow => {
      let next = { ...r }
      if (getSyncMeta().autoRollupFromOrg) {
        const pid = getParentUnitIdForEchelonRole(next.echelonRole, org)
        next = { ...next, parentUnitId: pid }
      }
      if (!next.peerUnitId?.trim()) {
        const parsed = parseEchelonRole(next.echelonRole)
        if (parsed) next = { ...next, peerUnitId: `${parsed.type}:${parsed.id}` }
      }
      return next
    },
    [org]
  )

  const saveRow = useCallback(
    (r: NetworkRosterRow) => {
      const next = normalizeRowForSave(r)
      upsertNetworkRosterRow(next)
      appendAuditLog('network', 'Roster row saved', r.id)
      onChanged?.()
      reload()
      setEditingId(null)
    },
    [reload, onChanged, normalizeRowForSave]
  )

  const autosaveRow = useCallback(
    (r: NetworkRosterRow) => {
      const next = normalizeRowForSave(r)
      upsertNetworkRosterRow(next)
      setRows((prev) => prev.map((x) => (x.id === next.id ? next : x)))
      onChanged?.()
    },
    [normalizeRowForSave, onChanged]
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

  const rosterToolbar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
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
        title="I’ll add any missing battery / PLT rows from Management, then fill parent IDs from your tree"
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
  )

  // --- Render ---
  return (
    <CollapsibleCard
      title="Echelon roster & reachability"
      defaultOpen
      headerRight={rosterToolbar}
      description={
        <div style={{ fontSize: '0.8rem', lineHeight: 1.35 }}>
          <p style={{ margin: 0 }}>
            <strong>Role</strong> = echelon from <strong>Management</strong> (Bde → Bn → BOC → PLT FDC). When{' '}
            <strong>Auto roll-up</strong> is on, turning it on adds a roster row for each <strong>Battery (BOC)</strong> and{' '}
            <strong>PLT FDC (POC)</strong> you created, and saving a row fills <strong>Parent ID</strong> from that tree.{' '}
            <strong>Apply parents from tree</strong> adds any missing BOC/POC rows, then updates all parents (legacy text roles
            skipped). Edit <strong>Host</strong>/<strong>Port</strong> per node (e.g. Pi at{' '}
            <code style={{ fontSize: '0.7rem' }}>fdc-tracker.local:8787</code> for sync). <strong>Peer unit ID</strong> = sender’s
            Local unit ID for ingest alerts / auto-accept. Use the same org ids for the external <strong>simulation</strong> binding
            (<code style={{ fontSize: '0.7rem' }}>poc:…</code> / <code style={{ fontSize: '0.7rem' }}>boc:…</code> style refs). Apply
            scope is automatic from this row’s Role: <strong>BOC</strong> rows apply battery subtree only, <strong>PLT</strong> rows
            apply that PLT subtree only.
          </p>
          <p style={{ margin: '0.45rem 0 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Simulation feed:</strong> {sim.connectionStatus}
            {sim.connectionStatus === 'connected' ? ` · seq ${sim.lastSequence}` : ''}
          </p>
        </div>
      }
    >
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
              No units yet. Add BOC / BN / BDE endpoints your node syncs with.
            </div>
          ) : (
            rows.map((r) => (
              <RosterRowEditor
                key={r.id}
                row={r}
                org={org}
                echelonGroups={echelonGroups}
                hasEchelonUnits={hasEchelonUnits}
                isEditing={editingId === r.id}
                isMobile
                onEdit={() => setEditingId(r.id)}
                onCancel={() => setEditingId(null)}
                onSave={saveRow}
                onAutoSave={autosaveRow}
                onDelete={() => removeRow(r.id)}
                statusColor={statusColor}
                deriveDisplayedStatus={deriveDisplayedStatus}
              />
            ))
          )}
        </div>
      ) : (
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
                <th style={{ padding: '0.35rem' }} title="Their Local unit ID — I use this to match incoming sync">
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
                  isMobile={false}
                  onEdit={() => setEditingId(r.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={saveRow}
                  onAutoSave={autosaveRow}
                  onDelete={() => removeRow(r.id)}
                  statusColor={statusColor}
                  deriveDisplayedStatus={deriveDisplayedStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleCard>
  )
}

export const NetworkRosterSection = NetworkRosterSectionInner

/**
 * Renders the Roster Row Editor UI section.
 */
function RosterRowEditor({
  row,
  org,
  echelonGroups,
  hasEchelonUnits,
  isEditing,
  isMobile,
  onEdit,
  onCancel,
  onSave,
  onAutoSave,
  onDelete,
  statusColor,
  deriveDisplayedStatus,
}: {
  row: NetworkRosterRow
  org: OrgUnitsSlice
  echelonGroups: EchelonSelectGroup[]
  hasEchelonUnits: boolean
  isEditing: boolean
  isMobile: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (r: NetworkRosterRow) => void
  onAutoSave: (r: NetworkRosterRow) => void
  onDelete: () => void
  statusColor: (s: string) => string
  deriveDisplayedStatus: (row: NetworkRosterRow) => { status: string; seen: string; tooltip: string }
}) {
  const [draft, setDraft] = useState(row)
  const rowRef = useRef<HTMLDivElement | HTMLTableRowElement | null>(null)
  const suppressBlurSaveRef = useRef(false)
  useEffect(() => {
    setDraft(row)
  }, [row])

    /**
   * Implements autosave if leaving editor for this module.
   */
const autosaveIfLeavingEditor = (relatedTarget: EventTarget | null) => {
    if (!isEditing) return
    if (suppressBlurSaveRef.current) {
      suppressBlurSaveRef.current = false
      return
    }
    const nextTarget = relatedTarget as Node | null
    if (!nextTarget || !rowRef.current?.contains(nextTarget)) {
      onAutoSave(draft)
    }
  }

  const roleSelectValue = parseEchelonRole(draft.echelonRole) ? draft.echelonRole : ''
  const legacyRole = draft.echelonRole && !parseEchelonRole(draft.echelonRole)

  if (!isEditing) {
    const derived = deriveDisplayedStatus(row)
    const shownStatus = derived.status || row.status || 'unknown'
    const seen = derived.seen
    const statusClass = `network-status-pill network-status-${shownStatus}`
    const statusTooltip = derived.tooltip
    if (isMobile) {
      const roleScope =
        parseEchelonRole(row.echelonRole)?.type === 'boc'
          ? 'Battery subtree'
          : parseEchelonRole(row.echelonRole)?.type === 'poc'
            ? 'PLT subtree'
            : 'Role-based'
      return (
        <div
          className="network-roster-card"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-primary)',
            padding: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{row.displayName}</strong>
            <span className={statusClass} style={{ color: statusColor(shownStatus), fontWeight: 700 }} title={statusTooltip}>
              {shownStatus}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
            {formatEchelonRoleForDisplay(row.echelonRole, org)} • {row.host ?? '—'}:{row.port ?? '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Peer: {row.peerUnitId ?? '—'} • Scope: {roleScope}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" onClick={onEdit}>
              Edit
            </button>
            <button type="button" onClick={onDelete}>
              Del
            </button>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
              {seen}
            </span>
          </div>
        </div>
      )
    }

    return (
      <tr className="network-roster-row" style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '0.35rem' }}>{row.displayName}</td>
        <td style={{ padding: '0.35rem' }}>{formatEchelonRoleForDisplay(row.echelonRole, org)}</td>
        <td style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {row.parentUnitId ?? '—'}
        </td>
        <td style={{ padding: '0.35rem' }}>{row.host ?? '—'}</td>
        <td style={{ padding: '0.35rem' }}>{row.port ?? '—'}</td>
        <td style={{ padding: '0.35rem' }}>{row.useTls ? 'yes' : 'no'}</td>
        <td style={{ padding: '0.35rem' }}>{row.bearer === RADIO_BEARER_ID ? 'RT-1523' : row.bearer}</td>
        <td style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>{row.peerUnitId ?? '—'}</td>
        <td style={{ padding: '0.35rem' }}>{row.syncAlertsEnabled ? 'on' : 'off'}</td>
        <td style={{ padding: '0.35rem' }}>{row.autoAcceptSync ? 'on' : 'off'}</td>
        <td style={{ padding: '0.35rem' }}>
          <span className={statusClass} style={{ color: statusColor(shownStatus), fontWeight: 600 }} title={statusTooltip}>
            {shownStatus}
          </span>
        </td>
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

  if (isMobile) {
    return (
      <div
        className="network-roster-editor"
        ref={(el) => {
          rowRef.current = el
        }}
        onBlurCapture={(e) => autosaveIfLeavingEditor(e.relatedTarget)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--bg-primary)',
          padding: '0.6rem',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0.45rem',
        }}
      >
        <input
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
          placeholder="Display name"
        />
        <select
          value={roleSelectValue}
          onChange={(e) => setDraft({ ...draft, echelonRole: e.target.value })}
          disabled={!hasEchelonUnits}
        >
          <option value="">{hasEchelonUnits ? 'Select echelon…' : 'Add units in Inventory / Management'}</option>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <input
            value={draft.host ?? ''}
            onChange={(e) => setDraft({ ...draft, host: e.target.value || null })}
            placeholder="Host"
          />
          <input
            type="number"
            className="touch-stepper"
            min={1}
            max={65535}
            step={1}
            value={draft.port ?? ''}
            onChange={(e) => setDraft({ ...draft, port: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="Port"
          />
        </div>
        <input
          value={draft.peerUnitId ?? ''}
          onChange={(e) => setDraft({ ...draft, peerUnitId: e.target.value.trim() || null })}
          placeholder="Peer unit ID"
        />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Apply scope is automatic from Role (BOC = battery subtree, PLT = PLT subtree).
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', fontSize: '0.78rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              checked={draft.useTls}
              onChange={(e) => setDraft({ ...draft, useTls: e.target.checked })}
            />
            TLS
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              checked={draft.syncAlertsEnabled}
              onChange={(e) => setDraft({ ...draft, syncAlertsEnabled: e.target.checked })}
            />
            Alerts
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              checked={draft.autoAcceptSync}
              onChange={(e) => setDraft({ ...draft, autoAcceptSync: e.target.checked })}
            />
            Auto-accept
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" onClick={() => onSave(draft)}>
            Save
          </button>
          <button
            type="button"
            onMouseDown={() => {
              suppressBlurSaveRef.current = true
            }}
            onClick={onCancel}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <tr
      className="network-roster-editor"
      ref={(el) => {
        rowRef.current = el
      }}
      onBlurCapture={(e) => autosaveIfLeavingEditor(e.relatedTarget)}
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}
    >
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
          className="touch-stepper"
          min={1}
          max={65535}
          step={1}
          value={draft.port ?? ''}
          onChange={(e) =>
            setDraft({ ...draft, port: e.target.value ? parseInt(e.target.value, 10) : null })
          }
          style={{ width: '100%', minWidth: '5.5rem' }}
          title="Port (8787 default). Use steppers or keyboard."
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
          <option value={RADIO_BEARER_ID}>RT-1523 (serial tunnel)</option>
        </select>
      </td>
      <td style={{ padding: '0.35rem' }}>
        <input
          value={draft.peerUnitId ?? ''}
          onChange={(e) => setDraft({ ...draft, peerUnitId: e.target.value.trim() || null })}
          placeholder="Their local unit ID"
          title="Same ID they use under Local unit ID — keeps alerts and auto-accept straight"
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
          title="If it’s from them, apply new data without asking"
        />
      </td>
      <td style={{ padding: '0.35rem', color: statusColor(draft.status) }}>{draft.status}</td>
      <td style={{ padding: '0.35rem' }}>—</td>
      <td style={{ padding: '0.35rem', whiteSpace: 'nowrap' }}>
        <button type="button" onClick={() => onSave(draft)}>
          Save
        </button>
        <button
          type="button"
          onMouseDown={() => {
            suppressBlurSaveRef.current = true
          }}
          onClick={onCancel}
          style={{ marginLeft: '0.25rem' }}
        >
          Cancel
        </button>
      </td>
    </tr>
  )
}
