import { useMemo, useCallback, type CSSProperties } from 'react'
import { X, GitBranch } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { Battalion, BOC, Brigade, Launcher, POC, RSV } from '../../types'

const AMMO_PLT_ID = 'ammo-plt-1'

type Props = {
  isOpen: boolean
  onClose: () => void
}

const sel: CSSProperties = {
  padding: '0.35rem 0.5rem',
  fontSize: '0.82rem',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  minWidth: '160px',
  maxWidth: '100%',
}

function treeIndent(level: number): CSSProperties {
  return {
    marginLeft: level * 14,
    paddingLeft: 10,
    borderLeft: level > 0 ? '2px solid var(--border)' : undefined,
  }
}

function sortByName<T extends { name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.name.localeCompare(b.name))
}

function rsvPlacement(rsv: RSV): string {
  if (rsv.pocId) return `poc|${rsv.pocId}`
  if (rsv.bocId) return `boc|${rsv.bocId}`
  if (rsv.ammoPltId === AMMO_PLT_ID) return `ammo|${AMMO_PLT_ID}`
  return 'unassigned'
}

export default function UnitHierarchyModal({ isOpen, onClose }: Props) {
  const {
    brigades,
    battalions,
    bocs,
    pocs,
    launchers,
    rsvs,
    ammoPltBocId,
    assignAmmoPltToBOC,
    updateBattalion,
    updateBOC,
    assignPOCToBOC,
    assignLauncherToPOC,
    assignRSVToPOC,
    assignRSVToBOC,
    assignRSVToAmmoPlt,
  } = useAppData()

  const brigadesSorted = useMemo(() => sortByName(brigades), [brigades])
  const battalionsSorted = useMemo(() => sortByName(battalions), [battalions])
  const bocsSorted = useMemo(() => sortByName(bocs), [bocs])
  const pocsSorted = useMemo(() => sortByName(pocs), [pocs])

  const applyRsvPlacement = useCallback(
    (rsvId: string, raw: string) => {
      assignRSVToPOC(rsvId, '')
      assignRSVToBOC(rsvId, '')
      assignRSVToAmmoPlt(rsvId, '')
      if (raw === 'unassigned') return
      const i = raw.indexOf('|')
      const kind = i < 0 ? raw : raw.slice(0, i)
      const id = i < 0 ? '' : raw.slice(i + 1)
      if (kind === 'poc') assignRSVToPOC(rsvId, id)
      else if (kind === 'boc') assignRSVToBOC(rsvId, id)
      else if (kind === 'ammo') assignRSVToAmmoPlt(rsvId, id)
    },
    [assignRSVToPOC, assignRSVToBOC, assignRSVToAmmoPlt]
  )

  const rsvSelectOptions = useMemo(
    () => (
      <>
        <option value="unassigned">Unassigned</option>
        <option value={`ammo|${AMMO_PLT_ID}`}>Ammo PLT</option>
        <optgroup label="BOC">
          {bocsSorted.map((b) => (
            <option key={b.id} value={`boc|${b.id}`}>
              {b.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="PLT FDC (POC)">
          {pocsSorted.map((p) => (
            <option key={p.id} value={`poc|${p.id}`}>
              {p.name}
            </option>
          ))}
        </optgroup>
      </>
    ),
    [bocsSorted, pocsSorted]
  )

  const launchersSorted = useMemo(() => sortByName(launchers), [launchers])
  const rsvOnAmmoPlt = useMemo(() => rsvs.filter((r) => r.ammoPltId === AMMO_PLT_ID), [rsvs])

  if (!isOpen) return null

  const bnForBrigade = (bde: Brigade) => battalionsSorted.filter((b) => b.brigadeId === bde.id)
  const bocForBn = (bn: Battalion) => bocsSorted.filter((b) => b.battalionId === bn.id)
  const pocForBoc = (boc: BOC) => pocsSorted.filter((p) => p.bocId === boc.id)
  const launchersForPoc = (poc: POC) => launchersSorted.filter((l) => l.pocId === poc.id)
  const rsvForPoc = (poc: POC) => rsvs.filter((r) => r.pocId === poc.id)
  const rsvForBocOnly = (boc: BOC) => rsvs.filter((r) => r.bocId === boc.id && !r.pocId)

  const orphanBattalions = battalionsSorted.filter((b) => !b.brigadeId)
  const orphanBocs = bocsSorted.filter((b) => !b.battalionId)
  const orphanPocs = pocsSorted.filter((p) => !p.bocId)
  const orphanLaunchers = launchersSorted.filter((l) => !l.pocId)
  const orphanRsvs = rsvs.filter((r) => !r.pocId && !r.bocId && r.ammoPltId !== AMMO_PLT_ID)

  const renderLauncherRow = (l: Launcher, level: number) => (
    <div
      key={l.id}
      style={{
        ...treeIndent(level),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.35rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        Launcher <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.name}</span>
      </span>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        PLT
        <select
          value={l.pocId || ''}
          onChange={(e) => assignLauncherToPOC(l.id, e.target.value)}
          style={sel}
        >
          <option value="">— None —</option>
          {pocsSorted.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )

  const renderRsvRow = (r: RSV, level: number) => (
    <div
      key={r.id}
      style={{
        ...treeIndent(level),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.35rem 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        RSV <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.name}</span>
      </span>
      <select
        value={rsvPlacement(r)}
        onChange={(e) => applyRsvPlacement(r.id, e.target.value)}
        style={sel}
      >
        {rsvSelectOptions}
      </select>
    </div>
  )

  const renderPocBlock = (poc: POC, level: number) => (
    <div key={poc.id} style={{ marginBottom: '0.5rem' }}>
      <div
        style={{
          ...treeIndent(level),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.35rem',
        }}
      >
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          PLT (POC) {poc.name}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Battery (BOC)
          <select
            value={poc.bocId || ''}
            onChange={(e) => assignPOCToBOC(poc.id, e.target.value)}
            style={sel}
          >
            <option value="">— None —</option>
            {bocsSorted.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {launchersForPoc(poc).map((l) => renderLauncherRow(l, level + 1))}
      {rsvForPoc(poc).map((r) => renderRsvRow(r, level + 1))}
    </div>
  )

  const renderBocBlock = (boc: BOC, level: number) => (
    <div key={boc.id} style={{ marginBottom: '0.75rem' }}>
      <div
        style={{
          ...treeIndent(level),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.35rem',
        }}
      >
        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent)' }}>BOC {boc.name}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Battalion
          <select
            value={boc.battalionId || ''}
            onChange={(e) => updateBOC(boc.id, { battalionId: e.target.value || undefined })}
            style={sel}
          >
            <option value="">— None —</option>
            {battalionsSorted.map((bn) => (
              <option key={bn.id} value={bn.id}>
                {bn.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pocForBoc(boc).map((poc) => renderPocBlock(poc, level + 1))}
      {rsvForBocOnly(boc).map((r) => renderRsvRow(r, level + 1))}
    </div>
  )

  const renderBnBlock = (bn: Battalion, level: number) => (
    <div key={bn.id} style={{ marginBottom: '0.75rem' }}>
      <div
        style={{
          ...treeIndent(level),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.35rem',
        }}
      >
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Bn {bn.name}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Brigade
          <select
            value={bn.brigadeId || ''}
            onChange={(e) => updateBattalion(bn.id, { brigadeId: e.target.value || undefined })}
            style={sel}
          >
            <option value="">— None —</option>
            {brigadesSorted.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {bocForBn(bn).map((boc) => renderBocBlock(boc, level + 1))}
    </div>
  )

  return (
    <div
      className="fdc-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          maxWidth: '720px',
          width: '100%',
          maxHeight: 'min(90vh, 100%)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <GitBranch size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Unit hierarchy & assignments
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Use the dropdowns to move echelons and line equipment. Changes apply immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem 1.25rem' }}>
          {/* Ammo PLT */}
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              AMMO PLT (echelon)
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Align to battery (BOC) for dashboard context
              <select
                value={ammoPltBocId || ''}
                onChange={(e) => {
                  if (e.target.value) assignAmmoPltToBOC(e.target.value)
                }}
                style={{ ...sel, width: '100%', maxWidth: '400px' }}
              >
                <option value="">— Select BOC —</option>
                {bocsSorted.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {rsvOnAmmoPlt.length > 0 && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  RSVs on Ammo PLT
                </div>
                {rsvOnAmmoPlt.map((r) => renderRsvRow(r, 0))}
              </div>
            )}
          </div>

          {/* Linked tree */}
          {brigadesSorted.map((bde) => (
            <div key={bde.id} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Bde {bde.name}
              </div>
              {bnForBrigade(bde).map((bn) => renderBnBlock(bn, 0))}
            </div>
          ))}

          {orphanBattalions.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>
                Battalions not under a brigade
              </div>
              {orphanBattalions.map((bn) => renderBnBlock(bn, 0))}
            </div>
          )}

          {orphanBocs.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>
                BOCs not under a battalion
              </div>
              {orphanBocs.map((boc) => renderBocBlock(boc, 0))}
            </div>
          )}

          {orphanPocs.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>
                PLTs not under a BOC
              </div>
              {orphanPocs.map((poc) => renderPocBlock(poc, 0))}
            </div>
          )}

          {(orphanLaunchers.length > 0 || orphanRsvs.length > 0) && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.5rem' }}>
                Unassigned launchers & RSVs
              </div>
              {orphanLaunchers.map((l) => renderLauncherRow(l, 0))}
              {orphanRsvs.map((r) => renderRsvRow(r, 0))}
            </div>
          )}

          {brigades.length === 0 &&
            orphanBattalions.length === 0 &&
            orphanBocs.length === 0 &&
            orphanPocs.length === 0 &&
            orphanLaunchers.length === 0 &&
            orphanRsvs.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                No units yet. Create brigades, battalions, BOCs, and POCs under Organization, then open this view again.
              </p>
            )}
        </div>
      </div>
    </div>
  )
}
