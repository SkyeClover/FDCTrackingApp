import { POC, Launcher, Pod, RSV, BOC } from '../types'
import LauncherCard from './LauncherCard'
import { Truck } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'
import { useMemo } from 'react'

interface POCCardProps {
  poc: POC
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  bocs: BOC[]
  onReload?: (launcherId: string) => void
  onClick?: () => void
  onLauncherClick?: (launcherId: string) => void
  /** Hide launcher reload / task controls (observe-only echelon) */
  readOnly?: boolean
}

/**
 * Renders the POCCard UI section.
 */
export default function POCCard({
  poc,
  launchers,
  pods,
  rsvs,
  bocs: _bocs,
  onReload,
  onClick,
  onLauncherClick,
  readOnly = false,
}: POCCardProps) {
  void _bocs // Keep for interface compatibility but not used in logic
  const { roundTypes } = useAppData()
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])
  const pocLaunchers = launchers.filter((l) => l.pocId === poc.id)
  
  // Get RSV's assigned to this POC, or to the POC's BOC (battery level slants)
  const pocRSVs = rsvs.filter((r) => {
    if (r.pocId === poc.id) return true
    // Battery level slants - RSV's assigned to BOC
    if (r.bocId === poc.bocId) return true
    return false
  })
  
  // Get pods on RSV's assigned to this POC, or directly assigned to this POC
  const podsOnRSVs = pods.filter((p) => {
    if (p.launcherId) return false
    
    // Pod directly assigned to this POC
    if (p.pocId === poc.id) return true
    
    if (!p.rsvId) return false
    const rsv = rsvs.find((r) => r.id === p.rsvId)
    if (!rsv) return false
    if (rsv.pocId === poc.id) return true
    if (rsv.bocId === poc.bocId) return true
    return false
  })
  
  // Pod count (by pod primary type) and available rounds (sum per type) — RSV / PLT stock
  const { podsByRoundTypeCounts, availableRoundsByType } = useMemo(() => {
    const pods: Record<string, number> = {}
    const rnds: Record<string, number> = {}
    for (const opt of roundTypeOptions) {
      pods[opt.value] = 0
      rnds[opt.value] = 0
    }
    for (const pod of podsOnRSVs) {
      const primary = pod.rounds[0]?.type
      if (primary) {
        pods[primary] = (pods[primary] ?? 0) + 1
      }
      for (const round of pod.rounds) {
        if (round.status === 'available') {
          rnds[round.type] = (rnds[round.type] ?? 0) + 1
        }
      }
    }
    return { podsByRoundTypeCounts: pods, availableRoundsByType: rnds }
  }, [podsOnRSVs, roundTypeOptions])

  // --- Render ---
  return (
    <div
      data-guide="poc-card"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {/* POC Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
          }}
        >
          {poc.name}
        </h3>
      </div>

      {/* RSV's - Pods by Round Type */}
      {pocRSVs.length > 0 && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Truck size={12} />
            RSV's ({pocRSVs.length}) — pods & available rounds
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}
          >
            {pocRSVs.map((rsv, idx) => (
              <span key={rsv.id}>
                {rsv.name}
                {idx < pocRSVs.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            {roundTypeOptions.map((option) => {
              const podCount = podsByRoundTypeCounts[option.value] ?? 0
              const rndCount = availableRoundsByType[option.value] ?? 0
              if (podCount === 0 && rndCount === 0) return null
              return (
                <div
                  key={option.value}
                  style={{
                    padding: '0.35rem 0.65rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{option.label}:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: '600' }}>
                    {podCount > 0 ? `${podCount} pod${podCount === 1 ? '' : 's'}` : ''}
                    {podCount > 0 && rndCount > 0 ? ' · ' : ''}
                    {rndCount > 0 ? `${rndCount} rnd` : podCount === 0 ? '0 rnd' : ''}
                  </span>
                </div>
              )
            })}
            {/* Types present on pods but not in enabled round-type list */}
            {Object.keys({ ...podsByRoundTypeCounts, ...availableRoundsByType })
              .filter((type) => !roundTypeOptions.some((o) => o.value === type))
              .filter((type) => (podsByRoundTypeCounts[type] ?? 0) > 0 || (availableRoundsByType[type] ?? 0) > 0)
              .sort((a, b) => a.localeCompare(b))
              .map((type) => {
                const podCount = podsByRoundTypeCounts[type] ?? 0
                const rndCount = availableRoundsByType[type] ?? 0
                return (
                  <div
                    key={type}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{type}:</span>
                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>
                      {podCount > 0 ? `${podCount} pod${podCount === 1 ? '' : 's'}` : ''}
                      {podCount > 0 && rndCount > 0 ? ' · ' : ''}
                      {rndCount > 0 ? `${rndCount} rnd` : podCount === 0 ? '0 rnd' : ''}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Launchers Grid */}
      {pocLaunchers.length === 0 ? (
        <p
          style={{
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '1rem',
          }}
        >
          No launchers assigned
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {pocLaunchers.map((launcher) => {
            const pod = pods.find((p) => p.launcherId === launcher.id)
            return (
              <LauncherCard
                key={launcher.id}
                launcher={launcher}
                pod={pod}
                onReload={() => onReload?.(launcher.id)}
                onClick={() => onLauncherClick?.(launcher.id)}
                readOnly={readOnly}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

