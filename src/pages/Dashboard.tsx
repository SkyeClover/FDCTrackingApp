import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import DashboardHeader from '../components/DashboardHeader'
import POCCard from '../components/POCCard'
import FireMissionModal from '../components/FireMissionModal'
import POCDetailModal from '../components/POCDetailModal'
import ReloadModal from '../components/ReloadModal'
import ReportModal from '../components/ReportModal'

export default function Dashboard() {
  const { bocs, pocs, launchers, pods, rsvs, addLog, reloadLauncher, saveToFile, loadFromFile } = useAppData()
  const [isFireMissionModalOpen, setIsFireMissionModalOpen] = useState(false)
  const [selectedPOC, setSelectedPOC] = useState<string | null>(null)
  const [reloadLauncherId, setReloadLauncherId] = useState<string | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const handleInitiateFireMission = () => {
    setIsFireMissionModalOpen(true)
  }

  const handleReport = () => {
    setIsReportModalOpen(true)
  }

  const handleSaveLoad = () => {
    saveToFile()
  }


  const handleReloadLauncher = (launcherId: string) => {
    setReloadLauncherId(launcherId)
  }

  const handleReloadConfirm = (launcherId: string, podId?: string) => {
    reloadLauncher(launcherId, podId)
    setReloadLauncherId(null)
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
            rsvs={rsvs}
            bocs={bocs}
            onReload={handleReloadLauncher}
            onClick={() => setSelectedPOC(poc.id)}
          />
        ))}
      </div>

      <FireMissionModal
        isOpen={isFireMissionModalOpen}
        onClose={() => setIsFireMissionModalOpen(false)}
      />

      {selectedPOC && (
        <POCDetailModal
          poc={pocs.find((p) => p.id === selectedPOC)!}
          pods={pods}
          launchers={launchers}
          isOpen={!!selectedPOC}
          onClose={() => setSelectedPOC(null)}
        />
      )}

      {reloadLauncherId && (() => {
        const launcher = launchers.find((l) => l.id === reloadLauncherId)
        if (!launcher || !launcher.pocId) return null
        const poc = pocs.find((p) => p.id === launcher.pocId)
        if (!poc) return null
        
        // Find available pods from RSV's assigned to the POC, BOC, or Ammo PLT
        const pocBOC = bocs.find((b) => b.id === poc.bocId)
        const availablePods = pods.filter((p) => {
          if (p.launcherId) return false
          
          // Check if pod is on an RSV assigned to this POC's BOC, the POC itself, or Ammo PLT
          if (p.rsvId) {
            const rsv = rsvs.find((r) => r.id === p.rsvId)
            if (rsv) {
              if (rsv.pocId === launcher.pocId) return true
              if (rsv.bocId === poc.bocId) return true
              if (rsv.ammoPltId) return true
            }
          }
          
          // Direct POC assignment (backwards compatibility)
          if (p.pocId === launcher.pocId) return true
          
          return false
        })
        
        const currentPod = pods.find((p) => p.launcherId === launcher.id)
        return (
          <ReloadModal
            launcher={launcher}
            poc={poc}
            availablePods={availablePods}
            currentPod={currentPod}
            rsvs={rsvs}
            isOpen={!!reloadLauncherId}
            onClose={() => setReloadLauncherId(null)}
            onReload={handleReloadConfirm}
          />
        )
      })()}

      <ReportModal
        bocs={bocs}
        pocs={pocs}
        launchers={launchers}
        pods={pods}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  )
}
