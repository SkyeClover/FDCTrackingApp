import { useState, memo, useMemo, useCallback, useEffect } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus, X, Trash2 } from 'lucide-react'
import { getEnabledRoundTypeOptions, RoundType } from '../constants/roundTypes'
import PodsManagement from '../components/PodsManagement'
import PodsToRSVAssignment from '../components/PodsToRSVAssignment'
import { useIsMobile } from '../hooks/useIsMobile'

// Memoized form component to prevent re-renders
const ItemForm = memo(({
  title,
  onSubmit,
  onCancel,
  pocs,
  roundTypeOptions,
}: {
  title: string
  onSubmit: (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => void
  onCancel: () => void
  pocs?: Array<{ id: string; name: string }>
  roundTypeOptions: Array<{ value: string; label: string }>
}) => {
  const [name, setName] = useState('')
  const [roundType, setRoundType] = useState<RoundType>(roundTypeOptions[0]?.value || '')
  const [roundCount, setRoundCount] = useState(6)
  const [quantity, setQuantity] = useState(1)
  const [pocId, setPocId] = useState('')

  // Update roundType when roundTypeOptions change
  useEffect(() => {
    if (title === 'Pods' && roundTypeOptions.length > 0) {
      // If current roundType is not in enabled options, switch to first enabled option
      if (!roundTypeOptions.find(opt => opt.value === roundType)) {
        setRoundType(roundTypeOptions[0].value)
      }
    } else if (title === 'Pods' && roundTypeOptions.length === 0) {
      setRoundType('')
    }
  }, [roundTypeOptions, title, roundType])

  // Check if we can create pods (need at least one enabled round type)
  const canCreatePods = title !== 'Pods' || roundTypeOptions.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreatePods) return
    if (name.trim() && (title !== 'Pods' || roundType)) {
      onSubmit({ 
        name: name.trim(), 
        roundType, 
        roundCount,
        quantity: title === 'Pods' ? quantity : undefined,
        pocId: title === 'Pods' && pocId ? pocId : undefined,
      })
      setName('')
      setRoundType(roundTypeOptions[0]?.value || '')
      setRoundCount(6)
      setQuantity(1)
      setPocId('')
    }
  }

  return (
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
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
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
      {title === 'Pods' && (
        <>
          {roundTypeOptions.length === 0 ? (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--warning)',
                borderRadius: '4px',
                color: 'var(--warning)',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ No round types are enabled. Please enable at least one round type in Settings before creating pods.
            </div>
          ) : (
            <select
              value={roundType}
              onChange={(e) => setRoundType(e.target.value as RoundType)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              {roundTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            value={roundCount}
            onChange={(e) => setRoundCount(Math.max(0, Math.min(6, parseInt(e.target.value) || 0)))}
            onFocus={(e) => e.target.select()}
            placeholder="Rounds per Pod"
            min="0"
            max="6"
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            onFocus={(e) => e.target.select()}
            placeholder="Number of Pods"
            min="1"
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
          {pocs && pocs.length > 0 && (
            <select
              value={pocId}
              onChange={(e) => setPocId(e.target.value)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              <option value="">Assign to POC (Optional)</option>
              {pocs.map((poc) => (
                <option key={poc.id} value={poc.id}>
                  {poc.name}
                </option>
              ))}
            </select>
          )}
        </>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="submit"
          disabled={!canCreatePods}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            backgroundColor: canCreatePods ? 'var(--success)' : 'var(--bg-tertiary)',
            color: canCreatePods ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '4px',
            cursor: canCreatePods ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            opacity: canCreatePods ? 1 : 0.6,
          }}
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
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
  )
})

ItemForm.displayName = 'ItemForm'

// Memoized item list to prevent re-renders
const ItemList = memo(({
  items,
  title,
  onDelete,
  selectedIds,
  onSelect,
  onSelectAll,
  isAllSelected,
  isSomeSelected,
}: {
  items: Array<{ id: string; name: string; rounds?: any[] }>
  title: string
  onDelete?: (id: string) => void
  selectedIds?: Set<string>
  onSelect?: (id: string) => void
  onSelectAll?: () => void
  isAllSelected?: boolean
  isSomeSelected?: boolean
}) => {
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        No {title.toLowerCase()} yet
      </p>
    )
  }

  const hasSelection = selectedIds !== undefined && onSelect !== undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {hasSelection && onSelectAll && (
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
            checked={isAllSelected || false}
            ref={(input) => {
              if (input && isSomeSelected !== undefined) {
                input.indeterminate = isSomeSelected && !isAllSelected
              }
            }}
            onChange={onSelectAll}
            style={{
              cursor: 'pointer',
              width: '18px',
              height: '18px',
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Select All ({selectedIds?.size || 0} selected)
          </span>
          {selectedIds && selectedIds.size > 0 && onDelete && (
            <button
              onClick={() => {
                const selectedItems = items.filter((item) => selectedIds.has(item.id))
                const itemNames = selectedItems.map((item) => item.name).join(', ')
                if (confirm(`Are you sure you want to delete ${selectedIds.size} ${title.slice(0, -1).toLowerCase()}(s)?\n\n${itemNames}`)) {
                  selectedIds.forEach((id) => onDelete(id))
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
              Delete Selected
            </button>
          )}
        </div>
      )}
      {items.map((item) => {
        const isSelected = selectedIds?.has(item.id) || false
        return (
          <div
            key={item.id}
            style={{
              padding: '0.75rem',
              backgroundColor: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              {hasSelection && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelect?.(item.id)}
                  style={{
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px',
                  }}
                />
              )}
              <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
              {title === 'Pods' && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {item.rounds?.length || 0} rounds
                </span>
              )}
            </div>
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${title.slice(0, -1)} "${item.name}"?`)) {
                    onDelete(item.id)
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
            )}
          </div>
        )
      })}
    </div>
  )
})

ItemList.displayName = 'ItemList'

// Memoized item card
const ItemCard = memo(({
  title,
  items,
  onAdd,
  onDelete,
  showForm,
  onToggleForm,
  pocs,
  selectedIds,
  onSelect,
  onSelectAll,
  isAllSelected,
  isSomeSelected,
  roundTypeOptions,
}: {
  title: string
  items: Array<{ id: string; name: string; rounds?: any[] }>
  onAdd: (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => void
  onDelete?: (id: string) => void
  showForm: boolean
  onToggleForm: () => void
  pocs?: Array<{ id: string; name: string }>
  selectedIds?: Set<string>
  onSelect?: (id: string) => void
  onSelectAll?: () => void
  isAllSelected?: boolean
  isSomeSelected?: boolean
  roundTypeOptions: Array<{ value: string; label: string }>
}) => {
  const handleSubmit = useCallback(
    (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => {
      onAdd(data)
      onToggleForm()
    },
    [onAdd, onToggleForm]
  )

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {title} ({items.length})
        </h2>
        <button
          onClick={onToggleForm}
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
          {showForm ? 'Cancel' : `Add ${title.slice(0, -1)}`}
        </button>
      </div>

      {showForm && <ItemForm title={title} onSubmit={handleSubmit} onCancel={onToggleForm} pocs={pocs} roundTypeOptions={roundTypeOptions} />}

      <ItemList 
        items={items} 
        title={title} 
        onDelete={onDelete}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onSelectAll={onSelectAll}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
      />
    </div>
  )
})

ItemCard.displayName = 'ItemCard'

export default function Inventory() {
  const isMobile = useIsMobile()
  const { bocs, pocs, launchers, rsvs, addBOC, addPOC, addLauncher, addPod, addRSV, addRound, assignPodToPOC, deleteBOC, deletePOC, deleteLauncher, deleteRSV, roundTypes } = useAppData()
  
  // Get enabled round type options
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])

  const [showBOCForm, setShowBOCForm] = useState(false)
  const [showPOCForm, setShowPOCForm] = useState(false)
  const [showLauncherForm, setShowLauncherForm] = useState(false)
  const [showPodForm, setShowPodForm] = useState(false)
  const [showRSVForm, setShowRSVForm] = useState(false)
  
  // Selection state for mass operations
  const [selectedBOCIds, setSelectedBOCIds] = useState<Set<string>>(new Set())
  const [selectedPOCIds, setSelectedPOCIds] = useState<Set<string>>(new Set())
  const [selectedLauncherIds, setSelectedLauncherIds] = useState<Set<string>>(new Set())
  const [selectedRSVIds, setSelectedRSVIds] = useState<Set<string>>(new Set())

  // Memoize callbacks to prevent re-renders
  const handleAddBOC = useCallback(
    (data: { name: string }) => {
      addBOC({
        id: Date.now().toString(),
        name: data.name,
        pocs: [],
      })
    },
    [addBOC]
  )

  const handleAddPOC = useCallback(
    (data: { name: string }) => {
      addPOC({
        id: Date.now().toString(),
        name: data.name,
        launchers: [],
      })
    },
    [addPOC]
  )

  const handleAddLauncher = useCallback(
    (data: { name: string }) => {
      addLauncher({
        id: Date.now().toString(),
        name: data.name,
        status: 'idle',
      })
    },
    [addLauncher]
  )

  const handleAddPod = useCallback(
    (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => {
      const quantity = data.quantity || 1
      const roundCount = data.roundCount || 0
      const roundType = data.roundType || 'M28A1'
      const AMMO_PLT_ID = 'ammo-plt-1'
      
      for (let i = 0; i < quantity; i++) {
        const podName = quantity > 1 ? `${data.name} ${i + 1}` : data.name
        const timestamp = Date.now() + i
        const newRounds = Array.from({ length: roundCount }, (_, j) => ({
          id: `${timestamp}-${j}`,
          type: roundType,
          status: 'available' as const,
        }))
        newRounds.forEach((round) => addRound(round))
        const newPod: any = {
          id: timestamp.toString(),
          uuid: crypto.randomUUID(),
          name: podName,
          rounds: newRounds,
          ammoPltId: AMMO_PLT_ID, // Assign to ammo plt by default
        }
        addPod(newPod)
        // Assign to POC if specified (this will override ammo plt assignment)
        if (data.pocId) {
          assignPodToPOC(timestamp.toString(), data.pocId)
        }
      }
    },
    [addPod, addRound, assignPodToPOC]
  )

  const handleAddRSV = useCallback(
    (data: { name: string }) => {
      addRSV({
        id: Date.now().toString(),
        name: data.name,
      })
    },
    [addRSV]
  )

  // Memoize arrays to prevent unnecessary re-renders
  const bocsMemo = useMemo(() => bocs, [bocs])
  const pocsMemo = useMemo(() => pocs, [pocs])
  const launchersMemo = useMemo(() => launchers, [launchers])
  const rsvsMemo = useMemo(() => rsvs, [rsvs])

  // Selection helpers for BOCs
  const isAllBOCsSelected = useMemo(() => {
    return bocs.length > 0 && bocs.every((boc) => selectedBOCIds.has(boc.id))
  }, [bocs, selectedBOCIds])
  const isSomeBOCsSelected = useMemo(() => {
    return bocs.some((boc) => selectedBOCIds.has(boc.id))
  }, [bocs, selectedBOCIds])
  const handleBOCSelectAll = useCallback(() => {
    if (isAllBOCsSelected) {
      setSelectedBOCIds(new Set())
    } else {
      setSelectedBOCIds(new Set(bocs.map((b) => b.id)))
    }
  }, [isAllBOCsSelected, bocs])
  const handleBOCSelect = useCallback((id: string) => {
    setSelectedBOCIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // Selection helpers for POCs
  const isAllPOCsSelected = useMemo(() => {
    return pocs.length > 0 && pocs.every((poc) => selectedPOCIds.has(poc.id))
  }, [pocs, selectedPOCIds])
  const isSomePOCsSelected = useMemo(() => {
    return pocs.some((poc) => selectedPOCIds.has(poc.id))
  }, [pocs, selectedPOCIds])
  const handlePOCSelectAll = useCallback(() => {
    if (isAllPOCsSelected) {
      setSelectedPOCIds(new Set())
    } else {
      setSelectedPOCIds(new Set(pocs.map((p) => p.id)))
    }
  }, [isAllPOCsSelected, pocs])
  const handlePOCSelect = useCallback((id: string) => {
    setSelectedPOCIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // Selection helpers for Launchers
  const isAllLaunchersSelected = useMemo(() => {
    return launchers.length > 0 && launchers.every((launcher) => selectedLauncherIds.has(launcher.id))
  }, [launchers, selectedLauncherIds])
  const isSomeLaunchersSelected = useMemo(() => {
    return launchers.some((launcher) => selectedLauncherIds.has(launcher.id))
  }, [launchers, selectedLauncherIds])
  const handleLauncherSelectAll = useCallback(() => {
    if (isAllLaunchersSelected) {
      setSelectedLauncherIds(new Set())
    } else {
      setSelectedLauncherIds(new Set(launchers.map((l) => l.id)))
    }
  }, [isAllLaunchersSelected, launchers])
  const handleLauncherSelect = useCallback((id: string) => {
    setSelectedLauncherIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  // Selection helpers for RSVs
  const isAllRSVsSelected = useMemo(() => {
    return rsvs.length > 0 && rsvs.every((rsv) => selectedRSVIds.has(rsv.id))
  }, [rsvs, selectedRSVIds])
  const isSomeRSVsSelected = useMemo(() => {
    return rsvs.some((rsv) => selectedRSVIds.has(rsv.id))
  }, [rsvs, selectedRSVIds])
  const handleRSVSelectAll = useCallback(() => {
    if (isAllRSVsSelected) {
      setSelectedRSVIds(new Set())
    } else {
      setSelectedRSVIds(new Set(rsvs.map((r) => r.id)))
    }
  }, [isAllRSVsSelected, rsvs])
  const handleRSVSelect = useCallback((id: string) => {
    setSelectedRSVIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  return (
    <div>
      <h1
        style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          marginBottom: isMobile ? '1rem' : '2rem',
          color: 'var(--text-primary)',
        }}
      >
        Inventory
      </h1>

      {/* Pods Management - Full Width */}
      <div style={{ marginBottom: '2rem' }}>
        <PodsManagement onAddPod={() => setShowPodForm(true)} />
      </div>

      {/* Pods to RSV Assignment - Full Width */}
      <div style={{ marginBottom: '2rem' }}>
        <PodsToRSVAssignment />
      </div>

      {/* Pod Creation Modal */}
      {showPodForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPodForm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Add Pod(s)
              </h2>
              <button
                onClick={() => setShowPodForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <ItemForm
              title="Pods"
              onSubmit={(data) => {
                handleAddPod(data)
                setShowPodForm(false)
              }}
              onCancel={() => setShowPodForm(false)}
              pocs={pocsMemo}
              roundTypeOptions={roundTypeOptions}
            />
          </div>
        </div>
      )}

      {/* Other Items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          width: '100%',
          maxWidth: '100%',
          gap: '1.5rem',
        }}
      >
        <ItemCard
          title="BOCs"
          items={bocsMemo}
          onAdd={handleAddBOC}
          onDelete={deleteBOC}
          showForm={showBOCForm}
          onToggleForm={() => setShowBOCForm(!showBOCForm)}
          selectedIds={selectedBOCIds}
          onSelect={handleBOCSelect}
          onSelectAll={handleBOCSelectAll}
          isAllSelected={isAllBOCsSelected}
          isSomeSelected={isSomeBOCsSelected}
          roundTypeOptions={roundTypeOptions}
        />
        <ItemCard
          title="POCs"
          items={pocsMemo}
          onAdd={handleAddPOC}
          onDelete={deletePOC}
          showForm={showPOCForm}
          onToggleForm={() => setShowPOCForm(!showPOCForm)}
          selectedIds={selectedPOCIds}
          onSelect={handlePOCSelect}
          onSelectAll={handlePOCSelectAll}
          isAllSelected={isAllPOCsSelected}
          isSomeSelected={isSomePOCsSelected}
          roundTypeOptions={roundTypeOptions}
        />
        <ItemCard
          title="Launchers"
          items={launchersMemo}
          onAdd={handleAddLauncher}
          onDelete={deleteLauncher}
          showForm={showLauncherForm}
          onToggleForm={() => setShowLauncherForm(!showLauncherForm)}
          selectedIds={selectedLauncherIds}
          onSelect={handleLauncherSelect}
          onSelectAll={handleLauncherSelectAll}
          isAllSelected={isAllLaunchersSelected}
          isSomeSelected={isSomeLaunchersSelected}
          roundTypeOptions={roundTypeOptions}
        />
        <ItemCard
          title="RSVs"
          items={rsvsMemo}
          onAdd={handleAddRSV}
          onDelete={deleteRSV}
          showForm={showRSVForm}
          onToggleForm={() => setShowRSVForm(!showRSVForm)}
          selectedIds={selectedRSVIds}
          onSelect={handleRSVSelect}
          onSelectAll={handleRSVSelectAll}
          isAllSelected={isAllRSVsSelected}
          isSomeSelected={isSomeRSVsSelected}
          roundTypeOptions={roundTypeOptions}
        />
      </div>
    </div>
  )
}
