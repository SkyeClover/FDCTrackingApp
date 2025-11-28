import { LayoutDashboard, Package, Settings, FileText, HelpCircle } from 'lucide-react'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings'

interface SidebarProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

const menuItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory' as Page, label: 'Inventory', icon: Package },
  { id: 'management' as Page, label: 'Management', icon: Settings },
  { id: 'logs' as Page, label: 'Logs', icon: FileText },
  { id: 'settings' as Page, label: 'Settings / Help', icon: HelpCircle },
]

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <aside
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
          FDC Tracker
        </h1>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          Version 1.0.0
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
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
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
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
        <p>Current Page: {menuItems.find((m) => m.id === currentPage)?.label}</p>
      </div>
    </aside>
  )
}

