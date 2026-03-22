import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { BOC, Battalion, Brigade, Launcher, POC, Pod, Task } from '../../types'
import { getLauncherTaskSummary } from '../../utils/launcherTaskSummary'

const rowBtn: CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  padding: '0.55rem 0.65rem',
  minHeight: 44,
  textAlign: 'left',
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  fontSize: '0.82rem',
  touchAction: 'manipulation',
  boxSizing: 'border-box',
}

const branchBtn: CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.45rem 0.5rem',
  textAlign: 'left',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  fontSize: '0.88rem',
  fontWeight: 600,
  touchAction: 'manipulation',
  boxSizing: 'border-box',
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

type ViewRole = 'brigade' | 'battalion' | 'boc'

export default function DashboardHierarchyTree({
  viewRole,
  roleName,
  brigades,
  battalions,
  bocs,
  pocs,
  launchers,
  pods,
  tasks,
  onLauncherClick,
}: {
  viewRole: ViewRole
  roleName?: string
  brigades: Brigade[]
  battalions: Battalion[]
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  tasks: Task[]
  onLauncherClick: (launcherId: string) => void
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  const isOpen = (key: string) => !!open[key]

  const title =
    viewRole === 'brigade'
      ? 'Brigade overview'
      : viewRole === 'battalion'
        ? 'Battalion overview'
        : 'Battery overview'

  const pocsByBoc = useMemo(() => {
    const m = new Map<string, POC[]>()
    for (const poc of pocs) {
      const bid = poc.bocId
      if (!bid) continue
      if (!m.has(bid)) m.set(bid, [])
      m.get(bid)!.push(poc)
    }
    for (const list of m.values()) sortByName(list)
    return m
  }, [pocs])

  const bocsByBattalion = useMemo(() => {
    const m = new Map<string, BOC[]>()
    const orphan: BOC[] = []
    for (const b of bocs) {
      if (b.battalionId) {
        if (!m.has(b.battalionId)) m.set(b.battalionId, [])
        m.get(b.battalionId)!.push(b)
      } else {
        orphan.push(b)
      }
    }
    for (const list of m.values()) sortByName(list)
    sortByName(orphan)
    return { map: m, orphan }
  }, [bocs])

  const battalionsByBrigade = useMemo(() => {
    const m = new Map<string, Battalion[]>()
    const orphan: Battalion[] = []
    for (const bn of battalions) {
      if (bn.brigadeId) {
        if (!m.has(bn.brigadeId)) m.set(bn.brigadeId, [])
        m.get(bn.brigadeId)!.push(bn)
      } else {
        orphan.push(bn)
      }
    }
    for (const list of m.values()) sortByName(list)
    sortByName(orphan)
    return { map: m, orphan }
  }, [battalions])

  const renderLaunchersForPoc = (pocId: string) => {
    const pl = launchers.filter((l) => l.pocId === pocId)
    if (pl.length === 0) {
      return (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.35rem 0.5rem 0.35rem 1.75rem' }}>
          No launchers assigned
        </div>
      )
    }
    return pl.map((launcher) => {
      const pod = pods.find((p) => p.launcherId === launcher.id)
      const avail = pod?.rounds.filter((r) => r.status === 'available').length ?? 0
      const total = pod?.rounds.length ?? 0
      const rt = pod?.rounds[0]?.type ?? '—'
      const summary = getLauncherTaskSummary(launcher, tasks)
      return (
        <button
          key={launcher.id}
          type="button"
          onClick={() => onLauncherClick(launcher.id)}
          style={{ ...rowBtn, marginLeft: '1.25rem' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: '0.15rem' }}>{launcher.name}</div>
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.35,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}
              title={summary}
            >
              {summary}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            <div>
              <span
                style={{
                  color:
                    launcher.status === 'active'
                      ? 'var(--accent)'
                      : launcher.status === 'maintenance'
                        ? 'var(--warning)'
                        : 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                {launcher.status}
              </span>
            </div>
            <div style={{ marginTop: '0.15rem' }}>
              {rt} · {avail}/{total || '—'} rnds
            </div>
          </div>
          <ChevronRight size={16} style={{ flexShrink: 0, opacity: 0.5 }} aria-hidden />
        </button>
      )
    })
  }

  const renderPocBlockFixed = (boc: BOC) => {
    const pl = pocsByBoc.get(boc.id) || []
    if (pl.length === 0) {
      return (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem 0.5rem 1.5rem' }}>
          No PLT FDCs under this battery
        </div>
      )
    }
    return pl.map((poc) => {
      const key = `poc-${poc.id}`
      const expanded = isOpen(key)
      const nLaunch = launchers.filter((l) => l.pocId === poc.id).length
      return (
        <div key={poc.id} style={{ marginBottom: '0.35rem' }}>
          <button type="button" onClick={() => toggle(key)} style={{ ...branchBtn, paddingLeft: '1.25rem' }}>
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>{poc.name}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
              · {nLaunch} HIMARS
            </span>
          </button>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
              {renderLaunchersForPoc(poc.id)}
            </div>
          )}
        </div>
      )
    })
  }

  const renderBocNode = (boc: BOC, depthPad: number) => {
    const key = `boc-${boc.id}`
    const expanded = isOpen(key)
    const nPoc = (pocsByBoc.get(boc.id) || []).length
    const nL = launchers.filter((l) => {
      const poc = pocs.find((p) => p.id === l.pocId)
      return poc?.bocId === boc.id
    }).length
    return (
      <div key={boc.id} style={{ marginBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => toggle(key)}
          style={{ ...branchBtn, paddingLeft: `${depthPad}px` }}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>{boc.name}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
            · {nPoc} PLT · {nL} HIMARS
          </span>
        </button>
        {expanded && <div style={{ marginTop: '0.35rem' }}>{renderPocBlockFixed(boc)}</div>}
      </div>
    )
  }

  const buildBattalionSections = (): ReactNode[] => {
    const sections: ReactNode[] = []
    sortByName(battalions).forEach((bn) => {
      const bocList = bocsByBattalion.map.get(bn.id) || []
      if (bocList.length === 0) return
      const bk = `bn-${bn.id}`
      sections.push(
        <div key={bn.id} style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(bk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            {isOpen(bk) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>{bn.name}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
              · {bocList.length} batter{bocList.length === 1 ? 'y' : 'ies'}
            </span>
          </button>
          {isOpen(bk) && (
            <div style={{ marginTop: '0.35rem', paddingLeft: '0.5rem' }}>
              {bocList.map((boc) => renderBocNode(boc, 12))}
            </div>
          )}
        </div>
      )
    })
    if (bocsByBattalion.orphan.length > 0) {
      const ok = `orphan-boc`
      sections.push(
        <div key="orphan-boc" style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(ok)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            {isOpen(ok) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>Batteries (no battalion)</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
              · {bocsByBattalion.orphan.length}
            </span>
          </button>
          {isOpen(ok) && (
            <div style={{ marginTop: '0.35rem', paddingLeft: '0.5rem' }}>
              {bocsByBattalion.orphan.map((boc) => renderBocNode(boc, 12))}
            </div>
          )}
        </div>
      )
    }
    return sections
  }

  let body: ReactNode = null

  const effectiveRole: ViewRole =
    viewRole === 'brigade' && brigades.length === 0 ? 'battalion' : viewRole

  if (effectiveRole === 'boc') {
    body = sortByName(bocs).map((boc) => (
      <div key={boc.id}>{renderBocNode(boc, 0)}</div>
    ))
  } else if (effectiveRole === 'battalion') {
    body = buildBattalionSections()
  } else {
    // brigade
    const sections: ReactNode[] = []
    sortByName(brigades).forEach((bg) => {
      const bns = battalionsByBrigade.map.get(bg.id) || []
      if (bns.length === 0) return
      const gk = `bg-${bg.id}`
      sections.push(
        <div key={bg.id} style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(gk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            {isOpen(gk) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>{bg.name}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
              · {bns.length} BN
            </span>
          </button>
          {isOpen(gk) && (
            <div style={{ marginTop: '0.35rem', paddingLeft: '0.75rem' }}>
              {sortByName(bns).map((bn) => {
                const bocList = bocsByBattalion.map.get(bn.id) || []
                if (bocList.length === 0) return null
                const bk = `bg-${bg.id}-bn-${bn.id}`
                return (
                  <div key={bn.id} style={{ marginBottom: '0.5rem' }}>
                    <button type="button" onClick={() => toggle(bk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
                      {isOpen(bk) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span>{bn.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
                        · {bocList.length} BOC
                      </span>
                    </button>
                    {isOpen(bk) && (
                      <div style={{ marginTop: '0.25rem', paddingLeft: '0.35rem' }}>
                        {bocList.map((boc) => renderBocNode(boc, 8))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    })
    if (battalionsByBrigade.orphan.length > 0) {
      const gk = 'orphan-bn-brigade'
      sections.push(
        <div key="orphan-bn" style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(gk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            {isOpen(gk) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>Battalions (no brigade)</span>
          </button>
          {isOpen(gk) && (
            <div style={{ marginTop: '0.35rem', paddingLeft: '0.75rem' }}>
              {sortByName(battalionsByBrigade.orphan).map((bn) => {
                const bocList = bocsByBattalion.map.get(bn.id) || []
                const bk = `orph-bn-${bn.id}`
                return (
                  <div key={bn.id} style={{ marginBottom: '0.45rem' }}>
                    <button type="button" onClick={() => toggle(bk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
                      {isOpen(bk) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span>{bn.name}</span>
                    </button>
                    {isOpen(bk) && (
                      <div style={{ paddingLeft: '0.35rem' }}>{bocList.map((boc) => renderBocNode(boc, 8))}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }
    if (bocsByBattalion.orphan.length > 0) {
      const ok = 'orphan-boc-brigade'
      sections.push(
        <div key="orphan-boc-bg" style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(ok)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            {isOpen(ok) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>Batteries (no battalion)</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>
              · {bocsByBattalion.orphan.length}
            </span>
          </button>
          {isOpen(ok) && (
            <div style={{ marginTop: '0.35rem', paddingLeft: '0.5rem' }}>
              {bocsByBattalion.orphan.map((boc) => renderBocNode(boc, 12))}
            </div>
          )}
        </div>
      )
    }
    if (sections.length === 0) {
      body = buildBattalionSections()
    } else {
      body = sections
    }
  }

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        overflowX: 'auto',
      }}
    >
      <h2
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.25rem',
        }}
      >
        {title}
      </h2>
      {roleName && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem' }}>View: {roleName}</p>
      )}
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.45 }}>
        Expand units to drill down to PLT FDCs and launchers. Tap a launcher for ammunition and task detail.
      </p>
      {(!body || (Array.isArray(body) && body.length === 0)) && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
          No units to show. Add brigades, battalions, batteries, and PLT FDCs in Inventory, and link them in Management.
        </p>
      )}
      {body && (Array.isArray(body) ? body.length > 0 : true) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>{body}</div>
      )}
    </div>
  )
}
