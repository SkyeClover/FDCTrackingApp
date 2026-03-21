import { useState, useMemo, useRef, type CSSProperties, type ChangeEvent } from 'react'
import { ArrowLeft, Upload, Sparkles, Database } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import CreateUnitModal from '../inventory/CreateUnitModal'
import { stateHasOrgEntities } from '../../utils/saveLoad'
import type { CurrentUserRole } from '../../types'

type Screen = 'home' | 'fresh' | 'restore'

export default function FirstRunSetup() {
  const isMobile = useIsMobile()
  const {
    brigades,
    battalions,
    bocs,
    pocs,
    launchers,
    setCurrentUserRole,
    loadFromFile,
    completeInitialSetup,
  } = useAppData()

  const [screen, setScreen] = useState<Screen>('home')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedRoleType, setSelectedRoleType] = useState<'brigade' | 'battalion' | 'boc' | 'poc' | ''>('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasOrg = useMemo(
    () => stateHasOrgEntities({ brigades, battalions, bocs, pocs, launchers }),
    [brigades, battalions, bocs, pocs, launchers]
  )

  const brigadesSorted = useMemo(
    () => [...brigades].sort((a, b) => a.name.localeCompare(b.name)),
    [brigades]
  )
  const battalionsSorted = useMemo(
    () => [...battalions].sort((a, b) => a.name.localeCompare(b.name)),
    [battalions]
  )
  const bocsSorted = useMemo(() => [...bocs].sort((a, b) => a.name.localeCompare(b.name)), [bocs])
  const pocsSorted = useMemo(() => [...pocs].sort((a, b) => a.name.localeCompare(b.name)), [pocs])

  const resolveRole = (): CurrentUserRole | null => {
    if (!selectedRoleType || !selectedRoleId) return null
    if (selectedRoleType === 'brigade') {
      const b = brigades.find((x) => x.id === selectedRoleId)
      return b ? { type: 'brigade', id: b.id, name: b.name } : null
    }
    if (selectedRoleType === 'battalion') {
      const bn = battalions.find((x) => x.id === selectedRoleId)
      return bn ? { type: 'battalion', id: bn.id, name: bn.name } : null
    }
    if (selectedRoleType === 'boc') {
      const boc = bocs.find((b) => b.id === selectedRoleId)
      return boc ? { type: 'boc', id: boc.id, name: boc.name } : null
    }
    const poc = pocs.find((p) => p.id === selectedRoleId)
    return poc ? { type: 'poc', id: poc.id, name: poc.name } : null
  }

  const handleEnterApp = () => {
    const role = resolveRole()
    if (!hasOrg || !role) return
    setCurrentUserRole(role)
    completeInitialSetup()
  }

  const canEnterApp = hasOrg && !!resolveRole()

  const onRestorePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRestoreError(null)
    setRestoreBusy(true)
    const ok = await loadFromFile(file)
    setRestoreBusy(false)
    if (!ok) {
      setRestoreError('Could not read that file. Use a JSON export from this app.')
    }
  }

  const panelStyle: CSSProperties = {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: isMobile ? '1rem' : '1.35rem',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        backgroundColor: 'var(--bg-primary)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: isMobile ? '1.25rem 1rem 2rem' : '2.5rem 1.5rem 3rem',
          boxSizing: 'border-box',
        }}
      >
        {screen === 'home' && (
          <>
            <h1
              style={{
                fontSize: isMobile ? '1.5rem' : '1.85rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                textAlign: 'center',
              }}
            >
              Welcome to Walker Track
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                lineHeight: 1.55,
                marginBottom: '1.75rem',
                textAlign: 'center',
              }}
            >
              First, either define your element and view role here, or restore a saved database. You can change the
              view role later in Settings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setScreen('fresh')}
                style={{
                  ...panelStyle,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  borderColor: 'var(--accent)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={22} color="var(--accent)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    New element &amp; view role
                  </span>
                </div>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Create at least one unit (brigade, battalion, battery, or PLT FDC), then pick your view role so the
                  dashboard matches your position.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScreen('restore')}
                style={{
                  ...panelStyle,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={22} color="var(--success)" />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    Restore database
                  </span>
                </div>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Upload a JSON file previously exported from this app (includes units, equipment, and saved view role
                  if present).
                </span>
              </button>
            </div>
          </>
        )}

        {screen === 'fresh' && (
          <>
            <button
              type="button"
              onClick={() => setScreen('home')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '1rem',
                padding: '0.4rem 0',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1
              style={{
                fontSize: isMobile ? '1.35rem' : '1.55rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Your element
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Add at least one organizational unit. Use the same flow as Management → Create unit (brigade through
              PLT FDC, or line equipment).
            </p>

            <div style={{ ...panelStyle, marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                UNITS ON FILE
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Brigades {brigades.length} · Battalions {battalions.length} · BOCs {bocs.length} · POCs {pocs.length} ·
                Launchers {launchers.length}
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Create unit…
              </button>
              {!hasOrg && (
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--warning)', fontStyle: 'italic' }}>
                  Create at least one unit before continuing.
                </p>
              )}
            </div>

            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              View role
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Brigade → Battalion → BOC → POC (highest to lowest). This scopes the dashboard and management actions.
            </p>

            <div style={{ ...panelStyle, marginBottom: '1.25rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Echelon
                </span>
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
                        border: `1px solid ${selectedRoleType === t ? 'var(--accent)' : 'var(--border)'}`,
                        backgroundColor: selectedRoleType === t ? 'var(--accent)' : 'transparent',
                        color: selectedRoleType === t ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
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
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                    {selectedRoleType === 'brigade' && 'Select brigade'}
                    {selectedRoleType === 'battalion' && 'Select battalion'}
                    {selectedRoleType === 'boc' && 'Select BOC'}
                    {selectedRoleType === 'poc' && 'Select POC (PLT FDC)'}
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
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                          No {kindLabel}s yet — create that echelon first (Create unit).
                        </p>
                      )
                    }
                    return (
                      <select
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                        }}
                      >
                        <option value="">— Select {kindLabel} —</option>
                        {availableItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )
                  })()}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!canEnterApp}
              onClick={handleEnterApp}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: canEnterApp ? 'var(--success)' : 'var(--bg-tertiary)',
                color: canEnterApp ? 'white' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: canEnterApp ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
              }}
            >
              Enter app
            </button>
          </>
        )}

        {screen === 'restore' && (
          <>
            <button
              type="button"
              onClick={() => {
                setScreen('home')
                setRestoreError(null)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginBottom: '1rem',
                padding: '0.4rem 0',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <h1
              style={{
                fontSize: isMobile ? '1.35rem' : '1.55rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              Restore database
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Choose a <code style={{ fontSize: '0.85em' }}>.json</code> file from <strong style={{ color: 'var(--text-primary)' }}>Export</strong>{' '}
              on the Dashboard or a previous backup.
            </p>
            <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onRestorePick} />
            <button
              type="button"
              disabled={restoreBusy}
              onClick={() => fileRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: 'white',
                fontWeight: 600,
                cursor: restoreBusy ? 'wait' : 'pointer',
                fontSize: '0.95rem',
              }}
            >
              <Upload size={20} />
              {restoreBusy ? 'Reading…' : 'Choose JSON file'}
            </button>
            {restoreError && (
              <p style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.88rem' }}>{restoreError}</p>
            )}
          </>
        )}
      </div>

      <CreateUnitModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
