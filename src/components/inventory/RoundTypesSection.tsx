import { useState } from 'react'
import { Plus, Trash2, X as XIcon } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { getAllRoundTypeOptions } from '../../constants/roundTypes'

type Props = {
  /** No outer card chrome — use inside CollapsibleSection */
  embedded?: boolean
  /** Tighter rows and scrollable list */
  compact?: boolean
}

/**
 * Round type catalog: which ammunition labels exist and are enabled for pods.
 */
export default function RoundTypesSection({ embedded = false, compact = false }: Props) {
  const { roundTypes, addRoundType, updateRoundType, deleteRoundType } = useAppData()
  // --- Local state and callbacks ---
  const [newRoundTypeName, setNewRoundTypeName] = useState('')

  const p = compact ? '0.45rem' : '0.75rem'
  const fs = compact ? '0.8rem' : '0.9rem'
  const btnPad = compact ? '0.35rem 0.65rem' : '0.5rem 1rem'
  const allTypes = getAllRoundTypeOptions(roundTypes)
  const enabledCount = allTypes.filter((o) => roundTypes[o.value]?.enabled).length

    /**
   * Handles add round type interactions for this workflow.
   */
const handleAddRoundType = () => {
    const next = newRoundTypeName.trim().toUpperCase()
    if (!next) return
    addRoundType(next)
    setNewRoundTypeName('')
  }

  const inner = (
    <div
      data-guide={embedded ? undefined : 'round-types-section'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '0.5rem' : '1rem',
        color: 'var(--text-secondary)',
      }}
    >
      {!embedded && (
        <p style={{ color: 'var(--text-secondary)', fontSize: fs, margin: 0 }}>
          Manage available round types. Enabled types appear in pod creation and filters.
        </p>
      )}
      {embedded && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
          Enable types for pod builds. Add new labels with <strong>Add round type</strong> below.
        </p>
      )}

      <div
        style={{
          borderTop: embedded ? 'none' : '1px solid var(--border)',
          paddingTop: embedded ? 0 : '1rem',
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '1fr auto',
          gap: '0.4rem 0.55rem',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          Enabled {enabledCount} of {allTypes.length} types
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newRoundTypeName}
            onChange={(e) => setNewRoundTypeName(e.target.value.toUpperCase())}
            placeholder="Add type (e.g. M57)"
            style={{
              minWidth: compact ? '11rem' : '14rem',
              padding: '0.45rem 0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: fs,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRoundType()
              if (e.key === 'Escape') setNewRoundTypeName('')
            }}
          />
          <button
            type="button"
            onClick={handleAddRoundType}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: btnPad,
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: compact ? '0.8rem' : '0.9rem',
              fontWeight: '500',
            }}
            disabled={!newRoundTypeName.trim()}
          >
            <Plus size={compact ? 14 : 16} />
            Add
          </button>
          {newRoundTypeName ? (
            <button
              type="button"
              onClick={() => setNewRoundTypeName('')}
              style={{
                padding: '0.45rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Clear"
            >
              <XIcon size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? '0.35rem' : '0.5rem',
        }}
      >
        {allTypes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: fs, margin: 0 }}>
            No round types configured
          </p>
        ) : (
          allTypes.map((option) => {
            const config = roundTypes[option.value]
            const isDefault = ['M28A1', 'M26', 'M31', 'M30', 'M57', 'M39'].includes(option.value)

            return (
              <div
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.35rem',
                  padding: p,
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  flexWrap: compact ? 'wrap' : 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: fs }}>{option.label}</span>
                  {isDefault && (
                    <span
                      style={{
                        padding: '0.15rem 0.35rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                      }}
                    >
                      Default
                    </span>
                  )}
                  <span
                    style={{
                      padding: '0.15rem 0.35rem',
                      backgroundColor: config.enabled ? 'var(--success)' : 'var(--bg-tertiary)',
                      color: config.enabled ? 'white' : 'var(--text-secondary)',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 500,
                    }}
                  >
                    {config.enabled ? 'On' : 'Off'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => updateRoundType(option.value, !config.enabled)}
                    style={{
                      padding: compact ? '0.3rem 0.5rem' : '0.5rem 1rem',
                      backgroundColor: config.enabled ? 'color-mix(in srgb, var(--success) 22%, var(--bg-tertiary))' : 'var(--bg-tertiary)',
                      color: config.enabled ? 'var(--success)' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: compact ? '0.75rem' : '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    {config.enabled ? 'Disable' : 'Enable'}
                  </button>
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete round type "${option.label}"? This cannot be undone if pods use this type.`
                          )
                        ) {
                          deleteRoundType(option.value)
                        }
                      }}
                      style={{
                        padding: '0.35rem',
                        backgroundColor: 'transparent',
                        color: 'var(--danger)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Delete"
                    >
                      <Trash2 size={compact ? 14 : 16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  if (embedded) {
    return inner
  }

  // --- Render ---
  return (
    <div
      data-guide="round-types-section"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: 'var(--text-primary)',
        }}
      >
        Round Types
      </h2>
      {inner}
    </div>
  )
}
