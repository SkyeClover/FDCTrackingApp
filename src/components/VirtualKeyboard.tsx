import { useState, useEffect, useRef } from 'react'

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void
  onBackspace: () => void
  onEnter: () => void
  visible: boolean
}

export default function VirtualKeyboard({ onKeyPress, onBackspace, onEnter, visible }: VirtualKeyboardProps) {
  const [capsLock, setCapsLock] = useState(false)
  const keyboardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-show keyboard when input is focused (on touchscreen)
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Keyboard will be shown by parent component
      }
    }

    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  const handleKeyClick = (key: string) => {
    const keyToSend = capsLock ? key.toUpperCase() : key.toLowerCase()
    onKeyPress(keyToSend)
    // Keep focus on the active input after key press
    // This is handled by the hook, but we ensure the input stays focused
  }

  const handleTouchEnd = (e: React.TouchEvent, action: () => void) => {
    e.stopPropagation()
    action()
    // Reset background after a brief delay
    setTimeout(() => {
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
      }
    }, 150)
  }

  const toggleCaps = () => {
    setCapsLock(!capsLock)
  }

  if (!visible) return null

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
    WebkitTapHighlightColor: 'transparent',
  }

  const specialKeyStyle: React.CSSProperties = {
    ...keyStyle,
    backgroundColor: 'var(--accent)',
    color: 'white',
  }

  return (
    <div
      ref={keyboardRef}
      data-virtual-keyboard="true"
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
      onMouseDown={(e) => {
        // Don't prevent default - we want clicks to work
        // Just stop propagation to prevent modal from closing
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        // Don't prevent default - we want touches to work
        e.stopPropagation()
      }}
    >
      {/* Row 1: Numbers */}
      <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'stretch' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
              setTimeout(() => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }, 150)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onMouseUp={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Row 2: QWERTY top */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
              setTimeout(() => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }, 150)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onMouseUp={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
      </div>

      {/* Row 3: QWERTY middle */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
              setTimeout(() => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }, 150)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onMouseUp={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
      </div>

      {/* Row 4: QWERTY bottom with shift and backspace */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        <button
          style={capsLock ? specialKeyStyle : keyStyle}
          onClick={(e) => {
            e.stopPropagation()
            toggleCaps()
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            handleTouchEnd(e, () => toggleCaps())
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = capsLock ? 'var(--accent)' : 'var(--bg-tertiary)'
          }}
        >
          ⇧
        </button>
        {['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'].map((key) => (
          <button
            key={key}
            style={keyStyle}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleKeyClick(key)
              setTimeout(() => {
                if (e.currentTarget instanceof HTMLElement) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }
              }, 150)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
            onMouseUp={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            }}
          >
            {capsLock ? key.toUpperCase() : key}
          </button>
        ))}
        <button
          style={specialKeyStyle}
          onClick={(e) => {
            e.stopPropagation()
            onBackspace()
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
          }}
          onTouchEnd={(e) => {
            handleTouchEnd(e, () => onBackspace())
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
          }}
          onMouseUp={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
        >
          ⌫
        </button>
      </div>

      {/* Row 5: Space bar and special keys */}
      <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
        <button
          style={keyStyle}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('@')
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('@')
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          @
        </button>
        <button
          style={keyStyle}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('#')
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('#')
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          #
        </button>
        <button
          style={keyStyle}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('_')
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('_')
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          _
        </button>
        <button
          style={{ ...keyStyle, flex: 2 }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick(' ')
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick(' ')
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          SPACE
        </button>
        <button
          style={keyStyle}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick(':')
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick(':')
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          :
        </button>
        <button
          style={keyStyle}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('!')
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleKeyClick('!')
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
          }}
        >
          !
        </button>
        <button
          style={specialKeyStyle}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEnter()
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEnter()
            setTimeout(() => {
              if (e.currentTarget instanceof HTMLElement) {
                e.currentTarget.style.backgroundColor = 'var(--accent)'
              }
            }, 150)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
          }}
          onMouseUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.style.backgroundColor = 'var(--accent)'
          }}
        >
          ENTER
        </button>
      </div>
    </div>
  )
}

