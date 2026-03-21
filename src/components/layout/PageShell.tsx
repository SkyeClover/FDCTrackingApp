import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Optional right side (buttons, etc.) — same row as title */
  actions?: ReactNode
  isMobile?: boolean
  /** Use h1; set false for pages that need a different heading level */
  asHeading?: boolean
  /** Only constrain width — no title row (e.g. Dashboard has its own header). */
  hideTitle?: boolean
  /**
   * Grow to fill the scroll parent (flex column). Use on Dashboard so content
   * stretches vertically instead of leaving empty space below.
   */
  fill?: boolean
  /** Max width of the content column (default 1200px). Use `100%` for full-width pages like Dashboard. */
  contentMaxWidth?: string
}

/**
 * Shared page frame: matches Inventory (max-width 1200px, title row).
 */
export default function PageShell({
  title,
  children,
  actions,
  isMobile = false,
  asHeading = true,
  hideTitle = false,
  fill = false,
  contentMaxWidth = '1200px',
}: Props) {
  return (
    <div
      style={{
        maxWidth: contentMaxWidth,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
        ...(fill
          ? {
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column' as const,
              alignSelf: 'stretch',
            }
          : {}),
      }}
    >
      {!hideTitle && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: isMobile ? '1rem' : '1.25rem',
          }}
        >
          {asHeading ? (
            <h1
              style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 'bold',
                margin: 0,
                color: 'var(--text-primary)',
                wordBreak: 'break-word',
              }}
            >
              {title}
            </h1>
          ) : (
            <div
              style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </div>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
