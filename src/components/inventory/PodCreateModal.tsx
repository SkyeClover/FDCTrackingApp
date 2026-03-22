import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../../constants/roundTypes'
import SegmentedIntPicker from '../ui/SegmentedIntPicker'
import TouchNumericStepper from '../ui/TouchNumericStepper'
import type { RoundType } from '../../types'

const AMMO_PLT_ID = 'ammo-plt-1'

type Props = {
  isOpen: boolean
  onClose: () => void
}

/** Single-select value: `kind|id` or `unassigned` (pipe allows ids with special chars). */
function parsePlacement(raw: string): { kind: string; id: string } {
  if (!raw || raw === 'unassigned') return { kind: 'unassigned', id: '' }
  const i = raw.indexOf('|')
  if (i < 0) return { kind: raw, id: '' }
  return { kind: raw.slice(0, i), id: raw.slice(i + 1) }
}

export default function PodCreateModal({ isOpen, onClose }: Props) {
  const {
    roundTypes,
    addPod,
    addRound,
    assignPodToPOC,
    assignPodToRSV,
    assignPodToAmmoPlt,
    assignPodToLauncher,
    assignPodToBOC,
    assignPodToBattalion,
    assignPodToBrigade,
    pocs,
    bocs,
    battalions,
    brigades,
    rsvs,
    launchers,
  } = useAppData()

  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])

  const [namePrefix, setNamePrefix] = useState('')
  const [roundType, setRoundType] = useState<RoundType>(roundTypeOptions[0]?.value || '')
  const [roundsPerPod, setRoundsPerPod] = useState<number | ''>(6)
  const [podCount, setPodCount] = useState<number | ''>(1)
  const [placement, setPlacement] = useState('unassigned')

  useEffect(() => {
    if (!isOpen) return
    setNamePrefix('')
    setRoundsPerPod(6)
    setPodCount(1)
    setPlacement('unassigned')
  }, [isOpen])

  useEffect(() => {
    if (roundTypeOptions.length > 0 && !roundTypeOptions.find((o) => o.value === roundType)) {
      setRoundType(roundTypeOptions[0].value)
    }
  }, [roundTypeOptions, roundType])

  const pocsSorted = useMemo(() => [...pocs].sort((a, b) => a.name.localeCompare(b.name)), [pocs])
  const bocsSorted = useMemo(() => [...bocs].sort((a, b) => a.name.localeCompare(b.name)), [bocs])
  const battalionsSorted = useMemo(
    () => [...battalions].sort((a, b) => a.name.localeCompare(b.name)),
    [battalions]
  )
  const brigadesSorted = useMemo(() => [...brigades].sort((a, b) => a.name.localeCompare(b.name)), [brigades])
  const rsvsSorted = useMemo(() => [...rsvs].sort((a, b) => a.name.localeCompare(b.name)), [rsvs])
  const launchersSorted = useMemo(
    () => [...launchers].sort((a, b) => a.name.localeCompare(b.name)),
    [launchers]
  )

  const applyPlacement = (podId: string, kind: string, id: string) => {
    switch (kind) {
      case 'unassigned':
        break
      case 'ammo-plt':
        assignPodToAmmoPlt(podId, id)
        break
      case 'poc':
        assignPodToPOC(podId, id)
        break
      case 'boc':
        assignPodToBOC(podId, id)
        break
      case 'battalion':
        assignPodToBattalion(podId, id)
        break
      case 'brigade':
        assignPodToBrigade(podId, id)
        break
      case 'rsv':
        assignPodToRSV(podId, id)
        break
      case 'launcher':
        assignPodToLauncher(podId, id)
        break
      default:
        break
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!namePrefix.trim() || !roundType || roundTypeOptions.length === 0) return
    const q = typeof podCount === 'number' ? podCount : 1
    const rc = typeof roundsPerPod === 'number' ? roundsPerPod : 0
    const { kind, id } = parsePlacement(placement)

    for (let i = 0; i < q; i++) {
      const timestamp = Date.now() + i
      const podId = timestamp.toString()
      const podName = q > 1 ? `${namePrefix.trim()} ${i + 1}` : namePrefix.trim()
      const newRounds = Array.from({ length: rc }, (_, j) => ({
        id: `${timestamp}-${j}`,
        type: roundType,
        status: 'available' as const,
      }))
      newRounds.forEach((r) => addRound(r))
      addPod({
        id: podId,
        uuid: crypto.randomUUID(),
        name: podName,
        rounds: newRounds,
      })
      applyPlacement(podId, kind, id)
    }
    onClose()
  }

  if (!isOpen) return null

  const canSubmit = !!namePrefix.trim() && !!roundType && roundTypeOptions.length > 0

  return (
    <div
      data-guide="pod-create-modal"
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
      onClick={onClose}
    >
      <div
        className="touch-kbd-scroll"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          maxWidth: '480px',
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
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Create ammunition pod(s)
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Each pod is one physical magazine. You choose how many rounds are loaded in each pod, how many duplicate pods to
            create, and where they start (you can change location later in the pods table).
          </p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Pod name (base label)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              If you create more than one pod, numbers are appended: “Alpha 1”, “Alpha 2”, …
            </span>
            <input
              data-guide="pod-create-name"
              required
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="e.g. Pod A / RESUP 1"
              style={{
                padding: '0.55rem 0.65rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
              }}
            />
          </label>

          {roundTypeOptions.length === 0 ? (
            <p style={{ color: 'var(--warning)', fontSize: '0.9rem', margin: 0 }}>
              Enable at least one round type under Round types before creating pods.
            </p>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Round type (ammo family)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Every round slot in this pod will be this type. Mixed pods are not modeled here.
              </span>
              <select
                data-guide="pod-create-round-type"
                value={roundType}
                onChange={(e) => setRoundType(e.target.value as RoundType)}
                style={{
                  padding: '0.55rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                }}
              >
                {roundTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div data-guide="pod-create-rounds-per-pod">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem' }}>
              Rounds per pod
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, var(--text-secondary))', marginBottom: '0.35rem' }}>
              How many round slots are in this pod (0–6). “0” creates an empty pod you can fill later.
            </div>
            <SegmentedIntPicker min={0} max={6} value={roundsPerPod} onChange={setRoundsPerPod} allowEmpty compact />
          </div>

          <div data-guide="pod-create-count">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem' }}>
              How many pods to create
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, var(--text-secondary))', marginBottom: '0.35rem' }}>
              Identical pods (same round type and rounds per pod). Use for a batch of magazines.
            </div>
            <TouchNumericStepper value={podCount} onChange={setPodCount} min={1} max={500} placeholder="1" />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Initial location (optional)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <strong>On hand (PLT)</strong> means platoon FDC holding, not on a launcher or RSV. Higher pools are Bn / Bde
              stock. You can always reassign in the pods table.
            </span>
            <select
              data-guide="pod-create-placement"
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              style={{
                padding: '0.55rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              <option value="unassigned">Unassigned — set later in table</option>
              <option value={`ammo-plt|${AMMO_PLT_ID}`}>Ammo PLT</option>
              <optgroup label="On hand (PLT FDC)">
                {pocsSorted.map((p) => (
                  <option key={p.id} value={`poc|${p.id}`}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Battery pool (BOC)">
                {bocsSorted.map((b) => (
                  <option key={b.id} value={`boc|${b.id}`}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Battalion holding">
                {battalionsSorted.map((b) => (
                  <option key={b.id} value={`battalion|${b.id}`}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Brigade holding">
                {brigadesSorted.map((b) => (
                  <option key={b.id} value={`brigade|${b.id}`}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="On RSV">
                {rsvsSorted.map((r) => (
                  <option key={r.id} value={`rsv|${r.id}`}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Loaded on launcher">
                {launchersSorted.map((l) => (
                  <option key={l.id} value={`launcher|${l.id}`}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button
              type="submit"
              disabled={!canSubmit}
              data-guide="pod-create-submit"
              style={{
                flex: 1,
                padding: '0.65rem',
                backgroundColor: canSubmit ? 'var(--success)' : 'var(--bg-tertiary)',
                color: canSubmit ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
