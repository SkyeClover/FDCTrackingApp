import { useEffect } from 'react'

/**
 * Hook to handle modal behavior:
 * - ESC key to close
 * - Prevent body scroll when open
 * - Focus management
 */
export function useModal(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return

    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Handle ESC key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])
}

