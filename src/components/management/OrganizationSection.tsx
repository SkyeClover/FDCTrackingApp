import { useState, useMemo, useCallback, memo } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { Plus, Trash2, GitBranch } from 'lucide-react'
const ItemList = memo(
  ({
    items,
    title,
    onDelete,
    selectedIds,
    onSelect,
    onSelectAll,
    isAllSelected,
    isSomeSelected,
  }: {
    items: Array<{ id: string; name: string; detail?: string }>
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
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No {title.toLowerCase()} yet</p>
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
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Select All ({selectedIds?.size || 0} selected)
            </span>
            {selectedIds && selectedIds.size > 0 && onDelete && (
              <button
                onClick={() => {
                  const selectedItems = items.filter((item) => selectedIds.has(item.id))
                  const itemNames = selectedItems.map((item) => item.name).join(', ')
                  if (
                    confirm(
                      `Are you sure you want to delete ${selectedIds.size} ${title.slice(0, -1).toLowerCase()}(s)?\n\n${itemNames}`
                    )
                  ) {
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
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                  {item.detail && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.detail}</span>
                  )}
                </div>
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
  }
)
ItemList.displayName = 'ItemList'

const ItemCard = memo(
  ({
    title,
    items,
    onDelete,
    selectedIds,
    onSelect,
    onSelectAll,
    isAllSelected,
    isSomeSelected,
  }: {
    title: string
    items: Array<{ id: string; name: string; detail?: string }>
    onDelete?: (id: string) => void
    selectedIds?: Set<string>
    onSelect?: (id: string) => void
    onSelectAll?: () => void
    isAllSelected?: boolean
    isSomeSelected?: boolean
  }) => {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '1rem',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {title} ({items.length})
          </h2>
        </div>
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
  }
)
ItemCard.displayName = 'ItemCard'

type OrganizationSectionProps = {
  isMobile?: boolean
  onOpenCreateUnit: () => void
  /** Opens the tree-style unit hierarchy modal (Management page). */
  onOpenHierarchy?: () => void
}

export default function OrganizationSection({ isMobile = false, onOpenCreateUnit, onOpenHierarchy }: OrganizationSectionProps) {
  const {
    brigades,
    battalions,
    bocs,
    pocs,
    ammoPlatoons,
    deleteBrigade,
    deleteBattalion,
    deleteBOC,
    deletePOC,
    deleteAmmoPlatoon,
  } = useAppData()

  const [selectedBrigadeIds, setSelectedBrigadeIds] = useState<Set<string>>(new Set())
  const [selectedBattalionIds, setSelectedBattalionIds] = useState<Set<string>>(new Set())
  const [selectedBOCIds, setSelectedBOCIds] = useState<Set<string>>(new Set())
  const [selectedPOCIds, setSelectedPOCIds] = useState<Set<string>>(new Set())
  const [selectedAmmoPltIds, setSelectedAmmoPltIds] = useState<Set<string>>(new Set())

  const brigadesMemo = useMemo(() => brigades, [brigades])
  const battalionsMemo = useMemo(() => {
    const bde = new Map(brigades.map((b) => [b.id, b.name]))
    return battalions.map((bn) => ({
      ...bn,
      detail: bn.brigadeId ? (bde.get(bn.brigadeId) ? `Brigade: ${bde.get(bn.brigadeId)}` : undefined) : undefined,
    }))
  }, [battalions, brigades])
  const bocsMemo = useMemo(() => {
    const bn = new Map(battalions.map((b) => [b.id, b.name]))
    return bocs.map((boc) => ({
      ...boc,
      detail: boc.battalionId ? (bn.get(boc.battalionId) ? `Battalion: ${bn.get(boc.battalionId)}` : undefined) : undefined,
    }))
  }, [bocs, battalions])
  const pocsMemo = useMemo(() => pocs, [pocs])

  const ammoPlatoonsMemo = useMemo(() => {
    const bocName = new Map(bocs.map((b) => [b.id, b.name]))
    return ammoPlatoons.map((ap) => ({
      id: ap.id,
      name: ap.name,
      detail: ap.bocId ? `BOC: ${bocName.get(ap.bocId) ?? ap.bocId}` : 'Not assigned to a battery',
    }))
  }, [ammoPlatoons, bocs])

  const isAllBrigadesSelected = useMemo(
    () => brigades.length > 0 && brigades.every((b) => selectedBrigadeIds.has(b.id)),
    [brigades, selectedBrigadeIds]
  )
  const isSomeBrigadesSelected = useMemo(
    () => brigades.some((b) => selectedBrigadeIds.has(b.id)),
    [brigades, selectedBrigadeIds]
  )
  const handleBrigadeSelectAll = useCallback(() => {
    if (isAllBrigadesSelected) setSelectedBrigadeIds(new Set())
    else setSelectedBrigadeIds(new Set(brigades.map((b) => b.id)))
  }, [isAllBrigadesSelected, brigades])
  const handleBrigadeSelect = useCallback((id: string) => {
    setSelectedBrigadeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isAllBattalionsSelected = useMemo(
    () => battalions.length > 0 && battalions.every((b) => selectedBattalionIds.has(b.id)),
    [battalions, selectedBattalionIds]
  )
  const isSomeBattalionsSelected = useMemo(
    () => battalions.some((b) => selectedBattalionIds.has(b.id)),
    [battalions, selectedBattalionIds]
  )
  const handleBattalionSelectAll = useCallback(() => {
    if (isAllBattalionsSelected) setSelectedBattalionIds(new Set())
    else setSelectedBattalionIds(new Set(battalions.map((b) => b.id)))
  }, [isAllBattalionsSelected, battalions])
  const handleBattalionSelect = useCallback((id: string) => {
    setSelectedBattalionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isAllBOCsSelected = useMemo(
    () => bocs.length > 0 && bocs.every((boc) => selectedBOCIds.has(boc.id)),
    [bocs, selectedBOCIds]
  )
  const isSomeBOCsSelected = useMemo(() => bocs.some((boc) => selectedBOCIds.has(boc.id)), [bocs, selectedBOCIds])
  const handleBOCSelectAll = useCallback(() => {
    if (isAllBOCsSelected) setSelectedBOCIds(new Set())
    else setSelectedBOCIds(new Set(bocs.map((b) => b.id)))
  }, [isAllBOCsSelected, bocs])
  const handleBOCSelect = useCallback((id: string) => {
    setSelectedBOCIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isAllPOCsSelected = useMemo(
    () => pocs.length > 0 && pocs.every((poc) => selectedPOCIds.has(poc.id)),
    [pocs, selectedPOCIds]
  )
  const isSomePOCsSelected = useMemo(() => pocs.some((poc) => selectedPOCIds.has(poc.id)), [pocs, selectedPOCIds])
  const handlePOCSelectAll = useCallback(() => {
    if (isAllPOCsSelected) setSelectedPOCIds(new Set())
    else setSelectedPOCIds(new Set(pocs.map((p) => p.id)))
  }, [isAllPOCsSelected, pocs])
  const handlePOCSelect = useCallback((id: string) => {
    setSelectedPOCIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isAllAmmoPltsSelected = useMemo(
    () => ammoPlatoons.length > 0 && ammoPlatoons.every((ap) => selectedAmmoPltIds.has(ap.id)),
    [ammoPlatoons, selectedAmmoPltIds]
  )
  const isSomeAmmoPltsSelected = useMemo(
    () => ammoPlatoons.some((ap) => selectedAmmoPltIds.has(ap.id)),
    [ammoPlatoons, selectedAmmoPltIds]
  )
  const handleAmmoPltSelectAll = useCallback(() => {
    if (isAllAmmoPltsSelected) setSelectedAmmoPltIds(new Set())
    else setSelectedAmmoPltIds(new Set(ammoPlatoons.map((ap) => ap.id)))
  }, [isAllAmmoPltsSelected, ammoPlatoons])
  const handleAmmoPltSelect = useCallback((id: string) => {
    setSelectedAmmoPltIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {onOpenHierarchy && (
          <button
            type="button"
            onClick={onOpenHierarchy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            <GitBranch size={18} />
            Unit hierarchy
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCreateUnit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <Plus size={18} />
          Create unit…
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '0.75rem',
        }}
      >
        <ItemCard
          title="Brigades"
          items={brigadesMemo}
          onDelete={deleteBrigade}
          selectedIds={selectedBrigadeIds}
          onSelect={handleBrigadeSelect}
          onSelectAll={handleBrigadeSelectAll}
          isAllSelected={isAllBrigadesSelected}
          isSomeSelected={isSomeBrigadesSelected}
        />
        <ItemCard
          title="Battalions"
          items={battalionsMemo}
          onDelete={deleteBattalion}
          selectedIds={selectedBattalionIds}
          onSelect={handleBattalionSelect}
          onSelectAll={handleBattalionSelectAll}
          isAllSelected={isAllBattalionsSelected}
          isSomeSelected={isSomeBattalionsSelected}
        />
        <ItemCard
          title="BOCs"
          items={bocsMemo}
          onDelete={deleteBOC}
          selectedIds={selectedBOCIds}
          onSelect={handleBOCSelect}
          onSelectAll={handleBOCSelectAll}
          isAllSelected={isAllBOCsSelected}
          isSomeSelected={isSomeBOCsSelected}
        />
        <ItemCard
          title="POCs"
          items={pocsMemo}
          onDelete={deletePOC}
          selectedIds={selectedPOCIds}
          onSelect={handlePOCSelect}
          onSelectAll={handlePOCSelectAll}
          isAllSelected={isAllPOCsSelected}
          isSomeSelected={isSomePOCsSelected}
        />
        <ItemCard
          title="Ammo PLTs"
          items={ammoPlatoonsMemo}
          onDelete={deleteAmmoPlatoon}
          selectedIds={selectedAmmoPltIds}
          onSelect={handleAmmoPltSelect}
          onSelectAll={handleAmmoPltSelectAll}
          isAllSelected={isAllAmmoPltsSelected}
          isSomeSelected={isSomeAmmoPltsSelected}
        />
      </div>
    </div>
  )
}
