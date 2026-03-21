import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import {
  appendAuditLog,
  getSyncMeta,
  listNetworkRoster,
  updateSyncMeta,
} from '../persistence/sqlite'
import { fetchIngestHealth, fetchIngestStatus } from '../sync/peerClient'
import { isSyncSharedSecretConfigured } from '../sync/syncGuards'
import { useAppData } from '../context/AppDataContext'
import { normalizePeerUnitId, parseSyncAlertStyle } from '../lib/syncAlertStyle'

type BannerState =
  | null
  | {
      kind: 'pending'
      message: string
      ingestSv: number
      fromUnitId: string | null
    }
  | { kind: 'notice'; message: string }

/**
 * Polls this origin’s ingest health; shows accept/dismiss for pending snapshots or auto-applies per roster.
 */
export function SyncInboxBanner() {
  const { applySnapshotFromJson } = useAppData()
  const [banner, setBanner] = useState<BannerState>(null)
  const busyRef = useRef(false)
  const dismissTimerRef = useRef<number | null>(null)

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  const scheduleHideNotice = useCallback(
    (ms: number) => {
      clearDismissTimer()
      dismissTimerRef.current = window.setTimeout(() => setBanner(null), ms)
    },
    [clearDismissTimer]
  )

  const runPoll = useCallback(async () => {
    if (typeof window === 'undefined' || busyRef.current) return
    if (!isSyncSharedSecretConfigured(getSyncMeta())) return
    const origin = window.location.origin
    const health = await fetchIngestHealth(origin)
    if (!health.ok) return

    const ingestSv = health.stateVersion ?? 0
    const fromUid = health.fromUnitId ?? null
    const meta = getSyncMeta()
    const lastApplied = meta.lastAppliedIngestStateVersion
    const dismissed = meta.dismissedIngestStateVersion

    if (ingestSv <= 0) return

    /** Same shared ingest echoes our own push — do not notify or re-apply. */
    const localUid = meta.localUnitId?.trim()
    if (
      fromUid != null &&
      localUid &&
      normalizePeerUnitId(String(fromUid)) === normalizePeerUnitId(localUid)
    ) {
      if (ingestSv > (lastApplied ?? 0)) {
        updateSyncMeta({ lastAppliedIngestStateVersion: ingestSv })
      }
      setBanner((b) => (b?.kind === 'pending' ? null : b))
      return
    }

    const pending = ingestSv > lastApplied && ingestSv !== dismissed
    if (!pending) {
      setBanner((b) => (b?.kind === 'pending' ? null : b))
      return
    }

    const roster = listNetworkRoster()
    const match = roster.find(
      (r) =>
        r.peerUnitId &&
        fromUid &&
        normalizePeerUnitId(r.peerUnitId) === normalizePeerUnitId(fromUid)
    )

    const showAlerts = match ? match.syncAlertsEnabled : meta.incomingAlertsEnabled

    if (match?.autoAcceptSync) {
      busyRef.current = true
      try {
        const r = await fetchIngestStatus(meta, origin)
        if (r.ok && r.snapshotJson) {
          const ok = applySnapshotFromJson(r.snapshotJson)
          if (ok) {
            updateSyncMeta({ lastAppliedIngestStateVersion: ingestSv })
            appendAuditLog('sync', 'Auto-accepted ingest snapshot', `${fromUid ?? '?'} v${ingestSv}`)
            const style = parseSyncAlertStyle(meta.syncAlertStyleJson)
            setBanner({
              kind: 'notice',
              message: `Snapshot from ${fromUid ?? 'peer'} (v${ingestSv}) applied automatically.`,
            })
            scheduleHideNotice(style.durationMs)
          }
        }
      } finally {
        busyRef.current = false
      }
      return
    }

    if (!showAlerts) return

    const label = match?.displayName ?? (fromUid ? `Unit ${fromUid}` : 'Unknown unit')
    setBanner({
      kind: 'pending',
      message: `Incoming sync (v${ingestSv}) from ${label}.`,
      ingestSv,
      fromUnitId: fromUid,
    })
  }, [applySnapshotFromJson, scheduleHideNotice])

  useEffect(() => {
    void runPoll()
    const id = window.setInterval(() => void runPoll(), 22_000)
    return () => clearInterval(id)
  }, [runPoll])

  const accept = useCallback(async () => {
    if (!banner || banner.kind !== 'pending') return
    busyRef.current = true
    try {
      const meta = getSyncMeta()
      const r = await fetchIngestStatus(meta, window.location.origin)
      if (!r.ok || !r.snapshotJson) {
        setBanner({ kind: 'notice', message: r.detail ?? 'Could not load snapshot.' })
        scheduleHideNotice(8000)
        return
      }
      const ok = applySnapshotFromJson(r.snapshotJson)
      if (ok) {
        updateSyncMeta({ lastAppliedIngestStateVersion: banner.ingestSv })
        appendAuditLog('sync', 'Accepted ingest snapshot from banner', String(banner.ingestSv))
        const style = parseSyncAlertStyle(meta.syncAlertStyleJson)
        setBanner({
          kind: 'notice',
          message: `Snapshot v${banner.ingestSv} applied.`,
        })
        scheduleHideNotice(style.durationMs)
      }
    } finally {
      busyRef.current = false
    }
  }, [banner, applySnapshotFromJson, scheduleHideNotice])

  const dismiss = useCallback(() => {
    if (!banner || banner.kind !== 'pending') return
    updateSyncMeta({ dismissedIngestStateVersion: banner.ingestSv })
    appendAuditLog('sync', 'Dismissed ingest notification', String(banner.ingestSv))
    setBanner(null)
  }, [banner])

  if (!banner) return null

  const meta = getSyncMeta()
  const style = parseSyncAlertStyle(meta.syncAlertStyleJson)

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'max(0.65rem, env(safe-area-inset-top))',
        right: 'max(0.65rem, env(safe-area-inset-right))',
        zIndex: 9998,
        maxWidth: 'min(380px, calc(100vw - 1.25rem))',
        padding: '0.65rem 0.75rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        background: style.background,
        border: style.border,
        color: style.color,
        fontSize: '0.82rem',
        lineHeight: 1.35,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>{banner.message}</div>
        {banner.kind === 'pending' ? (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '0.1rem',
              opacity: 0.85,
            }}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
      {banner.kind === 'pending' ? (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void accept()}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent-color, #336)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.78rem',
            }}
          >
            Accept &amp; apply
          </button>
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border, rgba(255,255,255,0.25))',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.78rem',
            }}
          >
            Not now
          </button>
        </div>
      ) : null}
    </div>
  )
}
