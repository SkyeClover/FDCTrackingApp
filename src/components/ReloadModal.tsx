import { Launcher, Pod, POC, RSV } from '../types'
import { X, Package, Truck } from 'lucide-react'

interface ReloadModalProps {
  launcher: Launcher
  poc: POC
  availablePods: Pod[]
  currentPod?: Pod
  rsvs?: RSV[]
  isOpen: boolean
  onClose: () => void
  onReload: (launcherId: string, podId?: string) => void
}

export default function ReloadModal({
  launcher,
  poc,
  availablePods,
  currentPod,
  rsvs = [],
  isOpen,
  onClose,
  onReload,
}: ReloadModalProps) {
  if (!isOpen) return null

  const handleReload = (podId?: string) => {
    onReload(launcher.id, podId)
    onClose()
  }

  // Group pods by RSV, Ammo PLT, or POC
  const podsByRSV = new Map<string, { rsv: RSV; pods: Pod[] }>()
  const podsByAmmoPlt: Pod[] = []
  const podsByPOC: Pod[] = []
  
  availablePods.forEach((pod) => {
    if (pod.ammoPltId) {
      podsByAmmoPlt.push(pod)
    } else if (pod.rsvId) {
      const rsv = rsvs.find((r) => r.id === pod.rsvId)
      if (rsv) {
        if (!podsByRSV.has(rsv.id)) {
          podsByRSV.set(rsv.id, { rsv, pods: [] })
        }
        podsByRSV.get(rsv.id)!.pods.push(pod)
      }
    } else if (pod.pocId) {
      podsByPOC.push(pod)
    }
  })
  
  const podsWithoutRSV = availablePods.filter((p) => !p.rsvId && !p.ammoPltId && !p.pocId)

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
          maxWidth: '600px',
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
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              Reload Launcher: {launcher.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Select a pod from {poc.name} RSV's or inventory
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

        {/* Current Pod Info */}
        {currentPod && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              CURRENT POD
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {currentPod.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {currentPod.rounds.filter((r) => r.status === 'available').length} / {currentPod.rounds.length}{' '}
              rounds available
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              UUID: {currentPod.uuid}
            </div>
            <button
              onClick={() => handleReload(null as any)}
              style={{
                marginTop: '0.75rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '500',
                width: '100%',
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
              Unload Pod (Return to {poc.name} Stock)
            </button>
          </div>
        )}

        {/* Available Pods by RSV */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Truck size={18} />
            Available Pods by RSV ({availablePods.length})
          </div>

          {availablePods.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              No available pods in RSV's or POC inventory
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Pods grouped by RSV */}
              {Array.from(podsByRSV.entries()).map(([rsvId, { rsv, pods: rsvPods }]) => (
                <div key={rsvId} style={{ marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--accent)',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Truck size={14} />
                    RSV: {rsv.name} ({rsvPods.length} pods)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1.5rem' }}>
                    {rsvPods.map((pod) => {
                      const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                      const roundType = pod.rounds[0]?.type || 'N/A'
                      return (
                        <button
                          key={pod.id}
                          onClick={() => handleReload(pod.id)}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '2px solid var(--border)',
                            borderRadius: '6px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'start',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {pod.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Type: {roundType}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--accent)',
                              }}
                            >
                              {availableRounds} / {pod.rounds.length} rounds
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            UUID: {pod.uuid}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              
              {/* Pods from Ammo PLT */}
              {podsByAmmoPlt.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--accent)',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Package size={14} />
                    Ammo PLT ({podsByAmmoPlt.length} pods)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1.5rem' }}>
                    {podsByAmmoPlt.map((pod) => {
                      const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                      const roundType = pod.rounds[0]?.type || 'N/A'
                      return (
                        <button
                          key={pod.id}
                          onClick={() => handleReload(pod.id)}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '2px solid var(--border)',
                            borderRadius: '6px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'start',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {pod.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Type: {roundType}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--accent)',
                              }}
                            >
                              {availableRounds} / {pod.rounds.length} rounds
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            UUID: {pod.uuid}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Pods directly assigned to POC */}
              {podsByPOC.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Direct POC Inventory ({podsByPOC.length} pods)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1.5rem' }}>
                    {podsByPOC.map((pod) => {
                      const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                      const roundType = pod.rounds[0]?.type || 'N/A'
                      return (
                        <button
                          key={pod.id}
                          onClick={() => handleReload(pod.id)}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '2px solid var(--border)',
                            borderRadius: '6px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'start',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {pod.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                Type: {roundType}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: 'var(--accent)',
                              }}
                            >
                              {availableRounds} / {pod.rounds.length} rounds
                            </div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            UUID: {pod.uuid}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Pods without RSV, POC, or Ammo PLT */}
              {podsWithoutRSV.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Direct POC Inventory ({podsWithoutRSV.length} pods)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {podsWithoutRSV.map((pod) => {
                const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                const roundType = pod.rounds[0]?.type || 'N/A'
                return (
                  <button
                    key={pod.id}
                    onClick={() => handleReload(pod.id)}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '2px solid var(--border)',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {pod.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Type: {roundType}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: 'var(--accent)',
                        }}
                      >
                        {availableRounds} / {pod.rounds.length} rounds
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      UUID: {pod.uuid}
                    </div>
                  </button>
                )
              })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          {availablePods.length > 0 && (
            <button
              onClick={() => handleReload()} // Use first available pod
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              Reload with First Available
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

