import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { X, Rocket } from 'lucide-react'

interface FireMissionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FireMissionModal({ isOpen, onClose }: FireMissionModalProps) {
  const { launchers, pods, startFireMission, addLog } = useAppData()
  const [selectedLaunchers, setSelectedLaunchers] = useState<Set<string>>(new Set())
  const [missionName, setMissionName] = useState('')
  const [roundsPerLauncher, setRoundsPerLauncher] = useState(1)

  if (!isOpen) return null

  // Get available launchers (those with pods and available rounds)
  const availableLaunchers = launchers.filter((launcher) => {
    const pod = pods.find((p) => p.launcherId === launcher.id)
    if (!pod) return false
    const availableRounds = pod.rounds.filter((r) => r.status === 'available')
    return availableRounds.length > 0 && launcher.status !== 'active'
  })

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

  const handleStartMission = () => {
    if (selectedLaunchers.size === 0) {
      alert('Please select at least one launcher')
      return
    }

    if (!missionName.trim()) {
      alert('Please enter a mission name')
      return
    }

    const name = missionName.trim() || `Fire Mission ${new Date().toLocaleTimeString()}`
    startFireMission(Array.from(selectedLaunchers), name, roundsPerLauncher)
    addLog({
      type: 'success',
      message: `Fire Mission "${name}" initiated with ${selectedLaunchers.size} launcher(s)`,
    })

    // Reset form
    setSelectedLaunchers(new Set())
    setMissionName('')
    setRoundsPerLauncher(1)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
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

        {/* Mission Name */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Mission Name
          </label>
          <input
            type="text"
            value={missionName}
            onChange={(e) => setMissionName(e.target.value)}
            placeholder="Enter mission name"
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

        {/* Rounds Per Launcher */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            Rounds Per Launcher
          </label>
          <input
            type="number"
            value={roundsPerLauncher}
            onChange={(e) => setRoundsPerLauncher(Math.max(1, parseInt(e.target.value) || 1))}
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
            disabled={selectedLaunchers.size === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: selectedLaunchers.size === 0 ? 'var(--bg-tertiary)' : '#dc2626',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: selectedLaunchers.size === 0 ? 'not-allowed' : 'pointer',
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

