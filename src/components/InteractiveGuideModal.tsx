import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, HelpCircle, CheckCircle, ArrowRight } from 'lucide-react'

type Page = 'dashboard' | 'inventory' | 'management' | 'logs' | 'settings' | 'fire-missions'

interface GuideStep {
  id: string
  title: string
  page: Page
  content: string
  highlights: string[]
  actionItems: string[]
}

const guideSteps: GuideStep[] = [
  {
    id: 'intro',
    title: 'Welcome to the Interactive Guide!',
    page: 'settings',
    content: 'This guide will walk you through the key features and actions in the FDC Tracker app. You can navigate through the steps at your own pace.',
    highlights: [],
    actionItems: [
      'Click "Next" to continue through each step',
      'The guide will navigate you to different pages automatically',
      'You can skip or exit at any time'
    ]
  },
  {
    id: 'dashboard-overview',
    title: 'Dashboard - Your Command Center',
    page: 'dashboard',
    content: 'The Dashboard gives you a complete overview of all your assets. Here you can see all POCs, their launchers, and the Ammo PLT status.',
    highlights: [
      'View all POCs and their assigned launchers',
      'See real-time ammo counts and pod status',
      'Monitor launcher readiness'
    ],
    actionItems: [
      'Click on any POC card to see detailed information',
      'Click on launcher cards to view launcher details',
      'Use the "Initiate Fire Mission" button to start a new mission',
      'Generate reports using the "Report" button'
    ]
  },
  {
    id: 'inventory-create',
    title: 'Inventory - Create Your Assets',
    page: 'inventory',
    content: 'The Inventory page is where you create and manage all your assets: BOCs, POCs, Launchers, Pods, RSVs, and Rounds.',
    highlights: [
      'Create BOCs (Battery Operations Centers)',
      'Create POCs (PLT Operations Centers)',
      'Add Launchers to your POCs',
      'Create Pods with rounds',
      'Set up RSVs (Resupply Vehicles)'
    ],
    actionItems: [
      'Use the "+" buttons to expand creation forms',
      'Fill in names and required fields',
      'For Pods: Select round type and quantity',
      'Click "Create" to add items to your inventory'
    ]
  },
  {
    id: 'management-assign',
    title: 'Management - Assign Your Assets',
    page: 'management',
    content: 'The Management page is where you assign assets to each other. This creates the organizational structure of your unit.',
    highlights: [
      'Assign Pods to Launchers',
      'Assign Launchers to POCs',
      'Assign POCs to BOCs',
      'Assign Pods to RSVs',
      'Create and assign Tasks to Launchers'
    ],
    actionItems: [
      'Expand sections to see available items',
      'Use dropdowns to select assignments',
      'Click "Assign" to link items together',
      'Tasks can be assigned to track launcher activities'
    ]
  },
  {
    id: 'fire-missions',
    title: 'Fire Missions - Track Operations',
    page: 'fire-missions',
    content: 'The Fire Missions page shows all your active and completed fire missions. You can view details, edit, and track mission status.',
    highlights: [
      'View all fire missions in one place',
      'See mission status and timing',
      'Edit mission details',
      'Track completed missions'
    ],
    actionItems: [
      'Click on a mission card to view details',
      'Use "Edit" to modify mission information',
      'Monitor mission progress and completion',
      'View mission statistics at the top'
    ]
  },
  {
    id: 'dashboard-actions',
    title: 'Dashboard Actions - Key Features',
    page: 'dashboard',
    content: 'The Dashboard header contains important action buttons for common tasks.',
    highlights: [
      'Initiate Fire Mission: Start a new fire mission',
      'Report: Generate ASCII reports',
      'Save/Load: Export and import your data'
    ],
    actionItems: [
      'Click "Initiate Fire Mission" to create a new mission',
      'Use "Report" to generate status reports',
      'Save your data regularly using "Save/Load"',
      'Load previously saved data when needed'
    ]
  },
  {
    id: 'settings-help',
    title: 'Settings & Help - Your Resource',
    page: 'settings',
    content: 'The Settings page contains helpful information, role management, and configuration options.',
    highlights: [
      'Change your user role (BOC or POC)',
      'View getting started guide',
      'Manage round types',
      'Access terminology reference',
      'View changelog'
    ],
    actionItems: [
      'Change your role if needed',
      'Review the Getting Started section',
      'Add or enable/disable round types',
      'Check the Terminology section for definitions',
      'Access this guide anytime from Settings'
    ]
  },
  {
    id: 'logs',
    title: 'Logs - Activity Tracking',
    page: 'logs',
    content: 'The Logs page shows all activity and changes in the system. This helps you track what has happened and when.',
    highlights: [
      'View all system activity',
      'See timestamps for all actions',
      'Track changes to inventory',
      'Monitor mission activities'
    ],
    actionItems: [
      'Scroll through logs to see activity history',
      'Use logs to audit system changes',
      'Logs are automatically generated for all actions'
    ]
  },
  {
    id: 'conclusion',
    title: 'You\'re All Set!',
    page: 'settings',
    content: 'You now know the basics of using the FDC Tracker app. Feel free to explore and experiment!',
    highlights: [
      'Start by creating your inventory',
      'Assign assets in Management',
      'Monitor everything from the Dashboard',
      'Generate reports as needed'
    ],
    actionItems: [
      'You can access this guide again from Settings',
      'Check the Getting Started section for more details',
      'Explore each page to learn more',
      'Don\'t forget to save your data regularly!'
    ]
  }
]

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = guideSteps[currentStepIndex]

  // Navigate to the page for the current step
  useEffect(() => {
    if (isOpen && currentStep && currentStep.page !== currentPage) {
      onNavigateToPage(currentStep.page)
    }
  }, [isOpen, currentStep, currentPage, onNavigateToPage])

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStepIndex < guideSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const progress = ((currentStepIndex + 1) / guideSteps.length) * 100

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
        zIndex: 10002,
        padding: '1rem',
      }}
      onClick={(e) => {
        // Allow closing by clicking outside
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-color)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
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

        {/* Progress Bar */}
        <div
          style={{
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                fontWeight: '500',
              }}
            >
              Step {currentStepIndex + 1} of {guideSteps.length}
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '3px',
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

        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0,
            }}
          >
            <HelpCircle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              {currentStep.title}
            </h2>
            <p
              style={{
                margin: '0.25rem 0 0 0',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
              }}
            >
              {currentStep.page.charAt(0).toUpperCase() + currentStep.page.slice(1).replace('-', ' ')} Page
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '1.5rem', flex: 1 }}>
          <p
            style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              fontSize: '1rem',
            }}
          >
            {currentStep.content}
          </p>

          {/* Highlights */}
          {currentStep.highlights.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle size={18} style={{ color: 'var(--accent-color)' }} />
                Key Features
              </h3>
              <ul
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.8',
                  paddingLeft: '1.5rem',
                  margin: 0,
                }}
              >
                {currentStep.highlights.map((highlight, idx) => (
                  <li key={idx}>{highlight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {currentStep.actionItems.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ArrowRight size={18} style={{ color: 'var(--accent-color)' }} />
                What to Do
              </h3>
              <ul
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: '1.8',
                  paddingLeft: '1.5rem',
                  margin: 0,
                }}
              >
                {currentStep.actionItems.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'space-between',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            onClick={handleSkip}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Skip Guide
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
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
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              {currentStepIndex === guideSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStepIndex < guideSteps.length - 1 && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

