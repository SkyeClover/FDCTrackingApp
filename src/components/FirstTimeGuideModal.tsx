import { ArrowRight, HelpCircle, X } from 'lucide-react'

interface FirstTimeGuideModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigateToSettings: () => void
}

export default function FirstTimeGuideModal({ isOpen, onClose, onNavigateToSettings }: FirstTimeGuideModalProps) {
  if (!isOpen) return null

  const handleGoToSettings = () => {
    onNavigateToSettings()
    onClose()
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
        zIndex: 10001,
        padding: '1rem',
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
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
            }}
          >
            <HelpCircle size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              Welcome to FDC Tracker!
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              You're all set up
            </p>
          </div>
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
            This is an older version. A new version (WalkerTrack) is being rebuilt from the ground up.{' '}
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

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            Great! You've created and assigned yourself to your first BOC or POC. Now that you're set up, 
            we recommend checking out the <strong style={{ color: 'var(--text-primary)' }}>Settings / Help</strong> page 
            to learn more about how to use the app.
          </p>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            The Settings / Help page contains:
          </p>
          <ul
            style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.8',
              marginTop: '0.5rem',
              paddingLeft: '1.5rem',
            }}
          >
            <li>A getting started guide</li>
            <li>Terminology reference</li>
            <li>Instructions for managing your inventory</li>
            <li>Tips for using the dashboard and management panels</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
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
            Maybe Later
          </button>
          <button
            type="button"
            onClick={handleGoToSettings}
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
            Go to Settings / Help
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

