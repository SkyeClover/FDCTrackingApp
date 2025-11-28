import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { ArrowRight, Plus, Trash2, Edit, Play } from 'lucide-react'
import { TaskTemplate } from '../types'

export default function Management() {
  const {
    bocs,
    pocs,
    launchers,
    pods,
    tasks,
    taskTemplates,
    assignPodToLauncher,
    assignLauncherToPOC,
    assignPOCToBOC,
    assignTaskToLauncher,
    addTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    startTaskFromTemplate,
  } = useAppData()

  const [showTaskTemplateForm, setShowTaskTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)

  const handleAddTaskTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const duration = parseInt(formData.get('duration') as string) || 60
    const type = (formData.get('type') as TaskTemplate['type']) || 'custom'

    if (name) {
      if (editingTemplate) {
        updateTaskTemplate(editingTemplate.id, {
          name,
          description: description || '',
          duration,
          type,
        })
        setEditingTemplate(null)
      } else {
        addTaskTemplate({
          id: Date.now().toString(),
          name,
          description: description || '',
          duration,
          type,
        })
      }
      setShowTaskTemplateForm(false)
      e.currentTarget.reset()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const AssignmentCard = ({
    title,
    children,
  }: {
    title: string
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
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Task Templates Section */}
        <AssignmentCard title="Task Templates">
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
            <form
              onSubmit={handleAddTaskTemplate}
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
                name="name"
                placeholder="Task Name (e.g., Reload, Fire Mission)"
                required
                defaultValue={editingTemplate?.name || ''}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                }}
              />
              <textarea
                name="description"
                placeholder="Description"
                rows={2}
                defaultValue={editingTemplate?.description || ''}
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
                  name="duration"
                  placeholder="Duration (seconds)"
                  min="1"
                  required
                  defaultValue={editingTemplate?.duration || 60}
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
                  name="type"
                  defaultValue={editingTemplate?.type || 'custom'}
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
              <button
                type="submit"
                style={{
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
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {taskTemplates.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No task templates. Create one to define custom task durations.
              </p>
            ) : (
              taskTemplates.map((template) => (
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
        <AssignmentCard title="Assign Tasks to Launchers">
          {launchers.length === 0 || taskTemplates.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create launchers and task templates first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {launchers.map((launcher) => (
                <div
                  key={launcher.id}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
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
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                      {launcher.name}
                    </span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          startTaskFromTemplate(e.target.value, launcher.id)
                          e.target.value = ''
                        }
                      }}
                      disabled={launcher.status === 'active'}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        cursor: launcher.status === 'active' ? 'not-allowed' : 'pointer',
                        opacity: launcher.status === 'active' ? 0.5 : 1,
                      }}
                    >
                      <option value="">
                        {launcher.status === 'active' ? 'Launcher Active' : 'Start Task...'}
                      </option>
                      {taskTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({formatDuration(template.duration)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {launcher.currentTask && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${launcher.currentTask.progress}%`,
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
                        {launcher.currentTask.progress.toFixed(0)}% - {launcher.currentTask.name}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign Pods to Launchers">
          {pods.length === 0 || launchers.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create pods and launchers in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pods.map((pod) => (
                <div
                  key={pod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                  }}
                >
                  <select
                    value={pod.launcherId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        assignPodToLauncher(pod.id, e.target.value)
                      } else {
                        assignPodToLauncher(pod.id, '')
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {launchers.map((launcher) => (
                      <option key={launcher.id} value={launcher.id}>
                        {launcher.name}
                      </option>
                    ))}
                  </select>
                  <ArrowRight size={16} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-primary)', minWidth: '120px' }}>
                    {pod.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign Launchers to POCs (Platoon Operations Center)">
          {launchers.length === 0 || pocs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create launchers and POCs in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {launchers.map((launcher) => (
                <div
                  key={launcher.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', minWidth: '120px' }}>
                    {launcher.name}
                  </span>
                  <ArrowRight size={16} color="var(--text-secondary)" />
                  <select
                    value={launcher.pocId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        assignLauncherToPOC(launcher.id, e.target.value)
                      } else {
                        assignLauncherToPOC(launcher.id, '')
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {pocs.map((poc) => (
                      <option key={poc.id} value={poc.id}>
                        {poc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </AssignmentCard>

        <AssignmentCard title="Assign POCs to BOCs (Battery Operations Center)">
          {pocs.length === 0 || bocs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>
              Create POCs and BOCs in Inventory first
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pocs.map((poc) => (
                <div
                  key={poc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', minWidth: '120px' }}>
                    {poc.name}
                  </span>
                  <ArrowRight size={16} color="var(--text-secondary)" />
                  <select
                    value={poc.bocId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        assignPOCToBOC(poc.id, e.target.value)
                      } else {
                        assignPOCToBOC(poc.id, '')
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {bocs.map((boc) => (
                      <option key={boc.id} value={boc.id}>
                        {boc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </AssignmentCard>
      </div>
    </div>
  )
}
