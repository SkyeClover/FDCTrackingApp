import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Info, Loader2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import {
  appendAuditLog,
  getStateVersion,
  getSyncMeta,
  listNetworkRoster,
  updateSyncMeta,
  upsertNetworkRosterRow,
} from '../../persistence/sqlite'
import {
  fetchIngestHealth,
  fetchIngestStatus,
  fetchPeerHealth,
  notifyUpstreamOffline,
  peerBaseUrl,
  reportBrowserOfflineLocalIngest,
  resolveUpstreamNotifyRosterRow,
  sendPeerPing,
} from '../../sync/peerClient'
import { isSyncSharedSecretConfigured } from '../../sync/syncGuards'
import { runSnapshotPush } from '../../sync/syncEngine'
import {
  applyStationOfflineEscalation,
  STATION_OFFLINE_RED_AFTER_MS,
} from '../../sync/rosterPresenceEscalation'
import { CollapsibleCard } from './CollapsibleCard'

export function SyncControlSection({
  isMobile,
  onSyncDone,
  onSyncOutputChange,
  onLogsChanged,
}: {
  isMobile: boolean
  /** Called after roster-affecting sync actions so the table refreshes. */
  onSyncDone?: () => void
  /** Called whenever sync output text is updated. */
  onSyncOutputChange?: (payload: { path: string; loggedAt: string }) => void
  /** Called whenever SQLite sync/network logs are updated. */
  onLogsChanged?: () => void
}) {
  const { getStateSnapshot, applySnapshotFromJson } = useAppData()
  const [meta, setMeta] = useState(getSyncMeta)
  const [sv, setSv] = useState(getStateVersion)
  const [busy, setBusy] = useState(false)
  const [pullBusy, setPullBusy] = useState(false)
  const [pingBusy, setPingBusy] = useState(false)
  const [cleanDisconnectBusy, setCleanDisconnectBusy] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [showSharedSecret, setShowSharedSecret] = useState(false)
  const [auditTick, setAuditTick] = useState(0)
  const [actionFeedback, setActionFeedback] = useState<{
    tone: 'info' | 'success' | 'warn' | 'error'
    text: string
  } | null>(null)
  /** Snapshot version currently stored at this origin’s ingest (GET /fdc/v1/health). */
  const [ingestSvOnThisSite, setIngestSvOnThisSite] = useState<number | null>(null)
  const autoBusyRef = useRef(false)
  const anyBusy = busy || pullBusy || pingBusy || cleanDisconnectBusy

  const ipRosterPeers = useMemo(
    () => listNetworkRoster().filter((r) => r.host && r.port != null && r.bearer === 'ip'),
    [auditTick]
  )
  const resolvedUpstream = useMemo(
    () => resolveUpstreamNotifyRosterRow(getSyncMeta()),
    [meta.upstreamNotifyRosterId, auditTick, ipRosterPeers.length]
  )
  const secretOk = useMemo(() => isSyncSharedSecretConfigured(meta), [meta])

  const refreshMeta = useCallback(() => {
    setMeta(getSyncMeta())
    setSv(getStateVersion())
  }, [])

  const setFeedback = useCallback((tone: 'info' | 'success' | 'warn' | 'error', text: string) => {
    setActionFeedback({ tone, text })
  }, [])

  const publishSyncOutput = useCallback(
    (path: string) => {
      const loggedAt = new Date().toLocaleTimeString()
      onSyncOutputChange?.({ path, loggedAt })
    },
    [onSyncOutputChange]
  )

  const markLogsChanged = useCallback(() => {
    setAuditTick((t) => t + 1)
    onLogsChanged?.()
  }, [onLogsChanged])

  useEffect(() => {
    refreshMeta()
  }, [refreshMeta])

  useEffect(() => {
    if (!actionFeedback) return
    const id = window.setTimeout(() => setActionFeedback(null), 4200)
    return () => clearTimeout(id)
  }, [actionFeedback])

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshMeta()
    }, 5000)
    return () => clearInterval(id)
  }, [refreshMeta])

  useEffect(() => {
    if (!secretOk) {
      setIngestSvOnThisSite(null)
      return
    }
    let cancelled = false
    const tick = async () => {
      const h = await fetchIngestHealth(window.location.origin, meta.peerListenPort)
      if (cancelled || !h.ok) return
      const n = Number(h.stateVersion)
      if (Number.isFinite(n) && n > 0) setIngestSvOnThisSite(n)
    }
    void tick()
    const id = window.setInterval(() => void tick(), 22_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [secretOk, meta.peerListenPort])

  /** Automatic background push (same as manual snapshot push; gated by DB + secret + roster). */
  useEffect(() => {
    if (!meta.autoPushEnabled) return
    const intervalMs = 90_000
    const t = window.setInterval(() => {
      if (autoBusyRef.current) return
      if (!getSyncMeta().autoPushEnabled) return
      if (!isSyncSharedSecretConfigured(getSyncMeta())) return
      const peers = listNetworkRoster().filter((r) => r.host && r.port != null)
      if (peers.length === 0) return
      autoBusyRef.current = true
      void runSnapshotPush(getStateSnapshot(), 'auto')
        .then((summary) => {
          const paths = summary.targets.map((x) => `${x.row.displayName}: ${x.result}`).join(' · ')
          publishSyncOutput('auto → ' + paths)
          onSyncDone?.()
        })
        .catch(console.error)
        .finally(() => {
          autoBusyRef.current = false
          refreshMeta()
          markLogsChanged()
        })
    }, intervalMs)
    return () => clearInterval(t)
  }, [getStateSnapshot, onSyncDone, refreshMeta, meta.autoPushEnabled, publishSyncOutput, markLogsChanged])

  const doPingPeers = useCallback(async () => {
    if (!isSyncSharedSecretConfigured(getSyncMeta())) {
      publishSyncOutput('Set your shared passphrase before I can send a test message.')
      setFeedback('warn', 'Shared passphrase required before test messages.')
      return
    }
    setPingBusy(true)
    setFeedback('info', 'Sending signed test messages to roster peers...')
    try {
      const m = getSyncMeta()
      const peers = listNetworkRoster().filter((r) => r.host && r.port != null && r.bearer === 'ip')
      if (peers.length === 0) {
        publishSyncOutput('No roster rows with host, port, and IP/LAN bearer to ping.')
        setFeedback('warn', 'No IP/LAN peers are configured for test messages.')
        return
      }
      const lines: string[] = []
      for (const row of peers) {
        const h = await fetchPeerHealth(row, { localStateVersion: getStateVersion() })
        const origin = peerBaseUrl(row) ?? row.displayName
        if (!h.transportOk) {
          lines.push(`${row.displayName}: FAIL ingest unreachable → ${origin}`)
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
          continue
        }
        const r = await sendPeerPing(row, m)
        const tracked = h.stationSessionTracked
        const tabMissing = tracked && !h.browserPresent
        let line: string
        let candidate: 'green' | 'yellow' | 'red'
        let lastErr: string | null
        if (!r.ok) {
          line = `FAIL signed ping: ${r.detail ?? 'error'}`
          candidate = 'red'
          lastErr = r.detail ?? 'ping failed'
        } else if (!tracked) {
          line = row.peerUnitId?.trim()
            ? `WARN crypto OK — ingest didn’t return per-unit tab presence (unexpected for Vercel / current peer server)`
            : `WARN set “Peer unit ID” on this row (must match their Network → Local unit ID) so the ingest can report that station’s tab`
          candidate = 'yellow'
          lastErr = 'ingest has no per-unit session tracking'
        } else if (tabMissing) {
          const kind =
            h.browserOfflineKind === 'clean'
              ? 'clean sign-off'
              : h.browserOfflineKind === 'stale'
                ? 'no tab heartbeat (unclean)'
                : 'tab offline'
          line = `FAIL station closed (${kind}) — ${r.detail ?? 'pong'}`
          candidate = 'red'
          lastErr = `Walker Track tab not present (${kind})`
        } else if (h.snapshotUnitMismatch) {
          line = `WARN last snapshot on their ingest is from a different Local unit ID than this row’s Peer unit ID — ${r.detail ?? 'pong'}`
          candidate = 'yellow'
          lastErr = 'snapshot fromUnitId ≠ Peer unit ID'
        } else {
          line = `OK Walker Track tab up — ${r.detail ?? 'pong'}`
          candidate = 'green'
          lastErr = null
        }
        const esc = applyStationOfflineEscalation({
          candidateStatus: candidate,
          stationOfflineYellow: tabMissing,
          prevOfflineSinceMs: row.stationOfflineSinceMs,
        })
        let displayErr = lastErr
        if (
          esc.status === 'red' &&
          candidate === 'yellow' &&
          tabMissing &&
          h.transportOk
        ) {
          const mins = STATION_OFFLINE_RED_AFTER_MS / 60_000
          displayErr = `${lastErr ?? 'Walker Track station offline'} — no recovery in ${mins}+ min`
        }
        lines.push(`${row.displayName}: ${line} → ${origin}`)
        upsertNetworkRosterRow({
          ...row,
          status: esc.status,
          stationOfflineSinceMs: esc.stationOfflineSinceMs,
          lastSeenMs: Date.now(),
          lastError: displayErr,
        })
      }
      publishSyncOutput(
        [
          'Test message: signed ping + (when supported) Walker Track tab presence on their ingest:',
          ...lines,
        ].join('\n')
      )
      appendAuditLog(
        'sync',
        'Ping test',
        lines.slice(0, 8).join(' · ') + (lines.length > 8 ? ` … +${lines.length - 8}` : '')
      )
      markLogsChanged()
      onSyncDone?.()
      setFeedback('success', `Peer test completed for ${peers.length} row${peers.length === 1 ? '' : 's'}.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      publishSyncOutput(msg)
      setFeedback('error', 'Peer test failed. Check output for details.')
    } finally {
      setPingBusy(false)
    }
  }, [onSyncDone, setFeedback, publishSyncOutput, markLogsChanged])

  const doForce = useCallback(async () => {
    if (!isSyncSharedSecretConfigured(getSyncMeta())) {
      publishSyncOutput('Set your shared passphrase before pushing — it has to match what you typed on the other machines.')
      setFeedback('warn', 'Shared passphrase required before force push.')
      return
    }
    setBusy(true)
    setFeedback('info', 'Pushing snapshot to configured peers...')
    try {
      const summary = await runSnapshotPush(getStateSnapshot(), 'force')
      const paths = summary.targets.map((t) => `${t.row.displayName} → ${t.path} (${t.result})`).join('\n')
      publishSyncOutput(paths || '(no roster rows with host/port)')
      appendAuditLog('sync', 'Force push completed', paths)
      onSyncDone?.()
      setFeedback('success', `Snapshot push completed for ${summary.targets.length} target${summary.targets.length === 1 ? '' : 's'}.`)
    } catch (e) {
      publishSyncOutput(e instanceof Error ? e.message : String(e))
      setFeedback('error', 'Snapshot push failed. Check output for details.')
    } finally {
      setBusy(false)
      refreshMeta()
      markLogsChanged()
    }
  }, [getStateSnapshot, onSyncDone, refreshMeta, setFeedback, publishSyncOutput, markLogsChanged])

  const pullFromThisSiteIngest = useCallback(async () => {
    if (!isSyncSharedSecretConfigured(getSyncMeta())) {
      publishSyncOutput('Set your shared passphrase before pulling — same one you use on the copy you’re pulling from.')
      setFeedback('warn', 'Shared passphrase required before pull.')
      return
    }
    if (
      !confirm(
        'Apply the ingest snapshot on this device? Scope is automatic from the matched roster Role (BOC row = battery subtree, PLT row = PLT subtree). If no scoped role matches the sender, the whole app state is replaced. You can’t undo that.'
      )
    ) {
      return
    }
    setPullBusy(true)
    setFeedback('info', 'Pulling latest snapshot from this site ingest...')
    try {
      const meta = getSyncMeta()
      const r = await fetchIngestStatus(meta, window.location.origin)
      if (!r.ok || !r.snapshotJson) {
        const msg = r.detail ?? 'Unknown error'
        publishSyncOutput(`Pull ingest failed: ${msg}`)
        appendAuditLog('sync', 'Pull ingest failed', msg)
        setFeedback('error', 'Pull failed. Check output for details.')
        markLogsChanged()
        return
      }
      const pulledSv = r.stateVersion != null ? Number(r.stateVersion) : undefined
      const ok = applySnapshotFromJson(r.snapshotJson, pulledSv, { fromUnitId: r.fromUnitId })
      if (ok) {
        if (pulledSv != null && Number.isFinite(pulledSv)) {
          updateSyncMeta({ lastAppliedIngestStateVersion: pulledSv })
          setIngestSvOnThisSite(pulledSv)
        }
        appendAuditLog('sync', 'Pulled snapshot from ingest', window.location.origin)
        publishSyncOutput('Pulled snapshot from this site ingest and applied it to local DB.')
        refreshMeta()
        markLogsChanged()
        onSyncDone?.()
        setFeedback('success', 'Snapshot pulled and applied from ingest.')
      }
    } catch {
      setFeedback('error', 'Pull failed. Check output for details.')
    } finally {
      setPullBusy(false)
    }
  }, [applySnapshotFromJson, onSyncDone, refreshMeta, setFeedback, publishSyncOutput, markLogsChanged])

  const saveMeta = useCallback(
    (next: Parameters<typeof updateSyncMeta>[0]) => {
      updateSyncMeta(next)
      refreshMeta()
      appendAuditLog('network', 'Sync settings updated', JSON.stringify(next))
      markLogsChanged()
    },
    [refreshMeta, markLogsChanged]
  )

  const confirmSkipOnce = useCallback(() => {
    saveMeta({ skipEchelonVerified: true, skipEchelonEnabled: true })
    setShowSkipConfirm(false)
  }, [saveMeta])

  const doCleanDisconnect = useCallback(async () => {
    if (!isSyncSharedSecretConfigured(getSyncMeta())) {
      publishSyncOutput('Set your shared passphrase before a clean disconnect.')
      setFeedback('warn', 'Shared passphrase required for clean disconnect.')
      return
    }
    if (
      !confirm(
        'Mark this station offline for sync (clean sign-off)? I’ll tell your local ingest and the first roster peer (next echelon up). Close the tab afterward or use this before walking away.'
      )
    ) {
      return
    }
    setCleanDisconnectBusy(true)
    setFeedback('info', 'Sending clean sign-off notifications...')
    try {
      const m = getSyncMeta()
      await reportBrowserOfflineLocalIngest(window.location.origin, m.peerListenPort, m, { clean: true })
      const up = await notifyUpstreamOffline(m, { clean: true })
      const lines = [
        'Local ingest: marked browser session offline (clean).',
        up.ok ? `Upstream (${up.detail}): notified of clean sign-off.` : `Upstream: ${up.detail}`,
      ]
      publishSyncOutput(lines.join('\n'))
      appendAuditLog('network', 'Clean disconnect', lines.join(' · '))
      markLogsChanged()
      onSyncDone?.()
      setFeedback('success', 'Clean disconnect notifications sent.')
    } catch {
      setFeedback('error', 'Clean disconnect failed. Check output for details.')
    } finally {
      setCleanDisconnectBusy(false)
    }
  }, [onSyncDone, setFeedback, publishSyncOutput, markLogsChanged])

  return (
    <CollapsibleCard
      title="Sync & identity"
      defaultOpen
      description={
        <p style={{ margin: 0 }}>
          Peers run in roster order; skip-echelon only when you’ve turned it on and confirmed here. Detailed sync and DB
          logs are in the right column.
        </p>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 0.8fr) minmax(360px, 1.2fr)',
          gap: '0.55rem 0.85rem',
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
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
          <span>Shared secret (for sync HMAC)</span>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.35rem' }}>
            <input
              type={showSharedSecret ? 'text' : 'password'}
              value={meta.syncSharedSecret}
              onChange={(e) => saveMeta({ syncSharedSecret: e.target.value })}
              placeholder="Same phrase on my Pi, laptop, and any other copy"
              autoComplete="off"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              title={showSharedSecret ? 'Hide passphrase' : 'Show passphrase'}
              aria-label={showSharedSecret ? 'Hide shared passphrase' : 'Show shared passphrase'}
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
            I use this exact text on every device and on whatever box is receiving sync (your Pi, another install, etc.).
            Extra spaces at the ends get trimmed. If something complains about a bad signature, it’s almost always a typo
            or a different phrase — compare carefully, character for character.
          </span>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
          <span>Peer listen port</span>
          <input
            type="number"
            value={meta.peerListenPort}
            onChange={(e) => saveMeta({ peerListenPort: parseInt(e.target.value, 10) || 8787 })}
            className="touch-stepper"
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.35 }}>
            Port where <code style={{ fontSize: '0.7rem' }}>fdc-peer-server</code> runs (often 8787). If the app opens on another
            port (e.g. Pi on :3000), I still use this for pull / ingest health on the same machine.
          </span>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
          <span>Upstream for sign-off &amp; tab-close notify</span>
          <select
            value={meta.upstreamNotifyRosterId || ''}
            onChange={(e) => saveMeta({ upstreamNotifyRosterId: e.target.value })}
            style={{ maxWidth: '100%', padding: '0.25rem 0.35rem', fontSize: '0.8rem' }}
          >
            <option value="">Default — first roster row (host + IP/LAN), same order as push</option>
            {ipRosterPeers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName} ({r.host}:{r.port})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.35 }}>
            Clean disconnect and closing this tab POST an <code style={{ fontSize: '0.7rem' }}>offline-notify</code> here.
            {ipRosterPeers.length === 0 ? (
              <strong> Add a network roster row with host/port first.</strong>
            ) : resolvedUpstream ? (
              <> Resolves to: <strong>{resolvedUpstream.displayName}</strong>.</>
            ) : (
              <strong> No row qualifies — set host, port, bearer IP/LAN on a roster entry.</strong>
            )}
          </span>
        </label>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            fontSize: '0.8rem',
            gridColumn: '1 / -1',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <input
              type="checkbox"
              checked={meta.autoPushEnabled}
              onChange={(e) => saveMeta({ autoPushEnabled: e.target.checked })}
            />
            Auto-push snapshot
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400, lineHeight: 1.4 }}>
            When this is on, I’ll push my data to everyone in the roster who has a host and port about every 90 seconds —
            but only if you’ve set the shared passphrase and there’s at least one peer. Turn it off if you only want to push
            when you tap “Force push snapshot”.
          </span>
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
            className="touch-stepper"
          />
        </div>
      </div>
      {!meta.skipEchelonVerified && (
        <button
          type="button"
          onClick={() => setShowSkipConfirm(true)}
          style={{
            alignSelf: 'flex-start',
            display: 'block',
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

      {!secretOk ? (
        <p style={{ margin: '0 0 0.5rem', color: 'var(--warning)', fontSize: '0.78rem', lineHeight: 1.4 }}>
          Add your <strong>shared passphrase</strong> up there before I can sync — auto push, force push, and pull all need
          it, and it has to match what you set on the other side.
        </p>
      ) : null}
      {actionFeedback ? (
        <div className={`sync-feedback-banner sync-feedback-${actionFeedback.tone}`} role="status" aria-live="polite">
          {actionFeedback.tone === 'success' ? (
            <CheckCircle2 size={15} aria-hidden />
          ) : actionFeedback.tone === 'warn' || actionFeedback.tone === 'error' ? (
            <AlertTriangle size={15} aria-hidden />
          ) : (
            <Info size={15} aria-hidden />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button
          className="sync-action-btn sync-action-btn-primary"
          type="button"
          disabled={busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk}
          onClick={() => void doForce()}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--accent-color, #336)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk ? 'not-allowed' : 'pointer',
            opacity: !secretOk ? 0.55 : 1,
          }}
        >
          {busy ? <><Loader2 size={14} className="spin-inline" aria-hidden />Syncing...</> : 'Force push snapshot'}
        </button>
        <button
          className="sync-action-btn"
          type="button"
          disabled={busy || pullBusy || pingBusy || !secretOk}
          onClick={() => void pullFromThisSiteIngest()}
          title="Pull the last snapshot stored in this device’s ingest (same host as the app; on a Pi I also try your peer listen port if the UI is on a different port)."
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk ? 'not-allowed' : 'pointer',
            opacity: !secretOk ? 0.55 : 1,
          }}
        >
          {pullBusy ? <><Loader2 size={14} className="spin-inline" aria-hidden />Pulling...</> : 'Pull snapshot (this site ingest)'}
        </button>
        <button
          className="sync-action-btn"
          type="button"
          disabled={busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk}
          onClick={() => void doPingPeers()}
          title="Send a quick hello to each LAN peer in the roster — doesn’t copy your full data."
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk ? 'not-allowed' : 'pointer',
            opacity: !secretOk ? 0.55 : 1,
          }}
        >
          {pingBusy ? <><Loader2 size={14} className="spin-inline" aria-hidden />Pinging...</> : 'Send test message'}
        </button>
        <button
          className="sync-action-btn"
          type="button"
          disabled={busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk}
          onClick={() => void doCleanDisconnect()}
          title="Tell your local peer server and the first roster row (upstream) that this Walker Track tab is signing off cleanly."
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: busy || pullBusy || pingBusy || cleanDisconnectBusy || !secretOk ? 'not-allowed' : 'pointer',
            opacity: !secretOk ? 0.55 : 1,
          }}
        >
          {cleanDisconnectBusy ? <><Loader2 size={14} className="spin-inline" aria-hidden />Signing off...</> : 'Clean disconnect (notify upstream)'}
        </button>
        <span
          className={anyBusy ? 'sync-version-indicator is-busy' : 'sync-version-indicator'}
          style={{
            alignSelf: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            lineHeight: 1.35,
          }}
          title="Local counter in your DB. After you pull or accept an ingest snapshot, it is set to that snapshot’s version so it matches what was pushed."
        >
          Data version: <strong>{sv}</strong>
          {ingestSvOnThisSite != null ? (
            <span style={{ marginLeft: '0.45rem', opacity: 0.92 }}>
              · This site’s ingest: <strong>{ingestSvOnThisSite}</strong>
              {ingestSvOnThisSite > sv
                ? ' (newer — pull or accept prompt)'
                : ingestSvOnThisSite < sv
                  ? ' (your DB is ahead)'
                  : ''}
            </span>
          ) : null}
        </span>
      </div>
      <p style={{ margin: '0 0 0.45rem', color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.35 }}>
        Over the internet: add the other site as a roster row (its hostname, port <code style={{ fontSize: '0.7rem' }}>443</code>, TLS on), and use the same shared passphrase there. If you’re on that same site, you can pull what was last saved there.
      </p>
      <p style={{ margin: '0 0 0.45rem', color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.35 }}>
        <strong>Station presence:</strong> each peer must run the current <code style={{ fontSize: '0.7rem' }}>fdc-peer-server</code>{' '}
        so <strong>Send test message</strong> can tell “tab up” vs “only Node is up.” I heartbeat to my local ingest while this tab
        is open. Closing the tab notifies <strong>Upstream for sign-off</strong> (and local ingest). If the tab dies, their ingest
        reports <em>unclean</em> (stale) after a couple of minutes. Snapshot push still works if their Node ingest is reachable —
        roster <strong>red</strong> includes “station closed” (no Walker Track tab); <strong>yellow</strong> is for other warnings (e.g. peer unit ID / snapshot mismatch).
      </p>

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
    </CollapsibleCard>
  )
}
