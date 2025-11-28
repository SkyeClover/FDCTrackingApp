import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Management from './pages/Management'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import { AppDataProvider } from './context/AppDataContext'
import { ProgressProvider, useProgress } from './context/ProgressContext'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings'

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const { updateProgress, removeProgress } = useProgress()

  return (
    <AppDataProvider updateProgress={updateProgress} removeProgress={removeProgress}>
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
    </AppDataProvider>
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

