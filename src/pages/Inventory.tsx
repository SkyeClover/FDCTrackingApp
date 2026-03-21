import { useState, useMemo, useCallback } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus } from 'lucide-react'
import PodsManagement from '../components/PodsManagement'
import PodsToRSVAssignment from '../components/PodsToRSVAssignment'
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

      <CollapsibleSection
        title="Round types"
        subtitle="Ammo labels and what is enabled for new pods"
        badge={roundTypeBadge}
        compact
        data-guide="round-types-section"
      >
        <RoundTypesSection embedded compact />
      </CollapsibleSection>

      <CollapsibleSection
        title="Pods"
        subtitle="On hand, launchers, RSVs, and higher holding"
        defaultCollapsed={false}
        compact
        data-guide="pods-management-section"
      >
        <PodsManagement onAddPod={openPodModal} />
      </CollapsibleSection>

      <CollapsibleSection title="Assign pods to RSVs" subtitle="Load plans" compact>
        <PodsToRSVAssignment />
      </CollapsibleSection>
    </PageShell>
  )
}
