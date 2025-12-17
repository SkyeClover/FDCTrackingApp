import { useEffect, useState, useRef } from 'react'

interface BootSplashProps {
  onComplete: () => void
}

interface Rocket {
  id: number
  progress: number
  showFlame: boolean
  angle: number // Launch angle in degrees
  startY: number // Starting Y position
  engineCutoffProgress: number // Progress at which engine cuts off (0-100)
  arcVariation: number // Slight variation in arc height
}

// Calculate parabolic trajectory position (like HIMARS projectile) - defined outside component
const calculateParabolicPosition = (rocket: Rocket, t: number) => {
  // Start from off-screen left (HIMARS launcher position)
  const startX = -10
  const startY = 90 // Launch from lower part of screen (HIMARS on ground)
  
  // End off-screen right (impact point - ground level)
  const endX = 110
  const endY = 90 // Ground level on the right (same as launch height)
  
  // Peak of the arc - apex much higher (like the blue trajectory lines)
  // Screen height: 0% = top, 100% = bottom
  // The blue lines show a high arc, so apex should be around 15-25% from top
  // Add slight variation for each rocket
  const peakY = 20 + rocket.arcVariation // Apex at ~20% from top (high arc like blue lines)
  
  // X position: linear movement from left to right (projectile motion)
  const x = startX + (t * (endX - startX))
  
  // Y position: smooth parabolic arc using quadratic bezier
  // This creates a smooth curve from start -> peak -> end
  // Formula: y = (1-t)^2 * startY + 2*(1-t)*t * peakY + t^2 * endY
  const y = startY * (1 - t) * (1 - t) + 2 * (1 - t) * t * peakY + endY * t * t
  
  // Calculate rotation by sampling nearby points to get smooth tangent
  // This ensures the rocket points along its path without flipping
  const epsilon = 0.02 // Small step for derivative calculation
  const tPrev = Math.max(0, t - epsilon)
  const tNext = Math.min(1, t + epsilon)
  
  // Calculate positions at nearby points
  const yPrev = startY * (1 - tPrev) * (1 - tPrev) + 2 * (1 - tPrev) * tPrev * peakY + endY * tPrev * tPrev
  const yNext = startY * (1 - tNext) * (1 - tNext) + 2 * (1 - tNext) * tNext * peakY + endY * tNext * tNext
  const xPrev = startX + (tPrev * (endX - startX))
  const xNext = startX + (tNext * (endX - startX))
  
  // Calculate tangent vector (direction of travel)
  const dy = yNext - yPrev
  const dx = xNext - xPrev
  
  // Calculate angle from tangent
  // atan2(dy, dx) gives angle in radians, convert to degrees
  // CSS: 0° = right, 90° = down, -90° = up
  let rotation = Math.atan2(dy, dx) * (180 / Math.PI)
  
  // At impact (last 15%), blend to ~15° downward angle for realistic impact
  if (t > 0.85) {
    const impactAngle = 15 // 15 degrees downward from horizontal
    const blendFactor = (t - 0.85) / 0.15 // 0 to 1 as t goes from 0.85 to 1.0
    rotation = rotation * (1 - blendFactor) + impactAngle * blendFactor
  }
  
  // Keep scale constant for realism (rockets don't change size)
  const scale = 1

  return { x, y, rotation, scale }
}

export default function BootSplash({ onComplete }: BootSplashProps) {
  const [progress, setProgress] = useState(0)
  const [showContent, setShowContent] = useState(false)
  const [rockets, setRockets] = useState<Rocket[]>([])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  // Get rocket position
  const getRocketPosition = (rocket: Rocket) => {
    if (rocket.progress === 0) {
      // At launch, rocket points at launch angle (nearly vertical, 75-80 degrees from horizontal)
      // CSS rotation: 0° = right, 90° = down, -90° = up
      // Launch angle: 75° from horizontal means the rocket is 15° from vertical
      // For CSS: if horizontal is 0°, then 75° from horizontal = 75° clockwise from right = 75° down
      // But we want it pointing up-right, so: 90° - launchAngle = angle from vertical
      // CSS: -75° means pointing up-right at 75° from horizontal
      const launchRotation = -(90 - rocket.angle) // Convert launch angle to CSS rotation
      return { x: -10, y: rocket.startY, rotation: launchRotation, scale: 1 }
    }

    const t = rocket.progress / 100
    const pos = calculateParabolicPosition(rocket, t)
    
    // Ensure rotation is smooth and doesn't flip
    // Normalize to prevent 180° jumps
    return pos
  }

  useEffect(() => {
    // Initialize 6 rockets with nearly vertical launch angles (HIMARS style)
    // Launch angles: 75-80 degrees from horizontal (nearly vertical)
    const angles = [75, 76, 77, 78, 79, 80] // Nearly vertical launch (75-80 degrees)
    const startYs = [90, 90, 90, 90, 90, 90] // All start from lower part of screen (HIMARS on ground)
    
    const initialRockets: Rocket[] = Array.from({ length: 6 }, (_, i) => {
      // Random engine cutoff between 30% and 70% of flight
      const engineCutoffProgress = 30 + Math.random() * 40
      // Slight variation in arc height (-5 to +5)
      const arcVariation = (Math.random() - 0.5) * 10
      
      return {
        id: i,
        progress: 0,
        showFlame: false,
        angle: angles[i],
        startY: startYs[i],
        engineCutoffProgress,
        arcVariation,
      }
    })
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
        // Faster, more dramatic flight - rockets shoot across quickly
        const rocketProgress = Math.min(100, (rocketElapsed / (duration * 0.7)) * 100)
        
        // Engine cuts off at random progress point (early in flight for dramatic effect)
        const engineOn = rocketProgress > 2 && rocketProgress < rocket.engineCutoffProgress
        
        return {
          ...rocket,
          progress: rocketProgress,
          showFlame: engineOn,
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
            const pos = getRocketPosition(rocket)
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

                {/* Rocket exhaust - comes from bottom of rocket, points backward (toward launch point) */}
                {rocket.showFlame && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-30px', // Extend outward from rocket bottom
                      left: '50%',
                      transform: 'translateX(-50%)', // No rotation - rocket container is already rotated
                      transformOrigin: 'center top', // Flame originates from top of this element (rocket's bottom)
                      width: '35px',
                      height: '70px',
                      background: 'radial-gradient(ellipse at center top, rgba(255, 100, 0, 0.95) 0%, rgba(255, 150, 0, 0.8) 25%, rgba(255, 200, 0, 0.6) 50%, transparent 80%)',
                      borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                      filter: 'blur(2px)',
                    }}
                  />
                )}

                {/* Exhaust trail - arrows pointing back towards launch point (left side) */}
                {rocket.showFlame && (
                  <>
                    {[0, 1, 2, 3].map((i) => {
                      const trailLength = 40 + (i * 10)
                      const trailOpacity = 0.9 - (i * 0.2)
                      const trailWidth = 6 - (i * 0.8)
                      const offsetY = 30 + (i * 8) // Distance from rocket bottom, extending backward
                      
                      return (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            bottom: `-${offsetY}px`, // Extend backward from rocket
                            left: '50%',
                            transform: 'translateX(-50%)', // No rotation - points backward in rocket's local space
                            transformOrigin: 'center top',
                            width: `${trailWidth}px`,
                            height: `${trailLength}px`,
                            background: `linear-gradient(180deg, rgba(255, ${140 + i * 15}, 0, ${trailOpacity}) 0%, rgba(255, ${180 + i * 10}, 0, ${trailOpacity * 0.7}) 50%, rgba(255, 255, ${80 + i * 25}, ${trailOpacity * 0.4}) 80%, transparent 100%)`,
                            filter: 'blur(1.5px)',
                            opacity: trailOpacity,
                          }}
                        />
                      )
                    })}
                  </>
                )}

                {/* Smoke trail */}
                {rocket.progress > 5 && rocket.progress < 85 && rocket.showFlame && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-30px', // At rocket bottom, extending backward
                      left: '50%',
                      transform: 'translateX(-50%)', // No rotation - points backward in rocket's local space
                      transformOrigin: 'center top',
                      width: '6px',
                      height: '60px',
                      background: 'linear-gradient(180deg, rgba(100, 100, 100, 0.7) 0%, rgba(150, 150, 150, 0.5) 40%, rgba(100, 100, 100, 0.3) 70%, transparent 100%)',
                      filter: 'blur(2px)',
                      opacity: 0.6,
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
