import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

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
  const { pocs, launchers, addLauncher, deleteLauncher, assignLauncherToPOC } = useAppData()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [formPocId, setFormPocId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const pocsSorted = useMemo(
    () => [...pocs].sort((a, b) => a.name.localeCompare(b.name)),
    [pocs]
  )

  const launchersSorted = useMemo(
    () => [...launchers].sort((a, b) => a.name.localeCompare(b.name)),
    [launchers]
  )

  const isAllSelected = launchers.length > 0 && launchers.every((l) => selectedIds.has(l.id))
  const isSomeSelected = launchers.some((l) => selectedIds.has(l.id))

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(launchers.map((l) => l.id)))
    }
  }, [isAllSelected, launchers])

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

  const pocName = (id: string | undefined) =>
    id ? pocs.find((p) => p.id === id)?.name ?? '—' : '—'

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
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Launchers ({launchers.length})
        </h2>
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

          {launchersSorted.map((launcher, idx) => {
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
        </div>
      )}
    </div>
  )
}
