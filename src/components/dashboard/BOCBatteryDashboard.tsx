import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { ChevronDown, ChevronRight, Package, ExternalLink } from 'lucide-react'
import AmmoPltCard from '../AmmoPltCard'
import { useAppData } from '../../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../../constants/roundTypes'
import { getLauncherTaskSummary } from '../../utils/launcherTaskSummary'
import type { AmmoPlatoon, BOC, Launcher, Pod, POC, RSV, Task } from '../../types'

const MAX_RND = 6
const DOT = 7

function launcherRoundDots(pod?: Pod) {
  const available = pod?.rounds.filter((r) => r.status === 'available').length ?? 0
  const used = pod?.rounds.filter((r) => r.status === 'used').length ?? 0
  const reserved = pod?.rounds.filter((r) => r.status === 'reserved').length ?? 0
  const seq: Array<'avail' | 'used' | 'res' | 'empty'> = []
  for (let i = 0; i < available; i++) seq.push('avail')
  for (let i = 0; i < used; i++) seq.push('used')
  for (let i = 0; i < reserved; i++) seq.push('res')
  while (seq.length < MAX_RND) seq.push('empty')
  return seq.slice(0, MAX_RND).map((k, i) => {
    let bg = 'var(--bg-primary)'
    let border = 'var(--border)'
    if (k === 'avail') {
      bg = 'var(--success)'
      border = 'var(--success)'
    } else if (k === 'used') {
      bg = 'var(--danger)'
      border = 'var(--danger)'
    } else if (k === 'res') {
      bg = 'var(--text-primary)'
      border = 'var(--text-primary)'
    }
    return (
      <div
        key={i}
        style={{
          width: DOT,
          height: DOT,
          borderRadius: '50%',
          backgroundColor: bg,
          border: `1.5px solid ${border}`,
          flexShrink: 0,
        }}
      />
    )
  })
}

interface BOCBatteryDashboardProps {
  boc: BOC
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  tasks: Task[]
  ammoPltsWithContent: AmmoPlatoon[]
  onPocDetail: (pocId: string) => void
  onLauncherClick: (launcherId: string) => void
  onAmmoPltClick: (ammoPltId: string) => void
}

function sectionHeaderButtonStyle(open: boolean): CSSProperties {
  return {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.65rem 0.75rem',
    backgroundColor: open ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: 600,
  }
}

function CompactPocPltBlock({
  poc,
  launchers,
  pods,
  rsvs,
  tasks,
  roundTypeOptions,
  onPocDetail,
  onLauncherClick,
}: {
  poc: POC
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  tasks: Task[]
  roundTypeOptions: ReturnType<typeof getEnabledRoundTypeOptions>
  onPocDetail: (id: string) => void
  onLauncherClick: (launcherId: string) => void
}) {
  const pocLaunchers = useMemo(() => launchers.filter((l) => l.pocId === poc.id), [launchers, poc.id])

  const podsOnRSVs = useMemo(() => {
    return pods.filter((p) => {
      if (p.launcherId) return false
      if (p.pocId === poc.id) return true
      if (!p.rsvId) return false
      const rsv = rsvs.find((r) => r.id === p.rsvId)
      if (!rsv) return false
      if (rsv.pocId === poc.id) return true
      if (rsv.bocId === poc.bocId) return true
      return false
    })
  }, [pods, poc.id, poc.bocId, rsvs])

  const { podsByRoundTypeCounts, availableRoundsByType } = useMemo(() => {
    const pc: Record<string, number> = {}
    const rnds: Record<string, number> = {}
    for (const opt of roundTypeOptions) {
      pc[opt.value] = 0
      rnds[opt.value] = 0
    }
    for (const pod of podsOnRSVs) {
      const primary = pod.rounds[0]?.type
      if (primary) pc[primary] = (pc[primary] ?? 0) + 1
      for (const round of pod.rounds) {
        if (round.status === 'available') {
          rnds[round.type] = (rnds[round.type] ?? 0) + 1
        }
      }
    }
    return { podsByRoundTypeCounts: pc, availableRoundsByType: rnds }
  }, [podsOnRSVs, roundTypeOptions])

  const hasStockStrip = useMemo(
    () => Object.keys(podsByRoundTypeCounts).some((k) => (podsByRoundTypeCounts[k] ?? 0) > 0 || (availableRoundsByType[k] ?? 0) > 0),
    [podsByRoundTypeCounts, availableRoundsByType]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {hasStockStrip && (
        <div
          style={{
            padding: '0.4rem 0.5rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            RSV / battery stock (pods · avail rnds)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {roundTypeOptions.map((option) => {
              const pcount = podsByRoundTypeCounts[option.value] ?? 0
              const rcount = availableRoundsByType[option.value] ?? 0
              if (pcount === 0 && rcount === 0) return null
              return (
                <span
                  key={option.value}
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.12rem 0.3rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                  }}
                >
                  {option.label}: {pcount}p · {rcount}r
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {pocLaunchers.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No launchers
          </p>
        ) : (
          pocLaunchers.map((launcher) => {
            const pod = pods.find((p) => p.launcherId === launcher.id)
            const summary = getLauncherTaskSummary(launcher, tasks)
            const rt = pod?.rounds[0]?.type ?? '—'
            return (
              <button
                key={launcher.id}
                type="button"
                onClick={() => onLauncherClick(launcher.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  width: '100%',
                  padding: '0.3rem 0.4rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  minWidth: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{launcher.name}</div>
                  <div
                    style={{
                      fontSize: '0.62rem',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={summary}
                  >
                    {summary}
                  </div>
                </div>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {rt}
                </span>
                <div style={{ display: 'flex', gap: '0.18rem', alignItems: 'center', flexShrink: 0 }}>
                  {launcherRoundDots(pod)}
                </div>
              </button>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => onPocDetail(poc.id)}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          marginTop: '0.15rem',
          padding: '0.25rem 0.45rem',
          fontSize: '0.72rem',
          color: 'var(--accent)',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        <ExternalLink size={12} />
        Full PLT details
      </button>
    </div>
  )
}

export default function BOCBatteryDashboard({
  boc,
  pocs,
  launchers,
  pods,
  rsvs,
  tasks,
  ammoPltsWithContent,
  onPocDetail,
  onLauncherClick,
  onAmmoPltClick,
}: BOCBatteryDashboardProps) {
  const { roundTypes } = useAppData()
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])
  const sortedPocs = useMemo(() => [...pocs].sort((a, b) => a.name.localeCompare(b.name)), [pocs])

  const [openPoc, setOpenPoc] = useState<Record<string, boolean>>({})
  const [openAmmo, setOpenAmmo] = useState(true)

  useEffect(() => {
    setOpenPoc((prev) => {
      const next: Record<string, boolean> = {}
      sortedPocs.forEach((p, i) => {
        next[p.id] = prev[p.id] ?? i < 2
      })
      return next
    })
  }, [boc.id, sortedPocs])

  const launcherCountForPoc = (pocId: string) => launchers.filter((l) => l.pocId === pocId).length

  return (
    <div
      data-guide="boc-battery-dashboard"
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--accent)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)' }}>{boc.name}</h2>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Expand each PLT or logistics section. Compact launcher rows: green / red / dark dots = available / used /
          reserved.
        </p>
      </div>

      {sortedPocs.map((poc) => {
        const open = openPoc[poc.id] ?? true
        const n = launcherCountForPoc(poc.id)
        return (
          <div
            key={poc.id}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.5rem',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenPoc((s) => ({ ...s, [poc.id]: !open }))}
              style={sectionHeaderButtonStyle(open)}
              aria-expanded={open}
            >
              {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <span>{poc.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {n} launcher{n !== 1 ? 's' : ''}
              </span>
            </button>
            {open && (
              <div style={{ padding: '0.65rem 0.35rem 0.35rem' }} onClick={(e) => e.stopPropagation()}>
                <CompactPocPltBlock
                  poc={poc}
                  launchers={launchers}
                  pods={pods}
                  rsvs={rsvs}
                  tasks={tasks}
                  roundTypeOptions={roundTypeOptions}
                  onPocDetail={onPocDetail}
                  onLauncherClick={onLauncherClick}
                />
              </div>
            )}
          </div>
        )
      })}

      {ammoPltsWithContent.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.5rem',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={() => setOpenAmmo((v) => !v)}
            style={sectionHeaderButtonStyle(openAmmo)}
            aria-expanded={openAmmo}
          >
            {openAmmo ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <Package size={18} style={{ flexShrink: 0, opacity: 0.85 }} />
            <span>Logistics — Ammo platoons</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {ammoPltsWithContent.length} plt{ammoPltsWithContent.length !== 1 ? 's' : ''}
            </span>
          </button>
          {openAmmo && (
            <div
              style={{
                padding: '0.75rem 0.35rem 0.35rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
                gap: '0.75rem',
              }}
            >
              {ammoPltsWithContent.map((ap) => (
                <AmmoPltCard
                  key={ap.id}
                  ammoPlatoon={ap}
                  pods={pods}
                  rsvs={rsvs}
                  onClick={() => onAmmoPltClick(ap.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
