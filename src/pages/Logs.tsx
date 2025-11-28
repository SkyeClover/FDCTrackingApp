import { useAppData } from '../context/AppDataContext'
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'

export default function Logs() {
  const { logs } = useAppData()

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return XCircle
      case 'warning':
        return AlertTriangle
      case 'success':
        return CheckCircle
      default:
        return Info
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'var(--danger)'
      case 'warning':
        return 'var(--warning)'
      case 'success':
        return 'var(--success)'
      default:
        return 'var(--accent)'
    }
  }

  return (
    <div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          color: 'var(--text-primary)',
        }}
      >
        Logs
      </h1>

      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1.5rem',
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No logs yet. Activity will appear here as you use the app.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.map((log) => {
              const Icon = getLogIcon(log.type)
              const color = getLogColor(log.type)
              return (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <Icon size={18} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                        }}
                      >
                        {log.message}
                      </span>
                      <span
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <span
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {log.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

