import { Launcher, Pod, LogEntry } from '../types'
import { X, Rocket, RotateCcw, Activity } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { useMemo, useState, useEffect } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'

interface LauncherDetailModalProps {
  launcher: Launcher
  pod?: Pod
  isOpen: boolean
  onClose: () => void
}

export default function LauncherDetailModal({ launcher, pod, isOpen, onClose }: LauncherDetailModalProps) {
  const { tasks, logs, taskTemplates, clearTask, endTaskEarly } = useAppData()
  const isMobile = useIsMobile()
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100,
    velocityThreshold: 0.2,
  })

  // Update time every second for standby time display
  useEffect(() => {
    if (launcher.status === 'idle' && launcher.lastIdleTime) {
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [launcher.status, launcher.lastIdleTime])

  if (!isOpen || !launcher) return null

  const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length || 0
  const usedRounds = pod?.rounds.filter((r) => r.status === 'used').length || 0
  const totalRounds = pod?.rounds.length || 0
  const roundType = pod?.rounds[0]?.type || 'N/A'

  // Get all tasks for this launcher (completed and current)
  const launcherTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Check if task is assigned to this launcher
      if (task.launcherIds?.includes(launcher.id)) return true
      // Check if task is assigned to launcher's POC
      if (task.pocIds?.includes(launcher.pocId || '')) return true
      return false
    })
  }, [tasks, launcher.id, launcher.pocId])

  // Get completed tasks (excluding reload tasks and fire missions since they're shown separately)
  const completedTasks = useMemo(() => {
    return launcherTasks.filter((task) => {
      if (task.status !== 'completed') return false
      const template = taskTemplates.find((t) => t.id === task.templateId)
      // Exclude reload tasks - they're shown in the reload tasks section
      const isReload = template?.type === 'reload' || task.name.toLowerCase().includes('reload')
      // Exclude fire missions - they're shown in the fire missions section
      const isFireMission = template?.type === 'fire' || 
                           task.description.toLowerCase().includes('fire mission') ||
                           task.name.toLowerCase().includes('fire')
      return !isReload && !isFireMission
    })
      .sort((a, b) => {
        const aTime = a.startTime?.getTime() || 0
        const bTime = b.startTime?.getTime() || 0
        return bTime - aTime // Most recent first
      })
  }, [launcherTasks, taskTemplates])

  // Get fire missions (tasks with 'fire' type or fire-related description)
  const fireMissions = useMemo(() => {
    return launcherTasks.filter((task) => {
      if (task.status !== 'completed') return false
      const template = taskTemplates.find((t) => t.id === task.templateId)
      return template?.type === 'fire' || 
             task.description.toLowerCase().includes('fire mission') ||
             task.name.toLowerCase().includes('fire')
    })
      .sort((a, b) => {
        const aTime = a.startTime?.getTime() || 0
        const bTime = b.startTime?.getTime() || 0
        return bTime - aTime // Most recent first
      })
  }, [launcherTasks, taskTemplates])

  // Get reload tasks (completed and in-progress)
  const reloadTasks = useMemo(() => {
    return launcherTasks.filter((task) => {
      const template = taskTemplates.find((t) => t.id === task.templateId)
      return template?.type === 'reload' || 
             task.name.toLowerCase().includes('reload')
    }).sort((a, b) => {
      const aTime = a.startTime?.getTime() || 0
      const bTime = b.startTime?.getTime() || 0
      return bTime - aTime // Most recent first
    })
  }, [launcherTasks, taskTemplates])

  // Get reload history from logs showing pod swaps
  const reloadHistory = useMemo(() => {
    return logs
      .filter((log: LogEntry) => {
        const message = log.message.toLowerCase()
        return message.includes(`launcher "${launcher.name.toLowerCase()}"`) &&
               (message.includes('reloading:') || message.includes('completed reload') || message.includes('unloaded'))
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20) // Limit to last 20 reloads
  }, [logs, launcher.name])

  // Calculate standby time
  const standbyTimeDisplay = useMemo(() => {
    if (launcher.status === 'idle' && launcher.lastIdleTime) {
      const standbySeconds = Math.floor((currentTime.getTime() - launcher.lastIdleTime.getTime()) / 1000)
      const hours = Math.floor(standbySeconds / 3600)
      const minutes = Math.floor((standbySeconds % 3600) / 60)
      const seconds = standbySeconds % 60
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      }
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    }
    return null
  }, [launcher.status, launcher.lastIdleTime, currentTime])

  // Format date/time
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isMobile ? 'var(--bg-primary)' : 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: isMobile ? '0' : '1rem',
      }}
      onClick={isMobile ? undefined : onClose}
    >
      <div
        ref={modalContentRef}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: isMobile ? '0' : '12px',
          padding: isMobile ? '1rem' : '2rem',
          maxWidth: isMobile ? '100%' : '900px',
          width: '100%',
          maxHeight: isMobile ? '100vh' : '90vh',
          height: isMobile ? '100vh' : 'auto',
          overflow: 'auto',
          border: isMobile ? 'none' : '2px solid var(--border)',
          boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
          touchAction: isMobile ? 'pan-y' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Rocket size={24} style={{ color: 'var(--accent)' }} />
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                }}
              >
                {launcher.name}
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Launcher Details & History
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Current Status Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              STATUS
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color:
                  launcher.status === 'active'
                    ? 'var(--accent)'
                    : launcher.status === 'maintenance'
                    ? 'var(--warning)'
                    : 'var(--text-primary)',
                textTransform: 'uppercase',
              }}
            >
              {launcher.status}
            </div>
          </div>
          {standbyTimeDisplay && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                STANDBY TIME
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {standbyTimeDisplay}
              </div>
            </div>
          )}
          {pod && (
            <>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  CURRENT POD
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {pod.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {roundType}
                </div>
              </div>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  ROUNDS
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {availableRounds}/{totalRounds}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {usedRounds} used
                </div>
              </div>
            </>
          )}
        </div>

        {/* Current Task */}
        {launcher.currentTask && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Current Task: {launcher.currentTask.name}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {launcher.currentTask.status === 'in-progress' && (
                  <button
                    onClick={() => {
                      const template = taskTemplates.find((t) => t.id === launcher.currentTask?.templateId)
                      const taskType = template?.type || 'task'
                      const taskTypeName = taskType === 'fire' ? 'fire mission' : taskType === 'reload' ? 'reload task' : 'task'
                      if (confirm(`End this ${taskTypeName} early?`)) {
                        endTaskEarly(launcher.currentTask!.id)
                      }
                    }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--warning)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    End Early
                  </button>
                )}
                {launcher.currentTask.status === 'completed' && (
                  <button
                    onClick={() => clearTask(launcher.id)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      backgroundColor: 'var(--accent)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {launcher.currentTask.description && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {launcher.currentTask.description}
              </p>
            )}
            {launcher.currentTask.startTime && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Started: {formatDateTime(launcher.currentTask.startTime)}
                {launcher.currentTask.duration && ` • Duration: ${formatDuration(launcher.currentTask.duration)}`}
              </div>
            )}
          </div>
        )}

        {/* Fire Missions History */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Rocket size={20} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Fire Missions ({fireMissions.length})
            </h3>
          </div>
          {fireMissions.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No fire missions completed yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {fireMissions.map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {task.name}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {task.description}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600' }}>
                      COMPLETED
                    </div>
                  </div>
                  {task.startTime && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(task.startTime)}
                      {task.duration && ` • ${formatDuration(task.duration)}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task History */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={20} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Task History ({completedTasks.length})
            </h3>
          </div>
          {completedTasks.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No tasks completed yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {completedTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {task.name}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {task.description}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600' }}>
                      COMPLETED
                    </div>
                  </div>
                  {task.startTime && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatDateTime(task.startTime)}
                      {task.duration && ` • ${formatDuration(task.duration)}`}
                    </div>
                  )}
                </div>
              ))}
              {completedTasks.length > 10 && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>
                  Showing 10 of {completedTasks.length} completed tasks
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reload Tasks */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <RotateCcw size={20} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Reload Tasks ({reloadTasks.length})
            </h3>
          </div>
          {reloadTasks.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No reload tasks yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reloadTasks.map((task) => {
                const isCompleted = task.status === 'completed'
                const actualDuration = task.startTime && task.completedTime
                  ? (task.completedTime.getTime() - task.startTime.getTime()) / 1000
                  : task.startTime
                  ? (Date.now() - task.startTime.getTime()) / 1000
                  : null
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {task.name}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {task.description}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isCompleted ? 'var(--success)' : 'var(--accent)', fontWeight: '600' }}>
                        {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                      </div>
                    </div>
                    {task.startTime && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        Started: {formatDateTime(task.startTime)}
                        {task.duration && ` • Expected: ${formatDuration(task.duration)}`}
                      </div>
                    )}
                    {isCompleted && task.completedTime && actualDuration && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                        Completed: {formatDateTime(task.completedTime)} • Actual: {formatDuration(actualDuration)}
                      </div>
                    )}
                    {!isCompleted && actualDuration && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Elapsed: {formatDuration(actualDuration)}
                        {task.duration && actualDuration > task.duration && (
                          <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>
                            (+{formatDuration(actualDuration - task.duration)} over)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Reload History (from logs) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <RotateCcw size={20} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Reload History ({reloadHistory.length})
            </h3>
          </div>
          {reloadHistory.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No reload history available
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reloadHistory.map((log, index) => (
                <div
                  key={log.id || index}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {log.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {formatDateTime(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

