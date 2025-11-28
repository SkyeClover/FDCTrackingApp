import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Management from './pages/Management'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import { AppDataProvider, useAppData } from './context/AppDataContext'
import { ProgressProvider, useProgress } from './context/ProgressContext'
import StartupRoleModal from './components/StartupRoleModal'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const { updateProgress, removeProgress } = useProgress()

  return (
    <AppDataProvider updateProgress={updateProgress} removeProgress={removeProgress}>
      <AppContentWithData />
    </AppDataProvider>
  )
}

function AppContentWithData() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const { bocs, pocs, currentUserRole } = useAppData()
  const [showStartupModal, setShowStartupModal] = useState(false)

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

  return (
    <>
      <StartupRoleModal isOpen={showStartupModal} onClose={() => setShowStartupModal(false)} />
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
    </>
  )
}

function App() {
  return (
    <ProgressProvider>
      <AppContent />
    </ProgressProvider>
  )
}

export default App

