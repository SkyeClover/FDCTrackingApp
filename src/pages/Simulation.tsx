import PageShell from '../components/layout/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import { SimulationSection } from '../components/network/SimulationSection'
import { SimulationMapSection } from '../components/network/SimulationMapSection'

/**
 * Renders the Simulation UI section.
 */
export default function Simulation() {
  const isMobile = useIsMobile()
  const safeIsMobile = isMobile ?? false

  return (
    <PageShell title="Simulation" isMobile={safeIsMobile} contentMaxWidth="min(100%, 1680px)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0 }}>
        <SimulationSection isMobile={safeIsMobile} />
        <SimulationMapSection isMobile={safeIsMobile} />
      </div>
    </PageShell>
  )
}

