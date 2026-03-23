import { NAV_ITEMS, type Page } from '../navigation/routes'
import { APP_VERSION } from '../utils/saveLoad'

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

/**
 * Renders the Sidebar UI section.
 */
export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <aside
      className="app-sidebar"
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
      }}
    >
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
          }}
        >
          Walker Track
        </h1>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          Version {APP_VERSION}
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              className={isActive ? 'app-nav-item is-active' : 'app-nav-item'}
              key={item.id}
              onClick={() => onPageChange(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                textAlign: 'left',
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div
        style={{
          padding: '0 1.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem',
        }}
      >
        <p>Current Page: {NAV_ITEMS.find((m) => m.id === currentPage)?.label}</p>
      </div>
    </aside>
  )
}
