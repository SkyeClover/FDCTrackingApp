import { useState, useMemo, useRef } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useScopedForce } from '../hooks/useScopedForce'
import PageShell from '../components/layout/PageShell'
import { Rocket, BarChart3, Clock, Printer, ChevronDown, ChevronRight } from 'lucide-react'
import FireMissionEditModal from '../components/FireMissionEditModal'
import FireMissionListRow from '../components/FireMissionListRow'
import { Task } from '../types'

/**
 * Renders the Fire Missions UI section.
 */
export default function FireMissions() {
  const { tasks, launchers, taskTemplates, updateTask, endTaskEarly, currentUserRole, bocs, pocs } = useAppData()
  const force = useScopedForce()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const isMobile = useIsMobile()
  const printRef = useRef<HTMLDivElement>(null)

  const roleType = currentUserRole?.type
  const compactUi =
    force.viewDensity === 'compact' ||
    roleType === 'brigade' ||
    roleType === 'battalion' ||
    roleType === 'boc'

  const scopedLauncherIds = useMemo(
    () => new Set(force.scopedLaunchers.map((l) => l.id)),
    [force.scopedLaunchers]
  )

  // Get all fire missions (tasks with fire type or fire-related description)
  const fireMissionsAll = useMemo(() => {
    return tasks
      .filter((task) => {
        const template = taskTemplates.find((t) => t.id === task.templateId)
        return (
          template?.type === 'fire' ||
          task.description.toLowerCase().includes('fire mission') ||
          task.name.toLowerCase().includes('fire')
        )
      })
      .sort((a, b) => {
        const aTime = a.startTime?.getTime() || 0
        const bTime = b.startTime?.getTime() || 0
        return bTime - aTime // Most recent first
      })
  }, [tasks, taskTemplates])

  const fireMissions = useMemo(() => {
    if (!currentUserRole) return fireMissionsAll
    if (roleType === 'brigade' || roleType === 'battalion') return fireMissionsAll
    return fireMissionsAll.filter((task) => {
      if (!task.launcherIds?.length) return false
      return task.launcherIds.some((id) => scopedLauncherIds.has(id))
    })
  }, [fireMissionsAll, currentUserRole, roleType, scopedLauncherIds])

  const missionGroups = useMemo(() => {
    const hierarchical = roleType === 'brigade' || roleType === 'battalion' || roleType === 'boc'
    if (!hierarchical) return null
    const map = new Map<string, { label: string; missions: Task[] }>()
    for (const task of fireMissions) {
      const lid = task.launcherIds?.[0]
      const launcher = lid ? launchers.find((l) => l.id === lid) : undefined
      const poc = launcher?.pocId ? pocs.find((p) => p.id === launcher.pocId) : undefined
      const boc = poc?.bocId ? bocs.find((b) => b.id === poc.bocId) : undefined
      const key = `${boc?.id ?? 'noboc'}|${poc?.id ?? 'nopoc'}`
      const label =
        boc && poc
          ? `${boc.name} → ${poc.name}`
          : poc
            ? poc.name
            : boc
              ? `${boc.name} (PLT unknown)`
              : 'Unknown unit'
      if (!map.has(key)) map.set(key, { label, missions: [] })
      map.get(key)!.missions.push(task)
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [fireMissions, launchers, pocs, bocs, roleType])


  // Calculate stats
  const stats = useMemo(() => {
    const completedMissions = fireMissions.filter((t) => t.status === 'completed' && !t.canceled)
    const lastMission = completedMissions[0]
    const now = new Date()
    
    let timeSinceLastMission: string | null = null
    if (lastMission?.completedTime) {
      const diffMs = now.getTime() - lastMission.completedTime.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      if (diffHours > 0) {
        timeSinceLastMission = `${diffHours}h ${diffMinutes}m`
      } else {
        timeSinceLastMission = `${diffMinutes}m`
      }
    } else if (lastMission?.startTime) {
      const diffMs = now.getTime() - lastMission.startTime.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      if (diffHours > 0) {
        timeSinceLastMission = `${diffHours}h ${diffMinutes}m`
      } else {
        timeSinceLastMission = `${diffMinutes}m`
      }
    }

    return {
      total: fireMissions.length,
      completed: completedMissions.length,
      canceled: fireMissions.filter((t) => t.canceled).length,
      inProgress: fireMissions.filter((t) => t.status === 'in-progress').length,
      timeSinceLastMission,
    }
  }, [fireMissions])

  // Calculate fire mission rate per hour
  const fireMissionRate = useMemo(() => {
    const completedMissions = fireMissions.filter((t) => t.status === 'completed' && !t.canceled)
    if (completedMissions.length === 0) return null

    // Get the oldest and newest completed mission times
    const times = completedMissions
      .map((t) => t.completedTime || t.startTime)
      .filter((t): t is Date => !!t)
      .sort((a, b) => a.getTime() - b.getTime())

    if (times.length < 2) return null

    const oldestTime = times[0]
    const newestTime = times[times.length - 1]
    const hoursDiff = (newestTime.getTime() - oldestTime.getTime()) / (1000 * 60 * 60)

    if (hoursDiff === 0) return null

    const rate = completedMissions.length / hoursDiff
    return rate.toFixed(2)
  }, [fireMissions])

  // Calculate average reload time
  const reloadRate = useMemo(() => {
    const reloadTasks = tasks.filter((task) => {
      const template = taskTemplates.find((t) => t.id === task.templateId)
      return template?.type === 'reload' && task.status === 'completed' && task.startTime && task.completedTime
    })

    if (reloadTasks.length === 0) return null

    const totalTime = reloadTasks.reduce((sum, task) => {
      if (task.startTime && task.completedTime) {
        const duration = (task.completedTime.getTime() - task.startTime.getTime()) / 1000 // seconds
        return sum + duration
      }
      return sum
    }, 0)

    const avgSeconds = totalTime / reloadTasks.length
    const minutes = Math.floor(avgSeconds / 60)
    const seconds = Math.floor(avgSeconds % 60)

    return `${minutes}m ${seconds}s`
  }, [tasks, taskTemplates])

    /**
   * Returns launcher names for downstream consumers.
   */
const getLauncherNames = (task: Task) => {
    if (!task.launcherIds || task.launcherIds.length === 0) return 'N/A'
    return task.launcherIds
      .map((id) => {
        const launcher = launchers.find((l) => l.id === id)
        return launcher?.name || 'Unknown'
      })
      .join(', ')
  }

    /**
   * Implements format date time for this module.
   */
const formatDateTime = (date?: Date) => {
    if (!date) return 'N/A'
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
    return date.toLocaleString('en-US', options)
  }

    /**
   * Implements toggle group for this module.
   */
const toggleGroup = (key: string) => {
    setOpenGroups((o) => ({ ...o, [key]: !o[key] }))
  }
    /**
   * Determines whether is group open is true in the current context.
   */
const isGroupOpen = (key: string) => openGroups[key] ?? false

  // --- Render ---
  return (
    <PageShell
      title="Fire missions"
      isMobile={isMobile}
      actions={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-secondary)',
            fontSize: isMobile ? '0.8rem' : '0.95rem',
            fontWeight: 500,
          }}
        >
          <Rocket size={isMobile ? 22 : 26} color="var(--danger)" aria-hidden />
          DA Form 7232
        </span>
      }
    >
      {compactUi && currentUserRole && (
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            marginTop: '-0.5rem',
            marginBottom: '1rem',
          }}
        >
          Showing missions for your view: <strong style={{ color: 'var(--text-primary)' }}>{currentUserRole.name}</strong>
          {roleType === 'brigade' || roleType === 'battalion' ? ' (full organization)' : ''}
        </p>
      )}

      {/* Stats Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : compactUi
              ? 'repeat(auto-fit, minmax(120px, 1fr))'
              : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: compactUi ? '0.65rem' : '1rem',
          marginBottom: compactUi ? '1.25rem' : '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: compactUi ? '0.65rem 0.75rem' : '1rem',
          }}
        >
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: compactUi ? '0.72rem' : '0.875rem',
              marginBottom: '0.25rem',
            }}
          >
            Total Missions
          </div>
          <div
            style={{
              color: 'var(--text-primary)',
              fontSize: compactUi ? '1.2rem' : '1.5rem',
              fontWeight: 'bold',
            }}
          >
            {stats.total}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: compactUi ? '0.65rem 0.75rem' : '1rem',
          }}
        >
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: compactUi ? '0.72rem' : '0.875rem',
              marginBottom: '0.25rem',
            }}
          >
            Completed
          </div>
          <div
            style={{
              color: 'var(--success)',
              fontSize: compactUi ? '1.2rem' : '1.5rem',
              fontWeight: 'bold',
            }}
          >
            {stats.completed}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: compactUi ? '0.65rem 0.75rem' : '1rem',
          }}
        >
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: compactUi ? '0.72rem' : '0.875rem',
              marginBottom: '0.25rem',
            }}
          >
            Canceled
          </div>
          <div
            style={{
              color: 'var(--warning)',
              fontSize: compactUi ? '1.2rem' : '1.5rem',
              fontWeight: 'bold',
            }}
          >
            {stats.canceled}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: compactUi ? '0.65rem 0.75rem' : '1rem',
          }}
        >
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: compactUi ? '0.72rem' : '0.875rem',
              marginBottom: '0.25rem',
            }}
          >
            Time Since Last
          </div>
          <div
            style={{
              color: 'var(--text-primary)',
              fontSize: compactUi ? '1.2rem' : '1.5rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Clock size={compactUi ? 15 : 18} />
            {stats.timeSinceLastMission || 'N/A'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile || compactUi ? '1fr' : '2fr 1fr',
          gap: compactUi ? '1rem' : '1.5rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Fire Missions List */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
              }}
            >
              Fire Missions
            </h2>
            <button
              onClick={() => {
                if (printRef.current) {
                  const printWindow = window.open('', '_blank')
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>MLRS FDC FIRE MISSION LOG - DA Form 7232</title>
                          <style>
                            @page {
                              size: landscape;
                              margin: 0.5in;
                            }
                            body {
                              font-family: 'Courier New', monospace;
                              font-size: 9pt;
                              color: #000;
                              margin: 0;
                              padding: 0;
                            }
                            .header {
                              text-align: center;
                              margin-bottom: 10px;
                            }
                            .header h1 {
                              font-size: 14pt;
                              font-weight: bold;
                              margin: 0;
                              padding: 0;
                              letter-spacing: 1px;
                            }
                            .header-info {
                              display: flex;
                              justify-content: space-between;
                              margin-top: 5px;
                              font-size: 9pt;
                            }
                            .header-info .date-unit {
                              text-align: right;
                            }
                            .header-info .date-unit div {
                              margin-bottom: 2px;
                            }
                            .instructions {
                              font-size: 8pt;
                              font-style: italic;
                              margin: 5px 0 10px 0;
                              text-align: center;
                            }
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              margin-top: 5px;
                              font-size: 8pt;
                            }
                            th, td {
                              border: 1px solid #000;
                              padding: 3px 4px;
                              text-align: left;
                              vertical-align: top;
                            }
                            th {
                              background-color: #fff;
                              font-weight: bold;
                              font-size: 7pt;
                              text-align: center;
                            }
                            td {
                              font-size: 8pt;
                            }
                            .footer {
                              margin-top: 10px;
                              font-size: 7pt;
                              display: flex;
                              justify-content: space-between;
                            }
                            @media print {
                              body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                              }
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>MLRS FDC FIRE MISSION LOG</h1>
                          <div class="header-info">
                            <div></div>
                            <div class="date-unit">
                              <div><strong>DATE:</strong> ${new Date().toLocaleDateString()}</div>
                              <div><strong>UNIT:</strong> ${currentUserRole?.name || ''}</div>
                            </div>
                          </div>
                          </div>
                          <div class="instructions">
                            For use of this form, see FM 3-09.60. The proponent agency is TRADOC.
                          </div>
                          <table>
                            <thead>
                              <tr>
                                <th style="width: 8%;">(a)<br>Target<br>Number</th>
                                <th style="width: 10%;">(b/c)<br>Grid</th>
                                <th style="width: 8%;">(d)<br>Unit<br>Assigned</th>
                                <th style="width: 8%;">(e)<br>Time of<br>Receipt</th>
                                <th style="width: 7%;">(f)<br>Number of<br>Rounds<br>to Fire</th>
                                <th style="width: 7%;">(g)<br>Ammo<br>Type<br>to Fire</th>
                                <th style="width: 10%;">(h)<br>Method of<br>Control<br>TOT Time</th>
                                <th style="width: 8%;">(i)<br>Time<br>MSN Sent</th>
                                <th style="width: 7%;">(j)<br>Mission<br>Status</th>
                                <th style="width: 8%;">(k)<br>Time<br>MFR<br>Received</th>
                                <th style="width: 7%;">(l)<br>Number of<br>Rounds<br>Fired</th>
                                <th style="width: 12%;">(m)<br>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${fireMissions.map((mission) => {
                                let statusText = mission.missionStatus || ''
                                if (!statusText) {
                                  if (mission.canceled) {
                                    statusText = 'Canceled'
                                  } else if (mission.status === 'completed') {
                                    statusText = 'Completed'
                                  } else {
                                    statusText = 'In Progress'
                                  }
                                }
                                
                                                                /**
                                 * Implements format time for this module.
                                 */
const formatTime = (date?: Date) => {
                                  if (!date) return ''
                                  return date.toLocaleString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  }).replace(',', '')
                                }
                                
                                return `
                                  <tr>
                                    <td>${mission.targetNumber || mission.name || ''}</td>
                                    <td>${mission.grid || ''}</td>
                                    <td>${mission.unitAssigned || ''}</td>
                                    <td>${mission.timeOfReceipt ? formatTime(mission.timeOfReceipt) : (mission.startTime ? formatTime(mission.startTime) : '')}</td>
                                    <td style="text-align: center;">${mission.numberOfRoundsToFire || ''}</td>
                                    <td>${mission.ammoTypeToFire || ''}</td>
                                    <td>${mission.methodOfControl || ''}${mission.totTime ? (mission.methodOfControl ? ' / ' : '') + mission.totTime : ''}</td>
                                    <td>${mission.timeMsnSent ? formatTime(mission.timeMsnSent) : ''}</td>
                                    <td>${statusText}</td>
                                    <td>${mission.timeMfrReceived ? formatTime(mission.timeMfrReceived) : ''}</td>
                                    <td style="text-align: center;">${mission.numberOfRoundsFired || ''}</td>
                                    <td>${mission.remarks || ''}</td>
                                  </tr>
                                `
                              }).join('')}
                            </tbody>
                          </table>
                          <div class="footer">
                            <span>DA FORM 7232-R, AUG 92</span>
                            <span>USAPA V1.01</span>
                          </div>
                        </body>
                      </html>
                    `)
                    printWindow.document.close()
                    printWindow.focus()
                    setTimeout(() => {
                      printWindow.print()
                      printWindow.close()
                    }, 250)
                  }
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
              }}
            >
              <Printer size={16} />
              {isMobile ? 'Print' : 'Print Report'}
            </button>
          </div>

          <div
            ref={printRef}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {fireMissions.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                No fire missions yet. Start a fire mission from the Dashboard.
              </div>
            ) : (
              <div style={{ maxHeight: isMobile ? 'none' : 'calc(100vh - 400px)', overflowY: 'auto' }}>
                {missionGroups
                  ? missionGroups.map((g) => (
                      <div key={g.key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(g.key)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: compactUi ? '0.55rem 0.75rem' : '0.65rem 1rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: 'none',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: compactUi ? '0.8rem' : '0.9rem',
                            color: 'var(--text-primary)',
                            textAlign: 'left',
                          }}
                        >
                          {isGroupOpen(g.key) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          {g.label}
                          <span
                            style={{
                              color: 'var(--text-secondary)',
                              fontWeight: 500,
                              marginLeft: '0.35rem',
                              fontSize: '0.78rem',
                            }}
                          >
                            ({g.missions.length})
                          </span>
                        </button>
                        {isGroupOpen(g.key) &&
                          g.missions.map((mission, index) => (
                            <FireMissionListRow
                              key={mission.id}
                              mission={mission}
                              index={index}
                              isMobile={isMobile}
                              compactUi={compactUi}
                              getLauncherNames={getLauncherNames}
                              formatDateTime={formatDateTime}
                              endTaskEarly={endTaskEarly}
                              setSelectedTask={setSelectedTask}
                            />
                          ))}
                      </div>
                    ))
                  : fireMissions.map((mission, index) => (
                      <FireMissionListRow
                        key={mission.id}
                        mission={mission}
                        index={index}
                        isMobile={isMobile}
                        compactUi={compactUi}
                        getLauncherNames={getLauncherNames}
                        formatDateTime={formatDateTime}
                        endTaskEarly={endTaskEarly}
                        setSelectedTask={setSelectedTask}
                      />
                    ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Panel */}
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <BarChart3 size={20} color="var(--accent)" />
            Stats
          </h2>

          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Fire Mission Rate
              </div>
              <div
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {fireMissionRate ? (
                  <>
                    <Rocket size={18} />
                    {fireMissionRate} / hour
                  </>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>N/A</span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Average completed missions per hour
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                Average Reload Time
              </div>
              <div
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {reloadRate ? (
                  <>
                    <Clock size={18} />
                    {reloadRate}
                  </>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>N/A</span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Average time to complete reload tasks
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedTask && (
        <FireMissionEditModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updates) => {
            updateTask(selectedTask.id, updates)
            setSelectedTask(null)
          }}
        />
      )}
    </PageShell>
  )
}

