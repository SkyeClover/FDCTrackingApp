import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import PageShell from '../components/layout/PageShell'
import { Network as NetworkIcon, Wifi, Server, Globe, Activity, RadioTower } from 'lucide-react'
import { fetchLocalSystemInfo, shouldAttemptLocalAgentFetch } from '../lib/deviceAgent'
import { NetworkRosterSection } from '../components/network/NetworkRosterSection'
import { SyncControlSection } from '../components/network/SyncControlSection'

interface NetworkInfo {
  ipAddress: string
  macAddress: string
  networkInterface: string
  networkStatus: string
  hostname?: string
  platform?: string
}

export default function Network() {
  const [rosterTick, setRosterTick] = useState(0)
  const bumpRoster = useCallback(() => setRosterTick((x) => x + 1), [])

  const [info, setInfo] = useState<NetworkInfo | null>(null)
  const [hostedSkip] = useState(
    () => typeof window !== 'undefined' && !shouldAttemptLocalAgentFetch()
  )
  const [loading, setLoading] = useState(
    () => (typeof window !== 'undefined' ? shouldAttemptLocalAgentFetch() : true)
  )
  const [error, setError] = useState<string | null>(null)
  const [rosterEditing, setRosterEditing] = useState(false)
  const lastInfoJsonRef = useRef<string | null>(null)
  const isMobile = useIsMobile()
  const safeIsMobile = isMobile ?? false

  const onRosterEditingChange = useCallback((editing: boolean) => {
    setRosterEditing(editing)
  }, [])

  const fetchNetworkInfo = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchLocalSystemInfo()
      const next: NetworkInfo = {
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        networkInterface: data.networkInterface,
        networkStatus: data.networkStatus,
        hostname: data.hostname,
        platform: data.platform,
      }
      const json = JSON.stringify(next)
      if (lastInfoJsonRef.current === json) {
        setLoading(false)
        return
      }
      lastInfoJsonRef.current = json
      setInfo(next)
      setLoading(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg === 'HOSTED_NO_LOCAL_AGENT') {
        setError(null)
        setInfo(null)
        lastInfoJsonRef.current = null
      } else {
        setError(
          `I couldn’t read this device’s network details (${msg}). On your Pi kiosk, make sure the small local helper is running; otherwise I’m fine without it.`
        )
      }
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hostedSkip) return
    const timer = setTimeout(() => {
      void fetchNetworkInfo()
    }, 200)

    return () => {
      clearTimeout(timer)
    }
  }, [fetchNetworkInfo, hostedSkip])

  /** Slower polling when the agent is offline; paused while editing roster so rows don’t fight focus. */
  useEffect(() => {
    if (hostedSkip || rosterEditing) return
    const pollMs = error ? 45_000 : 12_000
    const id = window.setInterval(() => {
      void fetchNetworkInfo()
    }, pollMs)
    return () => clearInterval(id)
  }, [fetchNetworkInfo, error, hostedSkip, rosterEditing])

  const safeString = useCallback((val: string | undefined | null): string => {
    if (val === null || val === undefined) return 'N/A'
    try {
      return String(val) || 'N/A'
    } catch {
      return 'N/A'
    }
  }, [])

  const networkItems = useMemo(() => {
    if (!info || typeof info !== 'object') return []

    try {
      const items: Array<{ icon: React.ReactNode; label: string; value: string }> = []
      const iconProps = { size: 18 }
      
      items.push({ icon: React.createElement(NetworkIcon, iconProps), label: 'IP Address', value: safeString(info.ipAddress) })
      items.push({ icon: React.createElement(Server, iconProps), label: 'MAC Address', value: safeString(info.macAddress) })
      items.push({ icon: React.createElement(Wifi, iconProps), label: 'Network Interface', value: safeString(info.networkInterface) })
      items.push({ icon: React.createElement(Activity, iconProps), label: 'Network Status', value: safeString(info.networkStatus) })
      if (info.hostname) items.push({ icon: React.createElement(Server, iconProps), label: 'Hostname', value: safeString(info.hostname) })
      if (info.platform) items.push({ icon: React.createElement(Globe, iconProps), label: 'Platform', value: safeString(info.platform) })

      return items.filter(item => item && item.label && item.value)
    } catch {
      return []
    }
  }, [info, safeString])

  return (
    <PageShell title="Network" isMobile={safeIsMobile}>
      <SyncControlSection isMobile={safeIsMobile} onSyncDone={bumpRoster} />
      <NetworkRosterSection
        isMobile={safeIsMobile}
        refreshKey={rosterTick}
        onChanged={bumpRoster}
        onEditingChange={onRosterEditingChange}
      />

      {hostedSkip && (
        <p
          style={{
            margin: '0 0 0.6rem',
            padding: '0.45rem 0.6rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>When I’m opened from a regular website</strong> — I can’t see your
          PC’s network card from here; that only works when you run me on your own machine or kiosk (browsers keep sites
          from poking around your LAN).
        </p>
      )}

      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
          Loading this device’s network information…
        </p>
      )}

      {!loading && !hostedSkip && error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.6rem 0.75rem',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: 'var(--warning)' }}>Local agent</strong> — {error}
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError(null)
              void fetchNetworkInfo()
            }}
            style={{
              display: 'inline-block',
              marginLeft: '0.75rem',
              padding: '0.25rem 0.6rem',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !hostedSkip && !error && !info && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
          No network information for this device.
        </p>
      )}

      {!loading && info && networkItems.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Could not build display for this device.</p>
      )}

      {info && networkItems.length > 0 && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: safeIsMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {networkItems.map((item, index) => (
          <div
            key={`network-${index}-${item.label}`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <div style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}>{item.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</div>
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  wordBreak: 'break-word',
                }}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* SINCGARS / 1523 Radio Connection Placeholder */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.65rem 0.75rem',
          borderRadius: '6px',
          border: '1px dashed var(--border)',
          marginTop: '0.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <div style={{ color: 'var(--accent)', flexShrink: 0 }}>{React.createElement(RadioTower, { size: 20 })}</div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            SINCGARS / 1523 Radio
          </h3>
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
          UI when connected. <span style={{ fontStyle: 'italic' }}>Not connected</span>
        </p>
      </div>
    </PageShell>
  )
}

