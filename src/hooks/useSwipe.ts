import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // Minimum distance in pixels to trigger swipe (default: 50)
  velocityThreshold?: number // Minimum velocity in px/ms to trigger swipe (default: 0.3)
}

/**
 * Hook to detect swipe gestures on an element
 * Returns ref to attach to the element
 */
export function useSwipe<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.3,
}: SwipeHandlers) {
  const elementRef = useRef<T>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

        /**
     * Handles touch start interactions for this workflow.
     */
const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }
    }

        /**
     * Handles touch end interactions for this workflow.
     */
const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const deltaTime = Date.now() - touchStartRef.current.time
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const velocity = distance / deltaTime

      // Check if swipe meets threshold requirements
      if (distance < threshold || velocity < velocityThreshold) {
        touchStartRef.current = null
        return
      }

      // Determine swipe direction
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Horizontal swipe
      if (absX > absY) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
      // Vertical swipe
      else {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }

      touchStartRef.current = null
    }

        /**
     * Handles touch move interactions for this workflow.
     */
const handleTouchMove = (e: TouchEvent) => {
      // For modals with swipe down, allow vertical scrolling but detect swipes
      // For drawer with swipe left, prevent scrolling during horizontal swipe
      if (touchStartRef.current) {
        const touch = e.touches[0]
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
        
        // Only prevent default for strong horizontal swipes (drawer)
        // Always allow vertical scrolling - never prevent default for vertical movements
        if ((onSwipeLeft || onSwipeRight) && !onSwipeUp && !onSwipeDown) {
          // Only for horizontal-only swipe handlers, and only if movement is clearly horizontal
          // Make threshold higher to be less aggressive
          if (deltaX > 30 && deltaX > deltaY * 2) {
            e.preventDefault()
          }
        }
        // For vertical swipes or mixed handlers, never prevent default to allow scrolling
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    // Use passive: false only when we might prevent default (for horizontal swipes)
    // This allows native scrolling to work smoothly
    element.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold])

  return elementRef
}

