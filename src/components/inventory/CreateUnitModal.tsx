import { useState, useEffect } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

export type CreateUnitKind =
  | 'brigade'
  | 'battalion'
  | 'boc'
  | 'poc'
  | 'ammo-plt'
  | 'launcher'
  | 'rsv'

const OPS_KINDS: { id: CreateUnitKind; label: string; hint: string }[] = [
  { id: 'brigade', label: 'Brigade', hint: 'Higher HQ' },
  { id: 'battalion', label: 'Battalion', hint: 'Bn HQ' },
  { id: 'boc', label: 'Battery (BOC)', hint: 'Battery ops center' },
  { id: 'poc', label: 'PLT FDC (POC)', hint: 'Platoon FDC' },
]

const LINE_KINDS: { id: CreateUnitKind; label: string; hint: string }[] = [
  { id: 'ammo-plt', label: 'Ammo PLT', hint: 'Pods & RSV holding (no firing)' },
  { id: 'launcher', label: 'Launcher', hint: 'HIMARS' },
  { id: 'rsv', label: 'RSV', hint: 'Reload vehicle' },
]

function kindMeta(kind: CreateUnitKind) {
  return [...OPS_KINDS, ...LINE_KINDS].find((k) => k.id === kind)
}

type Props = {
  isOpen: boolean
  onClose: () => void
  /** When set, opens at step 2 for this kind */
  initialKind?: CreateUnitKind | null
}

export default function CreateUnitModal({ isOpen, onClose, initialKind }: Props) {
  const {
    bocs,
    pocs,
    brigades,
    battalions,
    addBrigade,
    addBattalion,
    addBOC,
    addPOC,
    addLauncher,
    addRSV,
    assignPOCToBOC,
    addAmmoPlatoon,
    assignAmmoPlatoonToBOC,
  } = useAppData()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [kind, setKind] = useState<CreateUnitKind | null>(null)

  const [name, setName] = useState('')

  const [assignBocId, setAssignBocId] = useState('')
  const [assignPocId, setAssignPocId] = useState('')
  const [assignBrigadeId, setAssignBrigadeId] = useState('')
  const [assignBattalionId, setAssignBattalionId] = useState('')
  const [rsvAssign, setRsvAssign] = useState<'skip' | 'poc' | 'boc'>('skip')

  useEffect(() => {
    if (!isOpen) return
    if (initialKind) {
      setKind(initialKind)
      setStep(2)
    } else {
      setKind(null)
      setStep(1)
    }
    setName('')
    setAssignBocId('')
    setAssignPocId('')
    setAssignBrigadeId('')
    setAssignBattalionId('')
    setRsvAssign('skip')
  }, [isOpen, initialKind])

  const resetClose = () => {
    setStep(1)
    setKind(null)
    onClose()
  }

  const needsAssignStep =
    kind === 'poc' ||
    kind === 'ammo-plt' ||
    kind === 'launcher' ||
    kind === 'rsv' ||
    kind === 'battalion' ||
    kind === 'boc'

  const goNextFromStep2 = () => {
    if (!kind) return
    if (kind === 'brigade') {
      submitCreate()
      return
    }
    if (needsAssignStep) {
      setStep(3)
      return
    }
    submitCreate()
  }

  const submitCreate = () => {
    if (!kind) return
    const ts = Date.now().toString()

    if (kind === 'brigade') {
      if (!name.trim()) return
      addBrigade({ id: ts, name: name.trim() })
      resetClose()
      return
    }
    if (kind === 'battalion') {
      if (!name.trim()) return
      addBattalion({
        id: ts,
        name: name.trim(),
        ...(assignBrigadeId ? { brigadeId: assignBrigadeId } : {}),
      })
      resetClose()
      return
    }
    if (kind === 'boc') {
      if (!name.trim()) return
      addBOC({
        id: ts,
        name: name.trim(),
        pocs: [],
        ...(assignBattalionId ? { battalionId: assignBattalionId } : {}),
      })
      resetClose()
      return
    }
    if (kind === 'poc') {
      if (!name.trim()) return
      const id = ts
      addPOC({ id, name: name.trim(), launchers: [] })
      if (assignBocId) assignPOCToBOC(id, assignBocId)
      resetClose()
      return
    }
    if (kind === 'ammo-plt') {
      if (!name.trim()) return
      const id = ts
      addAmmoPlatoon({ id, name: name.trim() })
      if (assignBocId) assignAmmoPlatoonToBOC(id, assignBocId)
      resetClose()
      return
    }
    if (kind === 'launcher') {
      if (!name.trim()) return
      addLauncher({
        id: ts,
        name: name.trim(),
        status: 'idle',
        ...(assignPocId ? { pocId: assignPocId } : {}),
      })
      resetClose()
      return
    }
    if (kind === 'rsv') {
      if (!name.trim()) return
      const id = ts
      const rsv: Parameters<typeof addRSV>[0] = { id, name: name.trim() }
      if (rsvAssign === 'poc' && assignPocId) {
        rsv.pocId = assignPocId
      } else if (rsvAssign === 'boc' && assignBocId) {
        rsv.bocId = assignBocId
      }
      addRSV(rsv)
      resetClose()
      return
    }
  }

  if (!isOpen) return null

  const bocsSorted = [...bocs].sort((a, b) => a.name.localeCompare(b.name))
  const pocsSorted = [...pocs].sort((a, b) => a.name.localeCompare(b.name))
  const brigadesSorted = [...brigades].sort((a, b) => a.name.localeCompare(b.name))
  const battalionsSorted = [...battalions].sort((a, b) => a.name.localeCompare(b.name))

  const canStep2Next = () => {
    if (!kind) return false
    if (
      kind === 'brigade' ||
      kind === 'boc' ||
      kind === 'poc' ||
      kind === 'ammo-plt' ||
      kind === 'launcher' ||
      kind === 'rsv' ||
      kind === 'battalion'
    )
      return !!name.trim()
    return false
  }

  return (
    <div
      data-guide="create-unit-modal"
      className="fdc-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
      onClick={resetClose}
    >
      <div
        className="touch-kbd-scroll"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          maxWidth: '440px',
          width: '100%',
          maxHeight: 'min(90vh, 100%)',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1rem 0.5rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 3) setStep(2)
                  else if (step === 2 && initialKind) resetClose()
                  else if (step === 2) {
                    setStep(1)
                    setKind(null)
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                }}
                aria-label="Back"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {step === 1 && 'Create unit'}
              {step === 2 && (kind ? `New ${kindMeta(kind)?.label ?? ''}` : '')}
              {step === 3 && 'Assign (optional)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '1rem' }}>
          {step === 1 && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '0.75rem' }}>
                What are you adding?
              </p>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', letterSpacing: '0.02em' }}>
                Ops &amp; FDCs
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                {OPS_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    data-guide={`create-unit-kind-${k.id}`}
                    onClick={() => {
                      setKind(k.id)
                      setStep(2)
                    }}
                    style={{
                      padding: '0.65rem 0.5rem',
                      textAlign: 'left',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{k.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{k.hint}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem', letterSpacing: '0.02em' }}>
                Line units
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                {LINE_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    data-guide={`create-unit-kind-${k.id}`}
                    onClick={() => {
                      setKind(k.id)
                      setStep(2)
                    }}
                    style={{
                      padding: '0.65rem 0.5rem',
                      textAlign: 'left',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{k.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{k.hint}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && kind && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name</label>
                <input
                  type="text"
                  data-guide="create-unit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name"
                  autoFocus
                  style={{
                    padding: '0.55rem 0.65rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />

              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  data-guide="create-unit-step2-primary"
                  onClick={goNextFromStep2}
                  disabled={!canStep2Next()}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1rem',
                    backgroundColor: canStep2Next() ? 'var(--success)' : 'var(--bg-tertiary)',
                    color: canStep2Next() ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: canStep2Next() ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  {kind === 'brigade' ? 'Create' : needsAssignStep ? 'Next' : 'Create'}
                </button>
              </div>
            </>
          )}

          {step === 3 && kind && (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0 }}>
                Link this to an echelon, or skip and assign later in Inventory / Management.
              </p>

              {kind === 'battalion' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Brigade (optional)
                  <select
                    value={assignBrigadeId}
                    onChange={(e) => setAssignBrigadeId(e.target.value)}
                    style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">— Skip —</option>
                    {brigadesSorted.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {kind === 'boc' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Battalion (optional)
                  <select
                    value={assignBattalionId}
                    onChange={(e) => setAssignBattalionId(e.target.value)}
                    style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">— Skip —</option>
                    {battalionsSorted.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {(kind === 'poc' || kind === 'ammo-plt') && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Battery (BOC)
                  <select
                    value={assignBocId}
                    onChange={(e) => setAssignBocId(e.target.value)}
                    style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">— Skip —</option>
                    {bocsSorted.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {kind === 'launcher' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  PLT FDC (POC)
                  <select
                    data-guide="launcher-form-poc"
                    value={assignPocId}
                    onChange={(e) => setAssignPocId(e.target.value)}
                    style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">— Skip —</option>
                    {pocsSorted.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {kind === 'rsv' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(['skip', 'poc', 'boc'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setRsvAssign(m)
                          setAssignPocId('')
                          setAssignBocId('')
                        }}
                        style={{
                          padding: '0.4rem 0.65rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          backgroundColor: rsvAssign === m ? 'var(--accent)' : 'var(--bg-tertiary)',
                          color: rsvAssign === m ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {m === 'skip' ? 'Skip' : m === 'poc' ? 'PLT FDC' : 'Battery'}
                      </button>
                    ))}
                  </div>
                  {rsvAssign === 'poc' && (
                    <select
                      value={assignPocId}
                      onChange={(e) => setAssignPocId(e.target.value)}
                      style={{
                        padding: '0.55rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Select POC…</option>
                      {pocsSorted.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {rsvAssign === 'boc' && (
                    <select
                      value={assignBocId}
                      onChange={(e) => setAssignBocId(e.target.value)}
                      style={{
                        padding: '0.55rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Select BOC…</option>
                      {bocsSorted.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="button"
                data-guide="create-unit-step3-submit"
                onClick={submitCreate}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.65rem',
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
