import { useState, useEffect } from 'react'

/**
 * Hook to detect if the user is on a mobile device
 * Uses both screen width and user agent for better detection
 * 
 * For testing: Add ?mobile=true to URL to force mobile mode
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // Check on initial render
    if (typeof window === 'undefined') return false
    
    // Force mobile mode for testing via URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('mobile') === 'true') return true
    
    // Check screen width
    const isSmallScreen = window.innerWidth < breakpoint
    
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
    
    return isSmallScreen || isMobileUserAgent
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    const checkMobile = () => {
      // Force mobile mode for testing via URL parameter
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('mobile') === 'true') {
        setIsMobile(true)
        return
      }
      
      const isSmallScreen = window.innerWidth < breakpoint
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      
      setIsMobile(isSmallScreen || isMobileUserAgent)
    }

    // Debounced resize handler for better performance
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 150)
    }

    // Check on mount
    checkMobile()
    
    // Use debounced resize handler
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [breakpoint])

  return isMobile
}

