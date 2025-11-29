import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Management from './pages/Management'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import { AppDataProvider, useAppData } from './context/AppDataContext'
import { ProgressProvider, useProgress } from './context/ProgressContext'
import StartupRoleModal from './components/StartupRoleModal'
import FirstTimeGuideModal from './components/FirstTimeGuideModal'
import PasswordProtection from './components/PasswordProtection'
import { useIsMobile } from './hooks/useIsMobile'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings'

function AppContent() {
  const { updateProgress, removeProgress } = useProgress()

  return (
    <AppDataProvider updateProgress={updateProgress} removeProgress={removeProgress}>
      <AppContentWithData />
    </AppDataProvider>
  )
}

function AppContentWithData() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const { bocs, pocs, currentUserRole, hasSeenFirstTimeGuide, markFirstTimeGuideAsSeen } = useAppData()
  const [showStartupModal, setShowStartupModal] = useState(false)
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false)
  const isMobile = useIsMobile()

  // Check if app is empty (no BOCs or POCs) and show startup modal
  useEffect(() => {
    const isEmpty = bocs.length === 0 && pocs.length === 0
    // Only show modal if empty and user hasn't been assigned a role yet
    if (isEmpty && !currentUserRole) {
      setShowStartupModal(true)
    } else {
      setShowStartupModal(false)
    }
  }, [bocs.length, pocs.length, currentUserRole])

  // Show first-time guide after user creates and assigns themselves to first BOC/POC
  useEffect(() => {
    // Show guide if user has a role assigned but hasn't seen the guide yet
    if (currentUserRole && !hasSeenFirstTimeGuide && !showStartupModal) {
      // Small delay to ensure startup modal is closed first
      const timer = setTimeout(() => {
        setShowFirstTimeGuide(true)
      }, 300)
      return () => clearTimeout(timer)
    } else if (hasSeenFirstTimeGuide) {
      // Reset guide state if it's been marked as seen
      setShowFirstTimeGuide(false)
    }
  }, [currentUserRole, hasSeenFirstTimeGuide, showStartupModal])

  const handleCloseFirstTimeGuide = () => {
    setShowFirstTimeGuide(false)
    markFirstTimeGuideAsSeen()
  }

  const handleNavigateToSettings = () => {
    setCurrentPage('settings')
  }

  return (
    <>
      <StartupRoleModal isOpen={showStartupModal} onClose={() => setShowStartupModal(false)} />
      <FirstTimeGuideModal
        isOpen={showFirstTimeGuide}
        onClose={handleCloseFirstTimeGuide}
        onNavigateToSettings={handleNavigateToSettings}
      />
      {isMobile ? (
        // Mobile Layout
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
          <MobileNav currentPage={currentPage} onPageChange={setCurrentPage} />
          <main
            style={{
              flex: 1,
              overflow: 'auto',
              overflowX: 'hidden', // Prevent horizontal scrolling
              padding: isMobile ? '0.75rem' : '1rem',
              paddingTop: isMobile ? 'calc(56px + 0.75rem)' : 'calc(56px + 1rem)', // Fixed header height + padding
              width: '100%',
              maxWidth: '100vw',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'inventory' && <Inventory />}
            {currentPage === 'management' && <Management />}
            {currentPage === 'logs' && <Logs />}
            {currentPage === 'settings' && <Settings />}
          </main>
        </div>
      ) : (
        // Desktop Layout
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
          <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
          <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'inventory' && <Inventory />}
            {currentPage === 'management' && <Management />}
            {currentPage === 'logs' && <Logs />}
            {currentPage === 'settings' && <Settings />}
          </main>
        </div>
      )}
    </>
  )
}

function App() {
  return (
    <PasswordProtection>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </PasswordProtection>
  )
}

export default App

