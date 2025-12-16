import { useState } from 'react'

interface SimpleKeyboardProps {
  visible: boolean
  onToggle?: () => void
}

export default function SimpleKeyboard({ visible }: SimpleKeyboardProps) {
  const [capsLock, setCapsLock] = useState(false)

  const handleKeyPress = (key: string) => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      // Get current selection
      const start = activeElement.selectionStart || 0
      const end = activeElement.selectionEnd || 0
      const value = activeElement.value
      
      // Insert the key
      const newValue = value.substring(0, start) + key + value.substring(end)
      const newPos = start + key.length
      
      // Use native value setter
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set
      
      if (nativeValueSetter) {
        nativeValueSetter.call(activeElement, newValue)
      } else {
        activeElement.value = newValue
      }
      
      // Set cursor position
      activeElement.setSelectionRange(newPos, newPos)
      
      // Focus the element
      activeElement.focus()
      
      // Create and dispatch input event
      const inputEvent = new Event('input', { bubbles: true, cancelable: true })
      activeElement.dispatchEvent(inputEvent)
      
      // Also try change event
      const changeEvent = new Event('change', { bubbles: true, cancelable: true })
      activeElement.dispatchEvent(changeEvent)
    }
  }

  const handleBackspace = () => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const start = activeElement.selectionStart || 0
      const end = activeElement.selectionEnd || 0
      const value = activeElement.value
      
      if (start === end && start > 0) {
        const newValue = value.substring(0, start - 1) + value.substring(start)
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set
        
        if (nativeValueSetter) {
          nativeValueSetter.call(activeElement, newValue)
        } else {
          activeElement.value = newValue
        }
        
        activeElement.setSelectionRange(start - 1, start - 1)
        activeElement.focus()
        
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        activeElement.dispatchEvent(inputEvent)
      } else if (start !== end) {
        const newValue = value.substring(0, start) + value.substring(end)
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set
        
        if (nativeValueSetter) {
          nativeValueSetter.call(activeElement, newValue)
        } else {
          activeElement.value = newValue
        }
        
        activeElement.setSelectionRange(start, start)
        activeElement.focus()
        
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        activeElement.dispatchEvent(inputEvent)
      }
    }
  }

  const handleEnter = () => {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null
    
    if (activeElement) {
      if (activeElement.tagName === 'TEXTAREA') {
        handleKeyPress('\n')
      } else {
        // For input fields, trigger submit or blur
        const form = activeElement.closest('form')
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
          form.dispatchEvent(submitEvent)
        }
        activeElement.blur()
      }
    }
  }

  const keyStyle: React.CSSProperties = {
    padding: '12px 8px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    minWidth: '44px',
    minHeight: '44px',
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
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '2px solid var(--border)',
        padding: '12px',
        paddingLeft: '8px',
        paddingRight: '8px',
        zIndex: 10002,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Row 1: Numbers */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={() => handleKeyPress(key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Row 2: QWERTY top */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={() => handleKeyPress(capsLock ? key.toUpperCase() : key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
      </div>

      {/* Row 3: QWERTY middle */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={() => handleKeyPress(capsLock ? key.toUpperCase() : key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
      </div>

      {/* Row 4: QWERTY bottom with shift and backspace */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        <button
          style={capsLock ? specialKeyStyle : keyStyle}
          onClick={() => setCapsLock(!capsLock)}
          onMouseDown={(e) => e.preventDefault()}
        >
          ⇧
        </button>
        {['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={() => handleKeyPress(capsLock ? key.toUpperCase() : key)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
        <button
          style={specialKeyStyle}
          onClick={handleBackspace}
          onMouseDown={(e) => e.preventDefault()}
        >
          ⌫
        </button>
      </div>

      {/* Row 5: Space bar and special keys */}
      <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
        <button style={keyStyle} onClick={() => handleKeyPress('@')} onMouseDown={(e) => e.preventDefault()}>@</button>
        <button style={keyStyle} onClick={() => handleKeyPress('#')} onMouseDown={(e) => e.preventDefault()}>#</button>
        <button style={keyStyle} onClick={() => handleKeyPress('_')} onMouseDown={(e) => e.preventDefault()}>_</button>
        <button style={{ ...keyStyle, flex: 2 }} onClick={() => handleKeyPress(' ')} onMouseDown={(e) => e.preventDefault()}>SPACE</button>
        <button style={keyStyle} onClick={() => handleKeyPress(':')} onMouseDown={(e) => e.preventDefault()}>:</button>
        <button style={keyStyle} onClick={() => handleKeyPress('!')} onMouseDown={(e) => e.preventDefault()}>!</button>
        <button style={specialKeyStyle} onClick={handleEnter} onMouseDown={(e) => e.preventDefault()}>ENTER</button>
      </div>
    </div>
  )
}

