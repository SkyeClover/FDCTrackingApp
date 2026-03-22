import { Pod, RSV } from '../types'
import { X, Package, Truck } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'
import { useMemo, useState } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'
import RSVDetailModal from './RSVDetailModal'

const AMMO_PLT_ID = 'ammo-plt-1'

interface AmmoPltDetailModalProps {
  pods: Pod[]
  rsvs: RSV[]
  isOpen: boolean
  onClose: () => void
}

export default function AmmoPltDetailModal({ pods, rsvs, isOpen, onClose }: AmmoPltDetailModalProps) {
  const { roundTypes } = useAppData()
  const isMobile = useIsMobile()
  const [selectedRSV, setSelectedRSV] = useState<RSV | null>(null)
  
  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100,
    velocityThreshold: 0.2,
  })
  
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])
  
  if (!isOpen) return null

  // Get RSVs assigned to Ammo PLT
  const ammoPltRSVs = rsvs.filter((r) => r.ammoPltId === AMMO_PLT_ID)

  // Get pods assigned to Ammo PLT (directly or on RSVs assigned to Ammo PLT)
  const ammoPltPods = pods.filter((p) => {
    // Pod directly assigned to Ammo PLT
    if (p.ammoPltId === AMMO_PLT_ID) return true
    
    // Pod on an RSV assigned to Ammo PLT
    if (p.rsvId) {
      const rsv = rsvs.find((r) => r.id === p.rsvId)
      if (rsv && rsv.ammoPltId === AMMO_PLT_ID) return true
    }
    
    return false
  })
  
  // Only show pods not on launchers (ground pods)
  const podsOnGround = ammoPltPods.filter((p) => !p.launcherId)

  // Group pods by round type - dynamically handle all round types
  const podsByRoundType = (podList: Pod[]) => {
    const grouped: Record<string, Pod[]> = {}
    podList.forEach((pod) => {
      const roundType = pod.rounds[0]?.type
      if (roundType) {
        if (!grouped[roundType]) {
          grouped[roundType] = []
        }
        grouped[roundType].push(pod)
      }
    })
    return grouped
  }

  const onGroundByType = podsByRoundType(podsOnGround)

  // Calculate total rounds by type - dynamically handle all round types
  const calculateRoundsByType = (podList: Pod[]) => {
    const totals: Record<string, { available: number; used: number; total: number }> = {}
    podList.forEach((pod) => {
      pod.rounds.forEach((round) => {
        const type = round.type
        if (!totals[type]) {
          totals[type] = { available: 0, used: 0, total: 0 }
        }
        totals[type].total++
        if (round.status === 'available') {
          totals[type].available++
        } else if (round.status === 'used') {
          totals[type].used++
        }
      })
    })
    return totals
  }

  const roundsOnGround = calculateRoundsByType(podsOnGround)
  const roundsTotal = calculateRoundsByType(ammoPltPods)

  return (
    <div
      className="fdc-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isMobile ? 'var(--bg-primary)' : 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '1rem',
      }}
      onClick={isMobile ? undefined : onClose}
    >
      <div
        ref={modalContentRef}
        className="touch-kbd-scroll"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: isMobile ? '0' : '12px',
          padding: isMobile ? '1rem' : '2rem',
          maxWidth: isMobile ? '100%' : '900px',
          width: '100%',
          maxHeight: isMobile ? '100%' : '90vh',
          height: isMobile ? '100%' : 'auto',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          border: isMobile ? 'none' : '2px solid var(--accent)',
          touchAction: isMobile ? 'pan-y' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Package size={24} style={{ color: 'var(--accent)' }} />
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: 'var(--accent)',
                }}
              >
                Ammo Platoon - Ammunition Inventory
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Ammunition Supply and Distribution
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* RSV Information */}
        {ammoPltRSVs.length > 0 && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Truck size={18} />
              RSVs Assigned ({ammoPltRSVs.length})
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              {ammoPltRSVs.map((rsv) => {
                const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
                return (
                  <div
                    key={rsv.id}
                    onClick={() => setSelectedRSV(rsv)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{rsv.name}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                      ({rsvPods.length} pod{rsvPods.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              PODS AVAILABLE
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              {podsOnGround.length}
            </div>
          </div>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              TOTAL PODS
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {ammoPltPods.length}
            </div>
          </div>
        </div>

        {/* Pods by Round Type - On Ground */}
        <div style={{ marginBottom: '2rem' }}>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Package size={20} />
            Pods Available (On Ground)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {roundTypeOptions.map((option) => {
              const podsOfType = onGroundByType[option.value] || []
              const rounds = roundsOnGround[option.value] || { available: 0, used: 0, total: 0 }
              return (
                <div
                  key={option.value}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    {option.label}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                    {podsOfType.length} {podsOfType.length === 1 ? 'Pod' : 'Pods'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {rounds.total} rounds total
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Individual Rounds Breakdown */}
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
            }}
          >
            Individual Rounds Summary
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
            }}
          >
            {roundTypeOptions.map((option) => {
              const totals = roundsTotal[option.value] || { available: 0, used: 0, total: 0 }
              return (
                <div
                  key={option.value}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {option.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {totals.total}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Available:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--success)' }}>
                        {totals.available}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Used:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--danger)' }}>
                        {totals.used}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RSV Detail Modal */}
        {selectedRSV && (
          <RSVDetailModal
            rsv={selectedRSV}
            pods={pods}
            isOpen={!!selectedRSV}
            onClose={() => setSelectedRSV(null)}
          />
        )}
      </div>
    </div>
  )
}

