import { useState, useMemo, memo, useCallback } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus, Trash2, Edit, X, GitBranch, ListChecks } from 'lucide-react'
import { TaskTemplate } from '../types'
import RSVsManagement from '../components/RSVsManagement'
import TouchNumericStepper from '../components/ui/TouchNumericStepper'
import CollapsibleSection from '../components/ui/CollapsibleSection'
import PageShell from '../components/layout/PageShell'
import { useIsMobile } from '../hooks/useIsMobile'
import CreateUnitModal, { type CreateUnitKind } from '../components/inventory/CreateUnitModal'
import OrganizationSection from '../components/management/OrganizationSection'
import LaunchersSection from '../components/equipment/LaunchersSection'
import UnitHierarchyModal from '../components/management/UnitHierarchyModal'
import TaskAssignmentsModal from '../components/management/TaskAssignmentsModal'

// Memoized task template form
const TaskTemplateForm = memo(({
  editingTemplate,
  onSubmit,
  onCancel,
  isMobile = false,
}: {
  editingTemplate: TaskTemplate | null
  onSubmit: (data: { name: string; description: string; duration: number; type: TaskTemplate['type'] }) => void
  onCancel: () => void
  isMobile?: boolean
}) => {
  const [name, setName] = useState(editingTemplate?.name || '')
  const [description, setDescription] = useState(editingTemplate?.description || '')
  // Duration is stored in minutes in the UI, but converted to seconds for storage
  const initialDurationMinutes = editingTemplate ? Math.floor(editingTemplate.duration / 60) : 2
  const [duration, setDuration] = useState<number | ''>(initialDurationMinutes)
  const [type, setType] = useState<TaskTemplate['type']>(editingTemplate?.type || 'custom')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      // Convert minutes to seconds for storage
      const finalDurationMinutes = typeof duration === 'number' ? duration : 2
      const finalDurationSeconds = finalDurationMinutes * 60
      onSubmit({ name: name.trim(), description, duration: finalDurationSeconds, type })
      setName('')
      setDescription('')
      setDuration(2) // Default to 2 minutes
      setType('custom')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: isMobile ? '0.75rem' : '1rem',
        padding: isMobile ? '0.6rem' : '1rem',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.5rem' : '0.75rem',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
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
          width: '100%',
          boxSizing: 'border-box',
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
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duration (minutes)</span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <TouchNumericStepper
          value={duration}
          onChange={setDuration}
          min={1}
          max={1440}
          placeholder="min"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskTemplate['type'])}
          style={{
            flex: isMobile ? '1 1 100%' : '0 0 auto',
            minWidth: isMobile ? '100%' : '150px',
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        >
          <option value="reload">Reload</option>
          <option value="fire">Fire</option>
          <option value="maintenance">Maintenance</option>
          <option value="jumping">Jumping</option>
          <option value="custom">Custom</option>
        </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--success)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          {editingTemplate ? 'Update Template' : 'Create Template'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flexShrink: 0,
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            boxSizing: 'border-box',
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
  const isMobile = useIsMobile()
  const {
    taskTemplates,
    addRSV,
    addTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
  } = useAppData()

  const [showTaskTemplateForm, setShowTaskTemplateForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [showRSVForm, setShowRSVForm] = useState(false)
  const [createUnitOpen, setCreateUnitOpen] = useState(false)
  const [createUnitInitialKind, setCreateUnitInitialKind] = useState<CreateUnitKind | null>(null)
  const [hierarchyOpen, setHierarchyOpen] = useState(false)
  const [taskAssignmentsOpen, setTaskAssignmentsOpen] = useState(false)

  const openCreateUnit = useCallback((kind: CreateUnitKind | null) => {
    setCreateUnitInitialKind(kind)
    setCreateUnitOpen(true)
  }, [])

  const closeCreateUnit = useCallback(() => {
    setCreateUnitOpen(false)
    setCreateUnitInitialKind(null)
  }, [])

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

  const taskTemplatesMemo = useMemo(() => taskTemplates, [taskTemplates])

  const handleAddRSV = useCallback(
    (data: { name: string; assignToAmmoPlt?: boolean }) => {
      addRSV({
        id: Date.now().toString(),
        name: data.name,
      }, data.assignToAmmoPlt)
      setShowRSVForm(false)
    },
    [addRSV]
  )

  return (
    <PageShell
      title="Management"
      isMobile={isMobile}
      actions={
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => openCreateUnit(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: 'var(--success)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <Plus size={18} />
            Create unit
          </button>
          <button
            type="button"
            onClick={() => setHierarchyOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <GitBranch size={18} />
            Unit hierarchy
          </button>
          <button
            type="button"
            onClick={() => setTaskAssignmentsOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.1rem',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <ListChecks size={18} />
            Task assignments
          </button>
        </div>
      }
    >
      <CreateUnitModal isOpen={createUnitOpen} onClose={closeCreateUnit} initialKind={createUnitInitialKind} />
      <UnitHierarchyModal isOpen={hierarchyOpen} onClose={() => setHierarchyOpen(false)} />
      <TaskAssignmentsModal isOpen={taskAssignmentsOpen} onClose={() => setTaskAssignmentsOpen(false)} />

      <CollapsibleSection
        title="Organization"
        subtitle="Brigades, battalions, batteries & PLT FDCs — use Unit hierarchy to re-link Bn → Bde, BOC → Bn, PLT → BOC, launchers, RSVs, and Ammo PLT"
        compact
      >
        <OrganizationSection
          isMobile={isMobile}
          onOpenCreateUnit={() => openCreateUnit(null)}
          onOpenHierarchy={() => setHierarchyOpen(true)}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Launchers" subtitle="HIMARS & PLT assignment" compact>
        <LaunchersSection isMobile={isMobile} embedded />
      </CollapsibleSection>

      <CollapsibleSection
        title="Task templates"
        subtitle="Durations & types — start tasks from Task assignments (header); lists respect your view role"
        badge={taskTemplatesMemo.length}
        compact
      >
          <div style={{ marginBottom: isMobile ? '0.75rem' : '1rem' }}>
            <button
              onClick={() => {
                setEditingTemplate(null)
                setShowTaskTemplateForm(!showTaskTemplateForm)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: isMobile ? '0.5rem 0.6rem' : '0.5rem 1rem',
                backgroundColor: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
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
              isMobile={isMobile}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '0.75rem' }}>
            {taskTemplatesMemo.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: isMobile ? '0.75rem' : 'inherit' }}>
                No task templates. Create one to define custom task durations.
              </p>
            ) : (
              taskTemplatesMemo.map((template) => (
                <div
                  key={template.id}
                  style={{
                    padding: isMobile ? '0.5rem' : '0.75rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: isMobile ? '0.15rem' : '0.25rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontWeight: '600',
                          fontSize: isMobile ? '0.8rem' : '0.95rem',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
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
      </CollapsibleSection>


      <CollapsibleSection title="RSVs & assignments" subtitle="Reload vehicles & routing — detailed table; echelon moves also in Unit hierarchy" compact>
        <RSVsManagement onAddRSV={() => setShowRSVForm(true)} />
      </CollapsibleSection>

        {/* RSV Creation Modal */}
        {showRSVForm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowRSVForm(false)}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  Add RSV
                </h2>
                <button
                  onClick={() => setShowRSVForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const name = formData.get('name') as string
                  const assignToAmmoPlt = formData.get('assignToAmmoPlt') === 'on'
                  if (name?.trim()) {
                    handleAddRSV({ name: name.trim(), assignToAmmoPlt })
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <input
                  type="text"
                  name="name"
                  placeholder="RSV Name"
                  required
                  autoFocus
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    name="assignToAmmoPlt"
                    style={{
                      width: '1rem',
                      height: '1rem',
                      cursor: 'pointer',
                    }}
                  />
                  <span>Assign to Ammo PLT (instead of current user's unit)</span>
                </label>
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
                      fontSize: '0.9rem',
                    }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRSVForm(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </PageShell>
  )
}
