import { POC, Pod, Launcher, RSV, BOC } from '../types'
import { X, Package, Truck } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'
import { useMemo } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'

interface POCDetailModalProps {
  poc: POC
  pods: Pod[]
  launchers: Launcher[]
  rsvs?: RSV[]
  bocs?: BOC[]
  isOpen: boolean
  onClose: () => void
}

export default function POCDetailModal({ poc, pods, launchers, rsvs = [], bocs: _bocs = [], isOpen, onClose }: POCDetailModalProps) {
  void _bocs // Keep for interface compatibility but not used in logic
  // Hooks must be called at the top level - but only access when modal is open
  const { roundTypes = {} } = useAppData()
  const isMobile = useIsMobile()
  
  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100,
    velocityThreshold: 0.2,
  })
  
  const roundTypeOptions = useMemo(() => {
    try {
      return getEnabledRoundTypeOptions(roundTypes || {})
    } catch (error) {
      console.error('Error getting round type options:', error)
      return []
    }
  }, [roundTypes])
  
  if (!isOpen) return null
  
  // Safety check - ensure poc exists
  if (!poc) {
    return null
  }
  
  // Ensure arrays are defined
  const safePods = pods || []
  const safeLaunchers = launchers || []
  const safeRSVs = rsvs || []

  // Get RSV's assigned to this POC, or to the POC's BOC (battery level slants)
  const pocRSVs = safeRSVs.filter((r) => {
    if (r.pocId === poc.id) return true
    // Battery level slants - RSV's assigned to BOC
    if (r.bocId === poc.bocId) return true
    return false
  })

  // Get pods assigned to this POC (both explicitly and via common sense)
  // Common sense: pods on launchers belong to that launcher's POC
  // Also include pods on RSVs assigned to this POC
  const pocPods = safePods.filter((p) => {
    if (p.pocId === poc.id) return true
    // If pod is on a launcher that belongs to this POC, it belongs to this POC
    if (p.launcherId) {
      const launcher = safeLaunchers.find((l) => l.id === p.launcherId)
      return launcher?.pocId === poc.id
    }
    // If pod is on an RSV assigned to this POC, it belongs to this POC
    if (p.rsvId) {
      const rsv = safeRSVs.find((r) => r.id === p.rsvId)
      if (rsv) {
        if (rsv.pocId === poc.id) return true
        if (rsv.bocId === poc.bocId) return true
      }
    }
    return false
  })
  
  // Pods on RSVs (not on launchers, but on RSVs)
  const podsOnRSVs = pocPods.filter((p) => !p.launcherId && p.rsvId)
  
  // Pods truly on ground (POC STOCK - not on launchers, not on RSVs)
  const podsOnPOCStock = pocPods.filter((p) => !p.launcherId && !p.rsvId)
  
  // All pods on ground (not on launchers) - includes both RSV pods and POC STOCK
  const podsOnGround = pocPods.filter((p) => !p.launcherId)
  
  // Pods on launchers
  const podsOnLaunchers = pocPods.filter((p) => p.launcherId)

  // Group pods by round type - dynamically based on enabled round types
  const podsByRoundType = (podList: Pod[]) => {
    const grouped: Record<string, Pod[]> = {}
    // Initialize with enabled round types
    roundTypeOptions.forEach((option) => {
      grouped[option.value] = []
    })
    podList.forEach((pod) => {
      const roundType = pod.rounds[0]?.type
      if (roundType && grouped[roundType] !== undefined) {
        grouped[roundType].push(pod)
      }
    })
    return grouped
  }

  const onGroundByType = podsByRoundType(podsOnGround)
  const onLaunchersByType = podsByRoundType(podsOnLaunchers)

  // Calculate total rounds by type - dynamically based on enabled round types
  const calculateRoundsByType = (podList: Pod[]) => {
    const totals: Record<string, { available: number; used: number; total: number }> = {}
    // Initialize with enabled round types
    roundTypeOptions.forEach((option) => {
      totals[option.value] = { available: 0, used: 0, total: 0 }
    })
    podList.forEach((pod) => {
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
  }

  const roundsOnGround = calculateRoundsByType(podsOnGround)
  const roundsOnLaunchers = calculateRoundsByType(podsOnLaunchers)
  const roundsTotal = calculateRoundsByType(pocPods)

  // Ensure we have a valid poc name
  const pocName = poc?.name || 'Unknown POC'

  return (
    <div
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
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: isMobile ? '0' : '12px',
          padding: isMobile ? '1rem' : '2rem',
          maxWidth: isMobile ? '100%' : '900px',
          minWidth: isMobile ? '0' : '400px',
          width: '100%',
          maxHeight: isMobile ? '100vh' : '90vh',
          minHeight: isMobile ? '0' : '200px',
          height: isMobile ? '100vh' : 'auto',
          overflow: 'auto',
          border: isMobile ? 'none' : '2px solid var(--border)',
          boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 1001,
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
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {pocName} - Ammunition Inventory
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Platoon Operations Center (PLT FDC)
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
        {pocRSVs.length > 0 && (
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
              RSVs Assigned ({pocRSVs.length})
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              {pocRSVs.map((rsv) => {
                const rsvPods = safePods.filter((p) => p.rsvId === rsv.id)
                return (
                  <div
                    key={rsv.id}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem',
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
              POC STOCK
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              {podsOnPOCStock.length}
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
              ON RSVs
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>
              {podsOnRSVs.length}
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
              PODS ON LAUNCHERS
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {podsOnLaunchers.length}
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
              {pocPods.length}
            </div>
          </div>
        </div>

        {/* Show message if no data at all */}
        {pocPods.length === 0 && pocRSVs.length === 0 && (
          <div
            style={{
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem' }}>
              No pods or RSVs assigned to this POC yet.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Go to Inventory to assign pods and RSVs to this POC.
            </p>
          </div>
        )}

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
            Pods Available for Reload (POC STOCK & RSVs)
          </h3>
          {roundTypeOptions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>
              No round types enabled. Enable round types in Settings to see pod breakdowns.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
            {roundTypeOptions.map((option) => {
              const podsOfType = onGroundByType[option.value] || []
              const rounds = roundsOnGround[option.value] || { total: 0, available: 0, used: 0 }
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
          )}
        </div>

        {/* Pods by Round Type - On Launchers */}
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
            Pods On Launchers
          </h3>
          {roundTypeOptions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>
              No round types enabled. Enable round types in Settings to see pod breakdowns.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
            {roundTypeOptions.map((option) => {
              const podsOfType = onLaunchersByType[option.value] || []
              const rounds = roundsOnLaunchers[option.value] || { total: 0, available: 0, used: 0 }
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
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {podsOfType.length} {podsOfType.length === 1 ? 'Pod' : 'Pods'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    {rounds.total} rounds total
                  </div>
                </div>
              )
            })}
            </div>
          )}
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
          {roundTypeOptions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>
              No round types enabled. Enable round types in Settings to see rounds breakdown.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem',
              }}
            >
            {roundTypeOptions.map((option) => {
              const totals = roundsTotal[option.value] || { total: 0, available: 0, used: 0 }
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
          )}
        </div>
      </div>
    </div>
  )
}

