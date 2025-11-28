import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { useAppData } from '../context/AppDataContext'
import { RSV } from '../types'
import { Search, Truck, Trash2 } from 'lucide-react'

type RSVGroup = 'all' | 'poc' | 'boc' | 'ammo-plt' | 'unassigned'

interface RSVsManagementProps {
  onAddRSV?: () => void
}

const AMMO_PLT_ID = 'ammo-plt-1'

export default memo(function RSVsManagement({ onAddRSV }: RSVsManagementProps) {
  const { rsvs, pocs, bocs, pods, assignRSVToPOC, assignRSVToBOC, assignRSVToAmmoPlt, deleteRSV } = useAppData()
  
  const [selectedGroup, setSelectedGroup] = useState<RSVGroup>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRSVIds, setSelectedRSVIds] = useState<Set<string>>(new Set())
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  // Group RSVs
  const groupedRSVs = useMemo(() => {
    const groups: Record<RSVGroup, RSV[]> = {
      'all': [],
      'poc': [],
      'boc': [],
      'ammo-plt': [],
      'unassigned': [],
    }

    rsvs.forEach((rsv) => {
      groups.all.push(rsv)
      if (rsv.pocId) {
        groups.poc.push(rsv)
      } else if (rsv.bocId) {
        groups.boc.push(rsv)
      } else if (rsv.ammoPltId === AMMO_PLT_ID) {
        // Only group as ammo-plt if it matches the expected constant
        groups['ammo-plt'].push(rsv)
      } else {
        groups.unassigned.push(rsv)
      }
    })

    return groups
  }, [rsvs])

  // Filter RSVs based on selected group and search
  const filteredRSVs = useMemo(() => {
    let filtered = groupedRSVs[selectedGroup]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((rsv) => rsv.name.toLowerCase().includes(query))
    }

    return filtered
  }, [groupedRSVs, selectedGroup, searchQuery])

  // Get assignment info for an RSV
  const getRSVAssignment = useCallback((rsv: RSV) => {
    if (rsv.pocId) {
      const poc = pocs.find((p) => p.id === rsv.pocId)
      return { type: 'poc', displayType: 'POC', name: poc?.name || 'Unknown', id: rsv.pocId }
    }
    if (rsv.bocId) {
      const boc = bocs.find((b) => b.id === rsv.bocId)
      return { type: 'boc', displayType: 'BOC', name: boc?.name || 'Unknown', id: rsv.bocId }
    }
    // Only treat as ammo platoon if it matches the expected constant
    if (rsv.ammoPltId === AMMO_PLT_ID) {
      return { type: 'ammo-plt', displayType: 'Ammo PLT', name: 'Ammo PLT', id: rsv.ammoPltId }
    }
    // If ammoPltId exists but is invalid, still show it but mark as corrupted
    if (rsv.ammoPltId) {
      return { type: 'ammo-plt', displayType: 'Ammo PLT (Invalid)', name: 'Ammo PLT (Invalid)', id: rsv.ammoPltId }
    }
    return { type: 'unassigned', displayType: 'Unassigned', name: 'Unassigned', id: '' }
  }, [pocs, bocs])

  // Get pods assigned to an RSV
  const getRSVPods = useCallback((rsvId: string) => {
    return pods.filter((p) => p.rsvId === rsvId)
  }, [pods])

  // Handle RSV assignment change
  const handleAssignmentChange = useCallback((rsvId: string, assignmentType: string, assignmentId: string) => {
    // Clear all assignments first
    assignRSVToPOC(rsvId, '')
    assignRSVToBOC(rsvId, '')
    assignRSVToAmmoPlt(rsvId, '')

    // Apply new assignment
    switch (assignmentType) {
      case 'ammo-plt':
        assignRSVToAmmoPlt(rsvId, AMMO_PLT_ID)
        break
      case 'poc':
        assignRSVToPOC(rsvId, assignmentId)
        break
      case 'boc':
        assignRSVToBOC(rsvId, assignmentId)
        break
      case 'unassigned':
        // Already cleared above
        break
    }
  }, [assignRSVToPOC, assignRSVToBOC, assignRSVToAmmoPlt])

  // Group counts
  const groupCounts = useMemo(() => ({
    all: groupedRSVs.all.length,
    poc: groupedRSVs.poc.length,
    boc: groupedRSVs.boc.length,
    'ammo-plt': groupedRSVs['ammo-plt'].length,
    unassigned: groupedRSVs.unassigned.length,
  }), [groupedRSVs])

  // Selection helpers
  const isAllSelected = useMemo(() => {
    return filteredRSVs.length > 0 && filteredRSVs.every((rsv) => selectedRSVIds.has(rsv.id))
  }, [filteredRSVs, selectedRSVIds])

  const isSomeSelected = useMemo(() => {
    return filteredRSVs.some((rsv) => selectedRSVIds.has(rsv.id))
  }, [filteredRSVs, selectedRSVIds])

  // Set indeterminate state on select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeSelected && !isAllSelected
    }
  }, [isSomeSelected, isAllSelected])

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // Deselect all filtered RSVs
      setSelectedRSVIds((prev) => {
        const newSet = new Set(prev)
        filteredRSVs.forEach((rsv) => newSet.delete(rsv.id))
        return newSet
      })
    } else {
      // Select all filtered RSVs
      setSelectedRSVIds((prev) => {
        const newSet = new Set(prev)
        filteredRSVs.forEach((rsv) => newSet.add(rsv.id))
        return newSet
      })
    }
  }, [isAllSelected, filteredRSVs])

  const handleSelectRSV = useCallback((rsvId: string) => {
    setSelectedRSVIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rsvId)) {
        newSet.delete(rsvId)
      } else {
        newSet.add(rsvId)
      }
      return newSet
    })
  }, [])

  // Bulk delete
  const handleBulkDelete = useCallback(() => {
    const selectedRSVs = rsvs.filter((r) => selectedRSVIds.has(r.id))
    const rsvNames = selectedRSVs.map((r) => r.name).join(', ')
    if (confirm(`Are you sure you want to delete ${selectedRSVIds.size} RSV(s)?\n\n${rsvNames}\n\nPods assigned to these RSVs will be unassigned.`)) {
      selectedRSVIds.forEach((rsvId) => {
        deleteRSV(rsvId)
      })
      setSelectedRSVIds(new Set())
    }
  }, [selectedRSVIds, rsvs, deleteRSV])

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
          RSVs ({rsvs.length})
        </h2>
        {onAddRSV && (
          <button
            onClick={onAddRSV}
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
            <Truck size={16} />
            Add RSV
          </button>
        )}
      </div>

      {/* Search */}
      <div
        style={{
          position: 'relative',
          marginBottom: '1.5rem',
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
          placeholder="Search RSVs..."
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
        {(['all', 'poc', 'boc', 'ammo-plt', 'unassigned'] as RSVGroup[]).map((group) => (
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
            {group === 'ammo-plt' ? 'Ammo PLT' : group === 'all' ? 'All' : group.toUpperCase()}
            {' '}
            ({groupCounts[group]})
          </button>
        ))}
      </div>

      {/* Bulk Delete UI */}
      {selectedRSVIds.size > 0 && (
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
            {selectedRSVIds.size} RSV{selectedRSVIds.size !== 1 ? 's' : ''} selected
          </span>
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
            onClick={() => setSelectedRSVIds(new Set())}
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

      {/* RSVs Table */}
      {filteredRSVs.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          No RSVs found
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
                  Pods
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
              {filteredRSVs.map((rsv) => {
                const assignment = getRSVAssignment(rsv)
                const rsvPods = getRSVPods(rsv.id)
                const isSelected = selectedRSVIds.has(rsv.id)

                return (
                  <tr
                    key={rsv.id}
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
                        onChange={() => handleSelectRSV(rsv.id)}
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
                      <div style={{ fontWeight: '500' }}>{rsv.name}</div>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '500', color: 'var(--accent)' }}>
                          {rsvPods.length}
                        </span>
                        {' '}pod{rsvPods.length !== 1 ? 's' : ''}
                        {rsvPods.length > 0 && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              marginTop: '0.25rem',
                            }}
                          >
                            {rsvPods.slice(0, 3).map((p) => p.name).join(', ')}
                            {rsvPods.length > 3 && ` +${rsvPods.length - 3} more`}
                          </div>
                        )}
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
                          handleAssignmentChange(rsv.id, type, id || '')
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
                        {bocs.map((boc) => (
                          <option key={boc.id} value={`boc|${boc.id}`}>
                            BOC: {boc.name}
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
                          if (confirm(`Are you sure you want to delete RSV "${rsv.name}"? Pods assigned to this RSV will be unassigned.`)) {
                            deleteRSV(rsv.id)
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

