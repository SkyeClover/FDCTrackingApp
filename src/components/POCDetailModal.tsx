import { POC, Pod, Launcher, RoundType } from '../types'
import { X, Package } from 'lucide-react'
import { ROUND_TYPE_OPTIONS } from '../constants/roundTypes'

interface POCDetailModalProps {
  poc: POC
  pods: Pod[]
  launchers: Launcher[]
  isOpen: boolean
  onClose: () => void
}

export default function POCDetailModal({ poc, pods, launchers, isOpen, onClose }: POCDetailModalProps) {
  if (!isOpen) return null

  // Get pods assigned to this POC (both explicitly and via common sense)
  // Common sense: pods on launchers belong to that launcher's POC
  const pocPods = pods.filter((p) => {
    if (p.pocId === poc.id) return true
    // If pod is on a launcher that belongs to this POC, it belongs to this POC
    if (p.launcherId) {
      const launcher = launchers.find((l) => l.id === p.launcherId)
      return launcher?.pocId === poc.id
    }
    return false
  })
  
  // Pods on ground (not on launchers)
  const podsOnGround = pocPods.filter((p) => !p.launcherId)
  
  // Pods on launchers
  const podsOnLaunchers = pocPods.filter((p) => p.launcherId)

  // Group pods by round type
  const podsByRoundType = (podList: Pod[]) => {
    const grouped: Record<RoundType, Pod[]> = {
      M28A1: [],
      M26: [],
      M31: [],
      M30: [],
    }
    podList.forEach((pod) => {
      const roundType = pod.rounds[0]?.type
      if (roundType && grouped[roundType]) {
        grouped[roundType].push(pod)
      }
    })
    return grouped
  }

  const onGroundByType = podsByRoundType(podsOnGround)
  const onLaunchersByType = podsByRoundType(podsOnLaunchers)

  // Calculate total rounds by type
  const calculateRoundsByType = (podList: Pod[]) => {
    const totals: Record<RoundType, { available: number; used: number; total: number }> = {
      M28A1: { available: 0, used: 0, total: 0 },
      M26: { available: 0, used: 0, total: 0 },
      M31: { available: 0, used: 0, total: 0 },
      M30: { available: 0, used: 0, total: 0 },
    }
    podList.forEach((pod) => {
      pod.rounds.forEach((round) => {
        const type = round.type
        if (totals[type]) {
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '2px solid var(--border)',
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
              {poc.name} - Ammunition Inventory
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
              PODS ON GROUND
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
            Pods On Ground (Available for Reload)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {ROUND_TYPE_OPTIONS.map((option) => {
              const podsOfType = onGroundByType[option.value]
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
                    {roundsOnGround[option.value].total} rounds total
                  </div>
                </div>
              )
            })}
          </div>
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {ROUND_TYPE_OPTIONS.map((option) => {
              const podsOfType = onLaunchersByType[option.value]
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
                    {roundsOnLaunchers[option.value].total} rounds total
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
            {ROUND_TYPE_OPTIONS.map((option) => {
              const totals = roundsTotal[option.value]
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
      </div>
    </div>
  )
}

