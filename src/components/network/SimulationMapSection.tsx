import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CollapsibleCard } from './CollapsibleCard'
import { useAppData } from '../../context/AppDataContext'
import { DEFAULT_SIM_RANGE_FAN_CONFIG } from '../../simulation/rangeFanProfiles'
import type { SimRangeFanConfig, SimRoundRangeProfile, SimUnitState } from '../../types'

type RoleFilter = 'lineUnit' | 'opsNode' | 'fdcNode' | 'supportUnit' | 'enemyUnit'
const FORT_BRAGG_CENTER: [number, number] = [35.1415, -79.009]
const DEFAULT_ZOOM = 12
const DISPLAY_PREFS_LS_KEY = 'fdc.sim.displayPrefs.v1'

/**
 * Implements color for role for this module.
 */
function colorForRole(role: SimUnitState['unitRole']): string {
  if (role === 'lineUnit') return '#2f81f7'
  if (role === 'fdcNode') return '#f0883e'
  if (role === 'supportUnit') return '#9a6700'
  if (role === 'enemyUnit') return '#cf222e'
  return '#2ea043'
}

/**
 * Implements symbol for role for this module.
 */
function symbolForRole(role: SimUnitState['unitRole']): string {
  if (role === 'lineUnit') return 'LN'
  if (role === 'fdcNode') return 'FD'
  if (role === 'opsNode') return 'OP'
  if (role === 'supportUnit') return 'SP'
  return 'EN'
}

/**
 * Implements stroke for damage for this module.
 */
function strokeForDamage(level: SimUnitState['destructionLevel'], role: SimUnitState['unitRole']): string {
  if (level === 'destroyed' || level === 'struck_off') return '#000000'
  if (level === 'degraded') return '#bf8700'
  return colorForRole(role)
}

/**
 * Implements hash to unit for this module.
 */
function hashToUnit(v: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < v.length; i += 1) {
    h ^= v.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // --- Render ---
  return (h >>> 0) / 4294967295
}

/**
 * Implements point from grid for this module.
 */
function pointFromGrid(u: SimUnitState): { x: number; y: number } {
  const src = u.mgrsGrid || u.displayGrid || u.entityRef
  // Use the last two numeric chunks (MGRS easting/northing) to avoid
  // accidentally treating zone numbers as map coordinates.
  const nums = src.match(/\d{2,5}/g)
  if (nums && nums.length >= 2) {
    const e = Number(nums[nums.length - 2])
    const n = Number(nums[nums.length - 1])
    const x = ((e % 100000) / 100000) * 100
    const y = 100 - ((n % 100000) / 100000) * 100
    return { x, y }
  }
  const x = 5 + hashToUnit(`${src}:x`) * 90
  const y = 5 + hashToUnit(`${src}:y`) * 90
  return { x, y }
}

/**
 * Implements lat lng from grid for this module.
 */
function latLngFromGrid(u: SimUnitState): [number, number] {
  const pt = pointFromGrid(u)
  // Map 0..100 pseudo-grid into roughly a 15km x 15km box around Fort Bragg.
  const lat = FORT_BRAGG_CENTER[0] + (pt.y - 50) * 0.00135
  const lng = FORT_BRAGG_CENTER[1] + (pt.x - 50) * 0.00165
  return [lat, lng]
}

/**
 * Implements marker icon for unit for this module.
 */
function markerIconForUnit(u: SimUnitState) {
  const color = colorForRole(u.unitRole)
  const border = strokeForDamage(u.destructionLevel, u.unitRole)
  const symbol = symbolForRole(u.unitRole)
  return divIcon({
    className: 'sim-map-divicon',
    html: `<div style="
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: ${color};
      color: white;
      border: 2px solid ${border};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0,0,0,.45);
      ">${symbol}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  })
}

/**
 * Renders the Simulation Map Section UI section.
 */
export function SimulationMapSection({ isMobile }: { isMobile: boolean }) {
  const { simulationOverlay } = useAppData()
  const [showRangeFans, setShowRangeFans] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DISPLAY_PREFS_LS_KEY)
      if (!raw) return false
      return JSON.parse(raw).showRangeFans ?? false
    } catch {
      return false
    }
  })
  const [showRangeFanLabels, setShowRangeFanLabels] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DISPLAY_PREFS_LS_KEY)
      if (!raw) return true
      return JSON.parse(raw).showRangeFanLabels ?? true
    } catch {
      return true
    }
  })
  const [showUnitList, setShowUnitList] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DISPLAY_PREFS_LS_KEY)
      if (!raw) return true
      return JSON.parse(raw).showUnitList ?? true
    } catch {
      return true
    }
  })
  const [showTooltips, setShowTooltips] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DISPLAY_PREFS_LS_KEY)
      if (!raw) return true
      return JSON.parse(raw).showTooltips ?? true
    } catch {
      return true
    }
  })
  const [filters, setFilters] = useState<Record<RoleFilter, boolean>>({
    lineUnit: true,
    opsNode: true,
    fdcNode: true,
    supportUnit: true,
    enemyUnit: true,
  })
  const [roundProfileEnabled, setRoundProfileEnabled] = useState<Record<string, boolean>>({})

  // --- Side effects ---
  useEffect(() => {
    try {
      localStorage.setItem(
        DISPLAY_PREFS_LS_KEY,
        JSON.stringify({
          showRangeFans,
          showRangeFanLabels,
          showUnitList,
          showTooltips,
        })
      )
    } catch {
      // ignore storage failures
    }
  }, [showRangeFans, showRangeFanLabels, showUnitList, showTooltips])

  const units = useMemo(() => {
    const raw = simulationOverlay?.unitStates ?? []
    return raw.filter((u) => filters[u.unitRole])
  }, [filters, simulationOverlay?.unitStates])

  const rangeFanConfig = useMemo<SimRangeFanConfig>(
    () => simulationOverlay?.rangeFanConfig ?? DEFAULT_SIM_RANGE_FAN_CONFIG,
    [simulationOverlay?.rangeFanConfig]
  )
  const roundProfiles = useMemo<SimRoundRangeProfile[]>(
    () => rangeFanConfig.profiles ?? DEFAULT_SIM_RANGE_FAN_CONFIG.profiles,
    [rangeFanConfig.profiles]
  )

  useEffect(() => {
    setRoundProfileEnabled((prev) => {
      const next: Record<string, boolean> = {}
      for (const p of roundProfiles) {
        next[p.roundType] = prev[p.roundType] ?? true
      }
      return next
    })
  }, [roundProfiles])

  const launcherUnits = useMemo(() => units.filter((u) => u.entityRef.startsWith('launcher:')), [units])

  return (
    <CollapsibleCard
      title="Simulation map"
      defaultOpen
      description={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem' }}>Live positions from simulation overlay</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
            <input type="checkbox" checked={showRangeFans} onChange={(e) => setShowRangeFans(e.target.checked)} />
            range fans
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
            <input
              type="checkbox"
              checked={showRangeFanLabels}
              onChange={(e) => setShowRangeFanLabels(e.target.checked)}
              disabled={!showRangeFans}
            />
            fan labels
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
            <input type="checkbox" checked={showTooltips} onChange={(e) => setShowTooltips(e.target.checked)} />
            tooltips
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
            <input type="checkbox" checked={showUnitList} onChange={(e) => setShowUnitList(e.target.checked)} />
            unit list
          </label>
          {(['lineUnit', 'fdcNode', 'opsNode', 'supportUnit', 'enemyUnit'] as RoleFilter[]).map((role) => (
            <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
              <input
                type="checkbox"
                checked={filters[role]}
                onChange={(e) => setFilters((prev) => ({ ...prev, [role]: e.target.checked }))}
              />
              <span
                style={{
                  display: 'inline-flex',
                  minWidth: 20,
                  justifyContent: 'center',
                  padding: '0 4px',
                  borderRadius: 6,
                  fontWeight: 700,
                  color: '#fff',
                  background: colorForRole(role),
                }}
              >
                {symbolForRole(role)}
              </span>
              {role}
            </label>
          ))}
          {roundProfiles.map((profile) => (
            <label
              key={`rf-${profile.roundType}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}
              title={`${profile.roundType} max ${profile.maxRangeKm} km`}
            >
              <input
                type="checkbox"
                checked={roundProfileEnabled[profile.roundType] ?? true}
                disabled={!showRangeFans}
                onChange={(e) =>
                  setRoundProfileEnabled((prev) => ({ ...prev, [profile.roundType]: e.target.checked }))
                }
              />
              <span
                style={{
                  display: 'inline-flex',
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: profile.color ?? '#4e8ef7',
                }}
              />
              {profile.roundType}
            </label>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            units: {units.length}
          </span>
        </div>
      }
    >
      {units.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          No simulation unit positions yet. Connect simulator and wait for feed.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : showUnitList ? '1fr 280px' : '1fr',
            gap: '0.7rem',
          }}
        >
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--bg-primary)',
              padding: '0',
              minHeight: isMobile ? 260 : 420,
              overflow: 'hidden',
            }}
          >
            <MapContainer
              center={FORT_BRAGG_CENTER}
              zoom={DEFAULT_ZOOM}
              scrollWheelZoom
              style={{ width: '100%', height: isMobile ? 260 : 420 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {showRangeFans &&
                launcherUnits.map((u) => {
                  const pos = latLngFromGrid(u)
                  return roundProfiles
                    .filter((p) => roundProfileEnabled[p.roundType] ?? true)
                    .map((p) => (
                      <Circle
                        key={`fan-${u.entityRef}-${p.roundType}`}
                        center={pos}
                        radius={Math.max(0, p.maxRangeKm) * 1000}
                        pathOptions={{
                          color: p.color ?? '#4e8ef7',
                          weight: 1,
                          fillOpacity: 0.03,
                          opacity: 0.6,
                        }}
                      >
                        {showRangeFanLabels && (
                          <Tooltip direction="center" permanent={false} opacity={0.9}>
                            {(p.label ?? p.roundType) + ` � ${p.maxRangeKm}km`}
                          </Tooltip>
                        )}
                      </Circle>
                    ))
                })}
              {units.map((u) => {
                const pos = latLngFromGrid(u)
                return (
                  <Marker
                    key={u.entityRef}
                    position={pos}
                    icon={markerIconForUnit(u)}
                  >
                    {showTooltips && (
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent={false}>
                        {u.entityRef}
                      </Tooltip>
                    )}
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div><strong>{u.entityRef}</strong></div>
                        <div>role: {u.unitRole}</div>
                        <div>status: {u.destructionLevel}</div>
                        <div>grid: {u.displayGrid || u.mgrsGrid || 'n/a'}</div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          </div>

          {showUnitList && (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: 'var(--bg-primary)',
                padding: '0.55rem',
                maxHeight: isMobile ? 220 : 420,
                overflow: 'auto',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.45rem' }}>Live units</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {units.map((u) => (
                  <div key={`${u.entityRef}-row`} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <code style={{ fontSize: '0.74rem' }}>
                        {symbolForRole(u.unitRole)} {u.entityRef}
                      </code>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{u.unitRole}</span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                      {u.displayGrid || u.mgrsGrid || 'No grid'} | {u.destructionLevel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  )
}
