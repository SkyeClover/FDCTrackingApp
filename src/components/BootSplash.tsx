import { useEffect, useState, useRef } from 'react'

interface BootSplashProps {
  onComplete: () => void
}

interface Rocket {
  id: number
  progress: number
  showFlame: boolean
}

export default function BootSplash({ onComplete }: BootSplashProps) {
  const [progress, setProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const [rockets, setRockets] = useState<Rocket[]>([])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  useEffect(() => {
    // Initialize 6 rockets
    const initialRockets: Rocket[] = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      progress: 0,
      showFlame: false,
    }))
    setRockets(initialRockets)

    // Fade in content
    setTimeout(() => setShowContent(true), 100)

    // Animation over 5 seconds
    const duration = 5000
    startTimeRef.current = Date.now()

    const animate = () => {
      if (!startTimeRef.current) return

      const elapsed = Date.now() - startTimeRef.current
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)

      // Update rockets with staggered timing
      setRockets(prevRockets => prevRockets.map((rocket, index) => {
        const rocketStartTime = index * 200 // Stagger by 200ms
        const rocketElapsed = Math.max(0, elapsed - rocketStartTime)
        const rocketProgress = Math.min(100, (rocketElapsed / (duration * 0.8)) * 100) // Faster flight
        
        return {
          ...rocket,
          progress: rocketProgress,
          showFlame: rocketProgress > 2 && rocketProgress < 85,
        }
      }))

      if (newProgress < 100) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setTimeout(() => {
          onComplete()
        }, 300)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [onComplete])

  // Calculate rocket position along natural ballistic arc
  const getRocketPosition = (rocket: Rocket, index: number) => {
    if (rocket.progress === 0) {
      return { x: -10, y: 0, rotation: 0, scale: 1 }
    }

    const t = rocket.progress / 100
    
    // Natural ballistic trajectory: parabolic arc
    // Start from off-screen left, arc up and over, exit right
    const startX = -10 // Start off-screen left
    const endX = 110 // Exit off-screen right
    const startY = 75 + (index * 3) // Slightly different starting heights
    const peakY = 25 // Peak of arc
    const endY = 80 + (index * 2) // End slightly lower
    
    // X position: linear movement
    const x = startX + (t * (endX - startX))
    
    // Y position: parabolic arc (quadratic bezier)
    const y = startY + (t * (endY - startY)) - (4 * t * (1 - t) * (startY - peakY))
    
    // Calculate rotation based on trajectory (tangent to the arc)
    // Get velocity vector by calculating derivative
    const dx = (endX - startX) / 100
    const dy = ((endY - startY) - (4 * (1 - 2*t) * (startY - peakY))) / 100
    const rotation = Math.atan2(dy, dx) * (180 / Math.PI)
    
    // Scale: slightly smaller as it goes further
    const scale = 1 - (t * 0.1)

    return { x, y, rotation, scale }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: showContent ? 1 : 0,
        transition: 'opacity 0.5s ease-in',
        overflow: 'hidden',
      }}
    >
      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          transform: showContent ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.5s ease-out',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Rockets container */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
          }}
        >
          {rockets.map((rocket) => {
            const pos = getRocketPosition(rocket, rocket.id)
            if (pos.x < -5 || pos.x > 115) return null // Off screen

            return (
              <div
                key={rocket.id}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
                  willChange: 'transform',
                  transition: 'none',
                }}
              >
                {/* Rocket body */}
                <div
                  style={{
                    width: '32px',
                    height: '120px',
                    background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
                    border: '1px solid #555',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                  }}
                >
                  {/* Rocket nose */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '16px solid transparent',
                      borderRight: '16px solid transparent',
                      borderBottom: '20px solid #3a3a3a',
                    }}
                  />
                  {/* Rocket fins */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '48px',
                      height: '24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '4px',
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: '12px',
                          height: '24px',
                          backgroundColor: '#3a3a3a',
                          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Rocket flame */}
                {rocket.showFlame && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-40px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '40px',
                      height: '60px',
                      background: 'radial-gradient(ellipse at center, rgba(255, 100, 0, 0.9) 0%, rgba(255, 150, 0, 0.7) 30%, rgba(255, 200, 0, 0.5) 50%, transparent 80%)',
                      borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                      filter: 'blur(2px)',
                    }}
                  />
                )}

                {/* Smoke trail */}
                {rocket.progress > 5 && rocket.progress < 85 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '8px',
                      height: '80px',
                      background: 'linear-gradient(180deg, rgba(100, 100, 100, 0.6) 0%, rgba(150, 150, 150, 0.4) 30%, rgba(100, 100, 100, 0.2) 60%, transparent 100%)',
                      filter: 'blur(3px)',
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Title */}
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(48px, 8vw, 72px)',
              fontWeight: 'bold',
              color: '#d4d4d4',
              margin: '0 0 10px 0',
              letterSpacing: '4px',
              fontFamily: 'monospace',
            }}
          >
            WALKER TRACKER
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(18px, 3vw, 24px)',
              color: '#a0a0a0',
              margin: '0 0 40px 0',
              letterSpacing: '2px',
              fontFamily: 'monospace',
            }}
          >
            HIMARS Ammunition Tracking System
          </p>

          {/* Progress bar */}
          <div
            style={{
              width: 'min(600px, 80vw)',
              height: '6px',
              backgroundColor: '#2a2a2a',
              borderRadius: '3px',
              overflow: 'hidden',
              margin: '0 auto',
              border: '1px solid #444',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4a4a4a 0%, #6a6a6a 50%, #4a4a4a 100%)',
                borderRadius: '3px',
                willChange: 'width',
              }}
            />
          </div>

          {/* Loading text */}
          <p
            style={{
              fontSize: 'clamp(14px, 2vw, 18px)',
              color: '#888',
              marginTop: '20px',
              fontFamily: 'monospace',
            }}
          >
            Initializing System...
          </p>
        </div>
      </div>
    </div>
  )
}
