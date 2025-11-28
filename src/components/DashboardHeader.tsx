import { useState, useEffect, useRef } from 'react'
import { Download, Upload } from 'lucide-react'

interface DashboardHeaderProps {
  onInitiateFireMission?: () => void
  onReport?: () => void
  onSaveLoad?: () => void
  onSaveToFile?: () => void
  onLoadFromFile?: (file: File) => Promise<void>
  userInfo?: string
}

export default function DashboardHeader({
  onInitiateFireMission,
  onReport,
  onSaveLoad,
  onSaveToFile,
  onLoadFromFile,
  userInfo = 'Gator 40',
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        padding: '1rem',
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
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          Current Time & Date
        </div>
        <div
          style={{
            fontSize: '1rem',
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
          }}
        >
          {formatDate(currentTime)}
        </div>
        <div
          style={{
            fontSize: '1rem',
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
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={onInitiateFireMission}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#dc2626',
            border: '2px solid #000',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'background-color 0.2s',
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
          alignItems: 'flex-end',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: '1.1rem',
            color: 'var(--text-primary)',
            fontWeight: '600',
            marginBottom: '0.25rem',
          }}
        >
          {userInfo}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            }}
          >
            Report
          </button>
          <button
            onClick={handleSaveClick}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            title="Export to file"
          >
            <Download size={16} />
            Save
          </button>
          <button
            onClick={handleLoadClick}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            title="Import from file"
          >
            <Upload size={16} />
            Load
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
