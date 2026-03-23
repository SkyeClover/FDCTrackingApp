import { AmmoPlatoon, Pod, RSV, RoundType } from '../types'
import { Truck, Package } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'
import { useMemo } from 'react'

interface AmmoPltCardProps {
  ammoPlatoon: AmmoPlatoon
  pods: Pod[]
  rsvs: RSV[]
  onClick?: () => void
}

/**
 * Renders the Ammo Plt Card UI section.
 */
export default function AmmoPltCard({
  ammoPlatoon,
  pods,
  rsvs,
  onClick,
}: AmmoPltCardProps) {
  const { roundTypes } = useAppData()
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])
  
  // Get RSVs assigned to Ammo PLT
  const aid = ammoPlatoon.id
  const ammoPltRSVs = rsvs.filter((r) => r.ammoPltId === aid)

  const ammoPltPods = pods.filter((p) => {
    if (p.ammoPltId === aid) return true
    if (p.rsvId) {
      const rsv = rsvs.find((r) => r.id === p.rsvId)
      if (rsv && rsv.ammoPltId === aid) return true
    }
    return false
  })
  
  // Only show pods not on launchers (ground pods)
  const podsOnGround = ammoPltPods.filter((p) => !p.launcherId)
  
  // Group pods by round type
  const podsByRoundType: Record<RoundType, number> = {
    M28A1: 0,
    M26: 0,
    M31: 0,
    M30: 0,
  }
  
  podsOnGround.forEach((pod) => {
    const roundType = pod.rounds[0]?.type
    if (roundType && podsByRoundType[roundType] !== undefined) {
      podsByRoundType[roundType]++
    }
  })

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--accent)',
        borderRadius: '6px',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative',
        opacity: 0.85,
        boxSizing: 'border-box',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
          e.currentTarget.style.opacity = '1'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.opacity = '0.85'
        }
      }}
    >
      {/* Ammo PLT Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Package size={16} style={{ color: 'var(--accent)' }} />
          <h3
            style={{
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: 'var(--accent)',
            }}
          >
            {ammoPlatoon.name}
          </h3>
        </div>
      </div>

      {/* RSVs Section */}
      {ammoPltRSVs.length > 0 && (
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Truck size={10} />
            RSV's ({ammoPltRSVs.length})
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-primary)',
            }}
          >
            {ammoPltRSVs.slice(0, 2).map((rsv, idx) => (
              <span key={rsv.id}>
                {rsv.name}
                {idx < Math.min(ammoPltRSVs.length, 2) - 1 ? ', ' : ''}
              </span>
            ))}
            {ammoPltRSVs.length > 2 && (
              <span style={{ color: 'var(--text-secondary)' }}> +{ammoPltRSVs.length - 2} more</span>
            )}
          </div>
        </div>
      )}

      {/* Pods Available Section */}
      {podsOnGround.length > 0 && (
        <div
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Package size={10} />
            Pods ({podsOnGround.length})
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem',
            }}
          >
            {roundTypeOptions.map((option) => {
              const count = podsByRoundType[option.value]
              if (count === 0) return null
              return (
                <div
                  key={option.value}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '3px',
                    border: '1px solid var(--border)',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{option.label}:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {ammoPltRSVs.length === 0 && podsOnGround.length === 0 && (
        <p
          style={{
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '0.5rem',
            fontSize: '0.75rem',
          }}
        >
          No RSVs or pods assigned
        </p>
      )}
    </div>
  )
}

