import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { useAppData } from '../context/AppDataContext'
import { RSV } from '../types'
import { ChevronDown, ChevronRight, Search, Truck, Trash2 } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'

type RSVView = 'organized' | 'unassigned'

interface RSVsManagementProps {
  onAddRSV?: () => void
}

export default memo(function RSVsManagement({ onAddRSV }: RSVsManagementProps) {
  const isMobile = useIsMobile()
  const {
    rsvs,
    pocs,
    bocs,
    pods,
    ammoPlatoons,
    assignRSVToPOC,
    assignRSVToBOC,
    assignRSVToAmmoPlt,
    deleteRSV,
  } = useAppData()
  
  const [selectedView, setSelectedView] = useState<RSVView>('organized')
  // --- Local state and callbacks ---
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRSVIds, setSelectedRSVIds] = useState<Set<string>>(new Set())
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
  const [openBatteries, setOpenBatteries] = useState<Record<string, boolean>>({})
  const [openPocs, setOpenPocs] = useState<Record<string, boolean>>({})
  const [openAmmoAssigned, setOpenAmmoAssigned] = useState(false)
  const [openOrganizedUnassigned, setOpenOrganizedUnassigned] = useState(false)

  const pocsById = useMemo(() => new Map(pocs.map((poc) => [poc.id, poc])), [pocs])
  const bocsById = useMemo(() => new Map(bocs.map((boc) => [boc.id, boc])), [bocs])
  const ammoById = useMemo(() => new Map(ammoPlatoons.map((ap) => [ap.id, ap])), [ammoPlatoons])

  const searchFiltered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return rsvs
    return rsvs.filter((rsv) => {
      const pocName = rsv.pocId ? pocsById.get(rsv.pocId)?.name ?? '' : ''
      const bocName = rsv.bocId
        ? bocsById.get(rsv.bocId)?.name ?? ''
        : rsv.pocId
          ? bocsById.get(pocsById.get(rsv.pocId)?.bocId ?? '')?.name ?? ''
          : ''
      const ammoName = rsv.ammoPltId ? ammoById.get(rsv.ammoPltId)?.name ?? '' : ''
      return (
        rsv.name.toLowerCase().includes(query) ||
        pocName.toLowerCase().includes(query) ||
        bocName.toLowerCase().includes(query) ||
        ammoName.toLowerCase().includes(query)
      )
    })
  }, [rsvs, searchQuery, pocsById, bocsById, ammoById])

  const visibleRSVs = useMemo(() => {
    if (selectedView === 'unassigned') return searchFiltered.filter((rsv) => !rsv.pocId && !rsv.bocId && !rsv.ammoPltId)
    return searchFiltered
  }, [selectedView, searchFiltered])

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
    if (rsv.ammoPltId) {
      const ap = ammoPlatoons.find((a) => a.id === rsv.ammoPltId)
      return {
        type: 'ammo-plt',
        displayType: 'Ammo PLT',
        name: ap?.name ?? `Unknown (${rsv.ammoPltId})`,
        id: rsv.ammoPltId,
      }
    }
    return { type: 'unassigned', displayType: 'Unassigned', name: 'Unassigned', id: '' }
  }, [pocs, bocs, ammoPlatoons])

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
        assignRSVToAmmoPlt(rsvId, assignmentId)
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

  const ammoSorted = useMemo(
    () => [...ammoPlatoons].sort((a, b) => a.name.localeCompare(b.name)),
    [ammoPlatoons]
  )
  const pocsSorted = useMemo(() => [...pocs].sort((a, b) => a.name.localeCompare(b.name)), [pocs])
  const bocsSorted = useMemo(() => [...bocs].sort((a, b) => a.name.localeCompare(b.name)), [bocs])

  const rsvReassignOptions = useMemo(
    () => (
      <>
        <option value="unassigned|">Unassigned</option>
        <optgroup label="Ammo PLT">
          {ammoSorted.map((ap) => (
            <option key={ap.id} value={`ammo-plt|${ap.id}`}>
              {ap.name}
              {ap.bocId ? ` (${bocsSorted.find((b) => b.id === ap.bocId)?.name ?? 'BOC'})` : ''}
            </option>
          ))}
        </optgroup>
        {pocsSorted.map((poc) => (
          <option key={poc.id} value={`poc|${poc.id}`}>
            POC: {poc.name}
          </option>
        ))}
        {bocsSorted.map((boc) => (
          <option key={boc.id} value={`boc|${boc.id}`}>
            BOC: {boc.name}
          </option>
        ))}
      </>
    ),
    [ammoSorted, pocsSorted, bocsSorted]
  )

  const viewCounts = useMemo(
    () => ({
      organized: rsvs.length,
      unassigned: rsvs.filter((rsv) => !rsv.pocId && !rsv.bocId && !rsv.ammoPltId).length,
    }),
    [rsvs]
  )

  const organizedGroups = useMemo(() => {
    const batteryMap = new Map<
      string,
      {
        id: string
        name: string
        pocMap: Map<string, { id: string; name: string; rsvs: RSV[] }>
        bocAssigned: RSV[]
      }
    >()
    const ammoAssigned: RSV[] = []
    const unassigned: RSV[] = []

    for (const rsv of visibleRSVs) {
      if (rsv.ammoPltId) {
        ammoAssigned.push(rsv)
        continue
      }

      if (rsv.bocId && !rsv.pocId) {
        const battery = bocsById.get(rsv.bocId)
        const batteryId = battery?.id ?? 'unlinked-battery'
        const batteryName = battery?.name ?? 'Unlinked battery'
        if (!batteryMap.has(batteryId)) {
          batteryMap.set(batteryId, { id: batteryId, name: batteryName, pocMap: new Map(), bocAssigned: [] })
        }
        batteryMap.get(batteryId)!.bocAssigned.push(rsv)
        continue
      }

      if (rsv.pocId) {
        const poc = pocsById.get(rsv.pocId)
        const batteryId = poc?.bocId ?? 'unlinked-battery'
        const batteryName = poc?.bocId ? bocsById.get(poc.bocId)?.name ?? 'Unlinked battery' : 'Unlinked battery'
        const pocId = poc?.id ?? 'unlinked-poc'
        const pocName = poc?.name ?? 'Unlinked POC'
        if (!batteryMap.has(batteryId)) {
          batteryMap.set(batteryId, { id: batteryId, name: batteryName, pocMap: new Map(), bocAssigned: [] })
        }
        const batteryGroup = batteryMap.get(batteryId)!
        if (!batteryGroup.pocMap.has(pocId)) {
          batteryGroup.pocMap.set(pocId, { id: pocId, name: pocName, rsvs: [] })
        }
        batteryGroup.pocMap.get(pocId)!.rsvs.push(rsv)
        continue
      }

      unassigned.push(rsv)
    }

    const batteries = [...batteryMap.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((battery) => ({
        ...battery,
        pocs: [...battery.pocMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      }))
    return { batteries, ammoAssigned, unassigned }
  }, [visibleRSVs, pocsById, bocsById])

  // --- Side effects ---
  useEffect(() => {
    if (selectedView !== 'organized') return
    setOpenBatteries((prev) => {
      const next: Record<string, boolean> = {}
      organizedGroups.batteries.forEach((battery) => {
        next[battery.id] = prev[battery.id] ?? false
      })
      return next
    })
    setOpenPocs((prev) => {
      const next: Record<string, boolean> = {}
      organizedGroups.batteries.forEach((battery) => {
        battery.pocs.forEach((poc) => {
          next[poc.id] = prev[poc.id] ?? false
        })
      })
      return next
    })
  }, [organizedGroups, selectedView])

  // Selection helpers
  const isAllSelected = useMemo(() => {
    return visibleRSVs.length > 0 && visibleRSVs.every((rsv) => selectedRSVIds.has(rsv.id))
  }, [visibleRSVs, selectedRSVIds])

  const isSomeSelected = useMemo(() => {
    return visibleRSVs.some((rsv) => selectedRSVIds.has(rsv.id))
  }, [visibleRSVs, selectedRSVIds])

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
        visibleRSVs.forEach((rsv) => newSet.delete(rsv.id))
        return newSet
      })
    } else {
      // Select all filtered RSVs
      setSelectedRSVIds((prev) => {
        const newSet = new Set(prev)
        visibleRSVs.forEach((rsv) => newSet.add(rsv.id))
        return newSet
      })
    }
  }, [isAllSelected, visibleRSVs])

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

  // --- Render ---
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: isMobile ? '6px' : '8px',
        padding: isMobile ? '0.75rem' : '1.5rem',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: isMobile ? '0.75rem' : '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <h2 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            RSVs ({rsvs.length})
          </h2>
          <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.5rem', flexWrap: 'wrap' }}>
            {([
              ['organized', 'By battery / POC'],
              ['unassigned', 'Unassigned'],
            ] as const).map(([viewId, label]) => (
              <button
                key={viewId}
                onClick={() => setSelectedView(viewId)}
                style={{
                  padding: isMobile ? '0.35rem 0.65rem' : '0.4rem 0.8rem',
                  backgroundColor: selectedView === viewId ? 'var(--accent)' : 'transparent',
                  color: selectedView === viewId ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.78rem' : '0.82rem',
                  fontWeight: selectedView === viewId ? '600' : '400',
                  whiteSpace: 'nowrap',
                }}
              >
                {label} ({viewCounts[viewId]})
              </button>
            ))}
          </div>
        </div>
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
      <p
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: isMobile ? '0.75rem' : '1rem',
          lineHeight: 1.4,
        }}
      >
        New RSVs can also be created from the Inventory page (RSVs card). This panel focuses on assignments and filters.
      </p>

      {/* Search */}
      <div
        style={{
          position: 'relative',
          marginBottom: isMobile ? '0.75rem' : '1.5rem',
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

      {visibleRSVs.length > 0 && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <input
            type="checkbox"
            ref={selectAllCheckboxRef}
            checked={isAllSelected}
            onChange={handleSelectAll}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Select all ({selectedRSVIds.size} selected)
          </span>
        </div>
      )}

      {/* RSVs list */}
      {visibleRSVs.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          No RSVs found
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {selectedView === 'organized' &&
            organizedGroups.batteries.map((battery) => {
              const batteryOpen = !!openBatteries[battery.id]
              const batteryCount =
                battery.bocAssigned.length + battery.pocs.reduce((sum, p) => sum + p.rsvs.length, 0)
              return (
                <div key={battery.id} style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setOpenBatteries((prev) => ({ ...prev, [battery.id]: !batteryOpen }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderBottom: batteryOpen ? '1px solid var(--border)' : 'none',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {batteryOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {battery.name}
                    </span>
                    <span>{batteryCount}</span>
                  </button>
                  {batteryOpen && <div style={{ padding: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {battery.bocAssigned.length > 0 && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ padding: '0.35rem 0.55rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Battery-assigned ({battery.bocAssigned.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.35rem' }}>
                          {battery.bocAssigned.map((rsv) => {
                            const assignment = getRSVAssignment(rsv)
                            const rsvPods = getRSVPods(rsv.id)
                            const isSelected = selectedRSVIds.has(rsv.id)
                            return (
                              <div key={rsv.id} style={{ padding: '0.65rem', backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                                <input type="checkbox" checked={isSelected} onChange={() => handleSelectRSV(rsv.id)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '5.5rem' }}>{rsv.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{rsvPods.length}</span> pod{rsvPods.length !== 1 ? 's' : ''}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assignment.displayType}: {assignment.name}</span>
                                <select value={assignment.id ? `${assignment.type}|${assignment.id}` : 'unassigned|'} onChange={(e) => { const [type, ...idParts] = e.target.value.split('|'); handleAssignmentChange(rsv.id, type, idParts.join('|') || '') }} style={{ marginLeft: 'auto', padding: '0.35rem 0.45rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: isMobile ? '11rem' : '13rem' }}>
                                  {rsvReassignOptions}
                                </select>
                                <button type="button" onClick={() => { if (confirm(`Are you sure you want to delete RSV "${rsv.name}"? Pods assigned to this RSV will be unassigned.`)) deleteRSV(rsv.id) }} style={{ padding: '0.3rem 0.45rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {battery.pocs.map((poc) => (
                      <div key={poc.id} style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          type="button"
                          onClick={() => setOpenPocs((prev) => ({ ...prev, [poc.id]: !prev[poc.id] }))}
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.55rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderBottom: openPocs[poc.id] ? '1px solid var(--border)' : 'none',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {openPocs[poc.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {poc.name}
                          </span>
                          <span>{poc.rsvs.length}</span>
                        </button>
                        {openPocs[poc.id] && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.35rem' }}>
                          {poc.rsvs.map((rsv, idx) => {
                            const assignment = getRSVAssignment(rsv)
                            const rsvPods = getRSVPods(rsv.id)
                            const isSelected = selectedRSVIds.has(rsv.id)
                            return (
                              <div key={rsv.id} style={{ padding: '0.65rem', backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                                <input type="checkbox" checked={isSelected} onChange={() => handleSelectRSV(rsv.id)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '5.5rem' }}>{rsv.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{rsvPods.length}</span> pod{rsvPods.length !== 1 ? 's' : ''}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assignment.displayType}: {assignment.name}</span>
                                <select data-guide={idx === 0 ? 'rsv-inline-reassign' : undefined} value={assignment.id ? `${assignment.type}|${assignment.id}` : 'unassigned|'} onChange={(e) => { const [type, ...idParts] = e.target.value.split('|'); handleAssignmentChange(rsv.id, type, idParts.join('|') || '') }} style={{ marginLeft: 'auto', padding: '0.35rem 0.45rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: isMobile ? '11rem' : '13rem' }}>
                                  {rsvReassignOptions}
                                </select>
                                <button type="button" onClick={() => { if (confirm(`Are you sure you want to delete RSV "${rsv.name}"? Pods assigned to this RSV will be unassigned.`)) deleteRSV(rsv.id) }} style={{ padding: '0.3rem 0.45rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>}
                      </div>
                    ))}
                  </div>}
                </div>
              )
            })}

          {selectedView === 'organized' && organizedGroups.ammoAssigned.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setOpenAmmoAssigned((prev) => !prev)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.7rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderBottom: openAmmoAssigned ? '1px solid var(--border)' : 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  {openAmmoAssigned ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Ammo platoon assignments
                </span>
                <span>{organizedGroups.ammoAssigned.length}</span>
              </button>
              {openAmmoAssigned && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.45rem' }}>
                {organizedGroups.ammoAssigned.map((rsv) => {
                  const assignment = getRSVAssignment(rsv)
                  const rsvPods = getRSVPods(rsv.id)
                  const isSelected = selectedRSVIds.has(rsv.id)
                  return (
                    <div key={rsv.id} style={{ padding: '0.65rem', backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleSelectRSV(rsv.id)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '5.5rem' }}>{rsv.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{rsvPods.length}</span> pod{rsvPods.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assignment.displayType}: {assignment.name}</span>
                      <select value={assignment.id ? `${assignment.type}|${assignment.id}` : 'unassigned|'} onChange={(e) => { const [type, ...idParts] = e.target.value.split('|'); handleAssignmentChange(rsv.id, type, idParts.join('|') || '') }} style={{ marginLeft: 'auto', padding: '0.35rem 0.45rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: isMobile ? '11rem' : '13rem' }}>
                        {rsvReassignOptions}
                      </select>
                      <button type="button" onClick={() => { if (confirm(`Are you sure you want to delete RSV "${rsv.name}"? Pods assigned to this RSV will be unassigned.`)) deleteRSV(rsv.id) }} style={{ padding: '0.3rem 0.45rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>}
            </div>
          )}

          {selectedView === 'organized' && organizedGroups.unassigned.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setOpenOrganizedUnassigned((prev) => !prev)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.7rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderBottom: openOrganizedUnassigned ? '1px solid var(--border)' : 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  {openOrganizedUnassigned ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Unassigned
                </span>
                <span>{organizedGroups.unassigned.length}</span>
              </button>
              {openOrganizedUnassigned && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.45rem' }}>
                {organizedGroups.unassigned.map((rsv) => {
                  const assignment = getRSVAssignment(rsv)
                  const rsvPods = getRSVPods(rsv.id)
                  const isSelected = selectedRSVIds.has(rsv.id)
                  return (
                    <div key={rsv.id} style={{ padding: '0.65rem', backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleSelectRSV(rsv.id)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '5.5rem' }}>{rsv.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{rsvPods.length}</span> pod{rsvPods.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assignment.displayType}: {assignment.name}</span>
                      <select value={assignment.id ? `${assignment.type}|${assignment.id}` : 'unassigned|'} onChange={(e) => { const [type, ...idParts] = e.target.value.split('|'); handleAssignmentChange(rsv.id, type, idParts.join('|') || '') }} style={{ marginLeft: 'auto', padding: '0.35rem 0.45rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: isMobile ? '11rem' : '13rem' }}>
                        {rsvReassignOptions}
                      </select>
                      <button type="button" onClick={() => { if (confirm(`Are you sure you want to delete RSV "${rsv.name}"? Pods assigned to this RSV will be unassigned.`)) deleteRSV(rsv.id) }} style={{ padding: '0.3rem 0.45rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>}
            </div>
          )}

          {selectedView === 'unassigned' &&
            visibleRSVs.map((rsv, idx) => {
              const assignment = getRSVAssignment(rsv)
              const rsvPods = getRSVPods(rsv.id)
              const isSelected = selectedRSVIds.has(rsv.id)
              return (
                <div key={rsv.id} style={{ padding: '0.65rem', backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
                  <input type="checkbox" checked={isSelected} onChange={() => handleSelectRSV(rsv.id)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '5.5rem' }}>{rsv.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{rsvPods.length}</span> pod{rsvPods.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{assignment.displayType}: {assignment.name}</span>
                  <select data-guide={idx === 0 ? 'rsv-inline-reassign' : undefined} value={assignment.id ? `${assignment.type}|${assignment.id}` : 'unassigned|'} onChange={(e) => { const [type, ...idParts] = e.target.value.split('|'); handleAssignmentChange(rsv.id, type, idParts.join('|') || '') }} style={{ marginLeft: 'auto', padding: '0.35rem 0.45rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.82rem', minWidth: isMobile ? '11rem' : '13rem' }}>
                    {rsvReassignOptions}
                  </select>
                  <button type="button" onClick={() => { if (confirm(`Are you sure you want to delete RSV "${rsv.name}"? Pods assigned to this RSV will be unassigned.`)) deleteRSV(rsv.id) }} style={{ padding: '0.3rem 0.45rem', backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
})

