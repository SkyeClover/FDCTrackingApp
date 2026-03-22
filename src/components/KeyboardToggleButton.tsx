import { useState } from 'react'
import { getKioskSidecarOrigin } from '../lib/kioskSidecar'

interface KeyboardToggleButtonProps {
  onToggle: () => void
  isVisible: boolean
}

export default function KeyboardToggleButton({ onToggle, isVisible }: KeyboardToggleButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      // Call backend API to toggle system keyboard (Onboard) when running on Pi
      const response = await fetch(`${getKioskSidecarOrigin()}/keyboard-toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        onToggle()
      } else {
        console.warn('Keyboard API:', data.error ?? 'Unknown error')
        onToggle()
      }
    } catch (error) {
      // Backend not available (e.g. dev in browser or not on Pi) - use in-app keyboard only
      const isNetworkError =
        error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('fetch'))
      if (!isNetworkError) {
        console.error('Error toggling keyboard:', error)
      }
      onToggle()
    }
  }

  return (
    <button
      onClick={handleClick}
      onTouchEnd={handleClick}
      onTouchStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsPressed(true)
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
        /* Sit just above the on-screen keyboard; --keyboard-bottom-inset set by SimpleKeyboard */
        bottom: 'calc(16px + var(--keyboard-bottom-inset, 0px))',
        right: 'max(16px, env(safe-area-inset-right, 0px))',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        backgroundColor: isVisible ? '#4a9eff' : '#3b82f6',
        border: `3px solid ${isVisible ? '#6ab0ff' : '#2563eb'}`,
        color: '#fff',
        fontSize: '32px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999, // Extremely high z-index - always on top
        boxShadow: isPressed
          ? '0 2px 8px rgba(0, 0, 0, 0.3)'
          : '0 6px 20px rgba(59, 130, 246, 0.5)',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.3s ease', // Smooth transition when moving
        userSelect: 'none',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
        WebkitTapHighlightColor: 'transparent',
        opacity: 1, // Ensure it's fully visible
        visibility: 'visible', // Ensure it's visible
      }}
      title={isVisible ? 'Hide my keyboard' : 'Show my keyboard'}
    >
      ⌨️
    </button>
  )
}

