import { Launcher, Pod } from '../types'
import { RotateCcw } from 'lucide-react'
import { useProgress } from '../context/ProgressContext'

interface LauncherCardProps {
  launcher: Launcher
  pod?: Pod
  onReload?: () => void
}

export default function LauncherCard({ launcher, pod, onReload }: LauncherCardProps) {
  const { taskProgress } = useProgress()
  const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length || 0
  const usedRounds = pod?.rounds.filter((r) => r.status === 'used').length || 0
  const roundType = pod?.rounds[0]?.type || 'N/A'
  const maxRounds = 6 // Standard capacity

  // Use live progress from separate state if available, otherwise use task progress
  const currentProgress = launcher.currentTask?.id 
    ? (taskProgress[launcher.currentTask.id] ?? launcher.currentTask.progress ?? 0)
    : 0
  const taskProgressValue = currentProgress
  const taskDuration = launcher.currentTask?.duration || 168 // Default 2:48 (168 seconds)
  const taskStartTime = launcher.currentTask?.startTime
  
  // Calculate elapsed time
  let taskElapsed = 0
  let taskTotal = taskDuration
  
  if (taskStartTime && launcher.currentTask) {
    const elapsedSeconds = Math.floor((Date.now() - taskStartTime.getTime()) / 1000)
    taskElapsed = Math.min(elapsedSeconds, taskDuration)
    taskTotal = taskDuration
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Header with Launcher Name and Reload */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: 'var(--text-primary)',
            fontWeight: '700',
            fontSize: '1rem',
            letterSpacing: '0.5px',
          }}
        >
          {launcher.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReload?.()
          }}
          style={{
            padding: '0.35rem 0.65rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: '500',
          }}
        >
          <RotateCcw size={14} />
          Reload
        </button>
      </div>

      {/* Round Type - Prominent Display */}
      <div
        style={{
          padding: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '4px',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Round Type
        </div>
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'var(--accent)',
            fontFamily: 'monospace',
          }}
        >
          {roundType}
        </div>
      </div>

      {/* Round Count - Large and Clear */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '4px',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Rounds
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: availableRounds > 0 ? 'var(--success)' : 'var(--text-secondary)',
              fontFamily: 'monospace',
            }}
          >
            {availableRounds}
          </span>
          <span
            style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
            }}
          >
            / {maxRounds}
          </span>
        </div>
      </div>

      {/* Round Indicators - Visual Representation */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '4px',
        }}
      >
        {Array.from({ length: maxRounds }).map((_, i) => {
          let dotColor = 'var(--bg-primary)'
          let borderColor = 'var(--border)'
          
          if (i < availableRounds) {
            dotColor = 'var(--success)'
            borderColor = 'var(--success)'
          } else if (i < availableRounds + usedRounds) {
            dotColor = 'var(--danger)'
            borderColor = 'var(--danger)'
          }
          
          return (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                border: `2px solid ${borderColor}`,
                flexShrink: 0,
              }}
            />
          )
        })}
      </div>

      {/* Current Task */}
      {launcher.currentTask && (
        <div
          style={{
            marginTop: '0.25rem',
            padding: '0.5rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Current Task: {launcher.currentTask.name}
          </div>
          <div
            style={{
              width: '100%',
              height: '10px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              marginBottom: '0.5rem',
            }}
          >
            <div
              style={{
                width: `${taskProgressValue}%`,
                height: '100%',
                backgroundColor: taskProgressValue > 0 ? 'var(--success)' : 'var(--danger)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ color: 'var(--success)' }}>
              {String(Math.floor(taskElapsed / 60)).padStart(2, '0')}:
              {String(taskElapsed % 60).padStart(2, '0')}
            </span>
            <span style={{ color: 'var(--danger)' }}>
              {String(Math.floor(taskTotal / 60)).padStart(2, '0')}:
              {String(Math.floor(taskTotal % 60)).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
