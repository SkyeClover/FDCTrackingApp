import { Minus, Plus } from 'lucide-react'

export interface SegmentedIntPickerProps {
  min: number
  max: number
  value: number | ''
  onChange: (value: number | '') => void
  disabled?: boolean
  allowEmpty?: boolean
  'data-guide'?: string
  /** Larger padding on tablet-style layouts */
  compact?: boolean
}

/**
 * Discrete integer selection with large touch targets (no number spinners).
 * Good for bounded ranges e.g. 1–6 rounds to fire.
 */
export default function SegmentedIntPicker({
  min,
  max,
  value,
  onChange,
  disabled = false,
  allowEmpty = false,
  'data-guide': dataGuide,
  compact = false,
}: SegmentedIntPickerProps) {
  const values: number[] = []
  for (let i = min; i <= max; i++) values.push(i)

    /**
   * Implements bump for this module.
   */
const bump = (delta: number) => {
    if (disabled) return
    if (value === '') {
      onChange(Math.min(max, Math.max(min, min + delta)))
      return
    }
    const next = Math.min(max, Math.max(min, value + delta))
    onChange(next)
  }

  const pad = compact ? '0.4rem 0.55rem' : '0.55rem 0.75rem'
  const fontSize = compact ? '0.85rem' : '1rem'
  const gap = compact ? '0.35rem' : '0.5rem'

  return (
    <div data-guide={dataGuide} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap }}>
        <button
          type="button"
          disabled={disabled || (!allowEmpty && value !== '' && value <= min)}
          onClick={() => bump(-1)}
          aria-label="Decrease"
          style={{
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Minus size={22} strokeWidth={2.5} />
        </button>

        <div
          role="group"
          aria-label={`Select value from ${min} to ${max}`}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', flex: 1, justifyContent: 'center' }}
        >
          {values.map((n) => {
            const selected = value === n
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onChange(n)}
                style={{
                  minWidth: compact ? 40 : 44,
                  minHeight: compact ? 44 : 48,
                  padding: pad,
                  borderRadius: '8px',
                  border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  backgroundColor: selected ? 'var(--accent)' : 'var(--bg-primary)',
                  color: selected ? '#fff' : 'var(--text-primary)',
                  fontSize,
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {n}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={disabled || (!allowEmpty && value !== '' && value >= max)}
          onClick={() => bump(1)}
          aria-label="Increase"
          style={{
            minWidth: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
      {allowEmpty && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          style={{
            alignSelf: 'flex-start',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px dashed var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
