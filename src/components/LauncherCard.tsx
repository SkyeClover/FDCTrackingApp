import { useState, useEffect } from 'react'
import { Launcher, Pod } from '../types'
import { RotateCcw } from 'lucide-react'
import { useProgress } from '../context/ProgressContext'
import { useAppData } from '../context/AppDataContext'
import { useIsTablet } from '../hooks/useIsTablet'

interface LauncherCardProps {
  launcher: Launcher
  pod?: Pod
  onReload?: () => void
  onClick?: () => void
  /** Higher-echelon dashboard: hide reload and in-card task controls */
  readOnly?: boolean
}

/**
 * Renders the Launcher Card UI section.
 */
export default function LauncherCard({ launcher, pod, onReload, onClick, readOnly = false }: LauncherCardProps) {
  const { taskProgress } = useProgress()
  const { tasks, clearTask, taskTemplates, endTaskEarly } = useAppData()
  // --- Local state and callbacks ---
  const [currentTime, setCurrentTime] = useState(new Date())
  const isTablet = useIsTablet()
  const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length || 0
  const usedRounds = pod?.rounds.filter((r) => r.status === 'used').length || 0
  const roundType = pod?.rounds[0]?.type || 'N/A'
  const maxRounds = 6 // Standard capacity

  // Update time every second for standby time display and task elapsed time
  // --- Side effects ---
  useEffect(() => {
    const needsUpdate = (launcher.status === 'idle' && launcher.lastIdleTime) || launcher.currentTask
    if (needsUpdate) {
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [launcher.status, launcher.lastIdleTime, launcher.currentTask])

  // Use live progress from separate state if available, otherwise use task progress
  const currentProgress = launcher.currentTask?.id 
    ? (taskProgress[launcher.currentTask.id] ?? launcher.currentTask.progress ?? 0)
    : 0
  const taskProgressValue = currentProgress
  const taskDuration = launcher.currentTask?.duration || 168 // Default 2:48 (168 seconds)
  const taskStartTime = launcher.currentTask?.startTime
  const taskStatus = launcher.currentTask?.id 
    ? tasks.find(t => t.id === launcher.currentTask?.id)?.status 
    : undefined
  
  // Check if this is a reload task
  const isReloadTask = launcher.currentTask
    ? ((launcher.currentTask.templateId
        ? taskTemplates.find((t) => t.id === launcher.currentTask?.templateId)?.type === 'reload'
        : false) ||
      launcher.currentTask.name.toLowerCase().includes('reload') ||
      (launcher.currentTask.description ?? '').toLowerCase().includes('reload'))
    : false
  
  // For reload tasks, don't mark as completed just because progress >= 100%
  const isTaskCompleted = taskStatus === 'completed' || (!isReloadTask && taskProgressValue >= 100)
  
  // Calculate elapsed time
  let taskElapsed = 0
  let taskTotal = taskDuration
  let taskStartTime24h = ''
  let taskEndTime24h = ''
  
  if (taskStartTime && launcher.currentTask) {
    const elapsedSeconds = Math.floor((currentTime.getTime() - taskStartTime.getTime()) / 1000)
    // Allow elapsed time to exceed expected duration for all tasks (so user can see how long over)
    taskElapsed = elapsedSeconds
    taskTotal = taskDuration
    
    // Format start time in 24-hour format
    const startDate = new Date(taskStartTime)
    taskStartTime24h = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
    
    // Calculate and format end time in 24-hour format
    const endDate = new Date(taskStartTime.getTime() + (taskDuration * 1000))
    taskEndTime24h = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  }
  
  // Calculate standby time (time since launcher became idle) - updates with currentTime
  let standbyTimeDisplay = ''
  if (launcher.status === 'idle' && launcher.lastIdleTime) {
    const standbySeconds = Math.floor((currentTime.getTime() - launcher.lastIdleTime.getTime()) / 1000)
    const hours = Math.floor(standbySeconds / 3600)
    const minutes = Math.floor((standbySeconds % 3600) / 60)
    const seconds = standbySeconds % 60
    if (hours > 0) {
      standbyTimeDisplay = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    } else {
      standbyTimeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`
    }
  }

  // --- Render ---
  return (
    <div
      data-guide="launcher-card"
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: isTablet ? '1.25rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isTablet ? '1rem' : '0.75rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.boxShadow = 'none'
        }
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
        {!readOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReload?.()
          }}
          style={{
            padding: isTablet ? '0.6rem 1rem' : '0.35rem 0.65rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: isTablet ? '0.9rem' : '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: isTablet ? '0.5rem' : '0.35rem',
            fontWeight: '500',
            minHeight: isTablet ? '48px' : 'auto',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isTablet) return
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            if (!isTablet) return
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <RotateCcw size={isTablet ? 18 : 14} />
          Reload
        </button>
        )}
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

      {/* Standby Time (when idle) */}
      {launcher.status === 'idle' && launcher.lastIdleTime && (
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
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Standby Time
          </div>
          <div
            style={{
              fontSize: '0.9rem',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              fontWeight: '600',
            }}
          >
            {standbyTimeDisplay}
          </div>
        </div>
      )}

      {/* Current Task */}
      {launcher.currentTask && (
        <div
          style={{
            marginTop: '0.25rem',
            padding: '0.5rem',
            backgroundColor: isTaskCompleted ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
            borderRadius: '4px',
            border: isTaskCompleted ? '2px solid var(--success)' : '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                color: isTaskCompleted ? 'var(--success)' : 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: isTaskCompleted ? '600' : 'normal',
              }}
            >
              {isTaskCompleted ? '✓ ' : ''}Current Task: {launcher.currentTask.name}
              {isTaskCompleted ? ' (Complete)' : ''}
            </div>
            {!readOnly && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isTaskCompleted && launcher.currentTask && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const template = taskTemplates.find((t) => t.id === launcher.currentTask?.templateId)
                    const taskType = template?.type || 'task'
                    const taskTypeName = taskType === 'fire' ? 'fire mission' : taskType === 'reload' ? 'reload task' : 'task'
                    if (confirm(`End this ${taskTypeName} early?`)) {
                      endTaskEarly(launcher.currentTask!.id)
                    }
                  }}
                  style={{
                    padding: isTablet ? '0.5rem 0.75rem' : '0.25rem 0.5rem',
                    backgroundColor: 'var(--warning)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: isTablet ? '0.85rem' : '0.7rem',
                    fontWeight: '500',
                    minHeight: isTablet ? '40px' : 'auto',
                    transition: 'all 0.2s',
                  }}
                >
                  End Early
                </button>
              )}
              {isTaskCompleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearTask(launcher.id)
                  }}
                  style={{
                    padding: isTablet ? '0.5rem 0.75rem' : '0.25rem 0.5rem',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: isTablet ? '0.85rem' : '0.7rem',
                    fontWeight: '500',
                    minHeight: isTablet ? '40px' : 'auto',
                    transition: 'all 0.2s',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            )}
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
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, taskProgressValue)}%`,
                height: '100%',
                backgroundColor: isTaskCompleted ? 'var(--success)' : (taskProgressValue > 0 ? 'var(--success)' : 'var(--danger)'),
                transition: 'width 0.3s',
              }}
            />
            {/* Show overflow indicator for reload tasks exceeding 100% */}
            {isReloadTask && taskProgressValue > 100 && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  bottom: 0,
                  width: `${Math.min(100, taskProgressValue - 100)}%`,
                  backgroundColor: 'var(--warning)',
                  opacity: 0.7,
                }}
              />
            )}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              marginBottom: '0.25rem',
            }}
          >
            <span style={{ color: isReloadTask && taskElapsed > taskTotal ? 'var(--warning)' : 'var(--success)' }}>
              {String(Math.floor(taskElapsed / 60)).padStart(2, '0')}:
              {String(taskElapsed % 60).padStart(2, '0')}
              {isReloadTask && taskElapsed > taskTotal && ` (+${Math.floor((taskElapsed - taskTotal) / 60)}:${String((taskElapsed - taskTotal) % 60).padStart(2, '0')})`}
            </span>
            <span style={{ color: 'var(--danger)' }}>
              {String(Math.floor(taskTotal / 60)).padStart(2, '0')}:
              {String(Math.floor(taskTotal % 60)).padStart(2, '0')}
            </span>
          </div>
          {taskStartTime24h && taskEndTime24h && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Start: {taskStartTime24h}</span>
              <span>End: {taskEndTime24h}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
