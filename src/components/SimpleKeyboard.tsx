import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

interface SimpleKeyboardProps {
  visible: boolean
  onToggle?: () => void
}

function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
}

/** Many input types (number, date, etc.) expose selectionStart/End as null — caret APIs don’t apply. */
function getTextSelection(el: HTMLInputElement | HTMLTextAreaElement): { start: number; end: number } | null {
  const s = el.selectionStart
  const e = el.selectionEnd
  if (typeof s === 'number' && typeof e === 'number') return { start: s, end: e }
  return null
}

function trySetSelectionRange(el: HTMLInputElement | HTMLTextAreaElement, start: number, end: number) {
  try {
    el.setSelectionRange(start, end)
  } catch {
    /* number, date, … */
  }
}

function isAllowedKeyForNumberInput(key: string): boolean {
  return /^[0-9.eE+-]$/.test(key)
}

export default function SimpleKeyboard({ visible }: SimpleKeyboardProps) {
  const [capsLock, setCapsLock] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  /** Extra px above keyboard so the focused field isn’t flush against it (inset is keyboard height + this gap). */
  const KEYBOARD_GAP_PX = 24

  const applyKeyboardInset = useCallback(() => {
    const el = containerRef.current
    if (!visible || !el) {
      document.documentElement.style.setProperty('--keyboard-bottom-inset', '0px')
      return
    }
    const rectH = el.getBoundingClientRect().height
    const offsetH = el.offsetHeight
    let raw = Math.max(rectH, offsetH)
    // First paint / kiosk timing: rect can be 0 before layout; reserve ~typical keyboard band
    if (raw <= 1) {
      raw = Math.round(window.innerHeight * 0.42)
    }
    const h = Math.ceil(raw) + KEYBOARD_GAP_PX
    document.documentElement.style.setProperty('--keyboard-bottom-inset', `${h}px`)
  }, [visible])

  useLayoutEffect(() => {
    if (!visible) {
      document.documentElement.classList.remove('simple-kbd-visible')
      document.documentElement.style.setProperty('--keyboard-bottom-inset', '0px')
      return
    }
    document.documentElement.classList.add('simple-kbd-visible')
    const el = containerRef.current
    if (!el) return
    applyKeyboardInset()
    const ro = new ResizeObserver(() => applyKeyboardInset())
    ro.observe(el)
    window.addEventListener('resize', applyKeyboardInset)
    window.visualViewport?.addEventListener('resize', applyKeyboardInset)
    const t = window.setTimeout(applyKeyboardInset, 50)
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(applyKeyboardInset)
    })
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      ro.disconnect()
      window.removeEventListener('resize', applyKeyboardInset)
      window.visualViewport?.removeEventListener('resize', applyKeyboardInset)
      document.documentElement.classList.remove('simple-kbd-visible')
      document.documentElement.style.setProperty('--keyboard-bottom-inset', '0px')
    }
  }, [visible, applyKeyboardInset])

  const scrollInputIntoView = useCallback((element: HTMLElement) => {
    const insetStr = getComputedStyle(document.documentElement).getPropertyValue('--keyboard-bottom-inset').trim()
    const insetPx = parseFloat(insetStr) || 0
    const marginTop = 16
    const vv = window.visualViewport
    const layoutBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    const usableBottom = layoutBottom - insetPx - 8

    const rect = element.getBoundingClientRect()
    if (rect.bottom <= usableBottom && rect.top >= marginTop) return

    const modalHost = element.closest('.touch-kbd-scroll') as HTMLElement | null

    let scrollable: HTMLElement | null = modalHost
    if (!scrollable) {
      let n: HTMLElement | null = element.parentElement
      while (n) {
        const style = window.getComputedStyle(n)
        const oy = style.overflowY
        if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 2) {
          scrollable = n
          break
        }
        if (n.tagName === 'MAIN') {
          scrollable = n
          break
        }
        n = n.parentElement
      }
    }
    if (!scrollable) scrollable = document.querySelector('main')

    const delta = rect.bottom - usableBottom
    if (delta > 0 && scrollable) {
      scrollable.scrollBy({ top: delta + 16, behavior: 'smooth' })
    } else if (rect.top < marginTop && scrollable) {
      scrollable.scrollBy({ top: rect.top - marginTop, behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const scrollFocused = () => {
      applyKeyboardInset()
      const active = document.activeElement as HTMLElement | null
      if (active?.matches?.('input, textarea, select')) scrollInputIntoView(active)
    }
    const t1 = window.setTimeout(scrollFocused, 0)
    const t2 = window.setTimeout(scrollFocused, 120)
    const raf = requestAnimationFrame(() => requestAnimationFrame(scrollFocused))
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      cancelAnimationFrame(raf)
    }
  }, [visible, scrollInputIntoView, applyKeyboardInset])

  useEffect(() => {
    if (!visible) return
    const handleFocus = (e: Event) => {
      const target = e.target as HTMLElement
      if (target?.matches?.('input, textarea, select')) {
        window.setTimeout(() => scrollInputIntoView(target), 80)
      }
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [visible, scrollInputIntoView])

  const handleKeyPress = (key: string) => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    if (!activeElement?.matches?.('input, textarea')) return

    const value = activeElement.value
    const input = activeElement as HTMLInputElement
    if (input.type === 'number' && !isAllowedKeyForNumberInput(key)) return

    const sel = getTextSelection(activeElement)
    if (sel) {
      const { start, end } = sel
      const newValue = value.substring(0, start) + key + value.substring(end)
      const newPos = start + key.length
      setNativeInputValue(activeElement, newValue)
      trySetSelectionRange(activeElement, newPos, newPos)
    } else {
      setNativeInputValue(activeElement, value + key)
    }

    activeElement.focus()
    activeElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    activeElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
  }

  const handleBackspace = () => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    if (!activeElement?.matches?.('input, textarea')) return

    const value = activeElement.value
    const sel = getTextSelection(activeElement)

    if (sel) {
      const { start, end } = sel
      if (start === end && start > 0) {
        const newValue = value.substring(0, start - 1) + value.substring(start)
        setNativeInputValue(activeElement, newValue)
        trySetSelectionRange(activeElement, start - 1, start - 1)
      } else if (start !== end) {
        const newValue = value.substring(0, start) + value.substring(end)
        setNativeInputValue(activeElement, newValue)
        trySetSelectionRange(activeElement, start, start)
      } else return
    } else {
      if (value.length === 0) return
      setNativeInputValue(activeElement, value.slice(0, -1))
    }

    activeElement.focus()
    activeElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
  }

  const handleArrow = (dir: -1 | 1) => {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    if (!el?.matches?.('input, textarea')) return
    const sel = getTextSelection(el)
    if (!sel) return
    const { start, end } = sel
    const len = el.value.length
    if (start === end) {
      const next = Math.max(0, Math.min(len, start + dir))
      trySetSelectionRange(el, next, next)
    } else if (dir < 0) {
      trySetSelectionRange(el, start, start)
    } else {
      trySetSelectionRange(el, end, end)
    }
    el.focus()
  }

  const handleEnter = () => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    if (!activeElement) return
    if (activeElement.tagName === 'TEXTAREA') {
      handleKeyPress('\n')
    } else {
      const form = activeElement.closest('form')
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      activeElement.blur()
    }
  }

  const keyStyle: React.CSSProperties = {
    padding: '14px 10px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '17px',
    fontWeight: '500',
    cursor: 'pointer',
    minWidth: '48px',
    minHeight: '48px',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    touchAction: 'manipulation',
    pointerEvents: 'auto',
  }

  const specialKeyStyle: React.CSSProperties = {
    ...keyStyle,
    backgroundColor: 'var(--accent)',
    color: 'white',
  }

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxHeight: '45vh',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '2px solid var(--border)',
        padding: '10px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
        <button
          type="button"
          style={{ ...specialKeyStyle, flex: 1.2 }}
          onClick={() => handleArrow(-1)}
          onMouseDown={(e) => e.preventDefault()}
          title="Nudge cursor left"
        >
          ←
        </button>
        <button
          type="button"
          style={{ ...specialKeyStyle, flex: 1.2 }}
          onClick={() => handleArrow(1)}
          onMouseDown={(e) => e.preventDefault()}
          title="Nudge cursor right"
        >
          →
        </button>
        <button
          type="button"
          style={{ ...specialKeyStyle, flex: 1 }}
          onClick={handleBackspace}
          onMouseDown={(e) => e.preventDefault()}
        >
          ⌫
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='].map((key) => (
          <button
            key={key}
            type="button"
            style={keyStyle}
            onClick={() => handleKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'].map((key) => (
          <button
            key={key}
            type="button"
            style={keyStyle}
            onClick={() => handleKeyPress(capsLock ? key.toUpperCase() : key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'].map((key) => (
          <button
            key={key}
            type="button"
            style={keyStyle}
            onClick={() => handleKeyPress(capsLock ? key.toUpperCase() : key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        <button
          type="button"
          style={capsLock ? specialKeyStyle : keyStyle}
          onClick={() => setCapsLock(!capsLock)}
          onMouseDown={(e) => e.preventDefault()}
        >
          ⇧
        </button>
        {['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'].map((key) => (
          <button
            key={key}
            type="button"
            style={keyStyle}
            onClick={() => handleKeyPress(capsLock ? key.toUpperCase() : key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
        <button
          type="button"
          style={specialKeyStyle}
          onClick={handleBackspace}
          onMouseDown={(e) => e.preventDefault()}
        >
          ⌫
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        <button type="button" style={keyStyle} onClick={() => handleKeyPress('@')} onMouseDown={(e) => e.preventDefault()}>
          @
        </button>
        <button type="button" style={keyStyle} onClick={() => handleKeyPress('#')} onMouseDown={(e) => e.preventDefault()}>
          #
        </button>
        <button type="button" style={keyStyle} onClick={() => handleKeyPress('_')} onMouseDown={(e) => e.preventDefault()}>
          _
        </button>
        <button
          type="button"
          style={{ ...keyStyle, flex: 2 }}
          onClick={() => handleKeyPress(' ')}
          onMouseDown={(e) => e.preventDefault()}
        >
          SPACE
        </button>
        <button type="button" style={keyStyle} onClick={() => handleKeyPress(':')} onMouseDown={(e) => e.preventDefault()}>
          :
        </button>
        <button type="button" style={keyStyle} onClick={() => handleKeyPress('!')} onMouseDown={(e) => e.preventDefault()}>
          !
        </button>
        <button type="button" style={specialKeyStyle} onClick={handleEnter} onMouseDown={(e) => e.preventDefault()}>
          ENTER
        </button>
      </div>
    </div>
  )
}
