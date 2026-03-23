import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Props = {
  title: string
  /** Shown below the title row when expanded */
  description?: ReactNode
  defaultOpen?: boolean
  /** Extra controls on the header row (e.g. action buttons) */
  headerRight?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Renders the Collapsible Card UI section.
 */
export function CollapsibleCard({
  title,
  description,
  defaultOpen = true,
  headerRight,
  children,
  className,
  style,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const headerId = useId()

  return (
    <section
      className={['collapsible-card', className].filter(Boolean).join(' ')}
      style={{
        marginBottom: 0,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        minWidth: 0,
        ...style,
      }}
    >
      <div
        className="collapsible-card-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          rowGap: '0.4rem',
          padding: '0.5rem 0.65rem',
          background: 'var(--bg-tertiary)',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <button
          className="collapsible-card-toggle"
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          style={{
            flex: '1 1 12rem',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '0.45rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            textAlign: 'left',
            padding: '0.15rem 0',
          }}
        >
          {open ? <ChevronUp size={18} aria-hidden style={{ flexShrink: 0 }} /> : <ChevronDown size={18} aria-hidden style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: '1rem', fontWeight: 650, lineHeight: 1.25 }}>{title}</span>
        </button>
        {headerRight ? (
          <div
            style={{
              flex: '1 1 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              justifyContent: 'flex-end',
              minWidth: 0,
            }}
          >
            {headerRight}
          </div>
        ) : null}
      </div>
      {open && (
        <div id={panelId} role="region" aria-labelledby={headerId} className="collapsible-card-body">
          {description ? (
            <div
              style={{
                padding: '0.45rem 0.65rem 0',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          ) : null}
          <div style={{ padding: description ? '0.5rem 0.65rem 0.65rem' : '0.65rem' }}>{children}</div>
        </div>
      )}
    </section>
  )
}
