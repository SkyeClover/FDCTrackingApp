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
  const bannerRef = useRef<BannerState>(null)
  const busyRef = useRef(false)
  const dismissTimerRef = useRef<number | null>(null)
  const offlineNotifySeenAtRef = useRef(0)
  const noPeerMatchHintSvRef = useRef(0)
  const alertsOffForRowHintSvRef = useRef(0)

  useEffect(() => {
    bannerRef.current = banner
  }, [banner])

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
    const meta = getSyncMeta()
    if (!isSyncSharedSecretConfigured(meta)) return
    const origin = window.location.origin
    const health = await fetchIngestHealth(origin, meta.peerListenPort)
    if (!health.ok) return

    const offlineN = health.offlineNotify
    if (
      offlineN &&
      meta.incomingAlertsEnabled &&
      offlineN.receivedAt > offlineNotifySeenAtRef.current
    ) {
      const roster = listNetworkRoster()
      const match = roster.find(
        (r) =>
          r.peerUnitId &&
          offlineN.fromUnitId &&
          normalizePeerUnitId(String(r.peerUnitId)) === normalizePeerUnitId(offlineN.fromUnitId)
      )
      if (match?.syncAlertsEnabled === false) {
        offlineNotifySeenAtRef.current = offlineN.receivedAt
      } else if (bannerRef.current?.kind !== 'pending') {
        offlineNotifySeenAtRef.current = offlineN.receivedAt
        const label = match?.displayName ?? offlineN.fromUnitId
        appendAuditLog(
          'sync',
          'Upstream offline notice',
          `${offlineN.fromUnitId} clean=${offlineN.clean}`
        )
        setBanner({
          kind: 'notice',
          message: `${label} (${offlineN.fromUnitId}) reported going offline — ${offlineN.clean ? 'clean sign-off' : 'disconnect'}.`,
        })
        const style = parseSyncAlertStyle(meta.syncAlertStyleJson)
        scheduleHideNotice(style.durationMs)
      }
    }

    const ingestSv = health.stateVersion ?? 0
    const fromUid = health.fromUnitId ?? null
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

    /** No roster Peer unit ID matches ingest fromUnitId — user sees nothing unless we hint. */
    if (!match) {
      if (
        meta.incomingAlertsEnabled &&
        noPeerMatchHintSvRef.current !== ingestSv
      ) {
        noPeerMatchHintSvRef.current = ingestSv
        const who = fromUid ? `unit “${fromUid}”` : 'the peer (missing fromUnitId on snapshot)'
        appendAuditLog('sync', 'Ingest pending — no roster Peer unit ID match', `${who} v${ingestSv}`)
        setBanner({
          kind: 'notice',
          message: `Ingest has v${ingestSv} from ${who}. Set a Network roster row’s Peer unit ID to exactly match their Local unit ID to get apply prompts.`,
        })
        scheduleHideNotice(16_000)
      } else if (!meta.incomingAlertsEnabled) {
        setBanner((b) => (b?.kind === 'pending' ? null : b))
      }
      return
    }

    if (match.autoAcceptSync) {
      busyRef.current = true
      try {
        const r = await fetchIngestStatus(meta, origin)
        if (r.ok && r.snapshotJson) {
          const appliedSv = r.stateVersion ?? ingestSv
          const ok = applySnapshotFromJson(r.snapshotJson, appliedSv)
          if (ok) {
            updateSyncMeta({ lastAppliedIngestStateVersion: appliedSv })
            appendAuditLog('sync', 'Auto-accepted ingest snapshot', `${fromUid ?? '?'} v${ingestSv}`)
            const style = parseSyncAlertStyle(meta.syncAlertStyleJson)
            setBanner({
              kind: 'notice',
              message: `I pulled in data from ${fromUid ?? 'that unit'} — you’re up to date.`,
            })
            scheduleHideNotice(style.durationMs)
          }
        }
      } finally {
        busyRef.current = false
      }
      return
    }

    if (!match.syncAlertsEnabled && !match.autoAcceptSync) {
      if (alertsOffForRowHintSvRef.current !== ingestSv) {
        alertsOffForRowHintSvRef.current = ingestSv
        appendAuditLog(
          'sync',
          'Ingest pending — sync alerts off for roster row',
          `${match.displayName} (${fromUid ?? '?'}) v${ingestSv}`
        )
        if (meta.incomingAlertsEnabled) {
          setBanner({
            kind: 'notice',
            message: `New data on ingest (v${ingestSv}) for ${match.displayName}, but sync alerts are off for that row — enable alerts or turn on auto-accept in Network.`,
          })
          scheduleHideNotice(14_000)
        }
      }
      setBanner((b) => (b?.kind === 'pending' ? null : b))
      return
    }

    const label = match.displayName || (fromUid ? `Unit ${fromUid}` : 'Peer')
    setBanner({
      kind: 'pending',
      message: `New data waiting (v${ingestSv}) from ${label}. Want me to apply it?`,
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
      const appliedSv = r.stateVersion ?? banner.ingestSv
      const ok = applySnapshotFromJson(r.snapshotJson, appliedSv)
      if (ok) {
        updateSyncMeta({ lastAppliedIngestStateVersion: appliedSv })
        appendAuditLog('sync', 'Accepted ingest snapshot from banner', String(appliedSv))
        const style = parseSyncAlertStyle(meta.syncAlertStyleJson)
        setBanner({
          kind: 'notice',
          message: `Done — I’m on v${banner.ingestSv} now.`,
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
