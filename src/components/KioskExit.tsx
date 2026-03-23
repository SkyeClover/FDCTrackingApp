import { useEffect, useState } from 'react'
import { getKioskSidecarOrigin } from '../lib/kioskSidecar'

interface KioskExitProps {
  onExit: () => void
}

/**
 * Renders the Kiosk Exit UI section.
 */
export default function KioskExit({ onExit }: KioskExitProps) {
  const [showExit, setShowExit] = useState(false)
  const [exitCountdown, setExitCountdown] = useState(0)

  useEffect(() => {
    // ESC key to show exit option
    // Windows key (Meta/Super) + Enter to launch terminal directly
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExit(true)
        setExitCountdown(5)
      } else if ((e.key === 'Enter' || e.key === 'Return') && e.metaKey) {
        // Windows key (metaKey) + Enter to launch terminal
        e.preventDefault()
        e.stopPropagation()
        handleExit()
      }
    }

    // Long press on top-left corner (5 seconds)
    let longPressTimer: NodeJS.Timeout | null = null

        /**
     * Handles touch start interactions for this workflow.
     */
const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      // Top-left corner (within 100px from top and left)
      if (touch.clientX < 100 && touch.clientY < 100) {
        longPressTimer = setTimeout(() => {
          setShowExit(true)
          setExitCountdown(5)
        }, 5000) // 5 second long press
      }
    }

        /**
     * Handles touch end interactions for this workflow.
     */
const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
      if (longPressTimer) clearTimeout(longPressTimer)
    }
  }, [])

  useEffect(() => {
    if (exitCountdown > 0) {
      const timer = setTimeout(() => {
        setExitCountdown(exitCountdown - 1)
        if (exitCountdown === 1) {
          setShowExit(false)
          setExitCountdown(0)
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [exitCountdown])

    /**
   * Handles exit interactions for this workflow.
   */
const handleExit = async () => {
    try {
      // Call the exit handler endpoint to launch terminal
      const response = await fetch(`${getKioskSidecarOrigin()}/exit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (data.success) {
        // Terminal is launching, show message briefly
        setShowExit(false)
        // The terminal will appear and Chromium will close automatically
        onExit()
      } else {
        // Fallback: try to close window
        window.close()
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
        onExit()
      }
    } catch (error) {
      console.error('Failed to launch terminal:', error)
      // Fallback: try to close window
      window.close()
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      onExit()
    }
  }

  if (!showExit) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
      onClick={() => {
        setShowExit(false)
        setExitCountdown(0)
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '2px solid #00ff00',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ color: '#00ff00', marginTop: 0 }}>Exit Kiosk Mode?</h2>
        <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>
          This will exit full-screen kiosk mode and return to the desktop.
        </p>
        {exitCountdown > 0 && (
          <p style={{ color: '#ffaa00', marginBottom: '1rem' }}>
            Auto-cancel in {exitCountdown} seconds...
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={handleExit}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Exit Kiosk
          </button>
          <button
            onClick={() => {
              setShowExit(false)
              setExitCountdown(0)
            }}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
        <p style={{ color: '#666', fontSize: '12px', marginTop: '1rem' }}>
          Tip: Press ESC or long-press top-left corner to show this menu
        </p>
      </div>
    </div>
  )
}

