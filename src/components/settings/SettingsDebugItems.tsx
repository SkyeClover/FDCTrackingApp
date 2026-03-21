import { useState, memo, useEffect } from 'react'
import { Check, X as XIcon, Edit } from 'lucide-react'
import TouchNumericStepper from '../ui/TouchNumericStepper'

export const CompactEditableItem = memo(
  ({
    name,
    onUpdate,
  }: {
    name: string
    onUpdate: (name: string) => void
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(name)

    const handleSave = () => {
      if (editValue.trim() && editValue.trim() !== name) {
        onUpdate(editValue.trim())
      }
      setIsEditing(false)
      setEditValue(name)
    }

    const handleCancel = () => {
      setIsEditing(false)
      setEditValue(name)
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
        {isEditing ? (
          <>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                else if (e.key === 'Escape') handleCancel()
              }}
              autoFocus
              style={{
                flex: 1,
                padding: '0.25rem 0.5rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
            <button
              onClick={handleSave}
              style={{
                padding: '0.25rem',
                backgroundColor: 'var(--success)',
                border: 'none',
                borderRadius: '3px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Save"
            >
              <Check size={12} />
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '0.25rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Cancel"
            >
              <XIcon size={12} />
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{name}</span>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Edit"
            >
              <Edit size={12} />
            </button>
          </>
        )}
      </div>
    )
  }
)

CompactEditableItem.displayName = 'CompactEditableItem'

export const PodEditableItem = memo(
  ({
    pod,
    onUpdateName,
    onUpdateAmmoCount,
    launchers,
    rsvs,
    pocs,
  }: {
    pod: {
      id: string
      name: string
      rounds: Array<{ id: string; type: string; status: string }>
      launcherId?: string
      rsvId?: string
      pocId?: string
      ammoPltId?: string
    }
    onUpdateName: (name: string) => void
    onUpdateAmmoCount: (count: number) => void
    launchers: Array<{ id: string; name: string }>
    rsvs: Array<{ id: string; name: string }>
    pocs: Array<{ id: string; name: string }>
  }) => {
    const AMMO_PLT_ID = 'ammo-plt-1'

    const getPodAssignment = () => {
      if (pod.launcherId) {
        const launcher = launchers.find((l) => l.id === pod.launcherId)
        return { type: 'launcher', displayType: 'Launcher', name: launcher?.name || 'Unknown', id: pod.launcherId }
      }
      if (pod.rsvId) {
        const rsv = rsvs.find((r) => r.id === pod.rsvId)
        return { type: 'rsv', displayType: 'RSV', name: rsv?.name || 'Unknown', id: pod.rsvId }
      }
      if (pod.pocId) {
        const poc = pocs.find((p) => p.id === pod.pocId)
        return { type: 'poc', displayType: 'POC', name: poc?.name || 'Unknown', id: pod.pocId }
      }
      if (pod.ammoPltId === AMMO_PLT_ID) {
        return { type: 'ammo-plt', displayType: 'Ammo PLT', name: 'Ammo PLT', id: pod.ammoPltId }
      }
      if (pod.ammoPltId) {
        return { type: 'ammo-plt', displayType: 'Ammo PLT (Invalid)', name: 'Ammo PLT (Invalid)', id: pod.ammoPltId }
      }
      return { type: 'unassigned', displayType: 'Unassigned', name: 'Unassigned', id: '' }
    }

    const assignment = getPodAssignment()
    const [isEditingName, setIsEditingName] = useState(false)
    const [isEditingAmmo, setIsEditingAmmo] = useState(false)
    const [editNameValue, setEditNameValue] = useState(pod.name)
    const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
    const [editAmmoValue, setEditAmmoValue] = useState<number | ''>(availableRounds)

    useEffect(() => {
      setEditNameValue(pod.name)
      const currentAvailable = pod.rounds.filter((r) => r.status === 'available').length
      setEditAmmoValue(currentAvailable)
    }, [pod.name, pod.rounds])

    const handleSaveName = () => {
      if (editNameValue.trim() && editNameValue.trim() !== pod.name) {
        onUpdateName(editNameValue.trim())
      }
      setIsEditingName(false)
      setEditNameValue(pod.name)
    }

    const handleCancelName = () => {
      setIsEditingName(false)
      setEditNameValue(pod.name)
    }

    const handleSaveAmmo = () => {
      const count = typeof editAmmoValue === 'number' ? editAmmoValue : availableRounds
      const currentAvailable = pod.rounds.filter((r) => r.status === 'available').length
      if (count >= 0 && count !== currentAvailable) {
        onUpdateAmmoCount(count)
      }
      setIsEditingAmmo(false)
      const updatedAvailable = pod.rounds.filter((r) => r.status === 'available').length
      setEditAmmoValue(updatedAvailable)
    }

    const handleCancelAmmo = () => {
      setIsEditingAmmo(false)
      const currentAvailable = pod.rounds.filter((r) => r.status === 'available').length
      setEditAmmoValue(currentAvailable)
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          padding: '0.5rem',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          marginBottom: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isEditingName ? (
            <>
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  else if (e.key === 'Escape') handleCancelName()
                }}
                autoFocus
                style={{
                  flex: 1,
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--accent)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                onClick={handleSaveName}
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'var(--success)',
                  border: 'none',
                  borderRadius: '3px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Save"
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleCancelName}
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Cancel"
              >
                <XIcon size={12} />
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                {pod.name}
              </span>
              <button
                onClick={() => setIsEditingName(true)}
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Edit name"
              >
                <Edit size={12} />
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Ammo:</span>
          {isEditingAmmo ? (
            <>
              <TouchNumericStepper value={editAmmoValue} onChange={setEditAmmoValue} min={0} max={999} />
              <button
                onClick={handleSaveAmmo}
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'var(--success)',
                  border: 'none',
                  borderRadius: '3px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Save"
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleCancelAmmo}
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Cancel"
              >
                <XIcon size={12} />
              </button>
            </>
          ) : (
            <>
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                {pod.rounds.filter((r) => r.status === 'available').length}{' '}
                {pod.rounds.length > 0 && pod.rounds[0]?.type ? `(${pod.rounds[0].type})` : ''}
              </span>
              <button
                onClick={() => setIsEditingAmmo(true)}
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Edit ammo count"
              >
                <Edit size={12} />
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Assigned to:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
            {assignment.displayType}: {assignment.name}
          </span>
        </div>
      </div>
    )
  }
)

PodEditableItem.displayName = 'PodEditableItem'
