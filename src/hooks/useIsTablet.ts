import { useState, useEffect } from 'react'

/**
 * Hook to detect if the user is on a tablet device
 * Tablets are typically 768px - 1366px wide
 * 
 * For testing: Add ?tablet=true to URL to force tablet mode
 */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    
    // Force tablet mode for testing via URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('tablet') === 'true') return true
    
    // Tablet range: 768px - 1366px (covers most tablets in portrait and landscape)
    const width = window.innerWidth
    const isTabletWidth = width >= 768 && width <= 1366
    
    // Check user agent for tablet devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isTabletUserAgent = /ipad|android(?!.*mobile)|tablet/i.test(userAgent.toLowerCase())
    
    return isTabletWidth || isTabletUserAgent
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
        /**
     * Implements check tablet for this module.
     */
const checkTablet = () => {
      // Force tablet mode for testing via URL parameter
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('tablet') === 'true') {
        setIsTablet(true)
        return
      }
      
      const width = window.innerWidth
      const isTabletWidth = width >= 768 && width <= 1366
      
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isTabletUserAgent = /ipad|android(?!.*mobile)|tablet/i.test(userAgent.toLowerCase())
      
      setIsTablet(isTabletWidth || isTabletUserAgent)
    }

    // Debounced resize handler for better performance
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(checkTablet, 150)
    }

    // Check on mount
    checkTablet()
    
    // Use debounced resize handler
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return isTablet
}

