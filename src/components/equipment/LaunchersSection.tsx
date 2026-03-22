import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

type LauncherView = 'organized' | 'unassigned'

export default function LaunchersSection({
  isMobile = false,
  hideCreateButton = false,
  embedded = false,
}: {
  isMobile?: boolean
  /** Use global Create unit flow instead */
  hideCreateButton?: boolean
  /** Inside another panel — less outer margin */
  embedded?: boolean
}) {
  const { pocs, bocs, launchers, addLauncher, deleteLauncher, assignLauncherToPOC } = useAppData()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [formPocId, setFormPocId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedView, setSelectedView] = useState<LauncherView>('organized')
  const [searchQuery, setSearchQuery] = useState('')
  const [openBatteries, setOpenBatteries] = useState<Record<string, boolean>>({})
  const [openPocs, setOpenPocs] = useState<Record<string, boolean>>({})
  const [openUnassigned, setOpenUnassigned] = useState(false)

  const pocsSorted = useMemo(
    () => [...pocs].sort((a, b) => a.name.localeCompare(b.name)),
    [pocs]
  )

  const launchersSorted = useMemo(
    () => [...launchers].sort((a, b) => a.name.localeCompare(b.name)),
    [launchers]
  )

  const pocsById = useMemo(() => new Map(pocs.map((poc) => [poc.id, poc])), [pocs])
  const bocsById = useMemo(() => new Map(bocs.map((boc) => [boc.id, boc])), [bocs])

  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return launchersSorted
    return launchersSorted.filter((l) => {
      const poc = l.pocId ? pocsById.get(l.pocId)?.name ?? '' : ''
      const boc = l.pocId ? bocsById.get(pocsById.get(l.pocId)?.bocId ?? '')?.name ?? '' : ''
      return (
        l.name.toLowerCase().includes(q) ||
        poc.toLowerCase().includes(q) ||
        boc.toLowerCase().includes(q)
      )
    })
  }, [launchersSorted, searchQuery, pocsById, bocsById])

  const visibleLaunchers = useMemo(() => {
    if (selectedView === 'unassigned') return searchFiltered.filter((l) => !l.pocId)
    return searchFiltered
  }, [selectedView, searchFiltered])

  const viewCounts = useMemo(
    () => ({
      organized: launchersSorted.length,
      unassigned: launchersSorted.filter((l) => !l.pocId).length,
    }),
    [launchersSorted]
  )

  const organizedGroups = useMemo(() => {
    const batteryMap = new Map<string, { id: string; name: string; pocMap: Map<string, { id: string; name: string; launchers: typeof launchers }> }>()
    const unassigned: typeof launchers = []

    for (const launcher of visibleLaunchers) {
      if (!launcher.pocId) {
        unassigned.push(launcher)
        continue
      }
      const poc = pocsById.get(launcher.pocId)
      const batteryId = poc?.bocId ?? 'unlinked-battery'
      const batteryName = poc?.bocId ? bocsById.get(poc.bocId)?.name ?? 'Unlinked battery' : 'Unlinked battery'
      const pocId = poc?.id ?? 'unlinked-poc'
      const pocName = poc?.name ?? 'Unlinked POC'

      if (!batteryMap.has(batteryId)) {
        batteryMap.set(batteryId, { id: batteryId, name: batteryName, pocMap: new Map() })
      }
      const batteryGroup = batteryMap.get(batteryId)!
      if (!batteryGroup.pocMap.has(pocId)) {
        batteryGroup.pocMap.set(pocId, { id: pocId, name: pocName, launchers: [] })
      }
      batteryGroup.pocMap.get(pocId)!.launchers.push(launcher)
    }

    const batteries = [...batteryMap.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((battery) => ({
        id: battery.id,
        name: battery.name,
        pocs: [...battery.pocMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      }))

    return { batteries, unassigned }
  }, [visibleLaunchers, pocsById, bocsById, launchers])

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
    setOpenUnassigned((prev) => prev)
  }, [organizedGroups, selectedView])

  const isAllSelected = visibleLaunchers.length > 0 && visibleLaunchers.every((l) => selectedIds.has(l.id))
  const isSomeSelected = visibleLaunchers.some((l) => selectedIds.has(l.id))

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleLaunchers.forEach((l) => next.add(l.id))
        return next
      })
    }
  }, [isAllSelected, visibleLaunchers])

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addLauncher({
      id: Date.now().toString(),
      name: name.trim(),
      status: 'idle',
      ...(formPocId ? { pocId: formPocId } : {}),
    })
    setName('')
    setFormPocId('')
    setShowForm(false)
  }

  const pocName = (id: string | undefined) => (id ? pocsById.get(id)?.name ?? '—' : '—')

  return (
    <div
      data-guide="launchers-section"
      style={{
        backgroundColor: embedded ? 'transparent' : 'var(--bg-secondary)',
        border: embedded ? 'none' : '1px solid var(--border)',
        borderRadius: embedded ? 0 : '8px',
        padding: embedded ? 0 : isMobile ? '1rem' : '1.5rem',
        marginBottom: embedded ? 0 : '2rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Launchers ({launchers.length})
          </h2>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {([
              ['organized', 'By battery / POC'],
              ['unassigned', 'Unassigned'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedView(id)}
                style={{
                  padding: '0.35rem 0.6rem',
                  backgroundColor: selectedView === id ? 'var(--accent)' : 'transparent',
                  color: selectedView === id ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: selectedView === id ? 600 : 400,
                }}
              >
                {label} ({viewCounts[id]})
              </button>
            ))}
          </div>
        </div>
        {!hideCreateButton && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
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
            {showForm ? 'Cancel' : 'Add Launcher'}
          </button>
        )}
      </div>

      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginBottom: showForm ? '1rem' : '0.75rem',
          fontStyle: 'italic',
        }}
      >
        {hideCreateButton
          ? 'Assign launchers to a PLT FDC with the row dropdown. Add launchers via Create unit.'
          : 'Create a launcher and assign it to a PLT FDC (POC) on this screen. When your view is set to a POC role, new launchers can auto-assign to that POC if POC is left blank.'}
      </p>

      {!hideCreateButton && showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <input
            data-guide="launcher-form-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Launcher name"
            required
            autoFocus
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
          <select
            data-guide="launcher-form-poc"
            value={formPocId}
            onChange={(e) => setFormPocId(e.target.value)}
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          >
            <option value="">Assign to POC (optional)</option>
            {pocsSorted.map((poc) => (
              <option key={poc.id} value={poc.id}>
                {poc.name}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              data-guide="launcher-form-create-button"
              type="submit"
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setName('')
                setFormPocId('')
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '190px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.55rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search launcher or assigned POC..."
            style={{
              width: '100%',
              padding: '0.45rem 0.5rem 0.45rem 2rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {launchersSorted.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No launchers yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeSelected && !isAllSelected
              }}
              onChange={handleToggleSelectAll}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Select all ({selectedIds.size} selected)
            </span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  const names = launchers
                    .filter((l) => selectedIds.has(l.id))
                    .map((l) => l.name)
                    .join(', ')
                  if (
                    confirm(
                      `Delete ${selectedIds.size} launcher(s)?\n\n${names}`
                    )
                  ) {
                    selectedIds.forEach((id) => deleteLauncher(id))
                    setSelectedIds(new Set())
                  }
                }}
                style={{
                  marginLeft: 'auto',
                  padding: '0.35rem 0.5rem',
                  backgroundColor: 'var(--danger)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.85rem',
                }}
              >
                <Trash2 size={14} />
                Delete selected
              </button>
            )}
          </div>

          {selectedView === 'organized' &&
            organizedGroups.batteries.map((battery) => {
              const batteryOpen = !!openBatteries[battery.id]
              const batteryLauncherCount = battery.pocs.reduce((sum, p) => sum + p.launchers.length, 0)
              return (
                <div
                  key={battery.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenBatteries((prev) => ({ ...prev, [battery.id]: !batteryOpen }))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      borderBottom: batteryOpen ? '1px solid var(--border)' : 'none',
                      backgroundColor: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {batteryOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {battery.name}
                    </span>
                    <span>{batteryLauncherCount}</span>
                  </button>
                  {batteryOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.45rem' }}>
                    {battery.pocs.map((poc) => (
                      <div key={poc.id} style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          type="button"
                          onClick={() => setOpenPocs((prev) => ({ ...prev, [poc.id]: !prev[poc.id] }))}
                          style={{
                            width: '100%',
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-secondary)',
                            fontWeight: 600,
                            border: 'none',
                            borderBottom: openPocs[poc.id] ? '1px solid var(--border)' : 'none',
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
                          <span>{poc.launchers.length}</span>
                        </button>
                        {openPocs[poc.id] && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.35rem' }}>
                          {poc.launchers.map((launcher) => {
                            const isSelected = selectedIds.has(launcher.id)
                            return (
                              <div
                                key={launcher.id}
                                style={{
                                  padding: '0.75rem',
                                  backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelect(launcher.id)}
                                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '6rem' }}>
                                  {launcher.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {launcher.status}
                                </span>
                                <label
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    marginLeft: 'auto',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  POC
                                  <select
                                    value={launcher.pocId ?? ''}
                                    onChange={(e) => assignLauncherToPOC(launcher.id, e.target.value)}
                                    style={{
                                      padding: '0.35rem 0.5rem',
                                      backgroundColor: 'var(--bg-primary)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.85rem',
                                      maxWidth: isMobile ? '10rem' : '14rem',
                                    }}
                                  >
                                    <option value="">Unassigned</option>
                                    {pocsSorted.map((pocOption) => (
                                      <option key={pocOption.id} value={pocOption.id}>
                                        {pocOption.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {pocName(launcher.pocId)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete launcher "${launcher.name}"?`)) {
                                      deleteLauncher(launcher.id)
                                    }
                                  }}
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
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

          {selectedView === 'organized' &&
            organizedGroups.unassigned.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenUnassigned((prev) => !prev)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.7rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    backgroundColor: 'var(--bg-tertiary)',
                    border: 'none',
                    borderBottom: openUnassigned ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {openUnassigned ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    Unassigned
                  </span>
                  <span>{organizedGroups.unassigned.length}</span>
                </button>
                {openUnassigned && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.4rem' }}>
                  {organizedGroups.unassigned.map((launcher, idx) => {
                    const isSelected = selectedIds.has(launcher.id)
                    return (
                      <div
                        key={launcher.id}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelect(launcher.id)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '6rem' }}>{launcher.name}</span>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {launcher.status}
                        </span>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            marginLeft: 'auto',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          POC
                          <select
                            data-guide={idx === 0 ? 'launcher-inline-poc-assign' : undefined}
                            value={launcher.pocId ?? ''}
                            onChange={(e) => assignLauncherToPOC(launcher.id, e.target.value)}
                            style={{
                              padding: '0.35rem 0.5rem',
                              backgroundColor: 'var(--bg-primary)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              maxWidth: isMobile ? '10rem' : '14rem',
                            }}
                          >
                            <option value="">Unassigned</option>
                            {pocsSorted.map((pocOption) => (
                              <option key={pocOption.id} value={pocOption.id}>
                                {pocOption.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pocName(launcher.pocId)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete launcher "${launcher.name}"?`)) {
                              deleteLauncher(launcher.id)
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.5rem',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>}
              </div>
            )}

          {selectedView === 'unassigned' && visibleLaunchers.map((launcher, idx) => {
            const isSelected = selectedIds.has(launcher.id)
            return (
              <div
                key={launcher.id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelect(launcher.id)}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '6rem' }}>
                  {launcher.name}
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    textTransform: 'capitalize',
                  }}
                >
                  {launcher.status}
                </span>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginLeft: 'auto',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  POC
                  <select
                    data-guide={idx === 0 ? 'launcher-inline-poc-assign' : undefined}
                    value={launcher.pocId ?? ''}
                    onChange={(e) => assignLauncherToPOC(launcher.id, e.target.value)}
                    style={{
                      padding: '0.35rem 0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      maxWidth: isMobile ? '10rem' : '14rem',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {pocsSorted.map((poc) => (
                      <option key={poc.id} value={poc.id}>
                        {poc.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {pocName(launcher.pocId)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete launcher "${launcher.name}"?`)) {
                      deleteLauncher(launcher.id)
                    }
                  }}
                  style={{
                    padding: '0.35rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
          {visibleLaunchers.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.45rem 0.2rem' }}>
              No launchers match this filter.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
