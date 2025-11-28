import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Pod, RoundType } from '../types'
import { Plus, Search, Trash2 } from 'lucide-react'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'

type PodGroup = 'all' | 'ammo-plt' | 'poc' | 'rsv' | 'launcher' | 'unassigned'

interface PodsManagementProps {
  onAddPod?: () => void
}

const AMMO_PLT_ID = 'ammo-plt-1'

export default memo(function PodsManagement({ onAddPod }: PodsManagementProps) {
  const { pods, pocs, rsvs, launchers, assignPodToPOC, assignPodToRSV, assignPodToAmmoPlt, assignPodToLauncher, deletePod, roundTypes } = useAppData()
  
  const [selectedGroup, setSelectedGroup] = useState<PodGroup>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoundType, setSelectedRoundType] = useState<RoundType | 'all'>('all')
  const [selectedPodIds, setSelectedPodIds] = useState<Set<string>>(new Set())
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
  
  // Get enabled round type options
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])

  // Group pods
  const groupedPods = useMemo(() => {
    const groups: Record<PodGroup, Pod[]> = {
      'all': [],
      'ammo-plt': [],
      'poc': [],
      'rsv': [],
      'launcher': [],
      'unassigned': [],
    }

    pods.forEach((pod) => {
      groups.all.push(pod)
      // Only group as ammo-plt if it matches the expected constant
      if (pod.ammoPltId === AMMO_PLT_ID) {
        groups['ammo-plt'].push(pod)
      } else if (pod.launcherId) {
        groups.launcher.push(pod)
      } else if (pod.rsvId) {
        groups.rsv.push(pod)
      } else if (pod.pocId) {
        groups.poc.push(pod)
      } else {
        groups.unassigned.push(pod)
      }
    })

    return groups
  }, [pods])

  // Filter pods based on selected group, search, and round type
  const filteredPods = useMemo(() => {
    let filtered = groupedPods[selectedGroup]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (pod) =>
          pod.name.toLowerCase().includes(query) ||
          pod.uuid.toLowerCase().includes(query)
      )
    }

    // Filter by round type
    if (selectedRoundType !== 'all') {
      filtered = filtered.filter((pod) => pod.rounds[0]?.type === selectedRoundType)
    }

    return filtered
  }, [groupedPods, selectedGroup, searchQuery, selectedRoundType])

  // Get assignment info for a pod
  const getPodAssignment = useCallback((pod: Pod) => {
    // Only treat as ammo platoon if it matches the expected constant
    if (pod.ammoPltId === AMMO_PLT_ID) {
      return { type: 'ammo-plt', displayType: 'Ammo PLT', name: 'Ammo PLT', id: pod.ammoPltId }
    }
    // If ammoPltId exists but doesn't match, it's corrupted data - check other assignments
    if (pod.launcherId) {
      const launcher = launchers.find((l) => l.id === pod.launcherId)
      return { type: 'launcher', displayType: 'Launcher', name: launcher?.name || 'Unknown', id: pod.launcherId }
    }
    if (pod.rsvId) {
      const rsv = rsvs.find((r) => r.id === pod.rsvId)
      return { type: 'rsv', displayType: 'RSV', name: rsv?.name || 'Unknown', id: pod.rsvId }
    }
    if (pod.pocId) {
      const poc = pocs.find((p) => p.id === pod.pocId)
      return { type: 'poc', displayType: 'POC', name: poc?.name || 'Unknown', id: pod.pocId }
    }
    // If ammoPltId exists but is invalid, still show it but mark as corrupted
    if (pod.ammoPltId) {
      return { type: 'ammo-plt', displayType: 'Ammo PLT (Invalid)', name: 'Ammo PLT (Invalid)', id: pod.ammoPltId }
    }
    return { type: 'unassigned', displayType: 'Unassigned', name: 'Unassigned', id: '' }
  }, [launchers, rsvs, pocs])

  // Handle pod assignment change
  const handleAssignmentChange = useCallback((podId: string, assignmentType: string, assignmentId: string) => {
    // Clear all assignments first
    assignPodToPOC(podId, '')
    assignPodToRSV(podId, '')
    assignPodToAmmoPlt(podId, '')
    assignPodToLauncher(podId, '')

    // Apply new assignment
    switch (assignmentType) {
      case 'ammo-plt':
        assignPodToAmmoPlt(podId, AMMO_PLT_ID)
        break
      case 'poc':
        assignPodToPOC(podId, assignmentId)
        break
      case 'rsv':
        assignPodToRSV(podId, assignmentId)
        break
      case 'launcher':
        assignPodToLauncher(podId, assignmentId)
        break
      case 'unassigned':
        // Already cleared above
        break
    }
  }, [assignPodToPOC, assignPodToRSV, assignPodToAmmoPlt, assignPodToLauncher])

  // Get round type for a pod
  const getPodRoundType = (pod: Pod): RoundType | 'Unknown' => {
    return pod.rounds[0]?.type || 'Unknown'
  }

  // Get available rounds count
  const getAvailableRounds = (pod: Pod): number => {
    return pod.rounds.filter((r) => r.status === 'available').length
  }

  // Group counts
  const groupCounts = useMemo(() => ({
    all: groupedPods.all.length,
    'ammo-plt': groupedPods['ammo-plt'].length,
    poc: groupedPods.poc.length,
    rsv: groupedPods.rsv.length,
    launcher: groupedPods.launcher.length,
    unassigned: groupedPods.unassigned.length,
  }), [groupedPods])

  // Selection helpers
  const isAllSelected = useMemo(() => {
    return filteredPods.length > 0 && filteredPods.every((pod) => selectedPodIds.has(pod.id))
  }, [filteredPods, selectedPodIds])

  const isSomeSelected = useMemo(() => {
    return filteredPods.some((pod) => selectedPodIds.has(pod.id))
  }, [filteredPods, selectedPodIds])

  // Set indeterminate state on select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeSelected && !isAllSelected
    }
  }, [isSomeSelected, isAllSelected])

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // Deselect all filtered pods
      setSelectedPodIds((prev) => {
        const newSet = new Set(prev)
        filteredPods.forEach((pod) => newSet.delete(pod.id))
        return newSet
      })
    } else {
      // Select all filtered pods
      setSelectedPodIds((prev) => {
        const newSet = new Set(prev)
        filteredPods.forEach((pod) => newSet.add(pod.id))
        return newSet
      })
    }
  }, [isAllSelected, filteredPods])

  const handleSelectPod = useCallback((podId: string) => {
    setSelectedPodIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(podId)) {
        newSet.delete(podId)
      } else {
        newSet.add(podId)
      }
      return newSet
    })
  }, [])

  // Bulk reassignment
  const handleBulkReassign = useCallback((assignmentType: string, assignmentId: string) => {
    selectedPodIds.forEach((podId) => {
      handleAssignmentChange(podId, assignmentType, assignmentId)
    })
    setSelectedPodIds(new Set())
  }, [selectedPodIds, handleAssignmentChange])

  // Bulk delete
  const handleBulkDelete = useCallback(() => {
    const selectedPods = pods.filter((p) => selectedPodIds.has(p.id))
    const podNames = selectedPods.map((p) => p.name).join(', ')
    if (confirm(`Are you sure you want to delete ${selectedPodIds.size} pod(s)?\n\n${podNames}\n\nThis will also delete all rounds in these pods.`)) {
      selectedPodIds.forEach((podId) => {
        deletePod(podId)
      })
      setSelectedPodIds(new Set())
    }
  }, [selectedPodIds, pods, deletePod])

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Pods ({pods.length})
        </h2>
        {onAddPod && (
          <button
            onClick={onAddPod}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            <Plus size={16} />
            Add Pod
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div
          style={{
            position: 'relative',
            flex: '1',
            minWidth: '200px',
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

        {/* Round Type Filter */}
        <select
          value={selectedRoundType}
          onChange={(e) => setSelectedRoundType(e.target.value as RoundType | 'all')}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            minWidth: '150px',
          }}
        >
          <option value="all">All Round Types</option>
          {roundTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Group Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '0.5rem',
        }}
      >
        {(['all', 'ammo-plt', 'poc', 'rsv', 'launcher', 'unassigned'] as PodGroup[]).map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: selectedGroup === group ? 'var(--accent)' : 'transparent',
              color: selectedGroup === group ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: selectedGroup === group ? '600' : '400',
              textTransform: 'capitalize',
            }}
          >
            {group === 'ammo-plt' ? 'Ammo PLT' : group === 'all' ? 'All' : group}
            {' '}
            ({groupCounts[group]})
          </button>
        ))}
      </div>

      {/* Bulk Reassignment UI */}
      {selectedPodIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>
            {selectedPodIds.size} pod{selectedPodIds.size !== 1 ? 's' : ''} selected
          </span>
          <select
            onChange={(e) => {
              const [type, ...idParts] = e.target.value.split('|')
              const id = idParts.join('|')
              if (type && id) {
                handleBulkReassign(type, id)
              }
              e.target.value = ''
            }}
            style={{
              padding: '0.4rem 0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              minWidth: '150px',
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Bulk Reassign...
            </option>
            <option value={`ammo-plt|${AMMO_PLT_ID}`}>Assign to Ammo PLT</option>
            <option value="unassigned|">Unassign All</option>
            {pocs.map((poc) => (
              <option key={poc.id} value={`poc|${poc.id}`}>
                Assign to POC: {poc.name}
              </option>
            ))}
            {rsvs.map((rsv) => (
              <option key={rsv.id} value={`rsv|${rsv.id}`}>
                Assign to RSV: {rsv.name}
              </option>
            ))}
            {launchers.map((launcher) => (
              <option key={launcher.id} value={`launcher|${launcher.id}`}>
                Assign to Launcher: {launcher.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkDelete}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--danger)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedPodIds(new Set())}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Pods Table */}
      {filteredPods.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          No pods found
        </p>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderBottom: '2px solid var(--border)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    width: '40px',
                  }}
                >
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    style={{
                      cursor: 'pointer',
                      width: '18px',
                      height: '18px',
                    }}
                  />
                </th>
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Round Type
                </th>
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Rounds
                </th>
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Assignment
                </th>
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Reassign
                </th>
                <th
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPods.map((pod) => {
                const assignment = getPodAssignment(pod)
                const roundType = getPodRoundType(pod)
                const availableRounds = getAvailableRounds(pod)
                const totalRounds = pod.rounds.length

                const isSelected = selectedPodIds.has(pod.id)
                return (
                  <tr
                    key={pod.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    }}
                  >
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectPod(pod.id)}
                        style={{
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{pod.name}</div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace',
                            marginTop: '0.25rem',
                          }}
                        >
                          {pod.uuid.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {roundType}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--success)', fontWeight: '500' }}>
                          {availableRounds}
                        </span>
                        {' / '}
                        <span>{totalRounds}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                          }}
                        >
                          {assignment.displayType}: {assignment.name}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <select
                        value={assignment.id ? `${assignment.type}|${assignment.id}` : 'unassigned|'}
                        onChange={(e) => {
                          const [type, ...idParts] = e.target.value.split('|')
                          const id = idParts.join('|')
                          handleAssignmentChange(pod.id, type, id || '')
                        }}
                        style={{
                          padding: '0.4rem 0.5rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          minWidth: '150px',
                        }}
                      >
                        <option value="unassigned|">Unassigned</option>
                        <option value={`ammo-plt|${AMMO_PLT_ID}`}>Ammo PLT</option>
                        {pocs.map((poc) => (
                          <option key={poc.id} value={`poc|${poc.id}`}>
                            POC: {poc.name}
                          </option>
                        ))}
                        {rsvs.map((rsv) => (
                          <option key={rsv.id} value={`rsv|${rsv.id}`}>
                            RSV: {rsv.name}
                          </option>
                        ))}
                        {launchers.map((launcher) => (
                          <option key={launcher.id} value={`launcher|${launcher.id}`}>
                            Launcher: {launcher.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete pod "${pod.name}"? This will also delete all rounds in this pod.`)) {
                            deletePod(pod.id)
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.5rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.85rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                          e.currentTarget.style.borderColor = 'var(--danger)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})

