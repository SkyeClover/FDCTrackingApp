import { useState, useEffect } from 'react'

const STORAGE_KEY = 'fdc_warning_banner_dismissed'
const GITHUB_ISSUES_URL = 'https://github.com/SkyeClover/FDCTrackingApp/issues'
const WALKERTRACK_DEVLOG_URL = 'https://www.walkerjacob.com/blog/walkertrack-devlog-1'

export default function WarningBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if user hasn't dismissed this session (sessionStorage clears when browser/tab closes)
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--warning-banner-bg, #3d3520)',
        borderBottom: '1px solid var(--warning-banner-border, #6b5c2e)',
        color: 'var(--warning-banner-text, #e8dca4)',
        fontSize: '0.875rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        flexWrap: 'wrap',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        This is a work in progress, developed while serving on active duty in the Army. This is an older version; a new version (WalkerTrack) is being rebuilt from the ground up —{' '}
        <a
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--warning-banner-link, #c9b84a)',
            textDecoration: 'underline',
            fontWeight: 500,
          }}
        >
          Report an issue
        </a>
        {' · '}
        <a
          href={WALKERTRACK_DEVLOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--warning-banner-link, #c9b84a)',
            textDecoration: 'underline',
            fontWeight: 500,
          }}
        >
          Devlog
        </a>
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          padding: 0,
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '1.25rem',
          lineHeight: 1,
          opacity: 0.9,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)'
          e.currentTarget.style.opacity = '1'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.opacity = '0.9'
        }}
      >
        ×
      </button>
    </div>
  )
}
