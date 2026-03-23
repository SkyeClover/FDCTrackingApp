import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { X, Rocket } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
import { useIsTablet } from '../hooks/useIsTablet'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'
import SegmentedIntPicker from './ui/SegmentedIntPicker'

interface FireMissionModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Renders the Fire Mission Modal UI section.
 */
export default function FireMissionModal({ isOpen, onClose }: FireMissionModalProps) {
  const { launchers, pods, startFireMission, addLog, roundTypes } = useAppData()
  const [selectedLaunchers, setSelectedLaunchers] = useState<Set<string>>(new Set())
  // --- Local state and callbacks ---
  const [targetNumber, setTargetNumber] = useState('')
  const [roundsPerLauncher, setRoundsPerLauncher] = useState<number | ''>(1)
  const [selectedRoundType, setSelectedRoundType] = useState<string>('')
  const [grid, setGrid] = useState('')
  const [methodOfControl, setMethodOfControl] = useState('')
  const [totTime, setTotTime] = useState('')
  const [remarks, setRemarks] = useState('')
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100, // Higher threshold for modals to prevent accidental closes
    velocityThreshold: 0.2,
  })

  if (!isOpen) return null

  // Get enabled round types
  const enabledRoundTypes = Object.entries(roundTypes)
    .filter(([_, config]) => config.enabled)
    .map(([name]) => name)
    .sort()

  // Get available launchers (those with pods and available rounds)
  const availableLaunchers = launchers.filter((launcher) => {
    const pod = pods.find((p) => p.launcherId === launcher.id)
    if (!pod) return false
    const availableRounds = pod.rounds.filter((r) => r.status === 'available')
    if (availableRounds.length === 0 || launcher.status === 'active') return false
    
    // Filter by round type if selected
    if (selectedRoundType) {
      const hasMatchingRound = availableRounds.some((r) => r.type === selectedRoundType)
      if (!hasMatchingRound) return false
    }
    
    return true
  })

    /**
   * Implements toggle launcher for this module.
   */
const toggleLauncher = (launcherId: string) => {
    setSelectedLaunchers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(launcherId)) {
        newSet.delete(launcherId)
      } else {
        newSet.add(launcherId)
      }
      return newSet
    })
  }

    /**
   * Handles start mission interactions for this workflow.
   */
const handleStartMission = () => {
    if (selectedLaunchers.size === 0) {
      alert('Please select at least one launcher')
      return
    }

    if (!targetNumber.trim()) {
      alert('Please enter a target number')
      return
    }

    const rounds = typeof roundsPerLauncher === 'number' ? roundsPerLauncher : 1
    const timeOfReceipt = new Date()
    
    // Auto-populate unit assigned from selected launchers
    const unitAssignedNames = Array.from(selectedLaunchers)
      .map((id) => {
        const launcher = launchers.find((l) => l.id === id)
        return launcher?.name || 'Unknown'
      })
      .join(', ')
    
    // Auto-determine ammo type from selected launchers' pods
    const ammoTypes = Array.from(selectedLaunchers)
      .map((id) => {
        const pod = pods.find((p) => p.launcherId === id)
        return pod?.rounds[0]?.type
      })
      .filter((type): type is string => !!type)
    const uniqueAmmoTypes = [...new Set(ammoTypes)]
    const ammoType = uniqueAmmoTypes.length > 0 ? uniqueAmmoTypes[0] : selectedRoundType || ''
    
    if (!ammoType) {
      alert('Selected launchers must have ammo loaded')
      return
    }
    
    startFireMission(
      Array.from(selectedLaunchers),
      targetNumber.trim(),
      rounds,
      ammoType,
      {
        grid: grid.trim() || undefined,
        unitAssigned: unitAssignedNames,
        timeOfReceipt,
        methodOfControl: methodOfControl.trim() || undefined,
        totTime: totTime.trim() || undefined,
        remarks: remarks.trim() || undefined,
      }
    )
    addLog({
      type: 'success',
      message: `Fire Mission "${targetNumber.trim()}" initiated with ${selectedLaunchers.size} launcher(s)`,
    })

    // Reset form
    setSelectedLaunchers(new Set())
    setTargetNumber('')
    setRoundsPerLauncher(1)
    setSelectedRoundType('')
    setGrid('')
    setMethodOfControl('')
    setTotTime('')
    setRemarks('')
    onClose()
  }

  // --- Render ---
  return (
    <div
      className="fdc-modal-overlay"
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
        className="touch-kbd-scroll"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: isMobile ? 'none' : '1px solid var(--border)',
          borderRadius: isMobile ? '0' : '8px',
          padding: isMobile ? '1rem' : isTablet ? '2.5rem' : '2rem',
          maxWidth: isMobile ? '100%' : isTablet ? '90vw' : '600px',
          width: isMobile ? '100%' : '90%',
          maxHeight: isMobile ? '100%' : isTablet ? '95vh' : '80vh',
          height: isMobile ? '100%' : 'auto',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          touchAction: isMobile ? 'pan-y' : 'auto', // Allow vertical scrolling but detect swipes
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
            <Rocket size={24} color="var(--danger)" />
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
              }}
            >
              Initiate Fire Mission
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

        {/* Target Number - Required */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Target Number <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={targetNumber}
            onChange={(e) => setTargetNumber(e.target.value)}
            placeholder="e.g., DF0001"
            required
            style={{
              width: '100%',
              padding: isTablet ? '1rem' : '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1.125rem' : '1rem',
              minHeight: isTablet ? '48px' : 'auto',
            }}
          />
        </div>

        {/* Grid - Optional */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Grid (Optional)
          </label>
          <input
            type="text"
            value={grid}
            onChange={(e) => setGrid(e.target.value)}
            placeholder="e.g., 38T PK 12345 67890"
            style={{
              width: '100%',
              padding: isTablet ? '1rem' : '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1.125rem' : '1rem',
              minHeight: isTablet ? '48px' : 'auto',
            }}
          />
        </div>

        {/* Unit Assigned - Auto-populated from selected launchers */}
        {selectedLaunchers.size > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: '500',
              }}
            >
              Unit Assigned (Auto-filled)
            </label>
            <div
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              {Array.from(selectedLaunchers)
                .map((id) => {
                  const launcher = launchers.find((l) => l.id === id)
                  return launcher?.name || 'Unknown'
                })
                .join(', ')}
            </div>
          </div>
        )}

        {/* Ammo Type Filter - Optional */}
        {enabledRoundTypes.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
                fontWeight: '500',
              }}
            >
              Filter by Ammo Type (Optional)
            </label>
            <select
              value={selectedRoundType}
              onChange={(e) => {
                setSelectedRoundType(e.target.value)
                setSelectedLaunchers(new Set()) // Clear selection when filter changes
              }}
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
              <option value="">All Ammo Types</option>
              {enabledRoundTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }}
            >
              Filter launchers by the round type they have loaded
            </div>
          </div>
        )}

        {/* Ammo Type Display - Auto-filled from selected launchers */}
        {selectedLaunchers.size > 0 && (() => {
          // Get ammo types from selected launchers
          const ammoTypes = Array.from(selectedLaunchers)
            .map((id) => {
              const pod = pods.find((p) => p.launcherId === id)
              return pod?.rounds[0]?.type
            })
            .filter((type): type is string => !!type)
          const uniqueAmmoTypes = [...new Set(ammoTypes)]
          
          return (
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: '500',
                }}
              >
                Ammo Type to Fire (Auto-filled)
              </label>
              <div
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                }}
              >
                {uniqueAmmoTypes.length > 0 ? uniqueAmmoTypes.join(', ') : 'N/A'}
              </div>
            </div>
          )
        })()}

        {/* Number of Rounds to Fire - Required */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Number of Rounds to Fire <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <SegmentedIntPicker
            data-guide="fire-mission-rounds-picker"
            min={1}
            max={6}
            value={roundsPerLauncher}
            onChange={setRoundsPerLauncher}
            allowEmpty
            compact={isMobile}
          />
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              marginTop: '0.25rem',
            }}
          >
            This value will be saved as "Number of Rounds to Fire" in the mission log
          </div>
        </div>

        {/* Method of Control - Optional */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Method of Control (Optional)
          </label>
          <input
            type="text"
            value={methodOfControl}
            onChange={(e) => setMethodOfControl(e.target.value)}
            placeholder="e.g., Time on Target"
            style={{
              width: '100%',
              padding: isTablet ? '1rem' : '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1.125rem' : '1rem',
              minHeight: isTablet ? '48px' : 'auto',
            }}
          />
        </div>

        {/* TOT Time - Optional */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            TOT Time (Optional)
          </label>
          <input
            type="text"
            value={totTime}
            onChange={(e) => setTotTime(e.target.value)}
            placeholder="e.g., 1200Z"
            style={{
              width: '100%',
              padding: isTablet ? '1rem' : '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1.125rem' : '1rem',
              minHeight: isTablet ? '48px' : 'auto',
            }}
          />
        </div>

        {/* Remarks - Optional */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Remarks (Optional)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            style={{
              width: '100%',
              padding: isTablet ? '1rem' : '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: isTablet ? '1.125rem' : '1rem',
              minHeight: isTablet ? '48px' : 'auto',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Available Launchers */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Select Launchers ({selectedLaunchers.size} selected)
          </label>
          {availableLaunchers.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No available launchers. Ensure launchers have pods with available rounds.
            </p>
          ) : (
            <div
              data-guide="fire-mission-launcher-list"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '0.5rem',
              }}
            >
              {availableLaunchers.map((launcher) => {
                const pod = pods.find((p) => p.launcherId === launcher.id)
                const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length || 0
                const isSelected = selectedLaunchers.has(launcher.id)

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
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {launcher.name}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {availableRounds} rounds available
                        {pod && pod.rounds[0] && ` (${pod.rounds[0].type})`}
                      </div>
                    </div>
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
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
            onClick={handleStartMission}
            disabled={selectedLaunchers.size === 0 || !targetNumber.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: (selectedLaunchers.size === 0 || !targetNumber.trim()) ? 'var(--bg-tertiary)' : '#dc2626',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: (selectedLaunchers.size === 0 || !targetNumber.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
            }}
          >
            Initiate Mission
          </button>
        </div>
      </div>
    </div>
  )
}

