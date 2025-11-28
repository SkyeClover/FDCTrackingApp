import { useState, useMemo, useCallback, memo } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Pod, RSV } from '../types'
import { Package, Truck, Search, Check, X } from 'lucide-react'

interface PodsToRSVAssignmentProps {}

export default memo(function PodsToRSVAssignment({}: PodsToRSVAssignmentProps) {
  const { rsvs, pods, assignPodToRSV } = useAppData()
  
  const [selectedRSV, setSelectedRSV] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPods, setSelectedPods] = useState<Set<string>>(new Set())

  // Get available pods (not on launchers, not already on an RSV unless it's the selected RSV)
  const availablePods = useMemo(() => {
    return pods.filter((pod) => {
      if (pod.launcherId) return false // Pod is on a launcher
      if (pod.rsvId && pod.rsvId !== selectedRSV) return false // Pod is on a different RSV
      if (pod.ammoPltId) return false // Pod is assigned to Ammo PLT (not on RSV)
      return true
    })
  }, [pods, selectedRSV])

  // Filter pods by search
  const filteredPods = useMemo(() => {
    if (!searchQuery.trim()) return availablePods
    const query = searchQuery.toLowerCase()
    return availablePods.filter(
      (pod) =>
        pod.name.toLowerCase().includes(query) ||
        pod.uuid.toLowerCase().includes(query)
    )
  }, [availablePods, searchQuery])

  // Get pods for selected RSV
  const rsvPods = useMemo(() => {
    if (!selectedRSV) return []
    return pods.filter((p) => p.rsvId === selectedRSV)
  }, [pods, selectedRSV])

  // Toggle pod selection
  const togglePodSelection = useCallback((podId: string) => {
    setSelectedPods((prev) => {
      const next = new Set(prev)
      if (next.has(podId)) {
        next.delete(podId)
      } else {
        next.add(podId)
      }
      return next
    })
  }, [])

  // Assign selected pods to RSV
  const handleAssignSelected = useCallback(() => {
    if (!selectedRSV) return
    selectedPods.forEach((podId) => {
      assignPodToRSV(podId, selectedRSV)
    })
    setSelectedPods(new Set())
  }, [selectedRSV, selectedPods, assignPodToRSV])

  // Unassign pod from RSV
  const handleUnassignPod = useCallback((podId: string) => {
    assignPodToRSV(podId, '')
  }, [assignPodToRSV])

  // Select all filtered pods
  const handleSelectAll = useCallback(() => {
    setSelectedPods(new Set(filteredPods.map((p) => p.id)))
  }, [filteredPods])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedPods(new Set())
  }, [])

  // Get round type for a pod
  const getPodRoundType = (pod: Pod) => {
    return pod.rounds[0]?.type || 'Unknown'
  }

  // Get available rounds count
  const getAvailableRounds = (pod: Pod) => {
    return pod.rounds.filter((r) => r.status === 'available').length
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Package size={20} />
        Assign Pods to RSVs
      </h2>

      {/* RSV Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
          }}
        >
          Select RSV:
        </label>
        <select
          value={selectedRSV}
          onChange={(e) => {
            setSelectedRSV(e.target.value)
            setSelectedPods(new Set())
          }}
          style={{
            width: '100%',
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        >
          <option value="">-- Select an RSV --</option>
          {rsvs.map((rsv) => (
            <option key={rsv.id} value={rsv.id}>
              {rsv.name} ({pods.filter((p) => p.rsvId === rsv.id).length} pods)
            </option>
          ))}
        </select>
      </div>

      {selectedRSV && (
        <>
          {/* Current RSV Pods */}
          {rsvPods.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
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
                <Truck size={16} />
                Current Pods on RSV ({rsvPods.length})
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.5rem',
                }}
              >
                {rsvPods.map((pod) => (
                  <div
                    key={pod.id}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        {pod.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {getPodRoundType(pod)} • {getAvailableRounds(pod)}/{pod.rounds.length} rounds
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassignPod(pod.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'var(--danger)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove from RSV"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Pods */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Package size={16} />
                Available Pods ({filteredPods.length})
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedPods.size > 0 && (
                  <>
                    <button
                      onClick={handleAssignSelected}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--success)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Check size={14} />
                      Assign Selected ({selectedPods.size})
                    </button>
                    <button
                      onClick={handleClearSelection}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Clear
                    </button>
                  </>
                )}
                {filteredPods.length > 0 && (
                  <button
                    onClick={selectedPods.size === filteredPods.length ? handleClearSelection : handleSelectAll}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    {selectedPods.size === filteredPods.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div
              style={{
                position: 'relative',
                marginBottom: '1rem',
              }}
            >
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="text"
                placeholder="Search pods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Pods Grid */}
            {filteredPods.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                No available pods
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.75rem',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                }}
              >
                {filteredPods.map((pod) => {
                  const isSelected = selectedPods.has(pod.id)
                  const roundType = getPodRoundType(pod)
                  const availableRounds = getAvailableRounds(pod)

                  return (
                    <div
                      key={pod.id}
                      onClick={() => togglePodSelection(pod.id)}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-tertiary)',
                        borderRadius: '6px',
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                        }
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
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: isSelected ? 'white' : 'var(--text-primary)',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {pod.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
                            }}
                          >
                            {roundType}
                          </div>
                        </div>
                        {isSelected && (
                          <Check size={16} color="white" style={{ flexShrink: 0 }} />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {availableRounds}/{pod.rounds.length} rounds
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedRSV && (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          Select an RSV to assign pods
        </p>
      )}
    </div>
  )
})

