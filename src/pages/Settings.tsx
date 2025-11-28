import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus, Trash2, Check, X as XIcon } from 'lucide-react'
import { getAllRoundTypeOptions } from '../constants/roundTypes'

export default function Settings() {
  const { currentUserRole, bocs, pocs, setCurrentUserRole, roundTypes, addRoundType, updateRoundType, deleteRoundType } = useAppData()
  const [selectedRoleType, setSelectedRoleType] = useState<'boc' | 'poc' | ''>('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [newRoundTypeName, setNewRoundTypeName] = useState('')
  const [showAddRoundType, setShowAddRoundType] = useState(false)

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
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          color: 'var(--text-primary)',
        }}
      >
        Settings / Help
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
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
    </div>
  )
}

