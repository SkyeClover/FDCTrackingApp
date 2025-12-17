import { useState, useEffect, useMemo } from 'react'
import { X, Target, XCircle, Save, Rocket } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'
import { Task } from '../types'
import { useAppData } from '../context/AppDataContext'

interface FireMissionEditModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<Task>) => void
}

export default function FireMissionEditModal({
  task,
  isOpen,
  onClose,
  onSave,
}: FireMissionEditModalProps) {
  const { launchers, roundTypes } = useAppData()
  const [targetNumber, setTargetNumber] = useState(task.targetNumber || task.name || '')
  const [grid, setGrid] = useState(task.grid || '')
  const [unitAssigned, setUnitAssigned] = useState(task.unitAssigned || '')
  const [numberOfRoundsToFire, setNumberOfRoundsToFire] = useState(task.numberOfRoundsToFire?.toString() || '')
  const [ammoTypeToFire, setAmmoTypeToFire] = useState(task.ammoTypeToFire || '')
  const [methodOfControl, setMethodOfControl] = useState(task.methodOfControl || '')
  const [totTime, setTotTime] = useState(task.totTime || '')
  const [timeMsnSent, setTimeMsnSent] = useState(task.timeMsnSent ? task.timeMsnSent.toISOString().slice(0, 16) : '')
  const [missionStatus, setMissionStatus] = useState(task.missionStatus || '')
  const [timeMfrReceived, setTimeMfrReceived] = useState(task.timeMfrReceived ? task.timeMfrReceived.toISOString().slice(0, 16) : '')
  const [numberOfRoundsFired, setNumberOfRoundsFired] = useState(task.numberOfRoundsFired?.toString() || '')
  const [remarks, setRemarks] = useState(task.remarks || '')
  const [selectedLauncherIds, setSelectedLauncherIds] = useState<Set<string>>(
    new Set(task.launcherIds || [])
  )
  const [canceled, setCanceled] = useState(task.canceled || false)
  const isMobile = useIsMobile()

  // Get enabled round types
  const enabledRoundTypes = Object.entries(roundTypes)
    .filter(([_, config]) => config.enabled)
    .map(([name]) => name)
    .sort()

  // Update form when task changes
  useEffect(() => {
    setTargetNumber(task.targetNumber || task.name || '')
    setGrid(task.grid || '')
    setUnitAssigned(task.unitAssigned || '')
    setNumberOfRoundsToFire(task.numberOfRoundsToFire?.toString() || '')
    setAmmoTypeToFire(task.ammoTypeToFire || '')
    setMethodOfControl(task.methodOfControl || '')
    setTotTime(task.totTime || '')
    setTimeMsnSent(task.timeMsnSent ? task.timeMsnSent.toISOString().slice(0, 16) : '')
    setMissionStatus(task.missionStatus || '')
    setTimeMfrReceived(task.timeMfrReceived ? task.timeMfrReceived.toISOString().slice(0, 16) : '')
    setNumberOfRoundsFired(task.numberOfRoundsFired?.toString() || '')
    setRemarks(task.remarks || '')
    setSelectedLauncherIds(new Set(task.launcherIds || []))
    setCanceled(task.canceled || false)
  }, [task])

  // Get available launchers
  const availableLaunchers = useMemo(() => {
    return launchers.filter((l) => l.status !== 'maintenance')
  }, [launchers])

  const toggleLauncher = (launcherId: string) => {
    setSelectedLauncherIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(launcherId)) {
        newSet.delete(launcherId)
      } else {
        newSet.add(launcherId)
      }
      return newSet
    })
  }

  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100,
    velocityThreshold: 0.2,
  })

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      name: targetNumber.trim() || task.name, // Update mission name to match target number
      targetNumber: targetNumber.trim() || undefined,
      grid: grid.trim() || undefined,
      unitAssigned: unitAssigned.trim() || undefined,
      numberOfRoundsToFire: numberOfRoundsToFire ? parseInt(numberOfRoundsToFire) : undefined,
      ammoTypeToFire: ammoTypeToFire.trim() || undefined,
      methodOfControl: methodOfControl.trim() || undefined,
      totTime: totTime.trim() || undefined,
      timeMsnSent: timeMsnSent ? new Date(timeMsnSent) : undefined,
      missionStatus: missionStatus.trim() || undefined,
      timeMfrReceived: timeMfrReceived ? new Date(timeMfrReceived) : undefined,
      numberOfRoundsFired: numberOfRoundsFired ? parseInt(numberOfRoundsFired) : undefined,
      remarks: remarks.trim() || undefined,
      launcherIds: Array.from(selectedLauncherIds),
      canceled,
    })
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
        zIndex: 1000,
      }}
      onClick={isMobile ? undefined : onClose}
    >
      <div
        ref={modalContentRef}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: isMobile ? 'none' : '1px solid var(--border)',
          borderRadius: isMobile ? '0' : '8px',
          padding: isMobile ? '1rem' : '2rem',
          maxWidth: isMobile ? '100%' : '500px',
          width: isMobile ? '100%' : '90%',
          maxHeight: isMobile ? '100vh' : '80vh',
          height: isMobile ? '100vh' : 'auto',
          overflow: 'auto',
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
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Target size={24} color="var(--accent)" />
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
              }}
            >
              Edit Fire Mission
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mission Info */}
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Target Number (Mission Name)
          </div>
          <input
            type="text"
            value={targetNumber}
            onChange={(e) => setTargetNumber(e.target.value)}
            placeholder="e.g., DF0001"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              marginBottom: '0.5rem',
            }}
          />
          {task.startTime && (
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              }}
            >
              Started: {task.startTime.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
          )}
        </div>

        {/* DA Form 7232 Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Grid */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Grid (Optional)
            </label>
            <input
              type="text"
              value={grid}
              onChange={(e) => setGrid(e.target.value)}
              placeholder="e.g., 38T PK 12345 67890"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Unit Assigned */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Unit Assigned (Optional)
            </label>
            <input
              type="text"
              value={unitAssigned}
              onChange={(e) => setUnitAssigned(e.target.value)}
              placeholder="e.g., 1st PLT"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Number of Rounds to Fire */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Number of Rounds to Fire
            </label>
            <input
              type="number"
              value={numberOfRoundsToFire}
              onChange={(e) => setNumberOfRoundsToFire(e.target.value)}
              min="1"
              max="6"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Ammo Type to Fire */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Ammo Type to Fire
            </label>
            <select
              value={ammoTypeToFire}
              onChange={(e) => setAmmoTypeToFire(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              <option value="">Select Ammo Type</option>
              {enabledRoundTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Method of Control */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Method of Control (Optional)
            </label>
            <input
              type="text"
              value={methodOfControl}
              onChange={(e) => setMethodOfControl(e.target.value)}
              placeholder="e.g., Time on Target"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* TOT Time */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              TOT Time (Optional)
            </label>
            <input
              type="text"
              value={totTime}
              onChange={(e) => setTotTime(e.target.value)}
              placeholder="e.g., 1200Z"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Time Mission Sent */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Time Mission Sent (Optional)
            </label>
            <input
              type="datetime-local"
              value={timeMsnSent}
              onChange={(e) => setTimeMsnSent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Mission Status */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Mission Status (Optional)
            </label>
            <input
              type="text"
              value={missionStatus}
              onChange={(e) => setMissionStatus(e.target.value)}
              placeholder="e.g., Complete, In Progress"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Time MFR Received */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Time MFR Received (Optional)
            </label>
            <input
              type="datetime-local"
              value={timeMfrReceived}
              onChange={(e) => setTimeMfrReceived(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Number of Rounds Fired */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Number of Rounds Fired (Optional)
            </label>
            <input
              type="number"
              value={numberOfRoundsFired}
              onChange={(e) => setNumberOfRoundsFired(e.target.value)}
              min="0"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            />
          </div>

          {/* Remarks */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Launcher Assignment */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            <Rocket size={18} />
            Launchers ({selectedLauncherIds.size} selected)
          </label>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '0.5rem',
            }}
          >
            {availableLaunchers.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem' }}>
                No available launchers
              </div>
            ) : (
              availableLaunchers.map((launcher) => {
                const isSelected = selectedLauncherIds.has(launcher.id)
                return (
                  <div
                    key={launcher.id}
                    onClick={() => toggleLauncher(launcher.id)}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: isSelected ? '500' : '400' }}>
                      {launcher.name}
                    </span>
                    {isSelected && (
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.75rem',
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Canceled Checkbox */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
            }}
          >
            <input
              type="checkbox"
              checked={canceled}
              onChange={(e) => setCanceled(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <XCircle size={18} color={canceled ? 'var(--warning)' : 'var(--text-secondary)'} />
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                Mission was Canceled
              </span>
            </div>
          </label>
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
              marginLeft: '2.5rem',
            }}
          >
            Check this if the fire mission was canceled in real life
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            marginTop: 'auto',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

