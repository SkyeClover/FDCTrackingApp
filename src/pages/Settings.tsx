import { useState, memo } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus, Trash2, Check, X as XIcon, Edit, ChevronDown, ChevronUp, Bug, History } from 'lucide-react'
import { getAllRoundTypeOptions } from '../constants/roundTypes'
import { useIsMobile } from '../hooks/useIsMobile'

// Compact editable item component for debug section
const CompactEditableItem = memo(({
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
})

CompactEditableItem.displayName = 'CompactEditableItem'

export default function Settings() {
  const isMobile = useIsMobile()
  const { currentUserRole, bocs, pocs, launchers, pods, rsvs, setCurrentUserRole, roundTypes, addRoundType, updateRoundType, deleteRoundType, updateBOC, updatePOC, updateLauncher, updatePod, updateRSV, clearAllData } = useAppData()
  const [selectedRoleType, setSelectedRoleType] = useState<'boc' | 'poc' | ''>('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [newRoundTypeName, setNewRoundTypeName] = useState('')
  const [showAddRoundType, setShowAddRoundType] = useState(false)
  const [showDebugSection, setShowDebugSection] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)

  const handleRoleChange = () => {
    if (!selectedRoleType || !selectedRoleId) return

    if (selectedRoleType === 'boc') {
      const boc = bocs.find((b) => b.id === selectedRoleId)
      if (boc) {
        setCurrentUserRole({
          type: 'boc',
          id: boc.id,
          name: boc.name,
        })
        setSelectedRoleType('')
        setSelectedRoleId('')
      }
    } else {
      const poc = pocs.find((p) => p.id === selectedRoleId)
      if (poc) {
        setCurrentUserRole({
          type: 'poc',
          id: poc.id,
          name: poc.name,
        })
        setSelectedRoleType('')
        setSelectedRoleId('')
      }
    }
  }

  return (
    <div>
      <h1
        style={{
          fontSize: isMobile ? '1.5rem' : '2rem',
          fontWeight: 'bold',
          marginBottom: isMobile ? '1rem' : '2rem',
          color: 'var(--text-primary)',
        }}
      >
        Settings / Help
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: isMobile ? '1rem' : '1.5rem',
          width: '100%',
          maxWidth: '100%',
        }}
      >
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
            {currentUserRole ? (
              <>
                <div>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Current Role:</strong>
                  </p>
                  <p style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                    {currentUserRole.type.toUpperCase()}: {currentUserRole.name}
                  </p>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <p style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                    <strong>Change Role:</strong>
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
                        Select Role Type
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoleType('poc')
                            setSelectedRoleId('')
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: `1px solid ${selectedRoleType === 'poc' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                            backgroundColor: selectedRoleType === 'poc' ? 'var(--accent-color)' : 'transparent',
                            color: selectedRoleType === 'poc' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                        >
                          POC
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoleType('boc')
                            setSelectedRoleId('')
                          }}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: `1px solid ${selectedRoleType === 'boc' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                            backgroundColor: selectedRoleType === 'boc' ? 'var(--accent-color)' : 'transparent',
                            color: selectedRoleType === 'boc' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                        >
                          BOC
                        </button>
                      </div>
                    </div>
                    {selectedRoleType && (
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                          }}
                        >
                          Select {selectedRoleType.toUpperCase()}
                          {selectedRoleType === 'boc' && bocs.length > 0 && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                              ({bocs.length} available)
                            </span>
                          )}
                          {selectedRoleType === 'poc' && pocs.length > 0 && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                              ({pocs.length} available)
                            </span>
                          )}
                        </label>
                        {(() => {
                          const availableItems = Array.isArray(selectedRoleType === 'boc' ? bocs : pocs) 
                            ? (selectedRoleType === 'boc' ? bocs : pocs)
                            : []
                          
                          if (availableItems.length === 0) {
                            return (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                No {selectedRoleType.toUpperCase()}s available. Create one in the Inventory page first.
                              </p>
                            )
                          }
                          
                          return (
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
                              <option value="">-- Select {selectedRoleType.toUpperCase()} --</option>
                              {availableItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          )
                        })()}
                      </div>
                    )}
                    {selectedRoleType && selectedRoleId && (
                      <button
                        type="button"
                        onClick={handleRoleChange}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'var(--accent-color)',
                          color: 'white',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        Change Role
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p>
                No role assigned. Create a BOC or POC in the Inventory page, then return here to
                assign yourself.
              </p>
            )}
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
            Getting Started
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}
          >
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>1. Role Selection:</strong> On
              first startup, you'll be prompted to create and assign yourself to a BOC (Battery
              Operations Center) or POC (PLT Operations Center). You can change your role anytime
              in Settings.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>2. Inventory:</strong> Create
              BOCs, POCs, Launchers, Pods, and Rounds in the Inventory page. If you haven't
              created your unit yet, you can do so here.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>3. Management:</strong> Use the
              Management panel to assign Pods to Launchers, Launchers to POCs, POCs to BOCs, and
              Tasks to Launchers.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>4. Dashboard:</strong> View an
              overview of all your assets and their current status. Initiate fire missions and
              generate reports from here.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>5. Logs:</strong> Monitor all
              activity and changes in the system.
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
              <strong style={{ color: 'var(--text-primary)' }}>FDC Tracker</strong>
            </p>
            <p>Version 1.0.0</p>
            <p>
              A tracking application for rounds, pods, and launchers. Designed for AFATDS Operators
              to manage ammunition tracking and report generation.
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
            Round Types
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Manage available round types for inventory. Enabled types appear in pod creation and inventory filters.
            </p>

            {/* Add New Round Type */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              {!showAddRoundType ? (
                <button
                  type="button"
                  onClick={() => setShowAddRoundType(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  <Plus size={16} />
                  Add New Round Type
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    value={newRoundTypeName}
                    onChange={(e) => setNewRoundTypeName(e.target.value.toUpperCase())}
                    placeholder="Round type name (e.g., M57)"
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRoundTypeName.trim()) {
                        addRoundType(newRoundTypeName.trim())
                        setNewRoundTypeName('')
                        setShowAddRoundType(false)
                      } else if (e.key === 'Escape') {
                        setNewRoundTypeName('')
                        setShowAddRoundType(false)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newRoundTypeName.trim()) {
                        addRoundType(newRoundTypeName.trim())
                        setNewRoundTypeName('')
                        setShowAddRoundType(false)
                      }
                    }}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'var(--success)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    disabled={!newRoundTypeName.trim()}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRoundTypeName('')
                      setShowAddRoundType(false)
                    }}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Round Types List */}
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {getAllRoundTypeOptions(roundTypes).length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  No round types configured
                </p>
              ) : (
                getAllRoundTypeOptions(roundTypes).map((option) => {
                  const config = roundTypes[option.value]
                  const isDefault = ['M28A1', 'M26', 'M31', 'M30', 'M57', 'M39'].includes(option.value)
                  
                  return (
                    <div
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500', minWidth: '80px' }}>
                          {option.label}
                        </span>
                        {isDefault && (
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                            }}
                          >
                            Default
                          </span>
                        )}
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: config.enabled ? 'var(--success)' : 'var(--bg-tertiary)',
                            color: config.enabled ? 'white' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                          }}
                        >
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => updateRoundType(option.value, !config.enabled)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: config.enabled ? 'var(--bg-tertiary)' : 'var(--success)',
                            color: config.enabled ? 'var(--text-primary)' : 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                          }}
                        >
                          {config.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete round type "${option.label}"? This cannot be undone if there are pods using this type.`)) {
                                deleteRoundType(option.value)
                              }
                            }}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: 'transparent',
                              color: 'var(--danger)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Delete round type"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Changelog Section - Collapsible */}
      <div
        style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => setShowChangelog(!showChangelog)}
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
            <History size={16} />
            <span>Changelog</span>
          </div>
          {showChangelog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showChangelog && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                color: 'var(--text-secondary)',
              }}
            >
              {/* Version 1.0.1 */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    Version 1.0.1
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      fontStyle: 'italic',
                    }}
                  >
                    (Latest)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    paddingLeft: '1rem',
                    borderLeft: '2px solid var(--accent)',
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>✨ Mobile UI:</strong> Full mobile-friendly interface with responsive design
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>📱 Mobile Navigation:</strong> Hamburger menu with slide-out drawer
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>👆 Swipe Gestures:</strong> Swipe left to close menu, swipe down to close modals
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>🎯 Touch-Friendly:</strong> Improved button sizes and interactions for mobile devices
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>⌨️ Keyboard Support:</strong> ESC key to close modals
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>🔢 Input Improvements:</strong> Number inputs now auto-select on focus for easier editing
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>🔄 Reset Feature:</strong> Added "Reset All Data" button in Debug section
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>📋 Changelog:</strong> Added changelog section to track updates
                  </p>
                </div>
              </div>

              {/* Version 1.0.0 */}
              <div>
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                  }}
                >
                  Version 1.0.0
                </h3>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    paddingLeft: '1rem',
                    borderLeft: '2px solid var(--border)',
                  }}
                >
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>🎉 Initial Release:</strong> Core functionality for FDC tracking
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>📊 Dashboard:</strong> Overview of all assets and fire mission initiation
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>📦 Inventory:</strong> Create and manage BOCs, POCs, Launchers, Pods, RSVs, and Rounds
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>⚙️ Management:</strong> Assignment system for pods, launchers, and tasks
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>📝 Logs:</strong> Activity tracking and system monitoring
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>💾 Save/Load:</strong> Export and import data functionality
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>📄 Reports:</strong> Generate ASCII reports for ammunition status
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {pods.map((pod) => (
                      <CompactEditableItem
                        key={pod.id}
                        name={pod.name}
                        onUpdate={(name) => updatePod(pod.id, { name })}
                      />
                    ))}
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
    </div>
  )
}

