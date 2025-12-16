import { useState } from 'react'

interface KeyboardToggleButtonProps {
  onToggle: () => void
  isVisible: boolean
}

export default function KeyboardToggleButton({ onToggle, isVisible }: KeyboardToggleButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      onTouchStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsPressed(true)
      }}
      onTouchEnd={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsPressed(false)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsPressed(true)
      }}
      onMouseUp={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsPressed(false)
      }}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: isVisible ? '#4a9eff' : '#2a2a2a',
        border: `2px solid ${isVisible ? '#6ab0ff' : '#444'}`,
        color: '#fff',
        fontSize: '28px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10003,
        boxShadow: isPressed
          ? '0 2px 8px rgba(0, 0, 0, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.4)',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
        WebkitTapHighlightColor: 'transparent',
      }}
      title={isVisible ? 'Hide Keyboard' : 'Show Keyboard'}
    >
      ⌨️
    </button>
  )
}

