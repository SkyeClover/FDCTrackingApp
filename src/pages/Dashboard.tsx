import { useState, useMemo } from 'react'
import { useAppData } from '../context/AppDataContext'
import DashboardHeader from '../components/DashboardHeader'
import POCCard from '../components/POCCard'
import AmmoPltCard from '../components/AmmoPltCard'
import FireMissionModal from '../components/FireMissionModal'
import POCDetailModal from '../components/POCDetailModal'
import AmmoPltDetailModal from '../components/AmmoPltDetailModal'
import ReloadModal from '../components/ReloadModal'
import ReportModal from '../components/ReportModal'
import LauncherDetailModal from '../components/LauncherDetailModal'
import { useIsMobile } from '../hooks/useIsMobile'

const AMMO_PLT_ID = 'ammo-plt-1'

export default function Dashboard() {
  const { bocs, pocs, launchers, pods, rsvs, reloadLauncher, saveToFile, loadFromFile } = useAppData()
  const [isFireMissionModalOpen, setIsFireMissionModalOpen] = useState(false)
  const [selectedPOC, setSelectedPOC] = useState<string | null>(null)
  const [isAmmoPltModalOpen, setIsAmmoPltModalOpen] = useState(false)
  const [reloadLauncherId, setReloadLauncherId] = useState<string | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedLauncherId, setSelectedLauncherId] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Check if Ammo PLT has any RSVs or pods assigned
  const hasAmmoPltContent = useMemo(() => {
    const ammoPltRSVs = rsvs.filter((r) => r.ammoPltId === AMMO_PLT_ID)
    const ammoPltPods = pods.filter((p) => {
      if (p.ammoPltId === AMMO_PLT_ID) return true
      if (p.rsvId) {
        const rsv = rsvs.find((r) => r.id === p.rsvId)
        if (rsv && rsv.ammoPltId === AMMO_PLT_ID) return true
      }
      return false
    })
    return ammoPltRSVs.length > 0 || ammoPltPods.length > 0
  }, [rsvs, pods])

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
  // Ammo PLT card will be positioned separately
  const getGridColumns = () => {
    if (isMobile) return '1fr' // Single column on mobile
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
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1rem' : '1.5rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Main POC Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: getGridColumns(),
            gap: isMobile ? '1rem' : '1.5rem',
            flex: 1,
            width: isMobile ? '100%' : 'auto',
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
              onLauncherClick={setSelectedLauncherId}
            />
          ))}
        </div>

        {/* Ammo PLT Card - Sidebar style on desktop, full width on mobile */}
        {hasAmmoPltContent && (
          <div
            style={{
              width: isMobile ? '100%' : '280px',
              flexShrink: 0,
            }}
          >
            <AmmoPltCard
              pods={pods}
              rsvs={rsvs}
              onClick={() => setIsAmmoPltModalOpen(true)}
            />
          </div>
        )}
      </div>

      <FireMissionModal
        isOpen={isFireMissionModalOpen}
        onClose={() => setIsFireMissionModalOpen(false)}
      />

      {selectedPOC && (() => {
        const selectedPOCData = pocs.find((p) => p.id === selectedPOC)
        if (!selectedPOCData) {
          return null
        }
        try {
          return (
            <POCDetailModal
              poc={selectedPOCData}
              pods={pods}
              launchers={launchers}
              rsvs={rsvs}
              bocs={bocs}
              isOpen={!!selectedPOC}
              onClose={() => setSelectedPOC(null)}
            />
          )
        } catch (error) {
          console.error('Error rendering POCDetailModal:', error)
          return null
        }
      })()}

      <AmmoPltDetailModal
        pods={pods}
        rsvs={rsvs}
        isOpen={isAmmoPltModalOpen}
        onClose={() => setIsAmmoPltModalOpen(false)}
      />

      {reloadLauncherId && (() => {
        const launcher = launchers.find((l) => l.id === reloadLauncherId)
        if (!launcher || !launcher.pocId) return null
        const poc = pocs.find((p) => p.id === launcher.pocId)
        if (!poc) return null
        
        // Find available pods from RSV's assigned to the POC or BOC, or directly assigned to the POC
        const availablePods = pods.filter((p) => {
          if (p.launcherId) return false
          
          // Direct POC assignment
          if (p.pocId === launcher.pocId) return true
          
          // Check if pod is on an RSV assigned to this POC or its BOC
          if (p.rsvId) {
            const rsv = rsvs.find((r) => r.id === p.rsvId)
            if (rsv) {
              if (rsv.pocId === launcher.pocId) return true
              if (rsv.bocId === poc.bocId) return true
            }
          }
          
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
        rsvs={rsvs}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Launcher Detail Modal */}
      {selectedLauncherId && (() => {
        const selectedLauncher = launchers.find((l) => l.id === selectedLauncherId)
        if (!selectedLauncher) return null
        const launcherPod = pods.find((p) => p.launcherId === selectedLauncherId)
        return (
          <LauncherDetailModal
            launcher={selectedLauncher}
            pod={launcherPod}
            isOpen={!!selectedLauncherId}
            onClose={() => setSelectedLauncherId(null)}
          />
        )
      })()}
    </div>
  )
}
