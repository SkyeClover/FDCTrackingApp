import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link2, Unplug, Radio } from 'lucide-react'
import { useSimulation } from '../../simulation/SimulationContext'
import { useAppData } from '../../context/AppDataContext'
import { CollapsibleCard } from './CollapsibleCard'
import { getSyncMeta } from '../../persistence/sqlite'

/**
 * Renders the Simulation Section UI section.
 */
export function SimulationSection(_props: { isMobile: boolean }) {
  const {
    connectionStatus,
    lastError,
    targetUrl,
    setTargetUrl,
    scenarioId,
    setScenarioId,
    autoConnect,
    setAutoConnect,
    connect,
    disconnect,
    simAppVersion,
    protocolVersion,
    sendOperatorCommand,
    controlScopes,
    lastSequence,
  } = useSimulation()
  const { currentUserRole, simulationOverlay } = useAppData()
  const [syncMetaTick, setSyncMetaBump] = useState(0)
  useEffect(() => {
        /**
     * Implements fn for this module.
     */
const fn = () => setSyncMetaBump((n) => n + 1)
    window.addEventListener('fdc-sync-meta-changed', fn)
    return () => window.removeEventListener('fdc-sync-meta-changed', fn)
  }, [])

  const scopeId = useMemo(() => {
    if (currentUserRole) return `${currentUserRole.type}:${currentUserRole.id}`
    const lu = getSyncMeta().localUnitId?.trim()
    return lu || ''
  }, [currentUserRole, syncMetaTick])

  const localControl = scopeId ? controlScopes[scopeId] : undefined

    /**
   * Implements btn style for this module.
   */
const btnStyle = (primary?: boolean): CSSProperties => ({
    padding: '0.45rem 0.75rem',
    borderRadius: 8,
    border: `1px solid ${primary ? 'var(--accent, #38c)' : 'var(--border)'}`,
    background: primary ? 'var(--accent-muted, rgba(56,136,255,0.15))' : 'var(--bg-primary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
  })

  return (
    <CollapsibleCard title="Simulation (external app)" defaultOpen>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 0 }}>
        Connect to the separate <strong>fdc-simulator</strong> process. This channel is independent of{' '}
        <strong>HTTP peer sync</strong> (ingest / roster). Use the same org ids as <strong>Local unit ID</strong> and{' '}
        <strong>Peer unit ID</strong> (e.g. <code style={{ fontSize: '0.75rem' }}>poc:…</code>) so simulation lines up with
        roster scope. Changing View role or Local unit ID while connected sends a <strong>rebind</strong> automatically.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem' }}>
          WebSocket URL
          <input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
            style={{
              padding: '0.45rem 0.5rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem' }}>
          Scenario id
          <input
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            disabled={connectionStatus === 'connected'}
            style={{
              padding: '0.45rem 0.5rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => setAutoConnect(e.target.checked)}
          />
          Auto-reconnect on load / after drop
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {connectionStatus === 'connected' ? (
            <button type="button" style={btnStyle()} onClick={() => disconnect()}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Unplug size={16} /> Disconnect
              </span>
            </button>
          ) : (
            <button type="button" style={btnStyle(true)} onClick={() => connect()}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={16} /> Connect
              </span>
            </button>
          )}
        </div>
        <CollapsibleCard title="Simulation console" defaultOpen={false}>
          <div
            style={{
              fontSize: '0.8rem',
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Radio size={14} />
              <strong>Status:</strong> {connectionStatus}
              {lastError ? <span style={{ color: 'var(--danger, #c44)' }}> — {lastError}</span> : null}
            </div>
            <div>Sim app version: {simAppVersion ?? '—'}</div>
            <div>Protocol: {protocolVersion ?? '—'} · last seq: {lastSequence}</div>
            <div>Overlay units: {simulationOverlay?.unitStates.length ?? 0}</div>
            {scopeId ? (
              <div style={{ marginTop: 6 }}>
                Scope <code>{scopeId}</code>:{' '}
                {localControl ? (
                  <>
                    mode <strong>{localControl.mode}</strong>, held by <code>{localControl.heldBy}</code>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>no control.state yet</span>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
                Set a View role (Settings) or <strong>Local unit ID</strong> (Sync) to scope dual-control commands.
              </div>
            )}
            {Object.keys(controlScopes).length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Control handoff (all stations)</div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  {Object.entries(controlScopes).map(([id, st]) => (
                    <li key={id}>
                      <code>{id}</code> — {st.mode} · {st.heldBy}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {scopeId ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.55rem' }}>
              <button
                type="button"
                style={btnStyle(true)}
                disabled={connectionStatus !== 'connected'}
                onClick={() =>
                  sendOperatorCommand({
                    commandId: crypto.randomUUID(),
                    scopeId,
                    commandType: 'take_control',
                    payload: {},
                  })
                }
              >
                Take control (human)
              </button>
              <button
                type="button"
                style={btnStyle()}
                disabled={connectionStatus !== 'connected'}
                onClick={() =>
                  sendOperatorCommand({
                    commandId: crypto.randomUUID(),
                    scopeId,
                    commandType: 'hybrid_control',
                    payload: {},
                  })
                }
              >
                Hybrid (TTL)
              </button>
              <button
                type="button"
                style={btnStyle()}
                disabled={connectionStatus !== 'connected'}
                onClick={() =>
                  sendOperatorCommand({
                    commandId: crypto.randomUUID(),
                    scopeId,
                    commandType: 'release_control',
                    payload: {},
                  })
                }
              >
                Return to auto
              </button>
            </div>
          ) : null}
        </CollapsibleCard>
      </div>
    </CollapsibleCard>
  )
}

