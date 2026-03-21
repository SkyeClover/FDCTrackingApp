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
import { useIsTablet } from '../hooks/useIsTablet'
import { useScopedForce } from '../hooks/useScopedForce'
import DashboardHierarchyTree from '../components/dashboard/DashboardHierarchyTree'
import PageShell from '../components/layout/PageShell'
import { Rocket, FileText, Activity, Package } from 'lucide-react'

const AMMO_PLT_ID = 'ammo-plt-1'

export default function Dashboard() {
  const {
    bocs,
    pocs,
    launchers,
    pods,
    rsvs,
    tasks,
    brigades,
    battalions,
    reloadLauncher,
    saveToFile,
    loadFromFile,
    currentUserRole,
  } = useAppData()
  const [isFireMissionModalOpen, setIsFireMissionModalOpen] = useState(false)
  const [selectedPOC, setSelectedPOC] = useState<string | null>(null)
  const [isAmmoPltModalOpen, setIsAmmoPltModalOpen] = useState(false)
  const [reloadLauncherId, setReloadLauncherId] = useState<string | null>(null)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedLauncherId, setSelectedLauncherId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  const force = useScopedForce()
  const displayPocs = force.isScoped ? force.scopedPOCs : pocs
  const displayLaunchers = force.isScoped ? force.scopedLaunchers : launchers
  const displayPods = force.isScoped ? force.scopedPods : pods
  const displayRSVs = force.isScoped ? force.scopedRSVs : rsvs

  const roleType = currentUserRole?.type
  const displayBocsForTree = roleType === 'boc' ? force.scopedBOCs : bocs
  const echelonObserve =
    roleType === 'brigade' || roleType === 'battalion' || roleType === 'boc'
  const launcherDetailReadOnly = echelonObserve
  const showPocCards = !echelonObserve

  // Check if Ammo PLT has any RSVs or pods assigned (respect scoped view)
  const hasAmmoPltContent = useMemo(() => {
    const ammoPltRSVs = displayRSVs.filter((r) => r.ammoPltId === AMMO_PLT_ID)
    const ammoPltPods = displayPods.filter((p) => {
      if (p.ammoPltId === AMMO_PLT_ID) return true
      if (p.rsvId) {
        const rsv = displayRSVs.find((r) => r.id === p.rsvId)
        if (rsv && rsv.ammoPltId === AMMO_PLT_ID) return true
      }
      return false
    })
    return ammoPltRSVs.length > 0 || ammoPltPods.length > 0
  }, [displayRSVs, displayPods])

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

  // All hooks must run before any conditional return (React rules of hooks)
  // Calculate quick stats (used in both empty and full dashboard states)
  const quickStats = useMemo(() => {
    const activeLaunchers = displayLaunchers.filter((l) => l.status === 'active').length
    const idleLaunchers = displayLaunchers.filter((l) => l.status === 'idle').length
    const totalPods = displayPods.length
    const availablePods = displayPods.filter((p) => !p.launcherId).length

    const roundsByType: Record<string, number> = {}
    displayPods.forEach((pod) => {
      pod.rounds.forEach((round) => {
        if (round.status === 'available') {
          roundsByType[round.type] = (roundsByType[round.type] || 0) + 1
        }
      })
    })

    const totalAvailableRounds = Object.values(roundsByType).reduce((sum, count) => sum + count, 0)

    return {
      activeLaunchers,
      idleLaunchers,
      totalPods,
      availablePods,
      roundsByType,
      totalAvailableRounds,
    }
  }, [displayLaunchers, displayPods])

  if (pocs.length === 0) {
    return (
      <PageShell title="Dashboard" isMobile={isMobile} hideTitle fill contentMaxWidth="100%">
        <div style={{ flexShrink: 0 }}>
          <DashboardHeader
            onInitiateFireMission={handleInitiateFireMission}
            onReport={handleReport}
            onSaveLoad={handleSaveLoad}
            onSaveToFile={saveToFile}
            onLoadFromFile={loadFromFile}
          />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Nothing to see here!
          </h2>
          <p style={{ fontSize: '1.1rem', textAlign: 'center', padding: '0 1rem' }}>
            Go to Inventory to start creating POCs, Launchers, Pods, and Rounds
          </p>
        </div>
      </PageShell>
    )
  }

  if (force.isScoped && displayPocs.length === 0) {
    return (
      <PageShell title="Dashboard" isMobile={isMobile} hideTitle fill contentMaxWidth="100%">
        <div style={{ flexShrink: 0 }}>
          <DashboardHeader
            onInitiateFireMission={handleInitiateFireMission}
            onReport={handleReport}
            onSaveLoad={handleSaveLoad}
            onSaveToFile={saveToFile}
            onLoadFromFile={loadFromFile}
          />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            padding: '0 1rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>No units in this view</h2>
          <p style={{ fontSize: '1rem', textAlign: 'center', maxWidth: '32rem' }}>
            Your role doesn&apos;t match any PLT FDCs or units in the data. Open Settings and choose a different
            view, or add POCs and equipment under the selected battery.
          </p>
        </div>
      </PageShell>
    )
  }

  // Calculate responsive grid columns based on number of POCs in view
  const getGridColumns = () => {
    if (isMobile) return '1fr'
    if (displayPocs.length === 1) return '1fr'
    if (displayPocs.length === 2) return 'repeat(2, 1fr)'
    return 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))'
  }

  return (
    <PageShell title="Dashboard" isMobile={isMobile} hideTitle fill contentMaxWidth="100%">
      <div style={{ flexShrink: 0 }}>
        <DashboardHeader
          onInitiateFireMission={handleInitiateFireMission}
          onReport={handleReport}
          onSaveLoad={handleSaveLoad}
          onSaveToFile={saveToFile}
          onLoadFromFile={loadFromFile}
        />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {/* Quick Stats & Actions Panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? '0.75rem' : '1rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            flexShrink: 0,
          }}
        >
        <div
          style={{
            padding: isTablet ? '1rem' : '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--accent)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={isTablet ? 24 : 20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: isTablet ? '0.85rem' : '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {echelonObserve ? 'Launchers (view)' : 'Active Launchers'}
            </div>
            <div style={{ fontSize: isTablet ? '1.5rem' : '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {echelonObserve ? displayLaunchers.length : quickStats.activeLaunchers}
            </div>
            {echelonObserve && (
              <div style={{ fontSize: isTablet ? '0.7rem' : '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {quickStats.activeLaunchers} act · {quickStats.idleLaunchers} idle
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: isTablet ? '1rem' : '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--success)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={isTablet ? 24 : 20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: isTablet ? '0.85rem' : '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              {echelonObserve ? 'Pods (off launcher)' : 'Pods in Inventory'}
            </div>
            <div style={{ fontSize: isTablet ? '1.5rem' : '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {quickStats.availablePods}/{quickStats.totalPods}
            </div>
            <div style={{ fontSize: isTablet ? '0.7rem' : '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Not on launchers
            </div>
          </div>
        </div>

        <div
          style={{
            padding: isTablet ? '0.75rem' : '0.6rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                padding: '0.4rem',
                backgroundColor: 'var(--warning)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Rocket size={isTablet ? 18 : 16} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isTablet ? '0.75rem' : '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                Available Rounds
              </div>
              <div style={{ fontSize: isTablet ? '1.1rem' : '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {quickStats.totalAvailableRounds}
              </div>
            </div>
          </div>
          {Object.keys(quickStats.roundsByType).length > 0 && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.35rem',
              fontSize: isTablet ? '0.7rem' : '0.65rem',
              color: 'var(--text-secondary)',
              paddingTop: '0.25rem',
              borderTop: '1px solid var(--border)',
            }}>
              {Object.entries(quickStats.roundsByType)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([type, count]) => (
                  <span key={type} style={{ 
                    padding: '0.2rem 0.4rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                  }}>
                    {type}: {count}
                  </span>
                ))}
            </div>
          )}
        </div>

        <div
          onClick={handleReport}
          style={{
            padding: isTablet ? '1rem' : '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
          }}
        >
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--success)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={isTablet ? 24 : 20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: isTablet ? '0.85rem' : '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Quick Report
            </div>
            <div style={{ fontSize: isTablet ? '1rem' : '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              View Report
            </div>
          </div>
        </div>
      </div>

      {((force.viewDensity === 'compact' && force.isScoped) ||
        currentUserRole?.type === 'brigade' ||
        currentUserRole?.type === 'battalion') && (
        <div
          style={{
            flexShrink: 0,
            marginBottom: isMobile ? '1rem' : '1.5rem',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflowX: 'auto',
          }}
        >
          <DashboardHierarchyTree
            viewRole={
              currentUserRole?.type === 'brigade'
                ? 'brigade'
                : currentUserRole?.type === 'battalion'
                  ? 'battalion'
                  : 'boc'
            }
            roleName={currentUserRole?.name}
            brigades={brigades}
            battalions={battalions}
            bocs={
              currentUserRole?.type === 'brigade' || currentUserRole?.type === 'battalion' ? bocs : displayBocsForTree
            }
            pocs={
              currentUserRole?.type === 'brigade' || currentUserRole?.type === 'battalion' ? pocs : displayPocs
            }
            launchers={
              currentUserRole?.type === 'brigade' || currentUserRole?.type === 'battalion'
                ? launchers
                : displayLaunchers
            }
            pods={
              currentUserRole?.type === 'brigade' || currentUserRole?.type === 'battalion' ? pods : displayPods
            }
            tasks={tasks}
            onLauncherClick={setSelectedLauncherId}
          />
        </div>
      )}

      <div
        style={{
          flex: '0 1 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1rem' : '1.5rem',
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        {showPocCards && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: getGridColumns(),
              gap: isMobile ? '1rem' : '1.5rem',
              flex: 1,
              minWidth: 0,
              width: isMobile ? '100%' : 'auto',
              alignContent: 'start',
            }}
          >
            {displayPocs.map((poc) => (
              <POCCard
                key={poc.id}
                poc={poc}
                launchers={displayLaunchers}
                pods={displayPods}
                rsvs={displayRSVs}
                bocs={bocs}
                onReload={handleReloadLauncher}
                onClick={() => setSelectedPOC(poc.id)}
                onLauncherClick={setSelectedLauncherId}
              />
            ))}
          </div>
        )}

        {/* Ammo PLT Card - Sidebar style on desktop, full width on mobile */}
        {hasAmmoPltContent && (
          <div
            style={{
              width: isMobile ? '100%' : showPocCards ? '280px' : '100%',
              maxWidth: showPocCards ? undefined : isMobile ? '100%' : '400px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: isMobile ? undefined : 0,
            }}
          >
            <AmmoPltCard
              pods={displayPods}
              rsvs={displayRSVs}
              onClick={() => setIsAmmoPltModalOpen(true)}
            />
          </div>
        )}
      </div>
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
            readOnly={launcherDetailReadOnly}
          />
        )
      })()}
    </PageShell>
  )
}
