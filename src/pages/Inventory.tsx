import { useState, useMemo, useCallback } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus } from 'lucide-react'
import PodsManagement from '../components/PodsManagement'
import RoundTypesSection from '../components/inventory/RoundTypesSection'
import PodCreateModal from '../components/inventory/PodCreateModal'
import CollapsibleSection from '../components/ui/CollapsibleSection'
import { useIsMobile } from '../hooks/useIsMobile'
import PageShell from '../components/layout/PageShell'

export default function Inventory() {
  const isMobile = useIsMobile()
  const { roundTypes } = useAppData()
  const roundTypeBadge = useMemo(() => Object.keys(roundTypes).length, [roundTypes])
  const [podModalOpen, setPodModalOpen] = useState(false)

  const openPodModal = useCallback(() => setPodModalOpen(true), [])
  const closePodModal = useCallback(() => setPodModalOpen(false), [])

  return (
    <PageShell
      title="Inventory"
      isMobile={isMobile}
      contentMaxWidth="min(100%, 1680px)"
      actions={
        <button
          type="button"
          onClick={openPodModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            backgroundColor: 'var(--success)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          <Plus size={18} />
          Add ammunition pods
        </button>
      }
    >
      <PodCreateModal isOpen={podModalOpen} onClose={closePodModal} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(340px, 460px)',
          gap: '0.85rem',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0 }}>
          <CollapsibleSection
            title="Pods"
            subtitle="On hand, launchers, RSVs, and higher holding"
            defaultCollapsed
            compact
            data-guide="pods-management-section"
          >
            <PodsManagement onAddPod={openPodModal} />
          </CollapsibleSection>
        </div>

        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            minWidth: 0,
            ...(isMobile
              ? {}
              : {
                  position: 'sticky',
                  top: '0.35rem',
                  alignSelf: 'start',
                }),
          }}
        >
          <CollapsibleSection
            title="Round types"
            subtitle="Ammo labels and what is enabled for new pods"
            badge={roundTypeBadge}
            defaultCollapsed
            compact
            data-guide="round-types-section"
          >
            <RoundTypesSection embedded compact />
          </CollapsibleSection>
        </aside>
      </div>
    </PageShell>
  )
}
