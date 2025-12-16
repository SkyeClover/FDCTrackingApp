import { useState, useEffect } from 'react'

interface PasswordProtectionProps {
  children: React.ReactNode
}

const FUNNY_LOADING_MESSAGES = [
  "SSG Ames is Sick",
  "SGT Muller is talking boats being ships and ships being boats (somthin like that)",
  "We're getting up UltraLink!",
  "2400N is Better than 4800N",
  "Getting up Dcomms!",
  "Hwello?!",
  "Anywayysss",
  "FIRE MISSION!",
  "Put that OE-254 Up time MEOW!",
  "Walk-easy with this app!",
  "Sponsored by Pain! Steel Pain!!"
]

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState(FUNNY_LOADING_MESSAGES[0])

  useEffect(() => {
    // Check if already authenticated
    const auth = sessionStorage.getItem('fdc_auth')
    if (auth === 'authenticated') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  // Rotate through funny loading messages
  useEffect(() => {
    if (!isLoading) return
    
    let currentIndex = 0
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % FUNNY_LOADING_MESSAGES.length
      setLoadingMessage(FUNNY_LOADING_MESSAGES[currentIndex])
    }, 2000) // Change message every 2 seconds

    return () => clearInterval(interval)
  }, [isLoading])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get credentials from environment variables (fallback to defaults for development)
    const validUsername = import.meta.env.VITE_AUTH_USERNAME || 'Walker'
    const validPassword = import.meta.env.VITE_AUTH_PASSWORD || '58559'
    
    if (username === validUsername && password === validPassword) {
      sessionStorage.setItem('fdc_auth', 'authenticated')
      setIsAuthenticated(true)
      setError('')
    } else {
      setError('Invalid username or password')
      setPassword('')
    }
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{
          fontSize: '1.2rem',
          marginBottom: '1rem',
          textAlign: 'center',
          padding: '0 2rem',
          minHeight: '3rem',
          display: 'flex',
          alignItems: 'center',
          transition: 'opacity 0.3s'
        }}>
          {loadingMessage}
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: '#888',
          textAlign: 'center'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        padding: '2rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        minWidth: '320px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{ 
          marginBottom: '1.5rem', 
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          FDC Tracker
        </h2>
        <p style={{
          marginBottom: '1.5rem',
          textAlign: 'center',
          color: '#aaa',
          fontSize: '0.9rem'
        }}>
          Please enter your credentials to access the application
        </p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>
          {error && (
            <div style={{ 
              color: '#ff4444', 
              marginBottom: '1rem', 
              fontSize: '0.9rem',
              padding: '0.5rem',
              backgroundColor: '#3a1a1a',
              borderRadius: '4px',
              border: '1px solid #ff4444'
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#4a9eff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#3a8eef'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4a9eff'
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

