import { useAppData } from '../context/AppDataContext'

/**
 * Surface pending simulation-driven reassignments (destruction / survivor flow).
 */
export function SimulationReassignmentBanner() {
  const { simulationOverlay } = useAppData()
  const pending = simulationOverlay?.reassignments?.filter((r) => r.approvalState === 'pending') ?? []
  if (pending.length === 0) return null

  return (
    <div
      role="status"
      style={{
        margin: '0 0.75rem',
        padding: '0.45rem 0.65rem',
        borderRadius: 8,
        border: '1px solid var(--warning, #c90)',
        background: 'rgba(204, 153, 0, 0.12)',
        color: 'var(--text-primary)',
        fontSize: '0.82rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.35rem',
      }}
    >
      <strong>Simulation:</strong> {pending.length} pending reassignment(s). Review org moves and mission impact; approve in
      future workflow when wired.
    </div>
  )
}
