import { useState, useEffect, useRef } from 'react'
import { Download, Upload, SlidersHorizontal } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { formatRoleDisplay } from '../constants/roles'
import { useAppNavigation } from '../context/NavigationContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useIsTablet } from '../hooks/useIsTablet'

interface DashboardHeaderProps {
  onInitiateFireMission?: () => void
  onReport?: () => void
  onSaveLoad?: () => void
  onSaveToFile?: () => void
  onLoadFromFile?: (file: File) => Promise<boolean>
}

/**
 * Renders the Dashboard Header UI section.
 */
export default function DashboardHeader({
  onInitiateFireMission,
  onReport,
  onSaveLoad,
  onSaveToFile,
  onLoadFromFile,
}: DashboardHeaderProps) {
  const { currentUserRole } = useAppData()
  const { navigateTo } = useAppNavigation()
  // --- Local state and callbacks ---
  const [currentTime, setCurrentTime] = useState(new Date())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

  // --- Side effects ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

    /**
   * Implements format date for this module.
   */
const formatDate = (date: Date) => {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${month}/${day}/${year}`
  }

    /**
   * Implements format time for this module.
   */
const formatTime = (date: Date) => {
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds} ZULU`
  }

    /**
   * Handles save click interactions for this workflow.
   */
const handleSaveClick = () => {
    if (onSaveToFile) {
      onSaveToFile()
    } else if (onSaveLoad) {
      onSaveLoad()
    }
  }

    /**
   * Handles load click interactions for this workflow.
   */
const handleLoadClick = () => {
    fileInputRef.current?.click()
  }

    /**
   * Handles file change interactions for this workflow.
   */
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onLoadFromFile) {
      const ok = await onLoadFromFile(file)
      if (!ok) {
        alert('Failed to load file. Please ensure it is a valid Walker Track save file.')
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // --- Render ---
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        gap: isMobile ? '1rem' : '0',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0.75rem' : '1rem',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
      }}
    >
      {/* Left: Time & Date */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        <div
          style={{
            fontSize: isMobile ? '0.625rem' : '0.75rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          Current Time & Date
        </div>
        <div
          style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
          }}
        >
          {formatDate(currentTime)}
        </div>
        <div
          style={{
            fontSize: isMobile ? '0.875rem' : '1rem',
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
          }}
        >
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Center: Fire mission — PLT (POC) view role only */}
      {currentUserRole?.type === 'poc' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={onInitiateFireMission}
            style={{
              padding: isMobile ? '0.875rem 1.5rem' : isTablet ? '1.25rem 2.5rem' : '1rem 2rem',
              backgroundColor: '#dc2626',
              border: '2px solid #000',
              borderRadius: '8px',
              color: '#fff',
              fontSize: isMobile ? '1rem' : isTablet ? '1.25rem' : '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'background-color 0.2s',
              minHeight: isTablet ? '56px' : '48px',
              touchAction: 'manipulation',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626'
            }}
          >
            Initiate Fire Mission
          </button>
        </div>
      )}

      {/* Right: User Info and Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: isMobile ? '0.9rem' : '1.1rem',
            color: 'var(--text-primary)',
            fontWeight: '600',
            marginBottom: isMobile ? '0' : '0.25rem',
            textAlign: isMobile ? 'left' : 'right',
          }}
        >
          {currentUserRole ? formatRoleDisplay(currentUserRole) : 'No view role set'}
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          {currentUserRole && (
            <button
              type="button"
              onClick={() => navigateTo('settings')}
              style={{
                padding: isTablet ? '0.75rem 1rem' : '0.5rem 0.85rem',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: isTablet ? '1rem' : '0.85rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                minHeight: isTablet ? '48px' : '44px',
              }}
              title="Change role / view in Settings"
            >
              <SlidersHorizontal size={isTablet ? 20 : 16} />
              {!isMobile && <span>Change view</span>}
            </button>
          )}
          <button
            onClick={onReport}
            style={{
              padding: isTablet ? '0.75rem 1.5rem' : '0.5rem 1rem',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: isTablet ? '1.1rem' : '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: isTablet ? '48px' : '44px',
              flex: isMobile ? '1 1 auto' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Report
          </button>
          <button
            onClick={handleSaveClick}
            style={{
              padding: isTablet ? '0.75rem 1.25rem' : '0.5rem 1rem',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1rem' : '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: isTablet ? '48px' : '44px',
              minWidth: isTablet ? '48px' : '44px',
              transition: 'all 0.2s',
            }}
            title="Export to file"
          >
            <Download size={isTablet ? 20 : 16} />
            {(isMobile || isTablet) && <span>Save</span>}
          </button>
          <button
            onClick={handleLoadClick}
            style={{
              padding: isTablet ? '0.75rem 1.25rem' : '0.5rem 1rem',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1rem' : '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: isTablet ? '48px' : '44px',
              minWidth: isTablet ? '48px' : '44px',
              transition: 'all 0.2s',
            }}
            title="Import from file"
          >
            <Upload size={isTablet ? 20 : 16} />
            {(isMobile || isTablet) && <span>Load</span>}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
