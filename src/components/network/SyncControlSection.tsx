import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  appendAuditLog,
  clearAuditLog,
  getStateVersion,
  getSyncMeta,
  listAuditLog,
  listNetworkRoster,
  updateSyncMeta,
} from '../../persistence/sqlite'
import { fetchIngestStatus } from '../../sync/peerClient'
import { runSnapshotPush } from '../../sync/syncEngine'

export function SyncControlSection({
  isMobile: _isMobile,
  onSyncDone,
}: {
  isMobile: boolean
  onSyncDone?: () => void
}) {
  const { getStateSnapshot, applySnapshotFromJson } = useAppData()
  const [meta, setMeta] = useState(getSyncMeta)
  const [sv, setSv] = useState(getStateVersion)
  const [busy, setBusy] = useState(false)
  const [pullBusy, setPullBusy] = useState(false)
  const [lastPath, setLastPath] = useState<string>('')
  const [lastLog, setLastLog] = useState<string>('')
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [showSharedSecret, setShowSharedSecret] = useState(false)
  const [syncOutputOpen, setSyncOutputOpen] = useState(true)
  const [auditLogOpen, setAuditLogOpen] = useState(true)
  const [auditTick, setAuditTick] = useState(0)
  const autoBusyRef = useRef(false)

  const auditEntries = useMemo(() => listAuditLog(200), [auditTick])

  const refreshMeta = useCallback(() => {
    setMeta(getSyncMeta())
    setSv(getStateVersion())
  }, [])

  useEffect(() => {
    refreshMeta()
  }, [refreshMeta])

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshMeta()
    }, 5000)
    return () => clearInterval(id)
  }, [refreshMeta])

  /** Automatic background push (MVP: same as manual snapshot push). */
  useEffect(() => {
    const intervalMs = 90_000
    const t = window.setInterval(() => {
      if (autoBusyRef.current) return
      const peers = listNetworkRoster().filter((r) => r.host && r.port != null)
      if (peers.length === 0) return
      autoBusyRef.current = true
      void runSnapshotPush(getStateSnapshot(), 'auto')
        .then((summary) => {
          const paths = summary.targets.map((x) => `${x.row.displayName}: ${x.result}`).join(' · ')
          setLastPath('auto → ' + paths)
          setLastLog(new Date().toLocaleTimeString())
          setSyncOutputOpen(true)
          onSyncDone?.()
        })
        .catch(console.error)
        .finally(() => {
          autoBusyRef.current = false
          refreshMeta()
          setAuditTick((t) => t + 1)
        })
    }, intervalMs)
    return () => clearInterval(t)
  }, [getStateSnapshot, onSyncDone, refreshMeta])

  const doForce = useCallback(async () => {
    setBusy(true)
    setLastPath('')
    try {
      const summary = await runSnapshotPush(getStateSnapshot(), 'force')
      const paths = summary.targets.map((t) => `${t.row.displayName} → ${t.path} (${t.result})`).join('\n')
      setLastPath(paths || '(no roster rows with host/port)')
      setLastLog(new Date().toLocaleTimeString())
      setSyncOutputOpen(true)
      appendAuditLog('sync', 'Force push completed', paths)
      onSyncDone?.()
    } catch (e) {
      setLastPath(e instanceof Error ? e.message : String(e))
      setLastLog(new Date().toLocaleTimeString())
      setSyncOutputOpen(true)
    } finally {
      setBusy(false)
      refreshMeta()
      setAuditTick((t) => t + 1)
    }
  }, [getStateSnapshot, onSyncDone, refreshMeta])

  const pullFromThisSiteIngest = useCallback(async () => {
    if (
      !confirm(
        'Replace all local data on this device with the last snapshot stored on this deployment’s ingest (GET /fdc/v1/status)?'
      )
    ) {
      return
    }
    setPullBusy(true)
    try {
      const meta = getSyncMeta()
      const r = await fetchIngestStatus(meta, window.location.origin)
      if (!r.ok || !r.snapshotJson) {
        const msg = r.detail ?? 'Unknown error'
        setLastPath(`Pull ingest failed: ${msg}`)
        setLastLog(new Date().toLocaleTimeString())
        setSyncOutputOpen(true)
        appendAuditLog('sync', 'Pull ingest failed', msg)
        return
      }
      const ok = applySnapshotFromJson(r.snapshotJson)
      if (ok) {
        if (r.stateVersion != null) {
          updateSyncMeta({ lastAppliedIngestStateVersion: r.stateVersion })
        }
        appendAuditLog('sync', 'Pulled snapshot from ingest', window.location.origin)
        refreshMeta()
        setAuditTick((t) => t + 1)
        onSyncDone?.()
      }
    } finally {
      setPullBusy(false)
    }
  }, [applySnapshotFromJson, onSyncDone, refreshMeta])

  const saveMeta = useCallback(
    (next: Parameters<typeof updateSyncMeta>[0]) => {
      updateSyncMeta(next)
      refreshMeta()
      appendAuditLog('network', 'Sync settings updated', JSON.stringify(next))
      setAuditTick((t) => t + 1)
    },
    [refreshMeta]
  )

  const confirmSkipOnce = useCallback(() => {
    saveMeta({ skipEchelonVerified: true, skipEchelonEnabled: true })
    setShowSkipConfirm(false)
  }, [saveMeta])

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
      <h2 style={{ margin: '0 0 0.3rem', fontSize: '0.98rem' }}>Sync &amp; identity</h2>
      <p style={{ margin: '0 0 0.45rem', color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.38 }}>
        Log below shows paths after each run. Roster order; skip-echelon only when enabled and verified here.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.45rem 0.75rem',
          marginBottom: '0.5rem',
          alignItems: 'start',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
          <span>Local unit ID</span>
          <input
            value={meta.localUnitId}
            onChange={(e) => saveMeta({ localUnitId: e.target.value.slice(0, 16) })}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem', gridColumn: '1 / -1' }}>
          <span>Shared secret (for sync HMAC)</span>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.35rem' }}>
            <input
              type={showSharedSecret ? 'text' : 'password'}
              value={meta.syncSharedSecret}
              onChange={(e) => saveMeta({ syncSharedSecret: e.target.value })}
              placeholder="Same secret on all peers + FDC_SYNC_SECRET"
              autoComplete="off"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              title={showSharedSecret ? 'Hide secret' : 'Show secret'}
              aria-label={showSharedSecret ? 'Hide shared secret' : 'Show shared secret'}
              aria-pressed={showSharedSecret}
              onClick={() => setShowSharedSecret((v) => !v)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.25rem',
                padding: 0,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {showSharedSecret ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.35 }}>
            You choose a passphrase; the app uses it to sign requests (HMAC). It is not downloaded — match it on each node
            and set <code style={{ fontSize: '0.7em' }}>FDC_SYNC_SECRET</code> on machines running{' '}
            <code style={{ fontSize: '0.7em' }}>fdc-peer-server.mjs</code>.
          </span>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
          <span>Peer listen port</span>
          <input
            type="number"
            value={meta.peerListenPort}
            onChange={(e) => saveMeta({ peerListenPort: parseInt(e.target.value, 10) || 8787 })}
            className="input-no-spinner"
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', marginTop: '1.1rem' }}>
          <input
            type="checkbox"
            checked={meta.skipEchelonEnabled}
            onChange={(e) => saveMeta({ skipEchelonEnabled: e.target.checked })}
          />
          Skip-echelon routing
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
          <span>Max skip hops</span>
          <input
            type="number"
            min={1}
            max={5}
            value={meta.maxSkipHops}
            onChange={(e) => saveMeta({ maxSkipHops: Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
            style={{ width: '3.25rem' }}
            className="input-no-spinner"
          />
        </div>
      </div>
      {!meta.skipEchelonVerified && (
        <button
          type="button"
          onClick={() => setShowSkipConfirm(true)}
          style={{
            alignSelf: 'flex-start',
            marginBottom: '0.3rem',
            fontSize: '0.78rem',
            padding: '0.28rem 0.55rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
          }}
        >
          One-time verify skip-echelon…
        </button>
      )}
      {meta.skipEchelonVerified && (
        <p style={{ fontSize: '0.75rem', color: 'var(--success)', margin: '0 0 0.35rem' }}>Skip-echelon verified on this device.</p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button
          type="button"
          disabled={busy || pullBusy}
          onClick={() => void doForce()}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--accent-color, #336)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: busy || pullBusy ? 'wait' : 'pointer',
          }}
        >
          {busy ? 'Syncing…' : 'Force push snapshot'}
        </button>
        <button
          type="button"
          disabled={busy || pullBusy}
          onClick={() => void pullFromThisSiteIngest()}
          title="Fetches last pushed snapshot from this origin’s /fdc/v1/status (Vercel serverless or local peer server)."
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: busy || pullBusy ? 'wait' : 'pointer',
          }}
        >
          {pullBusy ? 'Pulling…' : 'Pull snapshot (this site ingest)'}
        </button>
        <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          DB stateVersion: <strong>{sv}</strong>
        </span>
      </div>
      <p style={{ margin: '0 0 0.45rem', color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.35 }}>
        Cross-internet: add the other deployment as a roster row (host e.g. <code style={{ fontSize: '0.7rem' }}>their-app.vercel.app</code>, port{' '}
        <code style={{ fontSize: '0.7rem' }}>443</code>, TLS on, shared secret matches Vercel <code style={{ fontSize: '0.7rem' }}>FDC_SYNC_SECRET</code>). Receiver on the same URL uses pull; see docs.
      </p>

      {(lastPath || lastLog) && (
        <div
          style={{
            marginTop: '0.45rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            overflow: 'hidden',
            background: 'var(--bg-primary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.35rem',
              padding: '0.4rem 0.55rem',
              borderBottom: syncOutputOpen ? '1px solid var(--border)' : 'none',
              background: 'var(--bg-tertiary)',
            }}
          >
            <button
              type="button"
              onClick={() => setSyncOutputOpen((o: boolean) => !o)}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.35rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <span>Last sync output</span>
              {syncOutputOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            </button>
            <button
              type="button"
              title="Clear this output"
              onClick={() => {
                setLastPath('')
                setLastLog('')
              }}
              style={{
                flexShrink: 0,
                fontSize: '0.72rem',
                padding: '0.2rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
          {syncOutputOpen && (
            <pre
              style={{
                margin: 0,
                padding: '0.65rem 0.75rem',
                fontSize: '0.78rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 'min(40vh, 280px)',
                overflow: 'auto',
                color: 'var(--text-secondary)',
              }}
            >
              {lastLog ? `[${lastLog}] ` : ''}
              Paths / results:{'\n'}
              {lastPath}
            </pre>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: '0.45rem',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.35rem',
            padding: '0.4rem 0.55rem',
            borderBottom: auditLogOpen ? '1px solid var(--border)' : 'none',
            background: 'var(--bg-tertiary)',
          }}
        >
          <button
            type="button"
            onClick={() => setAuditLogOpen((o: boolean) => !o)}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.35rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <span>Sync &amp; network log (SQLite)</span>
            {auditLogOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
          <button
            type="button"
            title="Clear stored sync/network log"
            onClick={() => {
              clearAuditLog()
              setAuditTick((t) => t + 1)
            }}
            style={{
              flexShrink: 0,
              fontSize: '0.72rem',
              padding: '0.2rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
        {auditLogOpen && (
          <pre
            style={{
              margin: 0,
              padding: '0.65rem 0.75rem',
              fontSize: '0.78rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 'min(40vh, 280px)',
              overflow: 'auto',
              color: 'var(--text-secondary)',
            }}
          >
            {auditEntries.length === 0
              ? 'No sync/network log entries yet.'
              : auditEntries
                  .map((entry: ReturnType<typeof listAuditLog>[number]) => {
                    const t = new Date(entry.ts).toLocaleString()
                    const head = `${t}  [${entry.category}] ${entry.message}`
                    return entry.detail ? `${head}\n  ${entry.detail}` : head
                  })
                  .join('\n\n')}
          </pre>
        )}
      </div>

      {showSkipConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '0.75rem',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-echelon-title"
            style={{
              background: 'var(--bg-secondary)',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '100%',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            <h3 id="skip-echelon-title" style={{ margin: '0 0 0.45rem', fontSize: '1rem' }}>
              Confirm skip-echelon
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 0.75rem' }}>
              You allow this device to bypass missing intermediate echelons when enabled. Saved once per device until app
              data is cleared.
            </p>
            <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.82rem',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSkipOnce}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: '1px solid var(--accent)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.82rem',
                }}
              >
                I understand — enable
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
