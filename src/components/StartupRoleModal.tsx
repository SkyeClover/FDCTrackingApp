import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'

interface StartupRoleModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function StartupRoleModal({ isOpen, onClose }: StartupRoleModalProps) {
  const { addBOC, addPOC, setCurrentUserRole } = useAppData()
  const [roleType, setRoleType] = useState<'boc' | 'poc'>('poc')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      const id = Date.now().toString()
      
      if (roleType === 'boc') {
        addBOC({
          id,
          name: name.trim(),
          pocs: [],
        })
        setCurrentUserRole({
          type: 'boc',
          id,
          name: name.trim(),
        })
      } else {
        addPOC({
          id,
          name: name.trim(),
          launchers: [],
        })
        setCurrentUserRole({
          type: 'poc',
          id,
          name: name.trim(),
        })
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to create role:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

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
          zIndex: 10000,
          padding: '1rem',
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          // Prevent closing by clicking outside
          e.stopPropagation()
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-color)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            Welcome to FDC Tracker
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Walk-easy with this app!
          </p>
        </div>

        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This is an older version of the app. I'm currently building a new version (WalkerTrack) from the ground up.{' '}
            <a
              href="https://www.walkerjacob.com/blog/walkertrack-devlog-1"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}
            >
              Read the devlog
            </a>
          </p>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          To get started, please create and assign yourself to a BOC (Battery Operations Center) or POC (PLT Operations Center).
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: '500',
              }}
            >
              Select Your Role
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: `2px solid ${roleType === 'poc' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: roleType === 'poc' ? 'var(--accent-color)' : 'transparent',
                  color: roleType === 'poc' ? 'white' : 'var(--text-primary)',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  value="poc"
                  checked={roleType === 'poc'}
                  onChange={(e) => setRoleType(e.target.value as 'boc' | 'poc')}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: '600' }}>POC</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
                  PLT Operations Center
                </div>
              </label>
              <label
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: `2px solid ${roleType === 'boc' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: roleType === 'boc' ? 'var(--accent-color)' : 'transparent',
                  color: roleType === 'boc' ? 'white' : 'var(--text-primary)',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  value="boc"
                  checked={roleType === 'boc'}
                  onChange={(e) => setRoleType(e.target.value as 'boc' | 'poc')}
                  style={{ display: 'none' }}
                />
                <div style={{ fontWeight: '600' }}>BOC</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
                  Battery Operations Center
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: '500',
              }}
            >
              {roleType === 'boc' ? 'BOC' : 'POC'} Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${roleType === 'boc' ? 'BOC' : 'POC'} name`}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: name.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: name.trim() && !isSubmitting ? 1 : 0.6,
                transition: 'opacity 0.2s',
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create & Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

