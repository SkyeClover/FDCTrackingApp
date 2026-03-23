import { useEffect, useRef } from 'react'
import { getSyncMeta } from '../../persistence/sqlite'
import { isSyncSharedSecretConfigured } from '../../sync/syncGuards'
import {
  notifyUpstreamOffline,
  reportBrowserOfflineLocalIngest,
  sessionPingLocalIngest,
} from '../../sync/peerClient'

const HEARTBEAT_MS = 45_000

/**
 * Keeps local fdc-peer-server aware this Walker Track tab is open (session-ping).
 * On real tab unload (not bfcache), tells local ingest + first roster upstream the station signed off cleanly.
 */
export function BrowserSessionLifecycle() {
  const signedOffRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

        /**
     * Implements tick for this module.
     */
const tick = () => {
      const meta = getSyncMeta()
      if (!isSyncSharedSecretConfigured(meta)) return
      void sessionPingLocalIngest(window.location.origin, meta.peerListenPort, meta)
    }

    void tick()
    const interval = window.setInterval(() => void tick(), HEARTBEAT_MS)

        /**
     * Implements on page hide for this module.
     */
const onPageHide = (ev: PageTransitionEvent) => {
      if (ev.persisted) return
      if (signedOffRef.current) return
      signedOffRef.current = true
      const meta = getSyncMeta()
      if (!isSyncSharedSecretConfigured(meta)) return
      void reportBrowserOfflineLocalIngest(window.location.origin, meta.peerListenPort, meta, {
        clean: true,
        keepalive: true,
      })
      void notifyUpstreamOffline(meta, { clean: true, keepalive: true })
    }

    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return null
}
