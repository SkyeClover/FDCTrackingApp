import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings' | 'fire-missions'

interface ElementSelector {
  selector?: string
  textMatch?: string
  tagName?: string
  description?: string
  scrollIntoView?: boolean
  waitForElement?: boolean
  getParentContainer?: boolean
}

interface GuideStep {
  id: string
  title: string
  content: string
  page: Page
  elementSelectors: ElementSelector[]
  requiresUserAction?: boolean
  autoAdvance?: boolean
  waitForCondition?: () => boolean
  onStepEnter?: () => void
  validation?: () => boolean
}

// Helper function to find element by text content and optionally get parent container
const findElementByText = (text: string, tagName?: string, getParentContainer = false): HTMLElement | null => {
  const searchText = text.toLowerCase().trim()
  const elements = tagName 
    ? Array.from(document.getElementsByTagName(tagName))
    : Array.from(document.querySelectorAll('*'))
  
  // First try exact match
  for (const element of elements) {
    const elementText = element.textContent?.trim().toLowerCase()
    if (elementText === searchText) {
      if (getParentContainer) {
        // Find the parent container (usually a div with styling that looks like a card/panel)
        let parent = element.parentElement
        let bestParent = parent
        
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent)
          
          // Check if parent has card-like styling
          const hasPadding = parseFloat(style.paddingTop) > 0 || parseFloat(style.padding) > 0
          const hasBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                                style.backgroundColor !== 'transparent' &&
                                !style.backgroundColor.includes('rgba(0, 0, 0')
          const hasBorder = style.border !== 'none' && style.border !== '0px' && style.borderWidth !== '0px'
          const hasBorderRadius = style.borderRadius !== '0px'
          const hasCardStyling = (hasPadding && hasBackground) || (hasBorder && hasBorderRadius)
          
          // If this looks like a card/panel, use it
          if (hasCardStyling) {
            bestParent = parent
            // Continue looking for a better parent (more nested card)
          }
          
          parent = parent.parentElement
        }
        
        // Return the best parent found, or immediate parent as fallback
        return (bestParent || element.parentElement) as HTMLElement
      }
      return element as HTMLElement
    }
  }
  
  // Then try contains match
  for (const element of elements) {
    const elementText = element.textContent?.trim().toLowerCase()
    if (elementText?.includes(searchText)) {
      // Prefer elements where the text is the main content (not nested)
      const children = Array.from(element.children)
      const hasTextInChildren = children.some(child => 
        child.textContent?.trim().toLowerCase().includes(searchText)
      )
      if (!hasTextInChildren) {
        if (getParentContainer && element.parentElement) {
          return element.parentElement as HTMLElement
        }
        return element as HTMLElement
      }
    }
  }
  
  // Fallback: any match
  for (const element of elements) {
    if (element.textContent?.trim().toLowerCase().includes(searchText)) {
      if (getParentContainer && element.parentElement) {
        return element.parentElement as HTMLElement
      }
      return element as HTMLElement
    }
  }
  
  return null
}

// Helper function to find element by selector or text with retry
const findElement = (selector: string, retries = 10, delay = 200, textMatch?: string, tagName?: string, getParentContainer = false): Promise<HTMLElement | null> => {
  return new Promise((resolve) => {
    let attempts = 0
    const tryFind = () => {
      let element: HTMLElement | null = null
      
      // Try CSS selector first
      if (selector) {
        element = document.querySelector(selector) as HTMLElement
      }
      
      // If not found and textMatch provided, try text matching
      if (!element && textMatch) {
        element = findElementByText(textMatch, tagName, getParentContainer)
      }
      
      if (element || attempts >= retries) {
        resolve(element)
      } else {
        attempts++
        setTimeout(tryFind, delay)
      }
    }
    tryFind()
  })
}

// Helper function to scroll element into view with better visibility
const scrollToElement = (element: HTMLElement, offset = 200): Promise<void> => {
  return new Promise((resolve) => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const elementRect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft
      const scrollY = window.pageYOffset || document.documentElement.scrollTop
      
      // Calculate element position relative to viewport
      const elementLeft = elementRect.left + scrollX
      
      // Account for guide card (estimate ~250px height) and padding
      const guideCardHeight = 250
      const padding = 50
      const totalOffset = offset + guideCardHeight + padding
      
      // Check if element is at least partially visible (same check as highlight effect)
      const isPartiallyVisible = !(
        elementRect.right < 0 ||
        elementRect.bottom < 0 ||
        elementRect.left > viewportWidth ||
        elementRect.top > viewportHeight
      )
      
      // Check if element is fully visible with proper offset
      const isFullyVisible = 
        elementRect.top >= totalOffset &&
        elementRect.bottom <= viewportHeight - padding &&
        elementRect.left >= 0 &&
        elementRect.right <= viewportWidth
      
      console.log('[InteractiveGuide] scrollToElement:', {
        isPartiallyVisible,
        isFullyVisible,
        elementRect: { top: elementRect.top, bottom: elementRect.bottom, left: elementRect.left, right: elementRect.right, width: elementRect.width, height: elementRect.height },
        viewport: { width: viewportWidth, height: viewportHeight },
        scrollY,
        totalOffset
      })
      
      // Always scroll if element is not fully visible (even if partially visible)
      if (!isFullyVisible) {
        // First, use scrollIntoView to get element into viewport quickly
        // Use 'auto' instead of 'instant' for better browser compatibility
        element.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' })
        
        // Then calculate ideal scroll position accounting for guide card
        requestAnimationFrame(() => {
          const newRect = element.getBoundingClientRect()
          const newScrollY = window.pageYOffset || document.documentElement.scrollTop
          const newElementTop = newRect.top + newScrollY
          const newElementHeight = newRect.height
          
          // Calculate ideal scroll position - ensure it's not negative
          let idealTop = newElementTop - totalOffset
          
          // If element is above viewport, scroll to show it at the top with offset
          if (newRect.top < 0) {
            idealTop = newScrollY + newRect.top - totalOffset
          }
          
          // Ensure scroll position is not negative
          idealTop = Math.max(0, idealTop)
          
          // If element is very large, scroll to show the top
          if (newElementHeight > viewportHeight * 0.6) {
            console.log('[InteractiveGuide] Scrolling to large element, top:', idealTop)
            window.scrollTo({
              top: idealTop,
              left: elementLeft > 0 ? scrollX : Math.max(0, elementLeft - padding),
              behavior: 'smooth',
            })
          } else {
            // For smaller elements, try to center them in the visible area
            const visibleAreaHeight = viewportHeight - totalOffset - padding
            const centerOffset = Math.max(0, (visibleAreaHeight - newElementHeight) / 2)
            let scrollTop = newElementTop - totalOffset - centerOffset
            // Ensure scroll position is not negative
            scrollTop = Math.max(0, scrollTop)
            console.log('[InteractiveGuide] Scrolling to small element, top:', scrollTop)
            window.scrollTo({
              top: scrollTop,
              left: elementLeft > 0 ? scrollX : Math.max(0, elementLeft - padding),
              behavior: 'smooth',
            })
          }
          
          // Wait for smooth scroll to complete (usually ~500-1000ms)
          setTimeout(() => {
            resolve()
          }, 1000)
        })
      } else {
        console.log('[InteractiveGuide] Element is already fully visible, no scroll needed')
        resolve()
      }
    })
  })
}

interface InteractiveGuideModalProps {
  isOpen: boolean
  onClose: () => void
  currentPage: Page
  onNavigateToPage: (page: Page) => void
}

export default function InteractiveGuideModal({
  isOpen,
  onClose,
  currentPage,
  onNavigateToPage,
}: InteractiveGuideModalProps) {
  const { launchers, pods } = useAppData()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [highlightedElements, setHighlightedElements] = useState<HTMLElement[]>([])
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0)
  // State for guide card position - MUST be before any conditional returns
  const [cardPosition, setCardPosition] = useState<{ top?: string; bottom?: string; left?: string; right?: string; transform: string }>({
    bottom: '2rem',
    top: 'auto',
    left: '50%',
    right: 'auto',
    transform: 'translateX(-50%)'
  })
  const guideCardRef = useRef<HTMLDivElement>(null)
  const highlightRefs = useRef<Map<HTMLElement, HTMLDivElement>>(new Map())
  const overlayRefs = useRef<Map<HTMLElement, HTMLDivElement>>(new Map())
  const hasScrolledRef = useRef<Set<string>>(new Set())
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updatePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const autoAdvanceListenersRef = useRef<Map<HTMLElement, () => void>>(new Map())
  const hasAutoAdvancedRef = useRef<Set<string>>(new Set())
  const isNavigatingRef = useRef(false)
  const prevPageRef = useRef<string | null>(null)

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('[InteractiveGuide] Guide opened', { currentStepIndex, currentPage })
    } else {
      console.log('[InteractiveGuide] Guide closed')
    }
  }, [isOpen, currentStepIndex, currentPage])

  // Define all guide steps based on the user flow document
  const guideSteps: GuideStep[] = [
    // Step 1: Starting the Guide
    {
      id: 'start',
      title: 'Welcome to the Interactive Guide!',
      content: 'This guide will walk you through the key features of the FDC Tracker app. Click "Next" to continue.',
      page: 'settings',
      elementSelectors: [],
      requiresUserAction: true,
    },
    // Step 2: Round Types Configuration
    {
      id: 'round-types',
      title: 'Configure Round Types',
      content: 'First, let\'s configure which round types you want to use. The guide will highlight the round types section.',
      page: 'settings',
      elementSelectors: [
        { selector: '[data-guide="round-types-section"]', scrollIntoView: true, waitForElement: true },
      ],
      requiresUserAction: true,
    },
    // Step 3: Navigate to Inventory
    {
      id: 'navigate-inventory',
      title: 'Navigate to Inventory',
      content: 'Now let\'s go to the Inventory page to create your first launcher.',
      page: 'inventory',
      elementSelectors: [],
      requiresUserAction: true,
    },
    // Step 4: Add Launcher Button
    {
      id: 'add-launcher-button',
      title: 'Add Your First Launcher',
      content: 'Click the "Add Launcher" button to create a new launcher. The guide will highlight it for you.',
      page: 'inventory',
      elementSelectors: [
        { textMatch: 'Add Launcher', tagName: 'button', scrollIntoView: true, waitForElement: true },
      ],
      requiresUserAction: true,
    },
    // Step 5: Launcher Form - Name
    {
      id: 'launcher-form-name',
      title: 'Enter Launcher Name',
      content: 'Enter a name for your launcher in the Name field. You can click on the text box - the guide will stay active.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="launcher-form-name"]', scrollIntoView: true, waitForElement: true, description: 'Name input field' },
      ],
      requiresUserAction: true,
    },
    // Step 6: Launcher Form - Create
    {
      id: 'launcher-form-create',
      title: 'Create the Launcher',
      content: 'Click the "Create" button to add your launcher to the inventory.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="launcher-form-create-button"]', scrollIntoView: true, waitForElement: true, description: 'Create button' },
      ],
      requiresUserAction: true,
      waitForCondition: () => launchers.length > 0,
    },
    // Step 7: Pods Management Section
    {
      id: 'pods-management',
      title: 'Pods Management',
      content: 'Now let\'s create some pods. Scroll up to the Pods Management section at the top of the Inventory page.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-management-section"]', scrollIntoView: true, waitForElement: true },
      ],
      requiresUserAction: true,
    },
    // Step 8: Add Pod Button
    {
      id: 'add-pod-button',
      title: 'Add Pods',
      content: 'Click the "Add Pod" button to create pods for your launcher.',
      page: 'inventory',
      elementSelectors: [
        { textMatch: 'Add Pod', tagName: 'button', scrollIntoView: true, waitForElement: true },
      ],
      requiresUserAction: true,
    },
    // Step 9: Pod Form - Name
    {
      id: 'pod-form-name',
      title: 'Enter Pod Name',
      content: 'Enter a name for your pod in the Name field.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pod-form-name"]', scrollIntoView: true, waitForElement: true, description: 'Pod name input' },
      ],
      requiresUserAction: true,
    },
    // Step 10: Pod Form - Round Type
    {
      id: 'pod-form-round-type',
      title: 'Select Round Type',
      content: 'Select a round type from the dropdown. The rounds shown here are the ones you enabled in Settings.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pod-form-round-type"]', scrollIntoView: true, waitForElement: true, description: 'Round type dropdown in Add Pod modal' },
      ],
      requiresUserAction: true,
    },
    // Step 11: Pod Form - Round Count
    {
      id: 'pod-form-round-count',
      title: 'Set Maximum Rounds',
      content: 'Select the maximum number of rounds this pod can hold.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pod-form-round-count"]', scrollIntoView: true, waitForElement: true, description: 'Round count input' },
      ],
      requiresUserAction: true,
    },
    // Step 12: Pod Form - Quantity
    {
      id: 'pod-form-quantity',
      title: 'Set Pod Quantity',
      content: 'Select how many pods to create. For this guide, create 3 pods.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pod-form-quantity"]', scrollIntoView: true, waitForElement: true, description: 'Quantity input' },
      ],
      requiresUserAction: true,
    },
    // Step 13: Pod Form - Assign to POC
    {
      id: 'pod-form-poc',
      title: 'Assign to PLT Operations Center',
      content: 'Select the PLT Operations Center (PLT FDC) to assign these pods to. Choose the first POC in the list.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pod-form-poc-assignment"]', scrollIntoView: true, waitForElement: true, description: 'POC assignment dropdown in Add Pod modal' },
      ],
      requiresUserAction: true,
    },
    // Step 14: Pod Form - Create
    {
      id: 'pod-form-create',
      title: 'Create Pods',
      content: 'Click "Create" to create your pods.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pod-form-create-button"]', scrollIntoView: true, waitForElement: true, description: 'Create button' },
      ],
      requiresUserAction: true,
      waitForCondition: () => pods.length >= 3,
    },
    // Step 15: Pods Table - Overview
    {
      id: 'pods-table-overview',
      title: 'View Created Pods',
      content: 'Great! Your pods have been created. The guide will now explain each column in the pods table.',
      page: 'inventory',
      elementSelectors: [
        { selector: 'table', scrollIntoView: true, waitForElement: true, description: 'Pods table' },
      ],
      requiresUserAction: true,
    },
    // Step 16: Pods Table - Name Column
    {
      id: 'pods-table-name-column',
      title: 'Name Column',
      content: 'The "Name" column shows the name you gave to each pod when you created it. This helps you identify and track individual pods.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-table-column-name"]', scrollIntoView: true, waitForElement: true, description: 'Name column header' },
      ],
      requiresUserAction: true,
    },
    // Step 17: Pods Table - Round Type Column
    {
      id: 'pods-table-round-type-column',
      title: 'Round Type Column',
      content: 'The "Round Type" column shows the type of ammunition rounds in each pod (e.g., M26, M30A1). This matches the round type you selected when creating the pod.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-table-column-round-type"]', scrollIntoView: true, waitForElement: true, description: 'Round Type column header' },
      ],
      requiresUserAction: true,
    },
    // Step 18: Pods Table - Rounds Column
    {
      id: 'pods-table-rounds-column',
      title: 'Rounds Column',
      content: 'The "Rounds" column shows how many rounds are in each pod. It displays the number of available rounds out of the total rounds (e.g., "6/6" means 6 available out of 6 total).',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-table-column-rounds"]', scrollIntoView: true, waitForElement: true, description: 'Rounds column header' },
      ],
      requiresUserAction: true,
    },
    // Step 19: Pods Table - Assignment Column
    {
      id: 'pods-table-assignment-column',
      title: 'Assignment Column',
      content: 'The "Assignment" column shows where each pod is currently assigned. It can be assigned to a PLT Operations Center (PLT FDC), RSV (Reload Supply Vehicle), Launcher, or Ammo PLT. Unassigned pods show as "Unassigned".',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-table-column-assignment"]', scrollIntoView: true, waitForElement: true, description: 'Assignment column header' },
      ],
      requiresUserAction: true,
    },
    // Step 20: Pods Table - Reassign Column
    {
      id: 'pods-table-reassign-column',
      title: 'Reassign Column',
      content: 'The "Reassign" column contains a dropdown menu that allows you to change where a pod is assigned. You can reassign pods to different PLT Operations Centers (PLT FDCs), RSVs, or Launchers as needed.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-table-column-reassign"]', scrollIntoView: true, waitForElement: true, description: 'Reassign column header' },
      ],
      requiresUserAction: true,
    },
    // Step 21: Pods Table - Actions Column
    {
      id: 'pods-table-actions-column',
      title: 'Actions Column',
      content: 'The "Actions" column contains buttons to perform actions on each pod. The delete button allows you to remove a pod from the inventory. Be careful - deleting a pod will also delete all rounds in that pod.',
      page: 'inventory',
      elementSelectors: [
        { selector: '[data-guide="pods-table-column-actions"]', scrollIntoView: true, waitForElement: true, description: 'Actions column header' },
      ],
      requiresUserAction: true,
    },
    // Step 22: Navigate to Management
    {
      id: 'navigate-management',
      title: 'Go to Management',
      content: 'Now let\'s go to the Management page to see how launchers are assigned to PLT Operations Centers (PLT FDCs).',
      page: 'management',
      elementSelectors: [],
      requiresUserAction: true,
    },
    // Step 23: Management - Launcher Assignment
    {
      id: 'management-launcher-assignment',
      title: 'Launcher Assignment',
      content: 'Here you can see how launchers are assigned to PLT Operations Centers (PLT FDCs). Your launcher was automatically assigned to the POC you created. The guide will highlight where this is shown.',
      page: 'management',
      elementSelectors: [
        { selector: '[data-guide="assign-launchers-card"]', scrollIntoView: true, waitForElement: true, description: 'Assign Launchers card' },
      ],
      requiresUserAction: true,
    },
    // Step 18: Navigate to Dashboard
    {
      id: 'navigate-dashboard',
      title: 'Go to Dashboard',
      content: 'Let\'s go to the Dashboard to see your launcher and perform actions.',
      page: 'dashboard',
      elementSelectors: [],
      requiresUserAction: true,
    },
    // Step 19: Dashboard - Launcher Card
    {
      id: 'dashboard-launcher',
      title: 'View Your Launcher',
      content: 'Here\'s your launcher on the Dashboard. The guide will highlight it and explain the information shown.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[data-guide="launcher-card"]', scrollIntoView: true, waitForElement: true, description: 'Launcher card' },
      ],
      requiresUserAction: true,
    },
    // Step 20: Reload Button
    {
      id: 'reload-button',
      title: 'Reload Launcher',
      content: 'Click the "Reload" button on your launcher to load a pod.',
      page: 'dashboard',
      elementSelectors: [
        { textMatch: 'Reload', tagName: 'button', description: 'Reload button' },
      ],
      requiresUserAction: true,
    },
    // Step 21: Reload Modal - Pod Selection
    {
      id: 'reload-modal-pod',
      title: 'Select a Pod',
      content: 'The reload menu is displayed. Select the first pod in the list to reload your launcher.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] button, [role="dialog"] [class*="pod"]', description: 'Pod selection' },
      ],
      requiresUserAction: true,
    },
    // Step 22: Dashboard - Updated Launcher
    {
      id: 'dashboard-updated-launcher',
      title: 'Launcher Reloaded',
      content: 'Your launcher is now loaded with the pod. Notice the updated information showing the loaded pod.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[data-guide="launcher-card"]', scrollIntoView: true, waitForElement: true, description: 'Updated launcher card' },
      ],
      requiresUserAction: true,
    },
    // Step 23: POC Card
    {
      id: 'poc-card',
      title: 'View PLT Operations Center Card',
      content: 'The guide will highlight the PLT Operations Center (PLT FDC) card. Click on it to see detailed information.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[data-guide="poc-card"]', scrollIntoView: true, waitForElement: true, description: 'POC card' },
      ],
      requiresUserAction: true,
      autoAdvance: true,
      waitForCondition: () => {
        // Auto-advance when POC detail modal opens
        return document.querySelector('[role="dialog"]') !== null
      },
    },
    // Step 24: POC Detail Modal - Overview
    {
      id: 'poc-detail-overview',
      title: 'PLT Operations Center Details',
      content: 'The Ammunition Inventory menu shows detailed information for this PLT Operations Center (PLT FDC). The guide will highlight each section as you click "Next".',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"]', scrollIntoView: true, waitForElement: true, description: 'POC detail modal' },
      ],
      requiresUserAction: true,
    },
    // Step 25: POC Detail Modal - RSV Information
    {
      id: 'poc-detail-rsvs',
      title: 'RSV Information',
      content: 'This section shows RSVs (Reload Supply Vehicles) assigned to this PLT Operations Center (PLT FDC). RSVs carry pods that can be used to reload launchers.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] [data-guide="poc-detail-rsvs"]', scrollIntoView: true, waitForElement: false, description: 'RSV Information section' },
      ],
      requiresUserAction: true,
      onStepEnter: () => {
        // Check if RSV section exists, if not, skip this step
        setTimeout(() => {
          const rsvSection = document.querySelector('[role="dialog"] [data-guide="poc-detail-rsvs"]')
          if (!rsvSection) {
            console.log('[InteractiveGuide] RSV section not found, skipping step 25')
            setCurrentStepIndex(prev => prev + 1)
          }
        }, 500)
      },
    },
    // Step 26: POC Detail Modal - Summary Cards
    {
      id: 'poc-detail-summary',
      title: 'Summary Cards',
      content: 'These cards show key statistics: POC STOCK (pods directly assigned to this PLT Operations Center), ON RSVs (pods on RSVs), PODS ON LAUNCHERS (pods currently loaded), and TOTAL PODS (all pods for this PLT Operations Center).',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] [data-guide="poc-detail-summary-cards"]', scrollIntoView: true, waitForElement: true, description: 'Summary cards section' },
      ],
      requiresUserAction: true,
    },
    // Step 27: POC Detail Modal - Pods Available for Reload
    {
      id: 'poc-detail-pods-available',
      title: 'Pods Available for Reload',
      content: 'This section shows pods that are available for reloading launchers. These are pods on POC STOCK and RSVs, grouped by round type.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] [data-guide="poc-detail-pods-available"]', scrollIntoView: true, waitForElement: true, description: 'Pods Available for Reload section' },
      ],
      requiresUserAction: true,
    },
    // Step 28: POC Detail Modal - Pods On Launchers
    {
      id: 'poc-detail-pods-launchers',
      title: 'Pods On Launchers',
      content: 'This section shows pods that are currently loaded on launchers, grouped by round type. These pods are in use and not available for reload.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] [data-guide="poc-detail-pods-launchers"]', scrollIntoView: true, waitForElement: true, description: 'Pods On Launchers section' },
      ],
      requiresUserAction: true,
    },
    // Step 29: POC Detail Modal - Individual Rounds Summary
    {
      id: 'poc-detail-rounds-summary',
      title: 'Individual Rounds Summary',
      content: 'This section provides a detailed breakdown of all rounds by type, showing total rounds, available rounds, and used rounds for each round type.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] [data-guide="poc-detail-rounds-summary"]', scrollIntoView: true, waitForElement: true, description: 'Individual Rounds Summary section' },
      ],
      requiresUserAction: true,
    },
    // Step 30: POC Detail Modal - Close
    {
      id: 'poc-detail-close',
      title: 'Close POC Details',
      content: 'Click the X button to close the POC details menu.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] button[aria-label*="close" i], [role="dialog"] button:has(svg)', description: 'Close button' },
      ],
      requiresUserAction: true,
    },
    // Step 31: End Early Button
    {
      id: 'end-early-button',
      title: 'End Reload Task',
      content: 'Click the "End Early" button to signify the launcher is done with the reload task.',
      page: 'dashboard',
      elementSelectors: [
        { textMatch: 'End Early', tagName: 'button', description: 'End Early button' },
      ],
      requiresUserAction: true,
    },
    // Step 32: Initiate Fire Mission
    {
      id: 'initiate-fire-mission',
      title: 'Initiate Fire Mission',
      content: 'Click the "Initiate Fire Mission" button in the dashboard header to start a new fire mission.',
      page: 'dashboard',
      elementSelectors: [
        { textMatch: 'Initiate Fire Mission', tagName: 'button', scrollIntoView: true, waitForElement: true, description: 'Initiate Fire Mission button' },
      ],
      requiresUserAction: true,
    },
    // Step 33: Fire Mission Form - Target Number
    {
      id: 'fire-mission-target',
      title: 'Enter Target Number',
      content: 'Enter a target number in the target number field.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] input[placeholder*="target" i], [role="dialog"] input[placeholder*="tgt" i]', description: 'Target number input' },
      ],
      requiresUserAction: true,
    },
    // Step 34: Fire Mission Form - Grid
    {
      id: 'fire-mission-grid',
      title: 'Enter Grid',
      content: 'Enter a grid coordinate.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] input[placeholder*="grid" i]', description: 'Grid input' },
      ],
      requiresUserAction: true,
    },
    // Step 35: Fire Mission Form - Ammo Type
    {
      id: 'fire-mission-ammo-type',
      title: 'Select Ammo Type',
      content: 'Select the ammo type filter. Choose the round type that matches what is loaded in your launcher.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] select, [role="dialog"] [role="combobox"]', description: 'Ammo type dropdown' },
      ],
      requiresUserAction: true,
    },
    // Step 36: Fire Mission Form - Rounds
    {
      id: 'fire-mission-rounds',
      title: 'Enter Number of Rounds',
      content: 'Enter the number of rounds to fire. For this guide, enter 3.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] input[type="number"], [role="dialog"] input[placeholder*="round" i]', description: 'Rounds input' },
      ],
      requiresUserAction: true,
    },
    // Step 37: Fire Mission Form - Method of Control
    {
      id: 'fire-mission-method',
      title: 'Enter Method of Control',
      content: 'Enter a method of control.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] input[placeholder*="method" i], [role="dialog"] input[placeholder*="control" i]', description: 'Method of control input' },
      ],
      requiresUserAction: true,
    },
    // Step 38: Fire Mission Form - Remarks
    {
      id: 'fire-mission-remarks',
      title: 'Enter Remarks',
      content: 'The guide will auto-type "ALT 78" in the remarks field.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] textarea, [role="dialog"] input[placeholder*="remark" i]', description: 'Remarks input' },
      ],
      requiresUserAction: false,
      onStepEnter: () => {
        const remarksInput = document.querySelector('[role="dialog"] textarea, [role="dialog"] input[placeholder*="remark" i]') as HTMLInputElement | HTMLTextAreaElement
        if (remarksInput) {
          remarksInput.value = 'ALT 78'
          remarksInput.dispatchEvent(new Event('input', { bubbles: true }))
          remarksInput.dispatchEvent(new Event('change', { bubbles: true }))
        }
      },
    },
    // Step 39: Fire Mission Form - Launcher Selection
    {
      id: 'fire-mission-launcher',
      title: 'Select Launcher',
      content: 'Select your launcher from the list. The guide will highlight the launcher selection area.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[role="dialog"] [data-guide="fire-mission-launcher-list"]', scrollIntoView: true, waitForElement: true, description: 'Launcher selection list' },
      ],
      requiresUserAction: true,
    },
    // Step 40: Fire Mission Form - Initiate
    {
      id: 'fire-mission-initiate',
      title: 'Initiate Mission',
      content: 'Click "Initiate Mission" to start the fire mission.',
      page: 'dashboard',
      elementSelectors: [
        { textMatch: 'Initiate Mission', tagName: 'button', description: 'Initiate Mission button' },
      ],
      requiresUserAction: true,
    },
    // Step 41: Dashboard - Fire Mission Task
    {
      id: 'dashboard-fire-mission-task',
      title: 'Fire Mission Active',
      content: 'Your launcher now shows the active fire mission task. The guide will highlight the updated information.',
      page: 'dashboard',
      elementSelectors: [
        { selector: '[data-guide="launcher-card"], [class*="card"]', description: 'Launcher with fire mission' },
      ],
      requiresUserAction: true,
    },
    // Step 42: End Fire Mission Task
    {
      id: 'end-fire-mission-task',
      title: 'End Fire Mission Task',
      content: 'Click "End Early" to complete the fire mission task.',
      page: 'dashboard',
      elementSelectors: [
        { textMatch: 'End Early', tagName: 'button', description: 'End Early button' },
      ],
      requiresUserAction: true,
    },
    // Step 43: Fire Mission History - Navigate
    {
      id: 'fire-mission-history-navigate',
      title: 'View Fire Mission History',
      content: 'Navigate to Fire Mission History to see your completed fire mission. The guide will walk through the information.',
      page: 'fire-missions',
      elementSelectors: [],
      requiresUserAction: true,
    },
    // Step 44: Fire Mission History - Card Overview
    {
      id: 'fire-mission-history-card',
      title: 'Fire Mission Card',
      content: 'This is your fire mission card. It shows the most recent fire mission at the top. The guide will highlight each piece of information.',
      page: 'fire-missions',
      elementSelectors: [
        { selector: '[data-guide="fire-mission-card"]', scrollIntoView: true, waitForElement: true, description: 'Fire mission card' },
      ],
      requiresUserAction: true,
    },
    // Step 45: Fire Mission History - Target Information
    {
      id: 'fire-mission-history-target',
      title: 'Target Information',
      content: 'The card shows the target number and target name. This identifies which target the fire mission was directed at.',
      page: 'fire-missions',
      elementSelectors: [
        { selector: '[data-guide="fire-mission-card"]', scrollIntoView: true, waitForElement: true, description: 'Target information on fire mission card' },
      ],
      requiresUserAction: true,
    },
    // Step 46: Fire Mission History - Status Badge
    {
      id: 'fire-mission-history-status',
      title: 'Mission Status',
      content: 'The status badge shows whether the mission is "Completed", "In Progress", or "Canceled". Completed missions show in green, in-progress in blue, and canceled in orange.',
      page: 'fire-missions',
      elementSelectors: [
        { selector: '[data-guide="fire-mission-card"]', scrollIntoView: true, waitForElement: true, description: 'Status badge on fire mission card' },
      ],
      requiresUserAction: true,
    },
    // Step 47: Fire Mission History - Mission Details
    {
      id: 'fire-mission-history-details',
      title: 'Mission Details',
      content: 'The card displays key information: Target location, assigned launchers, start time, and completion time (if completed). This gives you a complete overview of the mission.',
      page: 'fire-missions',
      elementSelectors: [
        { selector: '[data-guide="fire-mission-card"]', scrollIntoView: true, waitForElement: true, description: 'Mission details on fire mission card' },
      ],
      requiresUserAction: true,
    },
    // Step 48: Fire Mission History - Edit Button
    {
      id: 'fire-mission-history-edit',
      title: 'Edit Fire Mission',
      content: 'You can click "Edit" to modify the fire mission details, or click anywhere on the card to open the edit modal.',
      page: 'fire-missions',
      elementSelectors: [
        { selector: '[data-guide="fire-mission-card"] button', scrollIntoView: true, waitForElement: true, description: 'Edit button on fire mission card' },
      ],
      requiresUserAction: true,
      autoAdvance: true,
      waitForCondition: () => {
        // Auto-advance when edit modal opens
        return document.querySelector('[role="dialog"]') !== null
      },
    },
    // Step 48.5: Fire Mission History - Close Edit Modal
    {
      id: 'fire-mission-history-close-edit',
      title: 'Close Edit Modal',
      content: 'After reviewing or editing the fire mission details, close the edit modal by clicking the X button in the top right corner.',
      page: 'fire-missions',
      elementSelectors: [
        { selector: '[role="dialog"] button[aria-label*="close" i], [role="dialog"] button:has(svg)', scrollIntoView: false, waitForElement: true, description: 'Close button in edit modal' },
      ],
      requiresUserAction: true,
      autoAdvance: true,
      waitForCondition: () => {
        // Auto-advance when edit modal closes
        return document.querySelector('[role="dialog"]') === null
      },
      onStepEnter: () => {
        // Move guide card to left side when edit modal is open
        setCardPosition({
          left: '2rem',
          right: 'auto',
          top: 'auto',
          bottom: '2rem',
          transform: 'none'
        })
      },
    },
    // Step 49: Print Report
    {
      id: 'print-report',
      title: 'Print Fire Mission Report',
      content: 'Click "Print Report" to generate a printable report of your fire mission.',
      page: 'fire-missions',
      elementSelectors: [
        { textMatch: 'Print', tagName: 'button', description: 'Print Report button' },
      ],
      requiresUserAction: true,
    },
    // Step 50: Ammunition Status Report
    {
      id: 'ammunition-report',
      title: 'Generate Ammunition Status Report',
      content: 'Go back to Dashboard and click "Report" to generate an ammunition status report. The guide will highlight the sections.',
      page: 'dashboard',
      elementSelectors: [
        { textMatch: 'Report', tagName: 'button', description: 'Report button' },
      ],
      requiresUserAction: true,
    },
    // Step 51: Completion
    {
      id: 'completion',
      title: 'Congratulations!',
      content: 'You\'ve completed the interactive guide! You now know the basics of using the FDC Tracker app. Feel free to explore other menus and features.',
      page: 'dashboard',
      elementSelectors: [],
      requiresUserAction: true,
    },
  ]

  const currentStep = useMemo(() => guideSteps[currentStepIndex], [currentStepIndex])
  const currentStepId = currentStep?.id

  // Handle page navigation
  useEffect(() => {
    if (isOpen && currentStep && currentStep.page !== currentPage) {
      console.log('[InteractiveGuide] Navigating to page:', currentStep.page, 'from', currentPage)
      isNavigatingRef.current = true
      try {
        onNavigateToPage(currentStep.page)
        // Reset navigation flag after a delay
        setTimeout(() => {
          isNavigatingRef.current = false
        }, 1000)
      } catch (err) {
        console.error('[InteractiveGuide] Error navigating to page:', err)
        isNavigatingRef.current = false
      }
    }
  }, [isOpen, currentStepId, currentStep?.page, currentPage, onNavigateToPage])

  // Auto-advance function
  const autoAdvance = useCallback(() => {
    const stepId = currentStep?.id
    if (!stepId || hasAutoAdvancedRef.current.has(stepId)) {
      return
    }

    hasAutoAdvancedRef.current.add(stepId)
    console.log('[InteractiveGuide] Auto-advancing from step:', stepId)
    
    // Small delay before advancing to ensure UI has updated
    setTimeout(() => {
      if (currentStepIndex < guideSteps.length - 1) {
        setCurrentStepIndex(prev => prev + 1)
      }
    }, 500)
  }, [currentStep?.id, currentStepIndex, guideSteps.length])

  // Handle auto-advance when waitForCondition is met
  useEffect(() => {
    if (!isOpen || !currentStep) {
      return
    }

    const stepId = currentStep.id
    hasAutoAdvancedRef.current.delete(stepId) // Reset for this step

    // Check waitForCondition if provided
    if (currentStep.waitForCondition) {
      const checkInterval = setInterval(() => {
        try {
          if (currentStep.waitForCondition && currentStep.waitForCondition()) {
            console.log('[InteractiveGuide] Condition met for step:', stepId, '- auto-advancing')
            clearInterval(checkInterval)
            autoAdvance()
          }
        } catch (err) {
          console.error('[InteractiveGuide] Error checking waitForCondition:', err)
        }
      }, 500) // Check every 500ms

      return () => {
        clearInterval(checkInterval)
      }
    }
  }, [isOpen, currentStepId, currentStep?.waitForCondition, autoAdvance])

  // Auto-advance detection for highlighted elements (buttons, inputs, etc.)
  useEffect(() => {
    if (!isOpen || !currentStep || highlightedElements.length === 0) {
      // Clean up listeners
      autoAdvanceListenersRef.current.forEach((cleanup) => cleanup())
      autoAdvanceListenersRef.current.clear()
      return
    }

    const currentElement = highlightedElements[currentHighlightIndex]
    if (!currentElement) return

    // Skip if step requires explicit user action and doesn't have waitForCondition
    if (currentStep.requiresUserAction && !currentStep.waitForCondition && !currentStep.autoAdvance) {
      // Still set up listeners for buttons and forms
    }

    const setupAutoAdvance = (element: HTMLElement) => {
      // Detect button clicks
      if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
        const handleClick = (e: Event) => {
          // Don't auto-advance if clicking the guide's own buttons
          const target = e.target as HTMLElement
          if (target.closest('[data-guide-card="true"]')) {
            return
          }

          console.log('[InteractiveGuide] Button clicked, auto-advancing:', element)
          autoAdvance()
        }
        element.addEventListener('click', handleClick, { once: true, capture: true })
        autoAdvanceListenersRef.current.set(element, () => {
          element.removeEventListener('click', handleClick, { capture: true })
        })
      }

      // Detect form submissions
      const form = element.closest('form') || (element.tagName === 'FORM' ? element : null)
      if (form) {
        const handleSubmit = () => {
          console.log('[InteractiveGuide] Form submitted, auto-advancing:', form)
          autoAdvance()
        }
        form.addEventListener('submit', handleSubmit, { once: true })
        autoAdvanceListenersRef.current.set(form, () => {
          form.removeEventListener('submit', handleSubmit)
        })
      }

      // Detect input changes for form fields (advance after user fills and moves on)
      if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
        let hasChanged = false
        const handleChange = () => {
          hasChanged = true
        }
        const handleBlur = () => {
          if (hasChanged) {
            console.log('[InteractiveGuide] Input filled and blurred, auto-advancing:', element)
            autoAdvance()
          }
        }
        element.addEventListener('change', handleChange)
        element.addEventListener('blur', handleBlur, { once: true })
        autoAdvanceListenersRef.current.set(element, () => {
          element.removeEventListener('change', handleChange)
          element.removeEventListener('blur', handleBlur)
        })
      }

      // Detect navigation clicks (links, nav buttons)
      // Auto-advance if navigation matches the next step's page
      if (element.tagName === 'A' || element.getAttribute('role') === 'link' || 
          element.closest('nav') || element.closest('[role="navigation"]')) {
        const handleClick = (e: Event) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-guide-card="true"]')) {
            return
          }
          
          // Don't auto-advance if guide is currently navigating
          if (isNavigatingRef.current) {
            return
          }
          
          // Check if next step matches the navigation target
          const nextStep = guideSteps[currentStepIndex + 1]
          if (nextStep) {
            // Try to detect which page was navigated to from button text/content
            const buttonText = element.textContent?.toLowerCase() || ''
            const nextPageName = nextStep.page.toLowerCase()
            
            // If button text matches next step page, auto-advance
            if (buttonText.includes(nextPageName) || buttonText.includes('inventory') && nextPageName === 'inventory' ||
                buttonText.includes('management') && nextPageName === 'management' ||
                buttonText.includes('dashboard') && nextPageName === 'dashboard' ||
                buttonText.includes('fire mission') && nextPageName === 'fire-missions' ||
                buttonText.includes('log') && nextPageName === 'logs' ||
                buttonText.includes('setting') && nextPageName === 'settings') {
              console.log('[InteractiveGuide] Navigation clicked matches next step, auto-advancing:', element, 'to', nextStep.page)
              // Wait a bit for navigation to complete
              setTimeout(() => {
                autoAdvance()
              }, 800)
            }
          }
        }
        element.addEventListener('click', handleClick, { once: true, capture: true })
        autoAdvanceListenersRef.current.set(element, () => {
          element.removeEventListener('click', handleClick, { capture: true })
        })
      }
    }

    // Set up auto-advance for current highlighted element
    if (currentElement) {
      setupAutoAdvance(currentElement)
    }

    // Cleanup function
    return () => {
      autoAdvanceListenersRef.current.forEach((cleanup) => cleanup())
      autoAdvanceListenersRef.current.clear()
    }
  }, [isOpen, currentStepId, highlightedElements, currentHighlightIndex, autoAdvance])

  // Auto-advance on page navigation completion (only for navigation-only steps)
  useEffect(() => {
    if (!isOpen || !currentStep) return

    // If step has no elements and is just navigation, auto-advance after navigation completes
    // But only if we're on the correct page and haven't already advanced
    if (currentStep.elementSelectors.length === 0 && currentStep.page === currentPage) {
      const stepId = currentStep.id
      if (!hasAutoAdvancedRef.current.has(stepId) && !isNavigatingRef.current) {
        console.log('[InteractiveGuide] Navigation step completed, auto-advancing:', stepId)
        // Wait a bit for page to render
        const timeout = setTimeout(() => {
          autoAdvance()
        }, 1000)
        return () => clearTimeout(timeout)
      }
    }
  }, [isOpen, currentStepId, currentStep?.page, currentStep?.elementSelectors?.length, currentPage, autoAdvance])

  // Auto-advance when user navigates to a page that matches the next step
  useEffect(() => {
    if (!isOpen || !currentStep || isNavigatingRef.current) return

    const nextStep = guideSteps[currentStepIndex + 1]
    if (nextStep && nextStep.page === currentPage && currentStep.page !== currentPage) {
      // User navigated to a page that matches the next step
      const stepId = currentStep.id
      if (!hasAutoAdvancedRef.current.has(stepId)) {
        console.log('[InteractiveGuide] User navigated to next step page, auto-advancing:', stepId, 'to', nextStep.id)
        // Wait a bit for page to render
        const timeout = setTimeout(() => {
          autoAdvance()
        }, 1000)
        return () => clearTimeout(timeout)
      }
    }
  }, [isOpen, currentStepId, currentStepIndex, currentStep?.page, currentPage, guideSteps, autoAdvance])

  // Track previous page to detect navigation changes
  useEffect(() => {
    if (!isOpen || !currentStep || isNavigatingRef.current) {
      prevPageRef.current = currentPage
      return
    }

    // If page changed and it matches the next step, auto-advance
    if (prevPageRef.current !== null && prevPageRef.current !== currentPage) {
      const nextStep = guideSteps[currentStepIndex + 1]
      if (nextStep && nextStep.page === currentPage) {
        const stepId = currentStep.id
        if (!hasAutoAdvancedRef.current.has(stepId)) {
          console.log('[InteractiveGuide] Page changed to next step page, auto-advancing:', stepId, 'to', nextStep.id)
          setTimeout(() => {
            autoAdvance()
          }, 1000)
        }
      }
    }
    
    prevPageRef.current = currentPage
  }, [isOpen, currentStepId, currentStepIndex, currentStep?.page, currentPage, guideSteps, autoAdvance])

  // Reset card position when step changes (unless it's step 48.5)
  useEffect(() => {
    if (!isOpen || !currentStep) return
    
    // Reset card position to center when moving away from step 48.5
    if (currentStep.id !== 'fire-mission-history-close-edit') {
      const hasModal = document.querySelector('[role="dialog"]') !== null
      if (!hasModal) {
        setCardPosition({
          bottom: '2rem',
          top: 'auto',
          left: '50%',
          right: 'auto',
          transform: 'translateX(-50%)'
        })
      }
    }
  }, [isOpen, currentStepId])

  // Handle element highlighting and scrolling
  useEffect(() => {
    if (!isOpen || !currentStep) {
      // Clear highlights when guide is closed
      setHighlightedElements([])
      return
    }

    // Clear previous scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    const highlightElements = async () => {
      try {
        console.log('[InteractiveGuide] Starting highlightElements for step:', currentStep.id)
        // Wait for page to render and navigation to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Force a reflow to ensure DOM is fully rendered
        if (document.body) {
          document.body.offsetHeight
        } else {
          console.error('[InteractiveGuide] document.body is null!')
          return
        }
        
        const elements: HTMLElement[] = []
        const stepId = currentStep.id
        console.log('[InteractiveGuide] Looking for', currentStep.elementSelectors.length, 'elements')
        
        for (const selector of currentStep.elementSelectors) {
          try {
            let element: HTMLElement | null = null
            
            if (selector.waitForElement) {
              element = await findElement(selector.selector || '', 20, 250, selector.textMatch, selector.tagName, selector.getParentContainer)
            } else {
              // Try multiple times with delays for non-wait elements too
              for (let attempt = 0; attempt < 5 && !element; attempt++) {
                if (selector.selector) {
                  element = document.querySelector(selector.selector) as HTMLElement
                }
                if (!element && selector.textMatch) {
                  element = findElementByText(selector.textMatch, selector.tagName, selector.getParentContainer)
                }
                if (!element && attempt < 4) {
                  await new Promise(resolve => setTimeout(resolve, 100))
                }
              }
            }
            
            if (element && document.body.contains(element)) {
              elements.push(element)
              
              // Scroll first if needed, then set highlighted elements after scroll completes
              if (selector.scrollIntoView && !hasScrolledRef.current.has(stepId)) {
                hasScrolledRef.current.add(stepId)
                // Scroll immediately and wait for it to complete
                try {
                  await scrollToElement(element, 200)
                  // Small delay to ensure DOM has settled after scroll
                  await new Promise(resolve => setTimeout(resolve, 200))
                } catch (err) {
                  console.error('[InteractiveGuide] Error scrolling to element:', err)
                }
              }
            }
          } catch (err) {
            console.error('[InteractiveGuide] Error finding element:', err)
          }
        }

        console.log('[InteractiveGuide] Found', elements.length, 'elements to highlight')
        setHighlightedElements(elements)
        setCurrentHighlightIndex(0)

        // Call onStepEnter if provided
        if (currentStep.onStepEnter) {
          try {
            console.log('[InteractiveGuide] Calling onStepEnter')
            currentStep.onStepEnter()
          } catch (err) {
            console.error('[InteractiveGuide] Error in onStepEnter:', err)
          }
        }
      } catch (err) {
        console.error('[InteractiveGuide] Error in highlightElements:', err)
        console.error('[InteractiveGuide] Error stack:', err instanceof Error ? err.stack : 'No stack trace')
        // Still set empty array so guide card can render
        setHighlightedElements([])
      }
    }

    highlightElements()

    // Cleanup
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isOpen, currentStepId, currentPage])

  // Create highlight overlays
  useEffect(() => {
    if (!isOpen) {
      // Clear all highlights when guide is closed
      try {
        highlightRefs.current.forEach((highlight) => {
          if (highlight && highlight.parentNode) {
            highlight.parentNode.removeChild(highlight)
          }
        })
        highlightRefs.current.clear()
        overlayRefs.current.forEach((overlay) => {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay)
          }
        })
        overlayRefs.current.clear()
      } catch (err) {
        console.error('[InteractiveGuide] Error clearing highlights:', err)
      }
      return
    }

    // Safety: Clear any existing highlights when guide opens (in case of leftover highlights)
    try {
      highlightRefs.current.forEach((highlight) => {
        if (highlight && highlight.parentNode) {
          highlight.parentNode.removeChild(highlight)
        }
      })
      highlightRefs.current.clear()
      overlayRefs.current.forEach((overlay) => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay)
        }
      })
      overlayRefs.current.clear()
    } catch (err) {
      console.error('[InteractiveGuide] Error clearing existing highlights on open:', err)
    }

    if (highlightedElements.length === 0) {
      // Clear highlights if no elements
      try {
        highlightRefs.current.forEach((highlight) => {
          if (highlight && highlight.parentNode) {
            highlight.parentNode.removeChild(highlight)
          }
        })
        highlightRefs.current.clear()
        overlayRefs.current.forEach((overlay) => {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay)
          }
        })
        overlayRefs.current.clear()
      } catch (err) {
        console.error('Error clearing highlights:', err)
      }
      return
    }

    const currentElement = highlightedElements[currentHighlightIndex]
    if (!currentElement || !document.body.contains(currentElement)) return

    // Clear existing highlights first
    try {
      highlightRefs.current.forEach((highlight) => {
        if (highlight && highlight.parentNode) {
          highlight.parentNode.removeChild(highlight)
        }
      })
      highlightRefs.current.clear()
      overlayRefs.current.forEach((overlay) => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay)
        }
      })
      overlayRefs.current.clear()
    } catch (err) {
      console.error('Error clearing existing highlights:', err)
    }

    // Check if element is still in DOM
    if (!document.body.contains(currentElement)) {
      return
    }

    const updateHighlightPosition = () => {
      if (!document.body.contains(currentElement)) {
        // Element removed from DOM, clean up highlight
        const highlightToRemove = highlightRefs.current.get(currentElement)
        if (highlightToRemove && highlightToRemove.parentNode) {
          highlightToRemove.parentNode.removeChild(highlightToRemove)
        }
        highlightRefs.current.delete(currentElement)
        return
      }
      
      const newRect = currentElement.getBoundingClientRect()

      // Validate dimensions before updating
      if (newRect.width <= 0 || newRect.height <= 0) {
        console.warn('[InteractiveGuide] Element has invalid dimensions during update, removing highlight')
        const highlightToRemove = highlightRefs.current.get(currentElement)
        if (highlightToRemove && highlightToRemove.parentNode) {
          highlightToRemove.parentNode.removeChild(highlightToRemove)
        }
        highlightRefs.current.delete(currentElement)
        return
      }

      // Update highlight border - use fixed positioning for better scroll handling
      const existingHighlight = highlightRefs.current.get(currentElement)
      if (existingHighlight && existingHighlight.style) {
        // Use fixed positioning so it stays relative to viewport
        existingHighlight.style.position = 'fixed'
        existingHighlight.style.left = `${newRect.left}px`
        existingHighlight.style.top = `${newRect.top}px`
        existingHighlight.style.width = `${newRect.width}px`
        existingHighlight.style.height = `${newRect.height}px`
      }
    }

    // Use requestAnimationFrame for smooth, lag-free updates
    const throttledUpdate = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
      rafIdRef.current = requestAnimationFrame(() => {
        updateHighlightPosition()
        rafIdRef.current = null
      })
    }

    // Create highlight
    const rect = currentElement.getBoundingClientRect()

    // Validate element dimensions - don't create highlight if element is invalid
    // This prevents the black screen issue when elements have 0 dimensions or are off-screen
    if (rect.width <= 0 || rect.height <= 0) {
      console.warn('[InteractiveGuide] Element has invalid dimensions, skipping highlight:', {
        width: rect.width,
        height: rect.height,
        element: currentElement
      })
      return
    }

    // Check if element is at least partially visible in viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const isVisible = !(
      rect.right < 0 ||
      rect.bottom < 0 ||
      rect.left > viewportWidth ||
      rect.top > viewportHeight
    )

    if (!isVisible) {
      // If element is not visible, wait a bit and retry (in case scroll is still completing)
      // Smooth scroll can take up to 1000ms, so wait longer
      console.log('[InteractiveGuide] Element not immediately visible, waiting for scroll to complete...')
      setTimeout(() => {
        const retryRect = currentElement.getBoundingClientRect()
        const retryIsVisible = !(
          retryRect.right < 0 ||
          retryRect.bottom < 0 ||
          retryRect.left > viewportWidth ||
          retryRect.top > viewportHeight
        )
        if (retryIsVisible && retryRect.width > 0 && retryRect.height > 0 && document.body.contains(currentElement)) {
          // Element is now visible, create highlight
          const highlight = document.createElement('div')
          highlight.style.position = 'fixed'
          highlight.style.left = `${retryRect.left}px`
          highlight.style.top = `${retryRect.top}px`
          highlight.style.width = `${retryRect.width}px`
          highlight.style.height = `${retryRect.height}px`
          highlight.style.border = '4px solid #60a5fa'
          highlight.style.borderRadius = '6px'
          highlight.style.boxShadow = `
            0 0 0 9999px rgba(0, 0, 0, 0.4),
            0 0 0 4px rgba(96, 165, 250, 0.8),
            0 0 30px rgba(96, 165, 250, 0.6)
          `
          highlight.style.pointerEvents = 'none'
          highlight.style.zIndex = '10004'
          highlight.style.transition = 'none'
          highlight.style.boxSizing = 'border-box'
          highlight.style.backgroundColor = 'transparent'
          highlight.style.outline = 'none'
          if (document.body) {
            document.body.appendChild(highlight)
            highlightRefs.current.set(currentElement, highlight)
            console.log('[InteractiveGuide] Highlight created after retry')
          }
        } else {
          console.warn('[InteractiveGuide] Element still not visible after retry, skipping highlight:', {
            rect: retryRect,
            viewport: { width: viewportWidth, height: viewportHeight }
          })
        }
      }, 1500) // Wait longer for smooth scroll to complete
      return
    }

    // Create highlight border - completely transparent, only shows border and glow
    try {
      const highlight = document.createElement('div')
      // Use fixed positioning so it stays relative to viewport and updates on scroll
      highlight.style.position = 'fixed'
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
      highlight.style.border = '4px solid #60a5fa'
      highlight.style.borderRadius = '6px'
      // Use box-shadow to create dark overlay everywhere except the highlighted area
      // Reduced opacity to prevent screen from going completely black
      highlight.style.boxShadow = `
        0 0 0 9999px rgba(0, 0, 0, 0.4),
        0 0 0 4px rgba(96, 165, 250, 0.8),
        0 0 30px rgba(96, 165, 250, 0.6)
      `
      highlight.style.pointerEvents = 'none'
      highlight.style.zIndex = '10004'
      highlight.style.transition = 'none' // Remove transition for instant updates on scroll
      highlight.style.boxSizing = 'border-box'
      highlight.style.backgroundColor = 'transparent'
      highlight.style.outline = 'none'

      if (document.body) {
        document.body.appendChild(highlight)
        highlightRefs.current.set(currentElement, highlight)
        console.log('[InteractiveGuide] Highlight created successfully:', {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top
        })
      }
    } catch (err) {
      console.error('[InteractiveGuide] Error creating highlight:', err)
    }

    // Add event listeners - use capture phase and listen to all scroll events
    window.addEventListener('scroll', throttledUpdate, { passive: true, capture: true })
    window.addEventListener('resize', throttledUpdate, { passive: true })
    // Also listen to scroll on document and body
    document.addEventListener('scroll', throttledUpdate, { passive: true, capture: true })
    document.body?.addEventListener('scroll', throttledUpdate, { passive: true, capture: true })

    // Initial update
    updateHighlightPosition()
    
    // Also update after a short delay to ensure element is positioned
    setTimeout(updateHighlightPosition, 50)

    return () => {
      // Cancel any pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      window.removeEventListener('scroll', throttledUpdate, { capture: true })
      window.removeEventListener('resize', throttledUpdate)
      document.removeEventListener('scroll', throttledUpdate, { capture: true })
      document.body?.removeEventListener('scroll', throttledUpdate, { capture: true })
      if (updatePositionTimeoutRef.current) {
        clearTimeout(updatePositionTimeoutRef.current)
        updatePositionTimeoutRef.current = null
      }
      const highlightToRemove = highlightRefs.current.get(currentElement)
      if (highlightToRemove && highlightToRemove.parentNode) {
        highlightToRemove.parentNode.removeChild(highlightToRemove)
      }
      highlightRefs.current.delete(currentElement)
    }
  }, [isOpen, highlightedElements, currentHighlightIndex])

  const handleNext = useCallback(() => {
    // If there are multiple highlights, cycle through them
    if (highlightedElements.length > 1 && currentHighlightIndex < highlightedElements.length - 1) {
      setCurrentHighlightIndex(prev => prev + 1)
      return
    }

    // Otherwise, move to next step
    if (currentStepIndex < guideSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }, [currentStepIndex, guideSteps.length, highlightedElements.length, currentHighlightIndex, onClose])

  const handlePrevious = useCallback(() => {
    // If we're in the middle of multiple highlights, go back
    if (currentHighlightIndex > 0) {
      setCurrentHighlightIndex(prev => prev - 1)
      return
    }

    // Otherwise, go to previous step
    if (currentStepIndex > 0) {
      // Remove the previous step from hasScrolledRef so it can scroll again if needed
      const prevStepId = guideSteps[currentStepIndex - 1]?.id
      if (prevStepId) {
        hasScrolledRef.current.delete(prevStepId)
      }
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex, currentHighlightIndex, guideSteps])

  const handleSkip = () => {
    onClose()
  }

  // Update guide card position based on highlighted element
  // MUST be before conditional returns - all hooks must be called unconditionally
  useEffect(() => {
    if (!isOpen) return // Early return is OK inside useEffect
    
    if (highlightedElements.length === 0 || !guideCardRef.current) {
      setCardPosition({ bottom: '2rem', top: 'auto', transform: 'translateX(-50%)' })
      return
    }
    
    const currentElement = highlightedElements[currentHighlightIndex]
    if (!currentElement) {
      setCardPosition({ bottom: '2rem', top: 'auto', transform: 'translateX(-50%)' })
      return
    }
    
    const updatePosition = () => {
      if (!document.body.contains(currentElement)) return
      
      const rect = currentElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const elementTop = rect.top
      const elementBottom = rect.bottom
      const elementHeight = rect.height
      const guideCardHeight = guideCardRef.current?.offsetHeight || 250
      const padding = 20
      
      // Check if element is in bottom half of viewport
      const elementCenterY = elementTop + elementHeight / 2
      const isElementInBottomHalf = elementCenterY > viewportHeight / 2
      
      // Calculate space available
      const spaceAbove = elementTop
      const spaceBelow = viewportHeight - elementBottom
      
      // Position guide to avoid overlap
      // If element is in bottom half and there's enough space above, put guide at top
      if (isElementInBottomHalf && spaceAbove > guideCardHeight + padding) {
        setCardPosition({ top: '2rem', bottom: 'auto', transform: 'translateX(-50%)' })
      } else if (!isElementInBottomHalf && spaceBelow > guideCardHeight + padding) {
        setCardPosition({ bottom: '2rem', top: 'auto', transform: 'translateX(-50%)' })
      } else {
        // Not enough space on either side, position at top to avoid covering element
        setCardPosition({ top: '2rem', bottom: 'auto', transform: 'translateX(-50%)' })
      }
    }
    
    // Initial position update
    updatePosition()
    
    // Update on scroll/resize - update immediately for smooth repositioning
    const handleUpdate = () => {
      updatePosition() // Update immediately, no delay
    }
    
    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true })
    window.addEventListener('resize', handleUpdate, { passive: true })
    document.addEventListener('scroll', handleUpdate, { passive: true, capture: true })
    document.body?.addEventListener('scroll', handleUpdate, { passive: true, capture: true })
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, { capture: true })
      window.removeEventListener('resize', handleUpdate)
      document.removeEventListener('scroll', handleUpdate, { capture: true })
      document.body?.removeEventListener('scroll', handleUpdate, { capture: true })
    }
  }, [isOpen, highlightedElements, currentHighlightIndex])

  // All hooks must be before conditional returns
  if (!isOpen) {
    console.log('[InteractiveGuide] Not rendering - isOpen is false')
    return null
  }
  
  if (!currentStep) {
    console.error('[InteractiveGuide] Not rendering - currentStep is null!', { currentStepIndex, guideStepsLength: guideSteps.length })
    return null
  }

  console.log('[InteractiveGuide] Rendering guide card', { 
    stepIndex: currentStepIndex, 
    stepId: currentStep.id,
    highlightedElementsCount: highlightedElements.length 
  })

  const progress = ((currentStepIndex + 1) / guideSteps.length) * 100
  const hasMultipleHighlights = highlightedElements.length > 1
  const isLastHighlight = currentHighlightIndex === highlightedElements.length - 1

  // Don't render overlay at all - the highlight box-shadow handles the darkening
  return (
    <>

      {/* Guide Card */}
      <div
        ref={guideCardRef}
        data-guide-card="true"
        style={{
          position: 'fixed',
          ...cardPosition,
          left: cardPosition.left || '50%',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '35vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '2px solid var(--accent-color)',
          zIndex: 10005,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          transition: 'top 0.3s ease, bottom 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
              }}
            >
              <HelpCircle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {currentStep.title}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Step {currentStepIndex + 1} of {guideSteps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: 'var(--accent-color)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            {currentStep.content}
          </p>
          {hasMultipleHighlights && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Highlight {currentHighlightIndex + 1} of {highlightedElements.length} - Click "Next" to see the next element
            </p>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Skip Guide
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(currentStepIndex > 0 || currentHighlightIndex > 0) && (
              <button
                type="button"
                onClick={handlePrevious}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ChevronLeft size={18} />
                Previous
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {currentStepIndex === guideSteps.length - 1 && isLastHighlight
                ? 'Finish'
                : hasMultipleHighlights && !isLastHighlight
                ? 'Next Element'
                : 'Next'}
              {!(currentStepIndex === guideSteps.length - 1 && isLastHighlight) && (
                <ChevronRight size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
