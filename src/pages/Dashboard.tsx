import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import DashboardHeader from '../components/DashboardHeader'
import POCCard from '../components/POCCard'
import FireMissionModal from '../components/FireMissionModal'

export default function Dashboard() {
  const { pocs, launchers, pods, addLog, reloadLauncher, saveToFile, loadFromFile } = useAppData()
  const [isFireMissionModalOpen, setIsFireMissionModalOpen] = useState(false)

  const handleInitiateFireMission = () => {
    setIsFireMissionModalOpen(true)
  }

  const handleReport = () => {
    addLog({ type: 'info', message: 'Report generation requested' })
    // TODO: Implement report generation
    alert('Report generation - Feature coming soon')
  }

  const handleSaveLoad = () => {
    saveToFile()
  }

  const handleEditPOC = (pocId: string) => {
    addLog({ type: 'info', message: `Editing POC ${pocId}` })
    // TODO: Implement POC editing
  }

  const handleReloadLauncher = (launcherId: string) => {
    reloadLauncher(launcherId)
  }

  if (pocs.length === 0) {
    return (
      <div>
        <DashboardHeader
          onInitiateFireMission={handleInitiateFireMission}
          onReport={handleReport}
          onSaveLoad={handleSaveLoad}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            color: 'var(--text-secondary)',
          }}
        >
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Nothing to see here!
          </h2>
          <p style={{ fontSize: '1.1rem' }}>
            Go to Inventory to start creating POCs, Launchers, Pods, and Rounds
          </p>
        </div>
      </div>
    )
  }

  // Calculate responsive grid columns based on number of POCs
  // 1 POC = full width, 2 POCs = 2 columns, 3+ POCs = 3 columns max
  const getGridColumns = () => {
    if (pocs.length === 1) return '1fr'
    if (pocs.length === 2) return 'repeat(2, 1fr)'
    return 'repeat(auto-fit, minmax(400px, 1fr))'
  }

  return (
    <div>
      <DashboardHeader
        onInitiateFireMission={handleInitiateFireMission}
        onReport={handleReport}
        onSaveLoad={handleSaveLoad}
        onSaveToFile={saveToFile}
        onLoadFromFile={loadFromFile}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: getGridColumns(),
          gap: '1.5rem',
        }}
      >
        {pocs.map((poc) => (
          <POCCard
            key={poc.id}
            poc={poc}
            launchers={launchers}
            pods={pods}
            onEdit={() => handleEditPOC(poc.id)}
            onReload={handleReloadLauncher}
          />
        ))}
      </div>

      <FireMissionModal
        isOpen={isFireMissionModalOpen}
        onClose={() => setIsFireMissionModalOpen(false)}
      />
    </div>
  )
}
