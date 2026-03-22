import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { BOC, Battalion, Brigade, Launcher, POC, Pod, RSV, Task } from '../../types'
import { getLauncherTaskSummary } from '../../utils/launcherTaskSummary'

const rowBtn: CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, 0.85fr) minmax(220px, 1.4fr) minmax(110px, auto) auto',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.55rem 0.75rem',
  minHeight: 44,
  textAlign: 'left',
  backgroundColor: 'var(--bg-primary)',
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
  justifyContent: 'space-between',
  gap: '0.4rem',
  padding: '0.48rem 0.6rem',
  textAlign: 'left',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)',
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

function formatRoundPair(available: number, total: number): string {
  if (total <= 0) return 'No rounds loaded'
  return `${available}/${total} rounds available`
}

type RoundSummary = {
  loadedAvailable: number
  loadedTotal: number
  reserveAvailable: number
  reserveTotal: number
  loadedByTypeAvailable: Record<string, number>
  loadedByTypeTotal: Record<string, number>
  loadedPodsByType: Record<string, number>
  reserveByTypeAvailable: Record<string, number>
  reserveByTypeTotal: Record<string, number>
  reservePodsByType: Record<string, number>
}

function formatByTypeSummary(availableByType: Record<string, number>, totalByType: Record<string, number>): string {
  const keys = Object.keys(totalByType).sort((a, b) => a.localeCompare(b))
  if (keys.length === 0) return 'none'
  return keys.map((k) => `${k} ${availableByType[k] ?? 0}/${totalByType[k]}`).join(', ')
}

function formatTypePodRoundSummaryCompact(
  podsByType: Record<string, number>,
  availableByType: Record<string, number>
): string {
  const keys = Object.keys(podsByType).sort((a, b) => a.localeCompare(b))
  if (keys.length === 0) return 'none'
  return keys.map((k) => `${k} ${podsByType[k]}p/${availableByType[k] ?? 0}r`).join(' · ')
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
  rsvs,
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
  rsvs: RSV[]
  tasks: Task[]
  onLauncherClick: (launcherId: string) => void
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  const isOpen = (key: string) => !!open[key]

  useEffect(() => {
    setOpen({})
  }, [viewRole, roleName])

  const title =
    viewRole === 'brigade'
      ? 'Brigade overview'
      : viewRole === 'battalion'
        ? 'Battalion overview'
        : 'Battery overview'

  const totals = useMemo(
    () => ({
      bocs: bocs.length,
      pocs: pocs.length,
      launchers: launchers.length,
      availableRounds: pods.reduce(
        (sum, pod) => sum + pod.rounds.filter((r) => r.status === 'available').length,
        0
      ),
      totalRounds: pods.reduce((sum, pod) => sum + pod.rounds.length, 0),
    }),
    [bocs.length, pocs.length, launchers.length, pods]
  )

  const launchersByPoc = useMemo(() => {
    const m = new Map<string, Launcher[]>()
    for (const l of launchers) {
      if (!l.pocId) continue
      if (!m.has(l.pocId)) m.set(l.pocId, [])
      m.get(l.pocId)!.push(l)
    }
    return m
  }, [launchers])

  const podByLauncher = useMemo(() => {
    const m = new Map<string, Pod>()
    for (const pod of pods) {
      if (pod.launcherId) m.set(pod.launcherId, pod)
    }
    return m
  }, [pods])

  const rsvById = useMemo(() => {
    const m = new Map<string, RSV>()
    for (const rsv of rsvs) m.set(rsv.id, rsv)
    return m
  }, [rsvs])

  const summarizeRoundSummary = ({
    launcherList,
    pocIds,
    bocIds,
    battalionIds,
    brigadeIds,
  }: {
    launcherList: Launcher[]
    pocIds: Set<string>
    bocIds?: Set<string>
    battalionIds?: Set<string>
    brigadeIds?: Set<string>
  }): RoundSummary => {
    const loadedByTypeAvailable: Record<string, number> = {}
    const loadedByTypeTotal: Record<string, number> = {}
    const loadedPodsByType: Record<string, number> = {}
    const reserveByTypeAvailable: Record<string, number> = {}
    const reserveByTypeTotal: Record<string, number> = {}
    const reservePodsByType: Record<string, number> = {}
    let loadedAvailable = 0
    let loadedTotal = 0
    let reserveAvailable = 0
    let reserveTotal = 0

    const accumulate = (
      rounds: Pod['rounds'],
      targetAvailable: Record<string, number>,
      targetTotal: Record<string, number>
    ) => {
      for (const round of rounds) {
        targetTotal[round.type] = (targetTotal[round.type] ?? 0) + 1
        if (round.status === 'available') {
          targetAvailable[round.type] = (targetAvailable[round.type] ?? 0) + 1
        }
      }
    }

    for (const launcher of launcherList) {
      const pod = podByLauncher.get(launcher.id)
      if (!pod) continue
      loadedTotal += pod.rounds.length
      loadedAvailable += pod.rounds.filter((r) => r.status === 'available').length
      accumulate(pod.rounds, loadedByTypeAvailable, loadedByTypeTotal)
      const loadedPrimary = pod.rounds[0]?.type
      if (loadedPrimary) loadedPodsByType[loadedPrimary] = (loadedPodsByType[loadedPrimary] ?? 0) + 1
    }

    for (const pod of pods) {
      if (pod.launcherId) continue
      let inScope =
        (!!pod.pocId && pocIds.has(pod.pocId)) ||
        (!!pod.bocId && !!bocIds?.has(pod.bocId)) ||
        (!!pod.battalionId && !!battalionIds?.has(pod.battalionId)) ||
        (!!pod.brigadeId && !!brigadeIds?.has(pod.brigadeId))
      if (!inScope && pod.rsvId) {
        const rsv = rsvById.get(pod.rsvId)
        if (rsv) {
          inScope =
            (!!rsv.pocId && pocIds.has(rsv.pocId)) ||
            (!!rsv.bocId && !!bocIds?.has(rsv.bocId))
        }
      }
      if (!inScope) continue
      reserveTotal += pod.rounds.length
      reserveAvailable += pod.rounds.filter((r) => r.status === 'available').length
      accumulate(pod.rounds, reserveByTypeAvailable, reserveByTypeTotal)
      const reservePrimary = pod.rounds[0]?.type
      if (reservePrimary) reservePodsByType[reservePrimary] = (reservePodsByType[reservePrimary] ?? 0) + 1
    }

    return {
      loadedAvailable,
      loadedTotal,
      reserveAvailable,
      reserveTotal,
      loadedByTypeAvailable,
      loadedByTypeTotal,
      loadedPodsByType,
      reserveByTypeAvailable,
      reserveByTypeTotal,
      reservePodsByType,
    }
  }

  const summaryChipStyle: CSSProperties = {
    padding: '0.08rem 0.38rem',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-secondary)',
    fontSize: '0.66rem',
    lineHeight: 1.2,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  }

  const renderSummaryChips = (
    primary: string,
    loaded: string,
    reserve: string,
    tooltip: string,
    emphasizePrimary = false
  ) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: '0.22rem',
        maxWidth: '100%',
      }}
      title={tooltip}
    >
      <span
        style={{
          ...summaryChipStyle,
          color: emphasizePrimary ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: emphasizePrimary ? 600 : 500,
        }}
      >
        {primary}
      </span>
      <span style={summaryChipStyle}>Loaded: {loaded}</span>
      <span style={summaryChipStyle}>Reserve: {reserve}</span>
    </span>
  )

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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{launcher.name}</div>
          </div>
          <div style={{ minWidth: 0 }}>
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
              {total > 0 ? `${rt} · ${avail}/${total} rnds` : 'No pod loaded'}
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
      const pocLaunchers = launchersByPoc.get(poc.id) || []
      const nLaunch = pocLaunchers.length
      const pocRoundSummary = summarizeRoundSummary({
        launcherList: pocLaunchers,
        pocIds: new Set([poc.id]),
        bocIds: new Set([boc.id]),
      })
      const pocRoundTooltip = `Loaded by type: ${formatByTypeSummary(
        pocRoundSummary.loadedByTypeAvailable,
        pocRoundSummary.loadedByTypeTotal
      )} | Reload reserve by type: ${formatByTypeSummary(
        pocRoundSummary.reserveByTypeAvailable,
        pocRoundSummary.reserveByTypeTotal
      )}`
      return (
        <div key={poc.id} style={{ marginBottom: '0.35rem' }}>
          <button type="button" onClick={() => toggle(key)} style={{ ...branchBtn, paddingLeft: '1.25rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span>{poc.name}</span>
            </span>
            {renderSummaryChips(
              `${nLaunch} HIMARS`,
              formatTypePodRoundSummaryCompact(pocRoundSummary.loadedPodsByType, pocRoundSummary.loadedByTypeAvailable),
              formatTypePodRoundSummaryCompact(pocRoundSummary.reservePodsByType, pocRoundSummary.reserveByTypeAvailable),
              pocRoundTooltip,
              true
            )}
          </button>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
              <div
                style={{
                  marginLeft: '1.25rem',
                  padding: '0.2rem 0.75rem',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 0.85fr) minmax(220px, 1.4fr) minmax(110px, auto)',
                  gap: '0.5rem',
                  fontSize: '0.66rem',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                <span>Launcher</span>
                <span>Task / status</span>
                <span style={{ textAlign: 'right' }}>Ammo</span>
              </div>
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
    const bocPocs = pocsByBoc.get(boc.id) || []
    const nPoc = bocPocs.length
    const bocLaunchers = bocPocs.flatMap((poc) => launchersByPoc.get(poc.id) || [])
    const nL = bocLaunchers.length
    const bocRoundSummary = summarizeRoundSummary({
      launcherList: bocLaunchers,
      pocIds: new Set(bocPocs.map((p) => p.id)),
      bocIds: new Set([boc.id]),
    })
    const bocRoundTooltip = `Loaded by type: ${formatByTypeSummary(
      bocRoundSummary.loadedByTypeAvailable,
      bocRoundSummary.loadedByTypeTotal
    )} | Reload reserve by type: ${formatByTypeSummary(
      bocRoundSummary.reserveByTypeAvailable,
      bocRoundSummary.reserveByTypeTotal
    )}`
    return (
      <div key={boc.id} style={{ marginBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={() => toggle(key)}
          style={{ ...branchBtn, paddingLeft: `${depthPad}px` }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span>{boc.name}</span>
          </span>
          {renderSummaryChips(
            `${nPoc} PLT · ${nL} HIMARS`,
            formatTypePodRoundSummaryCompact(bocRoundSummary.loadedPodsByType, bocRoundSummary.loadedByTypeAvailable),
            formatTypePodRoundSummaryCompact(bocRoundSummary.reservePodsByType, bocRoundSummary.reserveByTypeAvailable),
            bocRoundTooltip
          )}
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
      const bnPocs = bocList.flatMap((boc) => pocsByBoc.get(boc.id) || [])
      const bnLaunchers = bnPocs.flatMap((poc) => launchersByPoc.get(poc.id) || [])
      const bnRoundSummary = summarizeRoundSummary({
        launcherList: bnLaunchers,
        pocIds: new Set(bnPocs.map((p) => p.id)),
        bocIds: new Set(bocList.map((b) => b.id)),
        battalionIds: new Set([bn.id]),
      })
      const bnRoundTooltip = `Loaded by type: ${formatByTypeSummary(
        bnRoundSummary.loadedByTypeAvailable,
        bnRoundSummary.loadedByTypeTotal
      )} | Reload reserve by type: ${formatByTypeSummary(
        bnRoundSummary.reserveByTypeAvailable,
        bnRoundSummary.reserveByTypeTotal
      )}`
      sections.push(
        <div key={bn.id} style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(bk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {isOpen(bk) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span>{bn.name}</span>
            </span>
            {renderSummaryChips(
              `${bocList.length} BOC · ${bnLaunchers.length} HIMARS`,
              formatTypePodRoundSummaryCompact(bnRoundSummary.loadedPodsByType, bnRoundSummary.loadedByTypeAvailable),
              formatTypePodRoundSummaryCompact(bnRoundSummary.reservePodsByType, bnRoundSummary.reserveByTypeAvailable),
              bnRoundTooltip
            )}
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
      const bgBocs = bns.flatMap((bn) => bocsByBattalion.map.get(bn.id) || [])
      const bgPocs = bgBocs.flatMap((boc) => pocsByBoc.get(boc.id) || [])
      const bgLaunchers = bgPocs.flatMap((poc) => launchersByPoc.get(poc.id) || [])
      const bgRoundSummary = summarizeRoundSummary({
        launcherList: bgLaunchers,
        pocIds: new Set(bgPocs.map((p) => p.id)),
        bocIds: new Set(bgBocs.map((b) => b.id)),
        battalionIds: new Set(bns.map((bn) => bn.id)),
        brigadeIds: new Set([bg.id]),
      })
      const bgRoundTooltip = `Loaded by type: ${formatByTypeSummary(
        bgRoundSummary.loadedByTypeAvailable,
        bgRoundSummary.loadedByTypeTotal
      )} | Reload reserve by type: ${formatByTypeSummary(
        bgRoundSummary.reserveByTypeAvailable,
        bgRoundSummary.reserveByTypeTotal
      )}`
      sections.push(
        <div key={bg.id} style={{ marginBottom: '0.65rem' }}>
          <button type="button" onClick={() => toggle(gk)} style={{ ...branchBtn, paddingLeft: '0.25rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {isOpen(gk) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <span>{bg.name}</span>
            </span>
            {renderSummaryChips(
              `${bns.length} BN · ${bgLaunchers.length} HIMARS`,
              formatTypePodRoundSummaryCompact(bgRoundSummary.loadedPodsByType, bgRoundSummary.loadedByTypeAvailable),
              formatTypePodRoundSummaryCompact(bgRoundSummary.reservePodsByType, bgRoundSummary.reserveByTypeAvailable),
              bgRoundTooltip
            )}
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {isOpen(bk) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>{bn.name}</span>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {bocList.length} BOC
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
        overflowX: 'hidden',
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
          marginBottom: '0.65rem',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.45rem' }}>
          BOCs: {totals.bocs}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.45rem' }}>
          PLTs: {totals.pocs}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.45rem' }}>
          HIMARS: {totals.launchers}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.45rem' }}>
          Rounds: {formatRoundPair(totals.availableRounds, totals.totalRounds)}
        </span>
      </div>
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
