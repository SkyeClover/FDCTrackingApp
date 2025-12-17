import { useState, useEffect } from 'react'
import { LayoutDashboard, Package, Settings, FileText, HelpCircle, Menu, X, Rocket, Cpu, Network } from 'lucide-react'
import { useSwipe } from '../hooks/useSwipe'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings' | 'fire-missions' | 'system-info' | 'network'

interface MobileNavProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

const menuItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory' as Page, label: 'Inventory', icon: Package },
  { id: 'management' as Page, label: 'Management', icon: Settings },
  { id: 'fire-missions' as Page, label: 'Fire Missions', icon: Rocket },
  { id: 'logs' as Page, label: 'Logs', icon: FileText },
  { id: 'system-info' as Page, label: 'System Info', icon: Cpu },
  { id: 'network' as Page, label: 'Network', icon: Network },
  { id: 'settings' as Page, label: 'Settings', icon: HelpCircle },
]

export default function MobileNav({ currentPage, onPageChange }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close menu when page changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [currentPage])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handlePageChange = (page: Page) => {
    onPageChange(page)
    setIsMenuOpen(false)
  }

  // Swipe left to close menu drawer
  const drawerRef = useSwipe({
    onSwipeLeft: () => setIsMenuOpen(false),
    threshold: 50,
  })

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsMenuOpen(true)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              FDC Tracker
            </h1>
            <p
              style={{
                fontSize: '0.625rem',
                color: 'var(--text-secondary)',
                margin: 0,
              }}
            >
              {menuItems.find((m) => m.id === currentPage)?.label}
            </p>
          </div>
        </div>
      </header>

      {/* Slide-out Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1001,
            }}
          />
          
          {/* Menu Drawer */}
          <aside
            ref={drawerRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              maxWidth: '85vw',
              backgroundColor: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1002,
              transform: isMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease-in-out',
            }}
          >
            {/* Menu Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    margin: 0,
                    marginBottom: '0.25rem',
                  }}
                >
                  FDC Tracker
                </h2>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}
                >
                  Version 1.0.2
                </p>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* Menu Items */}
            <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem 1.5rem',
                      backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      textAlign: 'left',
                      minHeight: '48px', // Touch-friendly size
                    }}
                  >
                    <Icon size={22} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>
        </>
      )}
    </>
  )
}

