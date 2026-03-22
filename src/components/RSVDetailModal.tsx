import { RSV, Pod } from '../types'
import { X, Truck, Package } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'
import { useMemo } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'

interface RSVDetailModalProps {
  rsv: RSV
  pods: Pod[]
  isOpen: boolean
  onClose: () => void
}

export default function RSVDetailModal({ rsv, pods, isOpen, onClose }: RSVDetailModalProps) {
  const { roundTypes } = useAppData()
  const isMobile = useIsMobile()
  
  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100,
    velocityThreshold: 0.2,
  })
  
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])

  // Get pods on this RSV (not on launchers) - safe when !rsv for hook order
  const rsvPods = rsv ? pods.filter((p) => p.rsvId === rsv.id && !p.launcherId) : []

  // Group pods by round type (all hooks must run before any conditional return)
  const podsByRoundType = useMemo(() => {
    const grouped: Record<string, Pod[]> = {}
    roundTypeOptions.forEach((option) => {
      grouped[option.value] = []
    })
    rsvPods.forEach((pod) => {
      const roundType = pod.rounds[0]?.type
      if (roundType && grouped[roundType] !== undefined) {
        grouped[roundType].push(pod)
      }
    })
    return grouped
  }, [rsvPods, roundTypeOptions])

  // Calculate rounds by type
  const roundsByType = useMemo(() => {
    const totals: Record<string, { available: number; used: number; total: number }> = {}
    roundTypeOptions.forEach((option) => {
      totals[option.value] = { available: 0, used: 0, total: 0 }
    })
    rsvPods.forEach((pod) => {
      pod.rounds.forEach((round) => {
        const type = round.type
        if (totals[type] !== undefined) {
          totals[type].total++
          if (round.status === 'available') {
            totals[type].available++
          } else if (round.status === 'used') {
            totals[type].used++
          }
        }
      })
    })
    return totals
  }, [rsvPods, roundTypeOptions])

  if (!isOpen || !rsv) return null

  // Calculate total rounds (plain values, not hooks)
  const totalRounds = rsvPods.reduce((sum, pod) => sum + pod.rounds.length, 0)
  const availableRounds = rsvPods.reduce(
    (sum, pod) => sum + pod.rounds.filter((r) => r.status === 'available').length,
    0
  )
  const usedRounds = rsvPods.reduce(
    (sum, pod) => sum + pod.rounds.filter((r) => r.status === 'used').length,
    0
  )

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
        zIndex: 2000,
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
          maxWidth: isMobile ? '100%' : '800px',
          width: '100%',
          maxHeight: isMobile ? '100%' : '90vh',
          height: isMobile ? '100%' : 'auto',
          overflow: 'auto',
          border: isMobile ? 'none' : '2px solid var(--border)',
          boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
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
              <Truck size={24} style={{ color: 'var(--accent)' }} />
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                }}
              >
                {rsv.name}
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Reload Supply Vehicle - Pod Inventory
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

        {/* Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
              PODS ON BOARD
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              {rsvPods.length}
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
              TOTAL ROUNDS
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {totalRounds}
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
              AVAILABLE
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
              {availableRounds}
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
              USED
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
              {usedRounds}
            </div>
          </div>
        </div>

        {/* Pods by Round Type */}
        {roundTypeOptions.length > 0 && (
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
              Pods by Round Type
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {roundTypeOptions.map((option) => {
                const podsOfType = podsByRoundType[option.value] || []
                const rounds = roundsByType[option.value] || { total: 0, available: 0, used: 0 }
                if (podsOfType.length === 0) return null
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
                      {rounds.total} rounds ({rounds.available} available, {rounds.used} used)
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Individual Pod List */}
        <div>
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
            Pods On Board ({rsvPods.length})
          </h3>
          {rsvPods.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                No pods currently on this RSV
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {rsvPods.map((pod) => {
                const roundType = pod.rounds[0]?.type || 'N/A'
                const totalRounds = pod.rounds.length
                const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                const usedRounds = pod.rounds.filter((r) => r.status === 'used').length
                return (
                  <div
                    key={pod.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {pod.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {roundType}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {totalRounds} rounds
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {availableRounds} available, {usedRounds} used
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: 'var(--success)',
                          borderRadius: '4px',
                          opacity: totalRounds > 0 ? availableRounds / totalRounds : 0,
                        }}
                      />
                      <div
                        style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: 'var(--danger)',
                          borderRadius: '4px',
                          opacity: totalRounds > 0 ? usedRounds / totalRounds : 0,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

