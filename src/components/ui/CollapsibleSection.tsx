import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  /** When true (default), section starts collapsed */
  defaultCollapsed?: boolean
  badge?: string | number
  /** Tighter header + body padding */
  compact?: boolean
  /** Extra controls (e.g. Clear) shown before the chevron */
  headerActions?: ReactNode
  'data-guide'?: string
}

export default function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultCollapsed = true,
  badge,
  compact = false,
  headerActions,
  'data-guide': dataGuide,
}: Props) {
  const [open, setOpen] = useState(!defaultCollapsed)

  return (
    <div
      data-guide={dataGuide}
      style={{
        marginBottom: compact ? '1rem' : '1.5rem',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: compact ? '0.5rem 0.75rem' : '0.65rem 1rem',
          backgroundColor: 'var(--bg-tertiary)',
          border: 'none',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: compact ? '0.9rem' : '0.95rem', fontWeight: 700 }}>{title}</span>
            {badge !== undefined && badge !== '' && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && !open && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{subtitle}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {headerActions}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      {open && (
        <div style={{ padding: compact ? '0.75rem' : '1rem' }}>{children}</div>
      )}
    </div>
  )
}
