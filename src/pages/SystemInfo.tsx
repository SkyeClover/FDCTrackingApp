import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import PageShell from '../components/layout/PageShell'
import { Cpu, Thermometer, Zap, HardDrive, Clock, Server, Globe, RadioTower } from 'lucide-react'
import { fetchSystemInfoPayload, shouldAttemptLocalAgentFetch } from '../lib/deviceAgent'

interface SystemInfo {
  cpuTemp: string
  cpuVoltage: string
  cpuLoad: string
  memoryTotal: string
  memoryUsed: string
  memoryFree: string
  diskTotal: string
  diskUsed: string
  diskFree: string
  uptime: string
  hostname: string
  osVersion: string
  cpuModel: string
}

// Format bytes function - defined outside component
function formatBytes(bytes: string | undefined | null): string {
  try {
    if (!bytes || bytes === 'N/A' || bytes === '0' || bytes === '') return 'N/A'
    const cleanBytes = String(bytes).replace(/[^0-9]/g, '')
    if (!cleanBytes || cleanBytes.length === 0) return 'N/A'
    const numBytes = parseInt(cleanBytes, 10)
    if (isNaN(numBytes) || numBytes < 0 || !isFinite(numBytes)) return 'N/A'
    if (numBytes === 0) return '0 Bytes'
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const logResult = Math.log(numBytes) / Math.log(1024)
    if (!isFinite(logResult) || logResult < 0) return 'N/A'
    const i = Math.floor(logResult)
    if (i < 0 || i >= sizes.length) return 'N/A'
    const divisor = Math.pow(1024, i)
    if (!isFinite(divisor) || divisor === 0) return 'N/A'
    const result = parseFloat((numBytes / divisor).toFixed(2))
    if (isNaN(result) || !isFinite(result)) return 'N/A'
    return result + ' ' + sizes[i]
  } catch (err) {
    return 'N/A'
  }
}

/**
 * Renders the System Info UI section.
 */
export default function SystemInfo() {
  // All hooks must be called unconditionally at the top
  const [info, setInfo] = useState<SystemInfo | null>(null)
  // --- Local state and callbacks ---
  const [hostedSkip] = useState(
    () => typeof window !== 'undefined' && !shouldAttemptLocalAgentFetch()
  )
  const [loading, setLoading] = useState(
    () => (typeof window !== 'undefined' ? shouldAttemptLocalAgentFetch() : true)
  )
  const [error, setError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const safeIsMobile = isMobile ?? false

  const fetchSystemInfo = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchSystemInfoPayload()

      const validatedData: SystemInfo = {
        cpuTemp: String(data.cpuTemp ?? 'N/A'),
        cpuVoltage: String(data.cpuVoltage ?? 'N/A'),
        cpuLoad: String(data.cpuLoad ?? 'N/A'),
        memoryTotal: String(data.memoryTotal ?? '0'),
        memoryUsed: String(data.memoryUsed ?? '0'),
        memoryFree: String(data.memoryFree ?? '0'),
        diskTotal: String(data.diskTotal ?? '0'),
        diskUsed: String(data.diskUsed ?? '0'),
        diskFree: String(data.diskFree ?? '0'),
        uptime: String(data.uptime ?? 'N/A'),
        hostname: String(data.hostname ?? 'N/A'),
        osVersion: String(
          (data.osVersion as string | undefined) ??
            ([data.platform, (data as { osRelease?: string }).osRelease].filter(Boolean).join(' ') || 'N/A')
        ),
        cpuModel: String(data.cpuModel ?? 'N/A'),
      }

      setInfo(validatedData)
      setLoading(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg === 'HOSTED_NO_LOCAL_AGENT') {
        setError(null)
        setInfo(null)
      } else {
        setError(
          `I couldn’t load hardware stats (${msg}). On your Pi that’s usually the little local helper; everything else still works.`
        )
      }
      setLoading(false)
    }
  }, [])

  // --- Side effects ---
  useEffect(() => {
    if (hostedSkip) return
    const timer = setTimeout(() => {
      void fetchSystemInfo()
    }, 200)

    return () => {
      clearTimeout(timer)
    }
  }, [fetchSystemInfo, hostedSkip])

  useEffect(() => {
    if (hostedSkip) return
    const pollMs = error ? 45_000 : 12_000
    const id = window.setInterval(() => {
      void fetchSystemInfo()
    }, pollMs)
    return () => clearInterval(id)
  }, [fetchSystemInfo, error, hostedSkip])

  // Safe string helper
  const safeString = useCallback((val: string | undefined | null): string => {
    if (val === null || val === undefined) return 'N/A'
    try {
      return String(val) || 'N/A'
    } catch {
      return 'N/A'
    }
  }, [])

  // Safe bytes formatter
  const formatBytesSafe = useCallback((bytes: string | undefined | null): string => {
    try {
      if (!bytes || bytes === 'N/A' || bytes === '') return 'N/A'
      return formatBytes(bytes)
    } catch {
      return 'N/A'
    }
  }, [])

  // Create info items - simplified and safe
  const infoItems = useMemo(() => {
    if (!info || typeof info !== 'object') return []

    try {
      const items: Array<{ icon: React.ReactNode; label: string; value: string }> = []

      // Create icons safely
      const iconProps = { size: 20 }
      
      items.push({ icon: React.createElement(Thermometer, iconProps), label: 'CPU Temperature', value: safeString(info.cpuTemp) })
      items.push({ icon: React.createElement(Zap, iconProps), label: 'CPU Voltage', value: safeString(info.cpuVoltage) })
      items.push({ icon: React.createElement(Cpu, iconProps), label: 'CPU Load', value: safeString(info.cpuLoad) })
      items.push({ icon: React.createElement(Cpu, iconProps), label: 'Memory Total', value: formatBytesSafe(info.memoryTotal) })
      items.push({ icon: React.createElement(Cpu, iconProps), label: 'Memory Used', value: formatBytesSafe(info.memoryUsed) })
      items.push({ icon: React.createElement(Cpu, iconProps), label: 'Memory Free', value: formatBytesSafe(info.memoryFree) })
      items.push({ icon: React.createElement(HardDrive, iconProps), label: 'Disk Total', value: formatBytesSafe(info.diskTotal) })
      items.push({ icon: React.createElement(HardDrive, iconProps), label: 'Disk Used', value: formatBytesSafe(info.diskUsed) })
      items.push({ icon: React.createElement(HardDrive, iconProps), label: 'Disk Free', value: formatBytesSafe(info.diskFree) })
      items.push({ icon: React.createElement(Clock, iconProps), label: 'Uptime', value: safeString(info.uptime) })
      items.push({ icon: React.createElement(Server, iconProps), label: 'Hostname', value: safeString(info.hostname) })
      items.push({ icon: React.createElement(Globe, iconProps), label: 'OS Version', value: safeString(info.osVersion) })
      items.push({ icon: React.createElement(Cpu, iconProps), label: 'CPU Model', value: safeString(info.cpuModel) })

      return items.filter(item => item && item.label && item.value)
    } catch {
      return []
    }
  }, [info, safeString, formatBytesSafe])

  // Early returns - all hooks must be called before any returns
  if (loading) {
    return (
      <PageShell title="System information" isMobile={safeIsMobile}>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 0 }}>Loading system information…</p>
      </PageShell>
    )
  }

  if (hostedSkip) {
    return (
      <PageShell title="System information" isMobile={safeIsMobile}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: '0.9rem', margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>When I’m on a public website</strong> — I can’t reach the tiny
            helper that lives on your Pi or PC, so this page stays empty. Open me on your LAN or straight on the kiosk when
            you want temps and disk use here.
          </p>
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell title="System information" isMobile={safeIsMobile}>
        <div style={{ textAlign: 'left', maxWidth: '520px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.45, fontSize: '0.9rem' }}>
          {error} The rest of the app works without this.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setError(null)
            void fetchSystemInfo()
          }}
          style={{
            padding: '0.4rem 0.85rem',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Retry
        </button>
        </div>
      </PageShell>
    )
  }

  if (!info) {
    return (
      <PageShell title="System information" isMobile={safeIsMobile}>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 0 }}>No system information available.</p>
      </PageShell>
    )
  }

  if (infoItems.length === 0) {
    return (
      <PageShell title="System information" isMobile={safeIsMobile}>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 0 }}>
          System information loaded but could not be displayed.
        </p>
      </PageShell>
    )
  }

  // --- Render ---
  return (
    <PageShell title="System information" isMobile={safeIsMobile}>
      {/* System Information Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: safeIsMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {infoItems.map((item, index) => (
          <div
            key={`info-${index}-${item.label}`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ color: 'var(--accent-color, var(--accent))', flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {item.label}
              </p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 1523 SINCGARS Radio Connection Placeholder */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '2px dashed var(--border)',
          marginTop: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--accent-color, var(--accent))', flexShrink: 0 }}>
            {React.createElement(RadioTower, { size: 24 })}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            1523 SINCGARS Radio Connection
          </h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 1rem 0' }}>
            Radio connection interface will be implemented here. This section will allow configuration and monitoring of the 1523 SINCGARS radio system.
          </p>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}>
            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              Placeholder for radio connection functionality
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
