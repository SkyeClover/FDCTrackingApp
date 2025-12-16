import { useState, useEffect } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

interface SystemInfo {
  temperature: string
  voltage: string
  cpuLoad: string
  memoryUsage: string
  diskUsage: string
  uptime: string
  hostname: string
  osVersion: string
  cpuModel: string
  lastUpdated: Date
}

export default function SystemInfo() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const fetchSystemInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to fetch from backend API
      // First try the API endpoint, if that fails, try direct fetch to Pi
      let response = await fetch('/api/system-info').catch(() => null)
      
      if (!response || !response.ok) {
        // Fallback: try fetching from Pi directly if we're on the Pi
        response = await fetch('http://localhost:3001/system-info').catch(() => null)
      }
      
      if (!response || !response.ok) {
        // If no backend, show mock data for development
        setInfo({
          temperature: 'N/A',
          voltage: 'N/A',
          cpuLoad: 'N/A',
          memoryUsage: 'N/A',
          diskUsage: 'N/A',
          uptime: 'N/A',
          hostname: 'N/A',
          osVersion: 'N/A',
          cpuModel: 'N/A',
          lastUpdated: new Date(),
        })
        setError('Backend API not available. System info requires a backend endpoint.')
        return
      }

      const data = await response.json()
      setInfo(data)
    } catch (err) {
      setError('Failed to fetch system information')
      console.error('Error fetching system info:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemInfo()
    const interval = setInterval(fetchSystemInfo, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1rem',
  }

  const labelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginBottom: '0.5rem',
  }

  const valueStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: '1.5rem',
    fontWeight: '600',
  }

  if (loading && !info) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading system information...</p>
      </div>
    )
  }

  if (error && !info) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ ...cardStyle, borderColor: 'var(--error-color, #ff4444)' }}>
          <h2 style={{ color: 'var(--error-color, #ff4444)', marginTop: 0 }}>Error</h2>
          <p style={{ color: 'var(--text-primary)' }}>{error}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
            Note: A backend API endpoint is required to fetch system information from the Raspberry Pi.
            The endpoint should be available at /api/system-info
          </p>
          <button
            onClick={fetchSystemInfo}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>System Information</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Raspberry Pi system status and metrics
        </p>
      </div>

      {info && (
        <>
          {/* Temperature and Voltage */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={cardStyle}>
              <div style={labelStyle}>CPU Temperature</div>
              <div style={valueStyle}>{info.temperature}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Voltage</div>
              <div style={valueStyle}>{info.voltage}</div>
            </div>
          </div>

          {/* CPU and Memory */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={cardStyle}>
              <div style={labelStyle}>CPU Load</div>
              <div style={valueStyle}>{info.cpuLoad}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Memory Usage</div>
              <div style={valueStyle}>{info.memoryUsage}</div>
            </div>
          </div>

          {/* Disk Usage */}
          <div style={cardStyle}>
            <div style={labelStyle}>Disk Usage</div>
            <div style={valueStyle}>{info.diskUsage}</div>
          </div>

          {/* System Details */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={cardStyle}>
              <div style={labelStyle}>Uptime</div>
              <div style={valueStyle}>{info.uptime}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Hostname</div>
              <div style={valueStyle}>{info.hostname}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={cardStyle}>
              <div style={labelStyle}>OS Version</div>
              <div style={{ ...valueStyle, fontSize: '1rem' }}>{info.osVersion}</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>CPU Model</div>
              <div style={{ ...valueStyle, fontSize: '1rem' }}>{info.cpuModel}</div>
            </div>
          </div>

          <div style={{ ...cardStyle, backgroundColor: 'var(--bg-tertiary)' }}>
            <div style={{ ...labelStyle, fontSize: '0.8rem' }}>
              Last Updated: {info.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={fetchSystemInfo}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

