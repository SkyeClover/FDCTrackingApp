import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { Network as NetworkIcon, Wifi, Server, Globe, Activity, RadioTower } from 'lucide-react'

interface NetworkInfo {
  ipAddress: string
  macAddress: string
  networkInterface: string
  networkStatus: string
}

export default function Network() {
  const [info, setInfo] = useState<NetworkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const safeIsMobile = isMobile ?? false

  const fetchNetworkInfo = useCallback(async () => {
    try {
      setError(null)
      let response: Response | null = null
      let lastError: Error | null = null

      // Try proxy server first
      try {
        response = await fetch('http://localhost:3002/system-info', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error')
        // Fallback to direct connection
        try {
          response = await fetch('http://localhost:3001/system-info', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
          })
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
        } catch (err2) {
          const error2 = err2 instanceof Error ? err2 : new Error('Unknown error')
          throw new Error(`Both connections failed. Proxy: ${lastError.message}, Direct: ${error2.message}`)
        }
      }

      if (!response) throw new Error('No response received')

      const data = await response.json()
      if (!data || typeof data !== 'object') throw new Error('Invalid response format')

      const validatedData: NetworkInfo = {
        ipAddress: String(data.ipAddress ?? 'N/A'),
        macAddress: String(data.macAddress ?? 'N/A'),
        networkInterface: String(data.networkInterface ?? 'N/A'),
        networkStatus: String(data.networkStatus ?? 'N/A'),
      }

      setInfo(validatedData)
      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Network info API not available: ${errorMessage}`)
      console.error('Error fetching network info:', err)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (mounted) {
        fetchNetworkInfo().catch(() => {
          if (mounted) {
            setError('Failed to load network information')
            setLoading(false)
          }
        })
      }
    }, 200)

    const interval = setInterval(() => {
      if (mounted) {
        fetchNetworkInfo().catch(() => {})
      }
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [fetchNetworkInfo])

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
      const iconProps = { size: 24 }
      
      items.push({ icon: React.createElement(NetworkIcon, iconProps), label: 'IP Address', value: safeString(info.ipAddress) })
      items.push({ icon: React.createElement(Server, iconProps), label: 'MAC Address', value: safeString(info.macAddress) })
      items.push({ icon: React.createElement(Wifi, iconProps), label: 'Network Interface', value: safeString(info.networkInterface) })
      items.push({ icon: React.createElement(Activity, iconProps), label: 'Network Status', value: safeString(info.networkStatus) })

      return items.filter(item => item && item.label && item.value)
    } catch (err) {
      console.error('Error creating network items:', err)
      return []
    }
  }, [info, safeString])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading network information...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger, #ff4444)' }}>
        Error: {error}
        <button
          onClick={() => {
            setLoading(true)
            setError(null)
            fetchNetworkInfo()
          }}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--accent-color, #007bff)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!info) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No network information available.
      </div>
    )
  }

  if (networkItems.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Network information loaded but could not be displayed.
      </div>
    )
  }

  return (
    <div style={{ padding: safeIsMobile ? '1rem' : '2rem' }}>
      <h2 style={{ fontSize: safeIsMobile ? '1.5rem' : '2rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        Network Information
      </h2>
      
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: safeIsMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {networkItems.map((item, index) => (
          <div
            key={`network-${index}-${item.label}`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: 'var(--accent-color, var(--accent))', flexShrink: 0 }}>
                {item.icon}
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                {item.label}
              </h3>
            </div>
            <div style={{ paddingLeft: '2.5rem' }}>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Network Information Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          marginTop: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--accent-color, var(--accent))', flexShrink: 0 }}>
            {React.createElement(Globe, { size: 24 })}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' }}>
            Network Details
          </h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 0.75rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Interface:</strong> {safeString(info.networkInterface)}
          </p>
          <p style={{ margin: '0 0 0.75rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Status:</strong>{' '}
            <span style={{ 
              color: info.networkStatus === 'Connected' ? 'var(--success)' : 'var(--warning)',
              fontWeight: '600'
            }}>
              {safeString(info.networkStatus)}
            </span>
          </p>
          <p style={{ margin: '0 0 0.75rem 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>IP Address:</strong> {safeString(info.ipAddress)}
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>MAC Address:</strong> {safeString(info.macAddress)}
          </p>
        </div>
      </div>

      {/* SINCGARS / 1523 Radio Connection Placeholder */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '2px dashed var(--border)',
          marginTop: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--accent-color, var(--accent))', flexShrink: 0 }}>
            {React.createElement(RadioTower, { size: 32 })}
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' }}>
            SINCGARS / 1523 Radio Connection
          </h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <p style={{ margin: 0 }}>
            Radio connection interface will be displayed here when connected.
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            Status: Not Connected
          </p>
        </div>
      </div>
    </div>
  )
}

