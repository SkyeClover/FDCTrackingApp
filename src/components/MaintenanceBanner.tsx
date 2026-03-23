/**
 * Renders the Maintenance Banner UI section.
 */
export default function MaintenanceBanner() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          fontWeight: '700',
          color: '#ff6b6b'
        }}>
          Under Maintenance
        </h1>
        <div style={{
          fontSize: '1.2rem',
          marginBottom: '2rem',
          color: '#ccc',
          lineHeight: '1.6'
        }}>
          Walker Track is currently being updated and is temporarily unavailable.
        </div>
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '2px solid #ff6b6b',
          marginBottom: '2rem'
        }}>
          <p style={{
            fontSize: '1rem',
            color: '#fff',
            marginBottom: '0.5rem',
            fontWeight: '500'
          }}>
            We're working on improvements and new features.
          </p>
          <p style={{
            fontSize: '0.9rem',
            color: '#aaa',
            margin: 0
          }}>
            Please check back soon. We apologize for any inconvenience.
          </p>
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: '#888',
          marginTop: '2rem'
        }}>
          If you need immediate access, please contact the system administrator.
        </div>
      </div>
    </div>
  )
}

