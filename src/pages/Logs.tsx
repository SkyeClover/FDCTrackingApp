import { useAppData } from '../context/AppDataContext'
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import CollapsibleSection from '../components/ui/CollapsibleSection'
import { useIsMobile } from '../hooks/useIsMobile'

/**
 * Renders the Logs UI section.
 */
export default function Logs() {
  const { logs, clearLogs } = useAppData()
  const isMobile = useIsMobile()

    /**
   * Returns log icon for downstream consumers.
   */
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

    /**
   * Returns log color for downstream consumers.
   */
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
    <PageShell title="Logs" isMobile={isMobile}>
      <CollapsibleSection
        title="Activity log"
        subtitle="Recent app actions & changes"
        badge={logs.length}
        compact
        defaultCollapsed={false}
        headerActions={
          logs.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearLogs()
              }}
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          ) : null
        }
      >
      <div
        style={{
          maxHeight: 'calc(100vh - 220px)',
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
      </CollapsibleSection>
    </PageShell>
  )
}

