import { Minus, Plus } from 'lucide-react'

export interface TouchNumericStepperProps {
  value: number | ''
  onChange: (value: number | '') => void
  min: number
  max?: number
  step?: number
  disabled?: boolean
  placeholder?: string
  'data-guide'?: string
}

/**
 * Numeric entry with large − / + buttons; optional text field uses inputMode numeric (no spinners).
 */
export default function TouchNumericStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  placeholder,
  'data-guide': dataGuide,
}: TouchNumericStepperProps) {
  const n = value === '' ? null : value
  const canDec = n === null ? false : n > min
  const canInc = n === null ? true : max === undefined || n < max

  const applyDelta = (delta: number) => {
    if (disabled) return
    const base = n ?? min
    let next = base + delta
    if (max !== undefined) next = Math.min(max, next)
    next = Math.max(min, next)
    onChange(next)
  }

  const onInput = (raw: string) => {
    if (raw === '') {
      onChange('')
      return
    }
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    let next = parsed
    if (max !== undefined) next = Math.min(max, next)
    next = Math.max(min, next)
    onChange(next)
  }

  return (
    <div data-guide={dataGuide} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        disabled={disabled || !canDec}
        onClick={() => applyDelta(-step)}
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
          cursor: disabled || !canDec ? 'not-allowed' : 'pointer',
          opacity: disabled || !canDec ? 0.45 : 1,
        }}
      >
        <Minus size={22} strokeWidth={2.5} />
      </button>
      <input
        className="input-touch-numeric"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === '' ? '' : String(value)}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onInput(e.target.value.replace(/\D/g, ''))}
        onFocus={(e) => e.target.select()}
        style={{
          width: '5rem',
          minHeight: 48,
          padding: '0.5rem 0.75rem',
          textAlign: 'center',
          fontSize: '1.1rem',
          fontWeight: 600,
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
        }}
      />
      <button
        type="button"
        disabled={disabled || !canInc}
        onClick={() => applyDelta(step)}
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
          cursor: disabled || !canInc ? 'not-allowed' : 'pointer',
          opacity: disabled || !canInc ? 0.45 : 1,
        }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
