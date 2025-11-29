import { useState, useEffect, useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { useIsMobile } from '../hooks/useIsMobile'

interface DashboardHeaderProps {
  onInitiateFireMission?: () => void
  onReport?: () => void
  onSaveLoad?: () => void
  onSaveToFile?: () => void
  onLoadFromFile?: (file: File) => Promise<void>
}

export default function DashboardHeader({
  onInitiateFireMission,
  onReport,
  onSaveLoad,
  onSaveToFile,
  onLoadFromFile,
}: DashboardHeaderProps) {
  const { currentUserRole } = useAppData()
  const [currentTime, setCurrentTime] = useState(new Date())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${month}/${day}/${year}`
  }

  const formatTime = (date: Date) => {
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds} ZULU`
  }

  const handleSaveClick = () => {
    if (onSaveToFile) {
      onSaveToFile()
    } else if (onSaveLoad) {
      onSaveLoad()
    }
  }

  const handleLoadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onLoadFromFile) {
      try {
        await onLoadFromFile(file)
      } catch (error) {
        alert('Failed to load file. Please ensure it is a valid FDC Tracker save file.')
      }
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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

      {/* Center: Initiate Fire Mission Button */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={onInitiateFireMission}
          style={{
            padding: isMobile ? '0.875rem 1.5rem' : '1rem 2rem',
            backgroundColor: '#dc2626',
            border: '2px solid #000',
            borderRadius: '6px',
            color: '#fff',
            fontSize: isMobile ? '1rem' : '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'background-color 0.2s',
            minHeight: '44px', // Touch-friendly
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
          {currentUserRole 
            ? `${currentUserRole.type.toUpperCase()}: ${currentUserRole.name}`
            : 'No Role Assigned'}
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          <button
            onClick={onReport}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '44px', // Touch-friendly
              flex: isMobile ? '1 1 auto' : 'none',
            }}
          >
            Report
          </button>
          <button
            onClick={handleSaveClick}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: '44px', // Touch-friendly
              minWidth: '44px', // Touch-friendly
            }}
            title="Export to file"
          >
            <Download size={16} />
            {isMobile && <span>Save</span>}
          </button>
          <button
            onClick={handleLoadClick}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: '44px', // Touch-friendly
              minWidth: '44px', // Touch-friendly
            }}
            title="Import from file"
          >
            <Upload size={16} />
            {isMobile && <span>Load</span>}
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
