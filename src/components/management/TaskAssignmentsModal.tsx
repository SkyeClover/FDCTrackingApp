import { useMemo, useState, useCallback } from 'react'
import { X, Plus, ListChecks } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useProgress } from '../../context/ProgressContext'
import { useScopedForce } from '../../hooks/useScopedForce'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Launcher, POC, TaskTemplate } from '../../types'
import TaskProgressBar from './TaskProgressBar'

type Props = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Implements sort by name for this module.
 */
function sortByName<T extends { name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Implements format duration for this module.
 */
function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Renders the Task Assignments Modal UI section.
 */
export default function TaskAssignmentsModal({ isOpen, onClose }: Props) {
  const isMobile = useIsMobile()
  const { scopedLaunchers, scopedPOCs, isScoped, currentUserRole } = useScopedForce()
  const {
    taskTemplates,
    tasks,
    startTaskFromTemplate,
    startTaskFromTemplateForPOC,
    cancelTask,
    clearTask,
  } = useAppData()
  const { taskProgress } = useProgress()

  const [expandedTaskLauncher, setExpandedTaskLauncher] = useState<string | null>(null)
  const [expandedTaskPOC, setExpandedTaskPOC] = useState<string | null>(null)

  const launchersSorted = useMemo(() => sortByName(scopedLaunchers), [scopedLaunchers])
  const pocsSorted = useMemo(() => sortByName(scopedPOCs), [scopedPOCs])
  const templatesSorted = useMemo(() => sortByName(taskTemplates), [taskTemplates])

  const launcherRows = useCallback(
    (launcher: Launcher) => (
      <div
        key={launcher.id}
        style={{
          padding: isMobile ? '0.5rem' : '1rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: isMobile ? '6px' : '8px',
          border: `${isMobile ? '1px' : '2px'} solid ${
            launcher.status === 'active' ? 'var(--accent)' : 'var(--border)'
          }`,
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: launcher.currentTask ? (isMobile ? '0.35rem' : '0.5rem') : '0',
            gap: '0.5rem',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                marginBottom: isMobile ? '0.15rem' : '0.25rem',
              }}
            >
              Launcher
            </div>
            <div
              style={{
                fontSize: isMobile ? '0.8rem' : '1rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {launcher.name}
            </div>
          </div>
          {launcher.status === 'active' && (
            <span
              style={{
                padding: isMobile ? '0.2rem 0.5rem' : '0.25rem 0.75rem',
                backgroundColor: 'var(--accent)',
                borderRadius: '4px',
                fontSize: isMobile ? '0.7rem' : '0.75rem',
                color: 'white',
                fontWeight: '500',
                whiteSpace: 'nowrap',
              }}
            >
              Active
            </span>
          )}
        </div>

        {launcher.currentTask ? (
          <TaskProgressBar
            taskId={launcher.currentTask.id}
            taskName={launcher.currentTask.name}
            taskProgress={taskProgress}
            taskStatus={tasks.find((t) => t.id === launcher.currentTask?.id)?.status}
            onCancel={cancelTask}
            onClear={clearTask}
            launcherId={launcher.id}
          />
        ) : (
          <div>
            {expandedTaskLauncher === launcher.id ? (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {templatesSorted.map((template: TaskTemplate) => (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => {
                        startTaskFromTemplate(template.id, launcher.id)
                        setExpandedTaskLauncher(null)
                      }}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        width: '100%',
                        minWidth: 0,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                        e.currentTarget.style.borderColor = 'var(--accent)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <div>{template.name}</div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.25rem',
                        }}
                      >
                        {formatDuration(template.duration)}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedTaskLauncher(null)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setExpandedTaskLauncher(launcher.id)}
                disabled={launcher.status === 'active'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: launcher.status === 'active' ? 'var(--bg-tertiary)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: launcher.status === 'active' ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: launcher.status === 'active' ? 0.5 : 1,
                }}
              >
                <Plus size={16} />
                Start Task
              </button>
            )}
          </div>
        )}
      </div>
    ),
    [
      isMobile,
      taskProgress,
      tasks,
      cancelTask,
      clearTask,
      expandedTaskLauncher,
      templatesSorted,
      startTaskFromTemplate,
    ]
  )

  if (!isOpen) return null

  const scopeHint =
    isScoped && currentUserRole
      ? `Only units under your view role (“${currentUserRole.name}”) are listed.`
      : 'All launchers and PLTs are listed (no view role filter).'

  const emptyPrereq =
    templatesSorted.length > 0 && launchersSorted.length === 0 && pocsSorted.length === 0
      ? 'Add launchers and PLTs (POCs) in Organization / Unit hierarchy.'
      : null
  const noTemplates = templatesSorted.length === 0

  // --- Render ---
  return (
    <div
      className="fdc-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          maxWidth: '920px',
          width: '100%',
          maxHeight: 'min(90vh, 100%)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <ListChecks size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Task assignments
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Start tasks per launcher or for an entire PLT (POC). {scopeHint}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem 1.25rem' }}>
          {noTemplates ? (
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Create task templates in Management first.</p>
          ) : (
            <>
              {emptyPrereq && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1rem' }}>{emptyPrereq}</p>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '1rem',
                  alignItems: 'start',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Launchers ({launchersSorted.length})
                  </div>
                  {launchersSorted.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>No launchers in scope.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.6rem' : '1rem' }}>
                      {launchersSorted.map((l) => launcherRows(l))}
                    </div>
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    PLTs — POC ({pocsSorted.length})
                  </div>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      margin: '0 0 0.75rem',
                      fontStyle: 'italic',
                    }}
                  >
                    POC tasks start the same template on every launcher in that PLT.
                  </p>
                  {pocsSorted.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>No PLTs in scope.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {pocsSorted.map((poc: POC) => {
                        const pocLaunchers = scopedLaunchers.filter((l) => l.pocId === poc.id)
                        const hasActiveLaunchers = pocLaunchers.some((l) => l.status === 'active')
                        const hasLaunchers = pocLaunchers.length > 0

                        return (
                          <div
                            key={poc.id}
                            style={{
                              padding: isMobile ? '0.5rem' : '1rem',
                              backgroundColor: 'var(--bg-tertiary)',
                              borderRadius: isMobile ? '6px' : '8px',
                              border: `${isMobile ? '1px' : '2px'} solid ${
                                hasActiveLaunchers ? 'var(--accent)' : 'var(--border)'
                              }`,
                              width: '100%',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: isMobile ? '0.35rem' : '0.5rem',
                                gap: '0.5rem',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    marginBottom: isMobile ? '0.15rem' : '0.25rem',
                                  }}
                                >
                                  POC
                                </div>
                                <div
                                  style={{
                                    fontSize: isMobile ? '0.8rem' : '1rem',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                  }}
                                >
                                  {poc.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    color: 'var(--text-secondary)',
                                    marginTop: isMobile ? '0.15rem' : '0.25rem',
                                  }}
                                >
                                  {pocLaunchers.length} launcher{pocLaunchers.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                              {hasActiveLaunchers && (
                                <span
                                  style={{
                                    padding: isMobile ? '0.2rem 0.5rem' : '0.25rem 0.75rem',
                                    backgroundColor: 'var(--accent)',
                                    borderRadius: '4px',
                                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                                    color: 'white',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Active
                                </span>
                              )}
                            </div>

                            {!hasLaunchers ? (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                No launchers assigned to this POC
                              </p>
                            ) : hasActiveLaunchers ? (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                                POC has active launchers. Wait for tasks to complete.
                              </p>
                            ) : (
                              <div>
                                {expandedTaskPOC === poc.id ? (
                                  <div>
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: '0.5rem',
                                        marginBottom: '0.5rem',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                      }}
                                    >
                                      {templatesSorted.map((template: TaskTemplate) => (
                                        <button
                                          type="button"
                                          key={template.id}
                                          onClick={() => {
                                            startTaskFromTemplateForPOC(template.id, poc.id)
                                            setExpandedTaskPOC(null)
                                          }}
                                          style={{
                                            padding: '0.75rem',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '6px',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            fontWeight: '500',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                            width: '100%',
                                            minWidth: 0,
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                            boxSizing: 'border-box',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                                            e.currentTarget.style.borderColor = 'var(--accent)'
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                                            e.currentTarget.style.borderColor = 'var(--border)'
                                          }}
                                        >
                                          <div>{template.name}</div>
                                          <div
                                            style={{
                                              fontSize: '0.75rem',
                                              color: 'var(--text-secondary)',
                                              marginTop: '0.25rem',
                                            }}
                                          >
                                            {formatDuration(template.duration)}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedTaskPOC(null)}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '4px',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTaskPOC(poc.id)}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      backgroundColor: 'var(--accent)',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: 'white',
                                      cursor: 'pointer',
                                      fontSize: '0.9rem',
                                      fontWeight: '500',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.5rem',
                                    }}
                                  >
                                    <Plus size={16} />
                                    Start Task for POC
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
