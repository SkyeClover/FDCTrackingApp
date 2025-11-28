import { useState, useMemo, memo, useCallback } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useProgress } from '../context/ProgressContext'
import { Plus, Trash2, Edit, X, Check, Package, Rocket, Target, Truck } from 'lucide-react'
import { TaskTemplate, Launcher, Pod, POC, BOC, RSV } from '../types'

// Memoized components to prevent re-renders during progress updates
const AssignmentItem = memo(({
  item,
  options,
  currentValue,
  onAssign,
  onUnassign,
  itemLabel,
  optionLabel,
}: {
  item: { id: string; name: string }
  options: { id: string; name: string }[]
  currentValue?: string
  onAssign: (itemId: string, optionId: string) => void
  onUnassign: (itemId: string) => void
  itemLabel: string
  optionLabel: string
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentOption = options.find((o) => o.id === currentValue)

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '8px',
        border: `2px solid ${currentValue ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded || currentValue ? '0.75rem' : '0',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}
          >
            {itemLabel}
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
            }}
          >
            {item.name}
          </div>
          {currentOption && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Check size={16} color="var(--success)" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {optionLabel}: <strong>{currentOption.name}</strong>
              </span>
              <button
                onClick={() => onUnassign(item.id)}
                style={{
                  marginLeft: 'auto',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'var(--danger)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <X size={12} />
                Unassign
              </button>
            </div>
          )}
        </div>
      </div>

      {!currentValue && (
        <div>
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
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
              Assign {optionLabel}
            </button>
          ) : (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onAssign(item.id, option.id)
                      setIsExpanded(false)
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
                      transition: 'all 0.2s',
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
                    {option.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
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
          )}
        </div>
      )}
    </div>
  )
})

AssignmentItem.displayName = 'AssignmentItem'

const TaskProgressBar = memo(({ taskId, taskName, taskProgress }: { taskId: string; taskName: string; taskProgress: { [key: string]: number } }) => {
  const progress = taskProgress[taskId] ?? 0
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div
        style={{
          width: '100%',
          height: '10px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '5px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'var(--accent)',
            transition: 'width 0.3s',
          }}
        />
      </div>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          marginTop: '0.25rem',
        }}
      >
        {progress.toFixed(0)}% - {taskName}
      </p>
    </div>
  )
})

TaskProgressBar.displayName = 'TaskProgressBar'

// Memoized task template form
const TaskTemplateForm = memo(({
  editingTemplate,
  onSubmit,
  onCancel,
}: {
  editingTemplate: TaskTemplate | null
  onSubmit: (data: { name: string; description: string; duration: number; type: TaskTemplate['type'] }) => void
  onCancel: () => void
}) => {
  const [name, setName] = useState(editingTemplate?.name || '')
  const [description, setDescription] = useState(editingTemplate?.description || '')
  const [duration, setDuration] = useState(editingTemplate?.duration || 60)
  const [type, setType] = useState<TaskTemplate['type']>(editingTemplate?.type || 'custom')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit({ name: name.trim(), description, duration, type })
      setName('')
      setDescription('')
      setDuration(60)
      setType('custom')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task Name (e.g., Reload, Fire Mission)"
        required
        autoFocus
        style={{
          padding: '0.5rem',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
        }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        style={{
          padding: '0.5rem',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
          resize: 'vertical',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 60))}
          placeholder="Duration (seconds)"
          min="1"
          required
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskTemplate['type'])}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
          }}
        >
          <option value="reload">Reload</option>
          <option value="fire">Fire</option>
          <option value="maintenance">Maintenance</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--success)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {editingTemplate ? 'Update Template' : 'Create Template'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
})

TaskTemplateForm.displayName = 'TaskTemplateForm'

export default function Management() {
  const {
    bocs,
    pocs,
    launchers,
    pods,
    rsvs,
    taskTemplates,
    assignPodToPOC,
    assignPodToRSV,
    assignPodToLauncher,
    assignLauncherToPOC,
    assignPOCToBOC,
    assignRSVToPOC,
    assignRSVToBOC,
    assignRSVToAmmoPlt,
    addTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    startTaskFromTemplate,
  } = useAppData()
  
  const { taskProgress } = useProgress()

  const [showTaskTemplateForm, setShowTaskTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [expandedTaskLauncher, setExpandedTaskLauncher] = useState<string | null>(null)

  // Memoize filtered data to prevent unnecessary recalculations
  const availableLaunchers = useMemo(
    () => launchers.filter((l) => l.status !== 'active'),
    [launchers]
  )

  const handleTaskTemplateSubmit = useCallback(
    (data: { name: string; description: string; duration: number; type: TaskTemplate['type'] }) => {
      if (editingTemplate) {
        updateTaskTemplate(editingTemplate.id, data)
        setEditingTemplate(null)
      } else {
        addTaskTemplate({
          id: Date.now().toString(),
          ...data,
        })
      }
      setShowTaskTemplateForm(false)
    },
    [editingTemplate, addTaskTemplate, updateTaskTemplate]
  )

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const AssignmentCard = memo(({
    title,
    icon: Icon,
    children,
  }: {
    title: string
    icon?: any
    children: React.ReactNode
  }) => (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {Icon && <Icon size={24} color="var(--accent)" />}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  ))

  AssignmentCard.displayName = 'AssignmentCard'

  // Memoize arrays to prevent re-renders
  const bocsMemo = useMemo(() => bocs, [bocs])
  const pocsMemo = useMemo(() => pocs, [pocs])
  const launchersMemo = useMemo(() => launchers, [launchers])
  const podsMemo = useMemo(() => pods, [pods])
  const rsvsMemo = useMemo(() => rsvs, [rsvs])
  const taskTemplatesMemo = useMemo(() => taskTemplates, [taskTemplates])
  
  // Ammo PLT ID - using a constant for now, could be made configurable
  const AMMO_PLT_ID = 'ammo-plt-1'

  return (
    <div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          color: 'var(--text-primary)',
        }}
      >
        Management Panel
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Task Templates Section */}
        <AssignmentCard title="Task Templates" icon={Edit}>
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => {
                setEditingTemplate(null)
                setShowTaskTemplateForm(!showTaskTemplateForm)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <Plus size={16} />
              {showTaskTemplateForm ? 'Cancel' : 'Create Task Template'}
            </button>
          </div>

          {showTaskTemplateForm && (
            <TaskTemplateForm
              editingTemplate={editingTemplate}
              onSubmit={handleTaskTemplateSubmit}
              onCancel={() => {
                setShowTaskTemplateForm(false)
                setEditingTemplate(null)
              }}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {taskTemplatesMemo.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No task templates. Create one to define custom task durations.
              </p>
            ) : (
              taskTemplatesMemo.map((template) => (
                <div
                  key={template.id}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontWeight: '600',
                          fontSize: '0.95rem',
                        }}
                      >
                        {template.name}
                      </span>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {template.type}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {template.description}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--accent)',
                        fontFamily: 'monospace',
                        fontWeight: '500',
                      }}
                    >
                      Duration: {formatDuration(template.duration)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setEditingTemplate(template)
                        setShowTaskTemplateForm(true)
                      }}
                      style={{
                        padding: '0.35rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => deleteTaskTemplate(template.id)}
                      style={{
                        padding: '0.35rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </AssignmentCard>

        {/* Assign Tasks from Templates */}
        <AssignmentCard title="Assign Tasks to Launchers" icon={Rocket}>
          {launchersMemo.length === 0 || taskTemplatesMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create launchers and task templates first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {launchersMemo.map((launcher) => (
                <div
                  key={launcher.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    border: `2px solid ${
                      launcher.status === 'active' ? 'var(--accent)' : 'var(--border)'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: launcher.currentTask ? '0.5rem' : '0',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem',
                        }}
                      >
                        Launcher
                      </div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {launcher.name}
                      </div>
                    </div>
                    {launcher.status === 'active' && (
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'var(--accent)',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: 'white',
                          fontWeight: '500',
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
                    />
                  ) : (
                    <div>
                      {expandedTaskLauncher === launcher.id ? (
                        <div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                              gap: '0.5rem',
                              marginBottom: '0.5rem',
                            }}
                          >
                            {taskTemplatesMemo.map((template) => (
                              <button
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
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign Pods to POCs" icon={Package}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontStyle: 'italic',
            }}
          >
            Assign pods to POCs for "POCs On Ground" inventory
          </div>
          {podsMemo.length === 0 || pocsMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create pods and POCs in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {podsMemo.map((pod) => (
                <AssignmentItem
                  key={pod.id}
                  item={pod}
                  options={pocsMemo}
                  currentValue={pod.pocId}
                  onAssign={assignPodToPOC}
                  onUnassign={(id) => assignPodToPOC(id, '')}
                  itemLabel="Pod"
                  optionLabel="POC"
                />
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign Pods to Launchers" icon={Package}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontStyle: 'italic',
            }}
          >
            Note: Pods should be assigned to POCs first. Reloading will automatically swap pods from POC inventory.
          </div>
          {podsMemo.length === 0 || launchersMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create pods and launchers in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {podsMemo.map((pod) => (
                <AssignmentItem
                  key={pod.id}
                  item={pod}
                  options={launchersMemo}
                  currentValue={pod.launcherId}
                  onAssign={assignPodToLauncher}
                  onUnassign={(id) => assignPodToLauncher(id, '')}
                  itemLabel="Pod"
                  optionLabel="Launcher"
                />
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign Launchers to POCs" icon={Target}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontStyle: 'italic',
            }}
          >
            Platoon Operations Center (PLT FDC)
          </div>
          {launchersMemo.length === 0 || pocsMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create launchers and POCs in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {launchersMemo.map((launcher) => (
                <AssignmentItem
                  key={launcher.id}
                  item={launcher}
                  options={pocsMemo}
                  currentValue={launcher.pocId}
                  onAssign={assignLauncherToPOC}
                  onUnassign={(id) => assignLauncherToPOC(id, '')}
                  itemLabel="Launcher"
                  optionLabel="POC"
                />
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign POCs to BOCs" icon={Target}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontStyle: 'italic',
            }}
          >
            Battery Operations Center (FDC)
          </div>
          {pocsMemo.length === 0 || bocsMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create POCs and BOCs in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pocsMemo.map((poc) => (
                <AssignmentItem
                  key={poc.id}
                  item={poc}
                  options={bocsMemo}
                  currentValue={poc.bocId}
                  onAssign={assignPOCToBOC}
                  onUnassign={(id) => assignPOCToBOC(id, '')}
                  itemLabel="POC"
                  optionLabel="BOC"
                />
              ))}
            </div>
          )}
        </AssignmentCard>

        {/* Assign RSV's to POC/BOC/Ammo PLT */}
        <AssignmentCard title="Assign RSV's" icon={Truck}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontStyle: 'italic',
            }}
          >
            Assign RSV's (Reload Supply Vehicles) to POC, BOC (Battery level slants), or Ammo PLT
          </div>
          {rsvsMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create RSV's in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rsvsMemo.map((rsv) => {
                const assignmentType = rsv.pocId ? 'POC' : rsv.bocId ? 'BOC' : rsv.ammoPltId ? 'Ammo PLT' : 'None'
                const assignmentId = rsv.pocId || rsv.bocId || rsv.ammoPltId || ''
                
                return (
                  <div
                    key={rsv.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: `2px solid ${assignmentId ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem',
                        }}
                      >
                        RSV
                      </div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {rsv.name}
                      </div>
                      {assignmentId && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Check size={16} color="var(--success)" />
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {assignmentType}: <strong>
                              {assignmentType === 'POC' && pocsMemo.find((p) => p.id === assignmentId)?.name}
                              {assignmentType === 'BOC' && bocsMemo.find((b) => b.id === assignmentId)?.name}
                              {assignmentType === 'Ammo PLT' && 'Ammo PLT'}
                            </strong>
                          </span>
                          <button
                            onClick={() => {
                              if (rsv.pocId) assignRSVToPOC(rsv.id, '')
                              else if (rsv.bocId) assignRSVToBOC(rsv.id, '')
                              else if (rsv.ammoPltId) assignRSVToAmmoPlt(rsv.id, '')
                            }}
                            style={{
                              marginLeft: 'auto',
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--danger)',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <X size={12} />
                            Unassign
                          </button>
                        </div>
                      )}
                    </div>

                    {!assignmentId && (
                      <div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '0.5rem',
                          }}
                        >
                          {pocsMemo.length > 0 && (
                            <button
                              onClick={() => {
                                const selected = prompt(`Assign to POC:\n${pocsMemo.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter number:`)
                                if (selected) {
                                  const index = parseInt(selected) - 1
                                  if (index >= 0 && index < pocsMemo.length) {
                                    assignRSVToPOC(rsv.id, pocsMemo[index].id)
                                  }
                                }
                              }}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                            >
                              Assign to POC
                            </button>
                          )}
                          {bocsMemo.length > 0 && (
                            <button
                              onClick={() => {
                                const selected = prompt(`Assign to BOC:\n${bocsMemo.map((b, i) => `${i + 1}. ${b.name}`).join('\n')}\n\nEnter number:`)
                                if (selected) {
                                  const index = parseInt(selected) - 1
                                  if (index >= 0 && index < bocsMemo.length) {
                                    assignRSVToBOC(rsv.id, bocsMemo[index].id)
                                  }
                                }
                              }}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                              }}
                            >
                              Assign to BOC
                            </button>
                          )}
                          <button
                            onClick={() => assignRSVToAmmoPlt(rsv.id, AMMO_PLT_ID)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            Assign to Ammo PLT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </AssignmentCard>

        {/* Assign Pods to RSV's - Bulk Assignment */}
        <AssignmentCard title="Assign Pods to RSV's" icon={Package}>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1rem',
              fontStyle: 'italic',
            }}
          >
            Assign pods to RSV's. Use bulk selection for Ammo PLT with many pods.
          </div>
          {rsvsMemo.length === 0 || podsMemo.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create RSV's and pods in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rsvsMemo.map((rsv) => {
                const rsvPods = podsMemo.filter((p) => p.rsvId === rsv.id)
                const unassignedPods = podsMemo.filter((p) => !p.rsvId && !p.launcherId)
                
                return (
                  <div
                    key={rsv.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          marginBottom: '0.25rem',
                        }}
                      >
                        RSV: {rsv.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {rsvPods.length} pod{rsvPods.length !== 1 ? 's' : ''} assigned
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          // Bulk assign - show modal-like interface
                          const podIds = unassignedPods.map((p) => p.id)
                          if (podIds.length === 0) {
                            alert('No unassigned pods available')
                            return
                          }
                          // Assign all unassigned pods
                          podIds.forEach((podId) => assignPodToRSV(podId, rsv.id))
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: 'var(--accent)',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                        }}
                      >
                        Bulk Assign All Unassigned ({unassignedPods.length})
                      </button>
                      <button
                        onClick={() => {
                          // Unassign all pods from this RSV
                          rsvPods.forEach((pod) => assignPodToRSV(pod.id, ''))
                        }}
                        disabled={rsvPods.length === 0}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: rsvPods.length === 0 ? 'var(--bg-secondary)' : 'var(--danger)',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: rsvPods.length === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          opacity: rsvPods.length === 0 ? 0.5 : 1,
                        }}
                      >
                        Unassign All ({rsvPods.length})
                      </button>
                    </div>
                    
                    {rsvPods.length > 0 && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Pods: {rsvPods.map((p) => p.name).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </AssignmentCard>
      </div>
    </div>
  )
}
