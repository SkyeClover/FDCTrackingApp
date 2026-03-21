import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import AppPageContent from './navigation/AppPageContent'
import type { Page } from './navigation/routes'
import { PersistenceRoot } from './persistence/PersistenceRoot'
import { NavigationProvider } from './context/NavigationContext'
import { ProgressProvider, useProgress } from './context/ProgressContext'
import KioskExit from './components/KioskExit'
import SimpleKeyboard from './components/SimpleKeyboard'
import KeyboardToggleButton from './components/KeyboardToggleButton'
import MaintenanceBanner from './components/MaintenanceBanner'
import { SyncInboxBanner } from './components/SyncInboxBanner'
import { useIsMobile } from './hooks/useIsMobile'

function AppContent() {
  const { updateProgress, removeProgress } = useProgress()

  return (
    <PersistenceRoot updateProgress={updateProgress} removeProgress={removeProgress}>
      <AppContentWithData />
    </PersistenceRoot>
  )
}

function AppContentWithData() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const isMobile = useIsMobile()

  return (
    <NavigationProvider navigateTo={setCurrentPage}>
      <SyncInboxBanner />
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
          <MobileNav currentPage={currentPage} onPageChange={setCurrentPage} />
          <main
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: isMobile ? '0.75rem' : '1rem',
              paddingTop: isMobile ? 'calc(56px + 0.75rem)' : 'calc(56px + 1rem)',
              width: '100%',
              maxWidth: '100vw',
              boxSizing: 'border-box',
              position: 'relative',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position',
              touchAction: 'pan-y pan-x',
              userSelect: 'none',
              overscrollBehavior: 'contain',
              scrollBehavior: 'smooth',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              <AppPageContent currentPage={currentPage} />
            </div>
          </main>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
          <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
          <main
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '2rem',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position',
              touchAction: 'pan-y pan-x',
              userSelect: 'none',
              overscrollBehavior: 'contain',
              scrollBehavior: 'smooth',
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              <AppPageContent currentPage={currentPage} />
            </div>
          </main>
        </div>
      )}
    </NavigationProvider>
  )
}

function App() {
  const [exitedKiosk, setExitedKiosk] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === 'true'

  const handleExitKiosk = () => {
    setExitedKiosk(true)
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }

  if (isMaintenanceMode) {
    return <MaintenanceBanner />
  }

  return (
    <>
      {!exitedKiosk && (
        <>
          <KioskExit onExit={handleExitKiosk} />
          <ProgressProvider>
            <AppContent />
          </ProgressProvider>
          <SimpleKeyboard
            visible={keyboardVisible}
            onToggle={() => setKeyboardVisible(!keyboardVisible)}
          />
          <KeyboardToggleButton
            onToggle={() => setKeyboardVisible(!keyboardVisible)}
            isVisible={keyboardVisible}
          />
        </>
      )}
      {exitedKiosk && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Kiosk Mode Exited</h1>
          <p>The app is still running. Close this window or restart the service to return to kiosk mode.</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      )}
    </>
  )
}

export default App
