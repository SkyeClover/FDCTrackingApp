import { useState, useMemo } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Trash2, ChevronDown, ChevronUp, Bug, LogOut, RefreshCw, Power, RotateCw } from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
import { CompactEditableItem, PodEditableItem } from '../components/settings/SettingsDebugItems'
import { formatRoleDisplay } from '../constants/roles'
import PageShell from '../components/layout/PageShell'
import { SyncAlertSettings } from '../components/settings/SyncAlertSettings'
import { APP_VERSION } from '../utils/saveLoad'

export default function Settings() {
  const isMobile = useIsMobile()
  const {
    currentUserRole,
    brigades,
    battalions,
    bocs,
    pocs,
    launchers,
    pods,
    rsvs,
    setCurrentUserRole,
    updateBOC,
    updatePOC,
    updateLauncher,
    updatePod,
    updateRSV,
    clearAllData,
  } = useAppData()
  const [selectedRoleType, setSelectedRoleType] = useState<'brigade' | 'battalion' | 'boc' | 'poc' | ''>('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')

  const brigadesSorted = useMemo(
    () => [...brigades].sort((a, b) => a.name.localeCompare(b.name)),
    [brigades]
  )
  const battalionsSorted = useMemo(
    () => [...battalions].sort((a, b) => a.name.localeCompare(b.name)),
    [battalions]
  )
  const bocsSorted = useMemo(
    () => [...bocs].sort((a, b) => a.name.localeCompare(b.name)),
    [bocs]
  )
  const pocsSorted = useMemo(
    () => [...pocs].sort((a, b) => a.name.localeCompare(b.name)),
    [pocs]
  )
  const [showDebugSection, setShowDebugSection] = useState(false)

  const handleApplyRole = () => {
    if (!selectedRoleType || !selectedRoleId) return

    if (selectedRoleType === 'brigade') {
      const b = brigades.find((x) => x.id === selectedRoleId)
      if (b) {
        setCurrentUserRole({ type: 'brigade', id: b.id, name: b.name })
        setSelectedRoleType('')
        setSelectedRoleId('')
      }
      return
    }
    if (selectedRoleType === 'battalion') {
      const bn = battalions.find((x) => x.id === selectedRoleId)
      if (bn) {
        setCurrentUserRole({ type: 'battalion', id: bn.id, name: bn.name })
        setSelectedRoleType('')
        setSelectedRoleId('')
      }
      return
    }
    if (selectedRoleType === 'boc') {
      const boc = bocs.find((b) => b.id === selectedRoleId)
      if (boc) {
        setCurrentUserRole({ type: 'boc', id: boc.id, name: boc.name })
        setSelectedRoleType('')
        setSelectedRoleId('')
      }
      return
    }
    const poc = pocs.find((p) => p.id === selectedRoleId)
    if (poc) {
      setCurrentUserRole({ type: 'poc', id: poc.id, name: poc.name })
      setSelectedRoleType('')
      setSelectedRoleId('')
    }
  }

  return (
    <PageShell title="Settings / Help" isMobile={isMobile}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: isMobile ? '1rem' : '1.5rem',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <SyncAlertSettings />

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
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            User Role
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              View role sets dashboard scope and density. Echelon order (highest to lowest): Brigade →
              Battalion → BOC → POC.
            </p>
            {currentUserRole && (
              <div>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Current view role:</strong>
                </p>
                <p style={{ color: 'var(--accent-color)', fontWeight: '600', marginBottom: '0.75rem' }}>
                  {formatRoleDisplay(currentUserRole)}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentUserRole(undefined)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Clear view role
                </button>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                <strong>Set view role</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                  >
                    Echelon
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                      gap: '0.5rem',
                    }}
                  >
                    {(
                      [
                        ['brigade', 'Brigade'],
                        ['battalion', 'Battalion'],
                        ['boc', 'BOC'],
                        ['poc', 'POC'],
                      ] as const
                    ).map(([t, label]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedRoleType(t)
                          setSelectedRoleId('')
                        }}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: `1px solid ${selectedRoleType === t ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          backgroundColor: selectedRoleType === t ? 'var(--accent-color)' : 'transparent',
                          color: selectedRoleType === t ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedRoleType === 'brigade' ||
                selectedRoleType === 'battalion' ||
                selectedRoleType === 'boc' ||
                selectedRoleType === 'poc' ? (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {selectedRoleType === 'brigade' && 'Select brigade'}
                      {selectedRoleType === 'battalion' && 'Select battalion'}
                      {selectedRoleType === 'boc' && 'Select BOC (battery)'}
                      {selectedRoleType === 'poc' && 'Select POC (PLT FDC)'}
                      {selectedRoleType === 'brigade' && brigadesSorted.length > 0 && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({brigadesSorted.length} available)
                        </span>
                      )}
                      {selectedRoleType === 'battalion' && battalionsSorted.length > 0 && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({battalionsSorted.length} available)
                        </span>
                      )}
                      {selectedRoleType === 'boc' && bocsSorted.length > 0 && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({bocsSorted.length} available)
                        </span>
                      )}
                      {selectedRoleType === 'poc' && pocsSorted.length > 0 && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          ({pocsSorted.length} available)
                        </span>
                      )}
                    </label>
                    {(() => {
                      const availableItems =
                        selectedRoleType === 'brigade'
                          ? brigadesSorted
                          : selectedRoleType === 'battalion'
                            ? battalionsSorted
                            : selectedRoleType === 'boc'
                              ? bocsSorted
                              : pocsSorted
                      const kindLabel =
                        selectedRoleType === 'brigade'
                          ? 'brigade'
                          : selectedRoleType === 'battalion'
                            ? 'battalion'
                            : selectedRoleType === 'boc'
                              ? 'BOC'
                              : 'POC'

                      if (availableItems.length === 0) {
                        return (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            No {kindLabel}s yet. Create one under <strong style={{ color: 'var(--text-primary)' }}>Management</strong> → Organization (or <strong style={{ color: 'var(--text-primary)' }}>Create unit</strong>).
                          </p>
                        )
                      }

                      return (
                        <>
                          <select
                            key={`${selectedRoleType}-${availableItems.length}`}
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '0.9rem',
                            }}
                          >
                            <option value="">-- Select {kindLabel} --</option>
                            {availableItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          {selectedRoleId && (
                            <button
                              type="button"
                              onClick={handleApplyRole}
                              style={{
                                marginTop: '0.75rem',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: 'var(--accent-color)',
                                color: 'white',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                width: isMobile ? '100%' : 'auto',
                              }}
                            >
                              Apply view role
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

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
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            About
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Walker Track</strong>
            </p>
            <p>Version {APP_VERSION}</p>
            <p>
              A tracking application for rounds, pods, and launchers. Designed for AFATDS Operators
              to manage ammunition tracking and report generation.
            </p>
            <p style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>© {new Date().getFullYear()} </span>
              <strong style={{ color: 'var(--text-primary)' }}>@jacob walker</strong>
            </p>
          </div>
        </div>

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
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            Terminology
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Echelon (view role):</strong> Brigade →
              Battalion → BOC → POC (highest to lowest)
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Brigade / Battalion:</strong> Higher
              echelon views scoped to that unit’s subtree; pick a brigade or battalion created under Management → Organization.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>BOC:</strong> Battery Operations
              Center
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>POC:</strong> PLT Operations Center (PLT FDC)
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Launcher:</strong> Artillery
              launcher system
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Pod:</strong> Container for rounds
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Round:</strong> Individual
              ammunition unit
            </p>
          </div>
        </div>
      </div>

      {/* Debug Section - Collapsible */}
      <div
        style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => setShowDebugSection(!showDebugSection)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bug size={16} />
            <span>Debug: Edit Metadata</span>
          </div>
          {showDebugSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDebugSection && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          >
            {/* System Controls */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-primary)',
                border: '2px solid var(--accent-color)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                System Controls
              </div>
              
              {/* Refresh Button */}
              <div style={{ marginBottom: '1rem' }}>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Reload the application page to refresh all data and UI.
                </p>
                <button
                  onClick={() => {
                    window.location.reload()
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={18} />
                  Refresh App
                </button>
              </div>

              {/* Restart App Button - only works when Pi-side service is running */}
              <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Restart the application service on the Raspberry Pi. Only available when running on Pi with the local service.
                </p>
                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to restart the app? This will temporarily disconnect the app.')) {
                      return
                    }
                    try {
                      const response = await fetch('http://localhost:3001/restart-app', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      })
                      const data = await response.json()
                      if (data.success) {
                        alert('App restart initiated. The app will reload in a few seconds.')
                        setTimeout(() => window.location.reload(), 3000)
                      } else {
                        alert('Failed to restart app: ' + (data.error || 'Unknown error'))
                      }
                    } catch {
                      alert('Restart service is not available. Run the app on the Pi with the local service for this feature.')
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <Power size={18} />
                  Restart App Service
                </button>
              </div>

              {/* Restart PI Button - only works when Pi-side service is running */}
              <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Restart the Raspberry Pi. Only available when running on Pi with the local service.
                </p>
                <button
                  onClick={async () => {
                    if (!confirm('Are you sure you want to restart the Raspberry Pi? This will shut down the entire system.')) return
                    if (!confirm('This will restart the Pi. Are you absolutely sure?')) return
                    try {
                      const response = await fetch('http://localhost:3001/restart-pi', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      })
                      const data = await response.json()
                      if (data.success) {
                        alert('Pi restart initiated. The system will restart in a few seconds.')
                      } else {
                        alert('Failed to restart Pi: ' + (data.error || 'Unknown error'))
                      }
                    } catch {
                      alert('Restart service is not available. Run the app on the Pi with the local service for this feature.')
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--warning)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCw size={18} />
                  Restart Pi
                </button>
              </div>

              {/* Exit to Desktop - only works when Pi-side service is running */}
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Exit kiosk mode and return to the desktop. Only available when running on Pi with the local service.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:3001/exit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      })
                      const data = await response.json()
                      if (data.success) {
                        if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
                        window.close()
                      } else {
                        alert('Failed to exit kiosk mode. Try ESC or long-press the top-left corner.')
                      }
                    } catch {
                      alert('Exit service is not available. Run the app on the Pi with the local service for this feature.')
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <LogOut size={18} />
                  Exit to Desktop
                </button>
              </div>
            </div>

            {/* Reset All Data Button */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-primary)',
                border: '2px solid var(--danger)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                Danger Zone
              </div>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem',
                }}
              >
                This will permanently delete all data including BOCs, POCs, Launchers, Pods, RSVs, Tasks, and Logs. This action cannot be undone.
              </p>
              <button
                onClick={clearAllData}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={18} />
                Reset All Data
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* BOCs */}
              {bocs.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    BOCs ({bocs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {bocs.map((boc) => (
                      <CompactEditableItem
                        key={boc.id}
                        name={boc.name}
                        onUpdate={(name) => updateBOC(boc.id, { name })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* POCs */}
              {pocs.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    POCs ({pocs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {pocs.map((poc) => (
                      <CompactEditableItem
                        key={poc.id}
                        name={poc.name}
                        onUpdate={(name) => updatePOC(poc.id, { name })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Launchers */}
              {launchers.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Launchers ({launchers.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {launchers.map((launcher) => (
                      <CompactEditableItem
                        key={launcher.id}
                        name={launcher.name}
                        onUpdate={(name) => updateLauncher(launcher.id, { name })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pods */}
              {pods.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Pods ({pods.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {pods.map((pod) => {
                      const handleUpdateAmmoCount = (newAvailableCount: number) => {
                        const currentAvailable = pod.rounds.filter((r) => r.status === 'available').length
                        const podRoundType = pod.rounds[0]?.type || 'M28A1'
                        
                        if (newAvailableCount > currentAvailable) {
                          // Add new rounds with 'available' status
                          const roundsToAdd = newAvailableCount - currentAvailable
                          const newRounds = Array.from({ length: roundsToAdd }, (_, i) => {
                            const roundId = `${Date.now()}-${i}-${Math.random()}`
                            return {
                              id: roundId,
                              type: podRoundType,
                              status: 'available' as const,
                            }
                          })
                          updatePod(pod.id, { rounds: [...pod.rounds, ...newRounds] })
                        } else if (newAvailableCount < currentAvailable) {
                          // Change excess available rounds to 'used' status
                          const availableRounds = pod.rounds.filter((r) => r.status === 'available')
                          const roundsToChange = availableRounds.slice(newAvailableCount)
                          const updatedRounds = pod.rounds.map((round) => {
                            if (roundsToChange.some((r) => r.id === round.id)) {
                              return { ...round, status: 'used' as const }
                            }
                            return round
                          })
                          updatePod(pod.id, { rounds: updatedRounds })
                        }
                      }
                      
                      return (
                        <PodEditableItem
                          key={pod.id}
                          pod={pod}
                          onUpdateName={(name) => updatePod(pod.id, { name })}
                          onUpdateAmmoCount={handleUpdateAmmoCount}
                          launchers={launchers}
                          rsvs={rsvs}
                          pocs={pocs}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* RSVs */}
              {rsvs.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    RSVs ({rsvs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {rsvs.map((rsv) => (
                      <CompactEditableItem
                        key={rsv.id}
                        name={rsv.name}
                        onUpdate={(name) => updateRSV(rsv.id, { name })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Credit */}
      <div
        style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            margin: 0,
            opacity: 0.6,
          }}
        >
          Created by Jacob Walker
        </p>
      </div>

    </PageShell>
  )
}

