/**
 * FDC Simulator ? standalone Node process (separate from FDCTrackingApp UI).
 * WebSocket JSON protocol v1; see ../src/simulation/contracts.ts.
 *
 * Emits moving unit states for all known entity refs from connected clients.
 * Includes simplified HIMARS-like auto fire/reload behavior and OPFOR movement.
 */
import { WebSocketServer } from 'ws'
import { createServer } from 'node:http'

const PORT = Number(process.env.FDC_SIM_PORT || 8765)
const HTTP_PORT = Number(process.env.FDC_SIM_HTTP_PORT || 8766)
const SIM_APP_VERSION = '0.1.0'
const PROTOCOL_VERSION = 1
const TICK_MS = 1500
const ENEMY_COUNT = 8
// Tuned for behavior:
// - fire mission cycle ~30s
// - reload cycle ~80s
// - maintenance repair ~60s
const FIRE_MISSION_SECONDS = 30
const RELOAD_SECONDS = 80
const REPAIR_SECONDS = 60
const LINE_FIRE_COOLDOWN_TICKS = Math.max(1, Math.round((FIRE_MISSION_SECONDS * 1000) / TICK_MS))
const LINE_RELOAD_TICKS = Math.max(1, Math.round((RELOAD_SECONDS * 1000) / TICK_MS))
const FRIENDLY_REPAIR_TICKS = Math.max(1, Math.round((REPAIR_SECONDS * 1000) / TICK_MS))
const LINE_HIT_PROBABILITY = 0.34
const ENEMY_COUNTERFIRE_HIT_PROBABILITY = 0.18
const ENEMY_HITPOINTS = 2
const ENEMY_DEGRADE_AT_HP = 1
const SIM_MISSION_ACTIVE_TICKS = LINE_FIRE_COOLDOWN_TICKS
const SIM_RELOAD_TASK_NAME = 'SIM Reload'
const SIM_REPAIR_TASK_NAME = 'SIM Maintenance'
const SIM_FIRE_DURATION_SECONDS = FIRE_MISSION_SECONDS
const SIM_RELOAD_DURATION_SECONDS = RELOAD_SECONDS
const SIM_REPAIR_DURATION_SECONDS = REPAIR_SECONDS
const SIM_BOX_KM = 15
// Approximate default ranges for built-in round labels:
// M26: up to ~32 km, M30/M31 GMLRS: up to ~84 km.
// We clamp these against the local map box so OPFOR starts farther away
// while remaining in-range for the simulator's default ammunition set.
const DEFAULT_ROUND_MAX_RANGE_KM = {
  M26: 32,
  M30: 84,
  M31: 84,
}
const RANGE_FAN_PROFILES = [
  { roundType: 'M26', minRangeKm: 10, maxRangeKm: 32, label: 'M26', color: '#f4b400' },
  { roundType: 'M30', minRangeKm: 15, maxRangeKm: 84, label: 'M30 GMLRS', color: '#4e8ef7' },
  { roundType: 'M31', minRangeKm: 15, maxRangeKm: 84, label: 'M31 GMLRS', color: '#2ea043' },
]
const MAX_DEFAULT_ROUND_RANGE_KM = Math.max(...Object.values(DEFAULT_ROUND_MAX_RANGE_KM))
const ENEMY_MIN_STANDOFF_NORM = Math.min(0.68, Math.max(0.28, (MAX_DEFAULT_ROUND_RANGE_KM / SIM_BOX_KM) * 0.12))
const ENEMY_REPOSITION_STANDOFF_NORM = Math.max(0.22, ENEMY_MIN_STANDOFF_NORM - 0.08)

let seq = 0
/** @type {'running'|'paused'|'stopped'} */
let simMode = 'running'
let lastScenarioId = 'default'
let enemySpawnEpoch = Date.now()
/** @type {{ x: number, y: number }[]} */
let enemyClusterAnchors = []
/**
 * Implements next seq for this module.
 */
function nextSeq() {
  seq += 1
  return seq
}

/** @type {Map<string, { orgEntityRef: string, scenarioId: string, stationInstanceId: string, knownEntityRefs: string[], knownPodOwners: { podRef: string, supportRef: string }[], ws: import('ws') }>} */
const participants = new Map()
/** @type {Record<string, { scopeId: string, mode: 'auto'|'human'|'hybrid', heldBy: string, leaseExpiresAt?: string }>} */
const globalControlScopes = Object.create(null)
/** @type {Map<string, string>} */
const podOwnerOverrides = new Map()
/** @type {Map<string, { x: number, y: number, vx: number, vy: number, unitRole: 'lineUnit'|'opsNode'|'fdcNode'|'supportUnit'|'enemyUnit', destructionLevel: 'intact'|'degraded'|'destroyed'|'struck_off', ammo: number, maxAmmo: number, cooldownTicks: number, reloadTicks: number, podsAvailable: number, missionTicks: number, missionCount: number, activeMissionId: string | null, activeMissionTarget: string | null, activeMissionTargetGrid: string | null, activeMissionStartedAt: string | null, activeMissionRounds: number, reloadCount: number, activeReloadId: string | null, activeReloadStartedAt: string | null, repairTicks: number, maintenanceCount: number, activeMaintenanceId: string | null, activeMaintenanceStartedAt: string | null, hitPoints: number }>} */
const simDynamics = new Map()

/**
 * Implements role from entity ref for this module.
 */
function roleFromEntityRef(ref) {
  if (ref.startsWith('poc:') || ref.startsWith('launcher:')) return 'lineUnit'
  if (ref.startsWith('boc:')) return 'fdcNode'
  if (ref.startsWith('rsv:') || ref.startsWith('pod:') || ref.startsWith('ammo-plt:')) return 'supportUnit'
  if (ref.startsWith('enemy:')) return 'enemyUnit'
  return 'opsNode'
}

/**
 * Determines whether is launcher ref is true in the current context.
 */
function isLauncherRef(ref) {
  return ref.startsWith('launcher:')
}

/**
 * Determines whether has pod supply ref is true in the current context.
 */
function hasPodSupplyRef(ref) {
  return ref.startsWith('rsv:') || ref.startsWith('ammo-plt:') || ref.startsWith('poc:')
}

/**
 * Implements seeded number for this module.
 */
function seededNumber(seed) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // --- Render ---
  return (h >>> 0) / 4294967295
}

/**
 * Implements clamp for this module.
 */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Implements ref id for this module.
 */
function refId(ref) {
  const i = ref.indexOf(':')
  return i >= 0 ? ref.slice(i + 1) : ref
}

/**
 * Implements carrier id from pod ref for this module.
 */
function carrierIdFromPodRef(ref) {
  if (!ref.startsWith('pod:')) return null
  const id = refId(ref)
  const m = /^(.*)-pod-\d+$/.exec(id)
  return m?.[1] ?? null
}

/**
 * Implements support owner for pod ref for this module.
 */
function supportOwnerForPodRef(ref) {
  const override = podOwnerOverrides.get(ref)
  if (override) return override
  const carrier = carrierIdFromPodRef(ref)
  if (!carrier) return null
  // Launcher-mounted pods are not reserve stock.
  if (carrier.includes('-ln-')) return null
  if (carrier.startsWith('poc-')) return `poc:${carrier}`
  if (carrier.includes('-rsv-')) return `rsv:${carrier}`
  if (carrier.startsWith('ammo-plt-')) return `ammo-plt:${carrier}`
  return null
}

/**
 * Implements refresh pod owner overrides for this module.
 */
function refreshPodOwnerOverrides() {
  podOwnerOverrides.clear()
  for (const p of participants.values()) {
    for (const it of p.knownPodOwners ?? []) {
      if (!it?.podRef || !it?.supportRef) continue
      if (!it.podRef.startsWith('pod:')) continue
      if (!(it.supportRef.startsWith('rsv:') || it.supportRef.startsWith('ammo-plt:') || it.supportRef.startsWith('poc:'))) continue
      podOwnerOverrides.set(it.podRef, it.supportRef)
    }
  }
}

/**
 * Implements anchor for poc id for this module.
 */
function anchorForPocId(pocId) {
  // Keep POCs behind launchers while still spread around center-left.
  const a = seededNumber(`poc:${pocId}:a`) * Math.PI * 2
  const r = 0.1 + seededNumber(`poc:${pocId}:r`) * 0.08
  const cx = 0.42
  const cy = 0.5
  return {
    x: clamp(cx + Math.cos(a) * r, 0.28, 0.58),
    y: clamp(cy + Math.sin(a) * r, 0.08, 0.92),
  }
}

/**
 * Implements point around for this module.
 */
function pointAround(base, seed, minR, maxR) {
  const angle = seededNumber(`${seed}:a`) * Math.PI * 2
  const r = minR + seededNumber(`${seed}:r`) * Math.max(0, maxR - minR)
  return {
    x: clamp(base.x + Math.cos(angle) * r, 0.08, 0.58),
    y: clamp(base.y + Math.sin(angle) * r, 0.06, 0.94),
  }
}

/**
 * Implements try poc id from carrier id for this module.
 */
function tryPocIdFromCarrierId(carrierId) {
  if (!carrierId) return null
  const ln = /(.*)-ln-\d+$/.exec(carrierId)
  if (ln && ln[1]?.startsWith('poc-')) return ln[1]
  const rsv = /(.*)-rsv-\d+$/.exec(carrierId)
  if (rsv && rsv[1]?.startsWith('poc-')) return rsv[1]
  return null
}

/**
 * Implements parent poc id from ref for this module.
 */
function parentPocIdFromRef(ref) {
  const id = refId(ref)
  if (ref.startsWith('poc:')) return id
  if (ref.startsWith('launcher:')) return tryPocIdFromCarrierId(id)
  if (ref.startsWith('rsv:')) return tryPocIdFromCarrierId(id)
  if (ref.startsWith('pod:')) {
    const carrier = /^(.*)-pod-\d+$/.exec(id)?.[1] ?? ''
    return tryPocIdFromCarrierId(carrier)
  }
  return null
}

/**
 * Implements pick friendly spawn point for this module.
 */
function pickFriendlySpawnPoint(ref) {
  const pocId = parentPocIdFromRef(ref)
  if (pocId) {
    const anchor = anchorForPocId(pocId)
    // POCs sit behind launchers; support stays nearby but not too close.
    if (ref.startsWith('poc:')) return pointAround(anchor, `${ref}:poc`, 0.012, 0.03)
    if (ref.startsWith('launcher:')) {
      const ahead = { x: clamp(anchor.x + 0.08, 0.34, 0.72), y: anchor.y }
      return pointAround(ahead, `${ref}:ln`, 0.02, 0.06)
    }
    if (ref.startsWith('rsv:')) {
      const support = { x: clamp(anchor.x + 0.04, 0.3, 0.64), y: anchor.y }
      return pointAround(support, `${ref}:rsv`, 0.025, 0.065)
    }
    if (ref.startsWith('pod:')) {
      const support = { x: clamp(anchor.x + 0.045, 0.3, 0.66), y: anchor.y }
      return pointAround(support, `${ref}:pod`, 0.03, 0.07)
    }
    return pointAround(anchor, `${ref}:gen`, 0.03, 0.08)
  }

  if (ref.startsWith('brigade:')) {
    return { x: 0.1 + seededNumber(`${ref}:fx`) * 0.1, y: 0.14 + seededNumber(`${ref}:fy`) * 0.72 }
  }
  if (ref.startsWith('battalion:')) {
    return { x: 0.2 + seededNumber(`${ref}:fx`) * 0.1, y: 0.14 + seededNumber(`${ref}:fy`) * 0.72 }
  }
  if (ref.startsWith('boc:')) {
    return { x: 0.3 + seededNumber(`${ref}:fx`) * 0.1, y: 0.12 + seededNumber(`${ref}:fy`) * 0.76 }
  }
  if (ref.startsWith('ammo-plt:')) {
    return { x: 0.34 + seededNumber(`${ref}:fx`) * 0.1, y: 0.18 + seededNumber(`${ref}:fy`) * 0.68 }
  }
  if (ref.startsWith('ops:')) {
    return { x: 0.36 + seededNumber(`${ref}:fx`) * 0.12, y: 0.14 + seededNumber(`${ref}:fy`) * 0.72 }
  }
  // Fallback for non-POC-tied friendlies.
  return {
    x: 0.18 + seededNumber(`${ref}:fx`) * 0.28,
    y: 0.1 + seededNumber(`${ref}:fy`) * 0.8,
  }
}

/**
 * Implements ensure dynamic for this module.
 */
function ensureDynamic(ref) {
  if (!ref || ref === 'unbound') return
  if (simDynamics.has(ref)) return
  const r1 = seededNumber(`${ref}:x`)
  const r2 = seededNumber(`${ref}:y`)
  const r3 = seededNumber(`${ref}:vx`)
  const r4 = seededNumber(`${ref}:vy`)
  const role = roleFromEntityRef(ref)
  const spawn = role === 'enemyUnit' ? pickEnemySpawnPoint(ref) : pickFriendlySpawnPoint(ref)
  const speedScale = role === 'enemyUnit' ? 0.007 : role === 'lineUnit' ? 0.005 : 0.0035
  const isLauncher = isLauncherRef(ref)
  const initialFireStagger = isLauncher ? Math.floor(seededNumber(`${ref}:stagger`) * LINE_FIRE_COOLDOWN_TICKS) : 0
  simDynamics.set(ref, {
    x: spawn.x,
    y: spawn.y,
    vx: (r3 - 0.5) * speedScale,
    vy: (r4 - 0.5) * speedScale,
    unitRole: role,
    destructionLevel: 'intact',
    ammo: isLauncher ? 6 : 0,
    maxAmmo: isLauncher ? 6 : 0,
    cooldownTicks: initialFireStagger,
    reloadTicks: 0,
    podsAvailable: 0,
    missionTicks: 0,
    missionCount: 0,
    activeMissionId: null,
    activeMissionTarget: null,
    activeMissionTargetGrid: null,
    activeMissionStartedAt: null,
    activeMissionRounds: 1,
    reloadCount: 0,
    activeReloadId: null,
    activeReloadStartedAt: null,
    repairTicks: 0,
    maintenanceCount: 0,
    activeMaintenanceId: null,
    activeMaintenanceStartedAt: null,
    hitPoints: role === 'enemyUnit' ? ENEMY_HITPOINTS : 0,
  })
}

/**
 * Implements ensure enemy dynamics for this module.
 */
function ensureEnemyDynamics() {
  for (let i = 1; i <= ENEMY_COUNT; i += 1) {
    ensureDynamic(`enemy:opfor-${i}`)
  }
}

/**
 * Implements ensure scope default for this module.
 */
function ensureScopeDefault(orgEntityRef) {
  if (!orgEntityRef || orgEntityRef === 'unbound') return
  if (!globalControlScopes[orgEntityRef]) {
    globalControlScopes[orgEntityRef] = {
      scopeId: orgEntityRef,
      mode: 'auto',
      heldBy: 'sim_autopilot',
    }
  }
}

/**
 * Implements sim status payload for this module.
 */
function simStatusPayload() {
  return {
    mode: simMode,
    protocolVersion: PROTOCOL_VERSION,
    wsPort: PORT,
    participants: participants.size,
    trackedUnits: simDynamics.size,
    sequence: seq,
    serverTime: new Date().toISOString(),
  }
}

/**
 * Implements unit snapshot for ui for this module.
 */
function unitSnapshotForUi() {
  const now = new Date().toISOString()
  const rows = []
  for (const [entityRef, d] of simDynamics.entries()) {
    rows.push({
      entityRef,
      unitRole: d.unitRole,
      destructionLevel: d.destructionLevel,
      commsStatus: 'up',
      xNorm: d.x,
      yNorm: d.y,
      mgrsGrid: toMgrsLike(d.x, d.y),
      displayGrid: d.unitRole === 'enemyUnit' ? 'OPFOR' : 'SIM-AUTO',
      readiness:
        isLauncherRef(entityRef)
          ? `ammo ${d.ammo}/${d.maxAmmo}`
          : d.unitRole === 'supportUnit'
            ? `pods ${d.podsAvailable}`
            : d.destructionLevel === 'intact'
              ? 'ready'
              : 'degraded',
      lastHeartbeat: now,
      enemyDetails:
        d.unitRole === 'enemyUnit'
          ? {
              category: 'ground_troops',
              label: 'OPFOR motorized element',
              threatRangeKm: 15,
            }
          : undefined,
    })
  }
  return rows
}

/**
 * Implements overlay snapshot payload for this module.
 */
function overlaySnapshotPayload() {
  return {
    mode: simMode,
    scenarioId: lastScenarioId,
    updatedAt: new Date().toISOString(),
    unitStates: unitSnapshotForUi(),
    rangeFanConfig: {
      enabled: false,
      showLabels: true,
      profiles: RANGE_FAN_PROFILES,
    },
  }
}

/**
 * Updates sim mode with the provided value.
 */
function setSimMode(nextMode) {
  if (simMode === nextMode) return
  simMode = nextMode
  console.log(`[fdc-simulator] mode -> ${simMode}`)
}

/**
 * Implements reset simulation world for this module.
 */
function resetSimulationWorld() {
  simDynamics.clear()
  seq = 0
  rebuildEnemyClusterAnchors()
  for (const p of participants.values()) {
    ensureDynamic(p.orgEntityRef)
    for (const ref of p.knownEntityRefs ?? []) {
      if (typeof ref === 'string') ensureDynamic(ref)
    }
  }
  refreshPodOwnerOverrides()
  ensureEnemyDynamics()
  console.log('[fdc-simulator] world reset')
}

/**
 * Implements broadcast world state now for this module.
 */
function broadcastWorldStateNow() {
  const now = new Date().toISOString()
  const any = [...participants.values()][0]
  broadcastDelta({
    simulationOverlay: {
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: any?.scenarioId ?? lastScenarioId ?? 'default',
      updatedAt: now,
      unitStates: unitSnapshotForUi(),
      rangeFanConfig: {
        enabled: false,
        showLabels: true,
        profiles: RANGE_FAN_PROFILES,
      },
      controlByScope: { ...globalControlScopes },
    },
    launchers: [],
    pods: [],
    tasks: [],
  })
}

/**
 * Implements to mgrs like for this module.
 */
function toMgrsLike(x, y) {
  const e = Math.floor(10000 + x * 80000)
  const n = Math.floor(10000 + y * 80000)
  return `48R XT ${String(e).padStart(5, '0')} ${String(n).padStart(5, '0')}`
}

/**
 * Implements distance for this module.
 */
function distance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Implements friendly units for this module.
 */
function friendlyUnits() {
  return [...simDynamics.values()].filter((d) => d.unitRole !== 'enemyUnit')
}

/**
 * Implements min distance to friendlies for this module.
 */
function minDistanceToFriendlies(point) {
  const friendlies = friendlyUnits()
  if (!friendlies.length) return Number.POSITIVE_INFINITY
  let best = Number.POSITIVE_INFINITY
  for (const f of friendlies) {
    const dist = distance(point, f)
    if (dist < best) best = dist
  }
  return best
}

/**
 * Implements enemy index from ref for this module.
 */
function enemyIndexFromRef(seedRef) {
  const m = /opfor-(\d+)$/.exec(seedRef)
  if (!m) return 0
  return Number(m[1]) || 0
}

/**
 * Implements rebuild enemy cluster anchors for this module.
 */
function rebuildEnemyClusterAnchors() {
  enemySpawnEpoch = Date.now() + Math.floor(Math.random() * 100000)
  enemyClusterAnchors = []
  for (let i = 0; i < 3; i += 1) {
    const rx = seededNumber(`enemy-anchor:${enemySpawnEpoch}:${i}:x`)
    const ry = seededNumber(`enemy-anchor:${enemySpawnEpoch}:${i}:y`)
    enemyClusterAnchors.push({
      x: 0.72 + rx * 0.2,
      y: 0.14 + ry * 0.72,
    })
  }
}

/**
 * Implements pick enemy spawn point for this module.
 */
function pickEnemySpawnPoint(seedRef) {
  if (!enemyClusterAnchors.length) rebuildEnemyClusterAnchors()
  // Randomized groups: new cluster locations every restart, cohesive local grouping.
  const idx = enemyIndexFromRef(seedRef)
  const cluster = enemyClusterAnchors[idx % enemyClusterAnchors.length] ?? { x: 0.84, y: 0.5 }
  for (let i = 0; i < 12; i += 1) {
    const angle = seededNumber(`${seedRef}:${enemySpawnEpoch}:a:${i}`) * Math.PI * 2
    const radius = 0.025 + seededNumber(`${seedRef}:${enemySpawnEpoch}:r:${i}`) * 0.075
    const point = {
      x: clamp(cluster.x + Math.cos(angle) * radius, 0.62, 0.96),
      y: clamp(cluster.y + Math.sin(angle) * radius, 0.06, 0.94),
    }
    if (minDistanceToFriendlies(point) >= ENEMY_MIN_STANDOFF_NORM) return point
  }
  // Bias OPFOR to east/northeast sectors and enforce standoff from friendlies.
  for (let i = 0; i < 20; i += 1) {
    const rx = seededNumber(`${seedRef}:${enemySpawnEpoch}:spawn-x:${i}`)
    const ry = seededNumber(`${seedRef}:${enemySpawnEpoch}:spawn-y:${i}`)
    const point = { x: 0.66 + rx * 0.3, y: 0.08 + ry * 0.84 }
    if (minDistanceToFriendlies(point) >= ENEMY_MIN_STANDOFF_NORM) return point
  }
  return { x: 0.84, y: 0.16 + seededNumber(`${seedRef}:${enemySpawnEpoch}:spawn-fallback`) * 0.68 }
}

/**
 * Implements nearest enemy for for this module.
 */
function nearestEnemyFor(ref) {
  const src = simDynamics.get(ref)
  if (!src) return null
  let best = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const [k, d] of simDynamics.entries()) {
    if (d.unitRole !== 'enemyUnit' || d.destructionLevel === 'destroyed' || d.destructionLevel === 'struck_off') continue
    const dist = distance(src, d)
    if (dist < bestDist) {
      bestDist = dist
      best = { key: k, unit: d, dist }
    }
  }
  return best
}

/**
 * Implements nearest support with pods for this module.
 */
function nearestSupportWithPods(ref) {
  const src = simDynamics.get(ref)
  if (!src) return null
  let best = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const [k, d] of simDynamics.entries()) {
    if (!hasPodSupplyRef(k) || d.podsAvailable <= 0) continue
    if (d.destructionLevel === 'destroyed' || d.destructionLevel === 'struck_off') continue
    const dist = distance(src, d)
    if (dist < bestDist) {
      bestDist = dist
      best = { key: k, unit: d, dist }
    }
  }
  return best
}

/**
 * Implements available reserve pods for support for this module.
 */
function availableReservePodsForSupport(supportRef) {
  let count = 0
  for (const [ref, d] of simDynamics.entries()) {
    if (!ref.startsWith('pod:')) continue
    if (d.destructionLevel === 'destroyed' || d.destructionLevel === 'struck_off') continue
    if (supportOwnerForPodRef(ref) !== supportRef) continue
    count += 1
  }
  return count
}

/**
 * Implements sync support pod availability for this module.
 */
function syncSupportPodAvailability() {
  for (const [ref, d] of simDynamics.entries()) {
    if (!hasPodSupplyRef(ref)) continue
    d.podsAvailable = availableReservePodsForSupport(ref)
  }
}

/**
 * Implements consume reserve pod from support for this module.
 */
function consumeReservePodFromSupport(supportRef) {
  for (const [ref, d] of simDynamics.entries()) {
    if (!ref.startsWith('pod:')) continue
    if (d.destructionLevel === 'destroyed' || d.destructionLevel === 'struck_off') continue
    if (supportOwnerForPodRef(ref) !== supportRef) continue
    d.destructionLevel = 'struck_off'
    return true
  }
  return false
}

/**
 * Implements nearest friendly for for this module.
 */
function nearestFriendlyFor(ref) {
  const src = simDynamics.get(ref)
  if (!src) return null
  let best = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const [k, d] of simDynamics.entries()) {
    if (d.unitRole === 'enemyUnit' || d.destructionLevel === 'destroyed' || d.destructionLevel === 'struck_off') continue
    const dist = distance(src, d)
    if (dist < bestDist) {
      bestDist = dist
      best = { key: k, unit: d, dist }
    }
  }
  return best
}

/**
 * Implements broadcast control state for this module.
 */
function broadcastControlState() {
  const scopes = { ...globalControlScopes }
  const msg = JSON.stringify({ type: 'control.state', scopes })
  for (const { ws } of participants.values()) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

/**
 * Implements broadcast delta for this module.
 */
function broadcastDelta(payload) {
  const msg = JSON.stringify({
    type: 'fdc.sim.v1.delta',
    eventId: crypto.randomUUID(),
    eventTime: new Date().toISOString(),
    sequence: nextSeq(),
    payload,
  })
  for (const { ws } of participants.values()) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

/**
 * Handles hello or rebind interactions for this workflow.
 */
function handleHelloOrRebind(ws, clientId, msg, isRebind) {
  if (msg.protocolVersion !== PROTOCOL_VERSION) {
    ws.send(JSON.stringify({ type: 'server.error', code: 'protocol_mismatch', message: `Server expects protocol ${PROTOCOL_VERSION}` }))
    return
  }
  const orgEntityRef = msg.orgEntityRef || 'unbound'
  const scenarioId = msg.scenarioId || 'default'
  lastScenarioId = scenarioId
  const stationInstanceId = msg.stationInstanceId || clientId

  const knownEntityRefs = Array.isArray(msg.knownEntityRefs)
    ? msg.knownEntityRefs.filter((v) => typeof v === 'string')
    : []
  const knownPodOwners = Array.isArray(msg.knownPodOwners)
    ? msg.knownPodOwners
        .filter((v) => v && typeof v === 'object')
        .map((v) => ({
          podRef: typeof v.podRef === 'string' ? v.podRef : '',
          supportRef: typeof v.supportRef === 'string' ? v.supportRef : '',
        }))
        .filter((v) => v.podRef && v.supportRef)
    : []
  participants.set(clientId, { orgEntityRef, scenarioId, stationInstanceId, knownEntityRefs, knownPodOwners, ws })
  refreshPodOwnerOverrides()
  ensureScopeDefault(orgEntityRef)
  ensureDynamic(orgEntityRef)
  ensureEnemyDynamics()
  if (knownEntityRefs.length) {
    for (const ref of knownEntityRefs) {
      ensureScopeDefault(ref)
      ensureDynamic(ref)
    }
  }
  for (const it of knownPodOwners) {
    ensureDynamic(it.podRef)
    ensureDynamic(it.supportRef)
  }

  if (!isRebind) {
    ws.send(JSON.stringify({ type: 'server.welcome', protocolVersion: PROTOCOL_VERSION, simAppVersion: SIM_APP_VERSION, scenarioId }))
  } else {
    ws.send(JSON.stringify({ type: 'server.rebound', protocolVersion: PROTOCOL_VERSION, scenarioId, orgEntityRef }))
  }
  broadcastControlState()
}

/**
 * Implements autopilot tick for this module.
 */
function autopilotTick() {
  if (simMode !== 'running') return
  ensureEnemyDynamics()
  if (simDynamics.size === 0 || participants.size === 0) return
  syncSupportPodAvailability()
  const now = new Date().toISOString()
  const unitStates = []
  const launcherPatches = []
  const podPatches = []
  const taskPatches = []

  for (const [ref, d] of simDynamics.entries()) {
    let repairedThisTick = false
    if (d.repairTicks > 0) {
      d.repairTicks -= 1
      if (d.repairTicks <= 0) {
        d.repairTicks = 0
        d.destructionLevel = 'intact'
        repairedThisTick = true
      }
    }
    if (d.unitRole === 'enemyUnit' && d.hitPoints <= 0) {
      d.destructionLevel = 'destroyed'
    }
    const scope = globalControlScopes[ref]
    const allowAuto = !scope || scope.mode !== 'human'

    // Hybrid control expires automatically
    if (scope?.mode === 'hybrid' && scope.leaseExpiresAt && new Date(scope.leaseExpiresAt).getTime() <= Date.now()) {
      globalControlScopes[ref] = { scopeId: ref, mode: 'auto', heldBy: 'sim_autopilot' }
    }

    if (
      allowAuto &&
      d.destructionLevel !== 'destroyed' &&
      d.destructionLevel !== 'struck_off' &&
      d.repairTicks <= 0
    ) {
      if (d.unitRole === 'enemyUnit') {
        const nearFriendly = nearestFriendlyFor(ref)
        if (nearFriendly && nearFriendly.dist < ENEMY_REPOSITION_STANDOFF_NORM) {
          const dx = d.x - nearFriendly.unit.x
          const dy = d.y - nearFriendly.unit.y
          const mag = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy))
          d.vx = (dx / mag) * 0.007
          d.vy = (dy / mag) * 0.007
        }
      } else if (isLauncherRef(ref) || ref.startsWith('poc:')) {
        const tgt = nearestEnemyFor(ref)
        if (tgt && tgt.dist > 0.16) {
          const dx = tgt.unit.x - d.x
          const dy = tgt.unit.y - d.y
          const mag = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy))
          const desiredSpeed = isLauncherRef(ref) ? 0.0056 : 0.0044
          const tx = (dx / mag) * desiredSpeed
          const ty = (dy / mag) * desiredSpeed
          d.vx = d.vx * 0.65 + tx * 0.35
          d.vy = d.vy * 0.65 + ty * 0.35
        }
      }
      d.x += d.vx
      d.y += d.vy
      if (d.x < 0.04 || d.x > 0.96) {
        d.vx *= -1
        d.x = Math.max(0.04, Math.min(0.96, d.x))
      }
      if (d.y < 0.04 || d.y > 0.96) {
        d.vy *= -1
        d.y = Math.max(0.04, Math.min(0.96, d.y))
      }
    }

    if (isLauncherRef(ref)) {
      const launcherId = ref.slice('launcher:'.length)

      if (d.repairTicks > 0) {
        if (!d.activeMaintenanceId) {
          d.maintenanceCount += 1
          d.activeMaintenanceId = `sim-mx-${launcherId}-${Date.now()}-${d.maintenanceCount}`
          d.activeMaintenanceStartedAt = now
        }
        const progress = Math.max(
          5,
          Math.round(((FRIENDLY_REPAIR_TICKS - d.repairTicks) / FRIENDLY_REPAIR_TICKS) * 100)
        )
        taskPatches.push({
          id: d.activeMaintenanceId,
          name: `${SIM_REPAIR_TASK_NAME} ${launcherId} #${d.maintenanceCount}`,
          description: 'Repair after OPFOR damage',
          status: 'in-progress',
          progress: Math.min(progress, 95),
          launcherIds: [launcherId],
          startTime: d.activeMaintenanceStartedAt ?? now,
          duration: SIM_REPAIR_DURATION_SECONDS,
        })
      } else if (repairedThisTick && d.activeMaintenanceId) {
        taskPatches.push({
          id: d.activeMaintenanceId,
          name: `${SIM_REPAIR_TASK_NAME} ${launcherId} #${d.maintenanceCount}`,
          description: 'Repair after OPFOR damage',
          status: 'completed',
          progress: 100,
          launcherIds: [launcherId],
          startTime: d.activeMaintenanceStartedAt ?? now,
          completedTime: now,
          duration: SIM_REPAIR_DURATION_SECONDS,
        })
        d.activeMaintenanceId = null
        d.activeMaintenanceStartedAt = null
      }

      if (d.cooldownTicks > 0) d.cooldownTicks -= 1
      if (d.missionTicks > 0) d.missionTicks -= 1

      if (d.repairTicks <= 0) {
        if (d.ammo <= 0) {
          if (d.reloadTicks === 0) {
            d.reloadTicks = LINE_RELOAD_TICKS
            d.reloadCount += 1
            d.activeReloadId = `sim-rl-${launcherId}-${Date.now()}-${d.reloadCount}`
            d.activeReloadStartedAt = now
          }
          d.reloadTicks -= 1
          if (d.activeReloadId) {
            const progress = Math.max(5, Math.round(((LINE_RELOAD_TICKS - d.reloadTicks) / LINE_RELOAD_TICKS) * 100))
            taskPatches.push({
              id: d.activeReloadId,
              name: `${SIM_RELOAD_TASK_NAME} ${launcherId} #${d.reloadCount}`,
              description: 'Autopilot reload cycle',
              status: 'in-progress',
              progress: Math.min(progress, 95),
              launcherIds: [launcherId],
              startTime: d.activeReloadStartedAt ?? now,
              duration: SIM_RELOAD_DURATION_SECONDS,
            })
          }
          if (d.reloadTicks <= 0) {
            const support = nearestSupportWithPods(ref)
            if (support) {
              const consumed = consumeReservePodFromSupport(support.key)
              if (consumed) {
                support.unit.podsAvailable = Math.max(0, support.unit.podsAvailable - 1)
                d.ammo = d.maxAmmo
                if (d.activeReloadId) {
                  taskPatches.push({
                    id: d.activeReloadId,
                    name: `${SIM_RELOAD_TASK_NAME} ${launcherId} #${d.reloadCount}`,
                    description: 'Autopilot reload cycle',
                    status: 'completed',
                    progress: 100,
                    launcherIds: [launcherId],
                    startTime: d.activeReloadStartedAt ?? now,
                    completedTime: now,
                    duration: SIM_RELOAD_DURATION_SECONDS,
                  })
                }
                d.activeReloadId = null
                d.activeReloadStartedAt = null
              } else {
                // A support node was near but no real reserve pod remained.
                d.reloadTicks = Math.max(3, Math.floor(LINE_RELOAD_TICKS / 2))
              }
            } else {
              d.reloadTicks = Math.max(3, Math.floor(LINE_RELOAD_TICKS / 2))
            }
          }
        } else if (allowAuto && d.cooldownTicks <= 0) {
          const tgt = nearestEnemyFor(ref)
          if (tgt && tgt.dist <= 0.45) {
            const roundsToFire = Math.max(1, Math.min(d.ammo, 1 + Math.floor(Math.random() * 3)))
            d.ammo -= roundsToFire
            d.cooldownTicks = LINE_FIRE_COOLDOWN_TICKS
            d.missionTicks = SIM_MISSION_ACTIVE_TICKS
            d.missionCount += 1
            d.activeMissionId = `sim-fm-${launcherId}-${Date.now()}-${d.missionCount}`
            d.activeMissionTarget = tgt.key
            d.activeMissionTargetGrid = toMgrsLike(tgt.unit.x, tgt.unit.y)
            d.activeMissionStartedAt = now
            d.activeMissionRounds = roundsToFire
            const hitRoll = Math.random()
            if (hitRoll < LINE_HIT_PROBABILITY && tgt.unit.hitPoints > 0) {
              tgt.unit.hitPoints -= 1
              if (tgt.unit.hitPoints <= 0) {
                tgt.unit.hitPoints = 0
                tgt.unit.destructionLevel = 'destroyed'
              } else if (tgt.unit.hitPoints <= ENEMY_DEGRADE_AT_HP) {
                tgt.unit.destructionLevel = 'degraded'
              } else {
                tgt.unit.destructionLevel = 'intact'
              }
            }
            const counterfire = Math.random()
            if (counterfire < ENEMY_COUNTERFIRE_HIT_PROBABILITY) {
              const friendly = nearestFriendlyFor(tgt.key)
              if (
                friendly &&
                friendly.key &&
                friendly.unit.destructionLevel === 'intact' &&
                friendly.unit.repairTicks <= 0 &&
                friendly.dist <= 0.7
              ) {
                friendly.unit.destructionLevel = 'degraded'
                friendly.unit.repairTicks = FRIENDLY_REPAIR_TICKS
              }
            }
          }
        }
      }

      const status = d.repairTicks > 0 || d.ammo <= 0 ? 'maintenance' : d.cooldownTicks > 0 ? 'active' : 'idle'
      launcherPatches.push({
        id: launcherId,
        status,
      })
      if (d.missionTicks > 0 && d.activeMissionId) {
        const progress = Math.max(
          10,
          Math.round(((SIM_MISSION_ACTIVE_TICKS - d.missionTicks + 1) / SIM_MISSION_ACTIVE_TICKS) * 100)
        )
        taskPatches.push({
          id: d.activeMissionId,
          name: `SIM Fire ${launcherId} #${d.missionCount}`,
          description: `Autopilot fire mission vs ${d.activeMissionTarget ?? 'OPFOR'}`,
          status: 'in-progress',
          progress,
          launcherIds: [launcherId],
          startTime: d.activeMissionStartedAt ?? now,
          timeMsnSent: d.activeMissionStartedAt ?? now,
          duration: SIM_FIRE_DURATION_SECONDS,
          targetNumber: `SIM-${d.missionCount}`,
          grid: d.activeMissionTargetGrid ?? undefined,
          numberOfRoundsToFire: d.activeMissionRounds || 1,
          ammoTypeToFire: ['M31', 'M30', 'M26'][d.missionCount % 3],
          missionStatus: 'in-progress',
        })
      } else if (d.activeMissionId) {
        const missionRounds = d.activeMissionRounds || 1
        const missionDurationSeconds = Math.max(1, SIM_FIRE_DURATION_SECONDS)
        const rofRoundsPerMinute = Number(((missionRounds / missionDurationSeconds) * 60).toFixed(2))
        taskPatches.push({
          id: d.activeMissionId,
          name: `SIM Fire ${launcherId} #${d.missionCount}`,
          description: `Autopilot fire mission vs ${d.activeMissionTarget ?? 'OPFOR'}`,
          status: 'completed',
          progress: 100,
          launcherIds: [launcherId],
          startTime: d.activeMissionStartedAt ?? now,
          completedTime: now,
          timeMfrReceived: now,
          duration: SIM_FIRE_DURATION_SECONDS,
          targetNumber: `SIM-${d.missionCount}`,
          grid: d.activeMissionTargetGrid ?? undefined,
          numberOfRoundsToFire: missionRounds,
          numberOfRoundsFired: missionRounds,
          rofRoundsPerMinute,
          ammoTypeToFire: ['M31', 'M30', 'M26'][d.missionCount % 3],
          missionStatus: 'completed',
          remarks: `SIM auto ROF ${rofRoundsPerMinute} rpm`,
        })
        d.activeMissionId = null
        d.activeMissionTarget = null
        d.activeMissionTargetGrid = null
        d.activeMissionStartedAt = null
        d.activeMissionRounds = 1
      }
      const podId = `${launcherId}-pod-1`
      const rounds = []
      for (let i = 0; i < d.maxAmmo; i += 1) {
        rounds.push({
          id: `${podId}-sim-${i + 1}`,
          type: ['M31', 'M30', 'M26'][i % 3],
          status: i < d.ammo ? 'available' : 'used',
        })
      }
      podPatches.push({
        id: podId,
        rounds,
        launcherId,
      })
    }

    unitStates.push({
      entityRef: ref,
      unitRole: d.unitRole,
      destructionLevel: d.destructionLevel,
      mgrsGrid: toMgrsLike(d.x, d.y),
      displayGrid: d.unitRole === 'enemyUnit' ? 'OPFOR' : 'SIM-AUTO',
      lastHeartbeat: now,
      readiness:
        d.repairTicks > 0
          ? `repair ${d.repairTicks}`
          : isLauncherRef(ref)
          ? `ammo ${d.ammo}/${d.maxAmmo}`
          : d.unitRole === 'supportUnit'
            ? `pods ${d.podsAvailable}`
            : d.destructionLevel === 'intact'
              ? 'ready'
              : 'degraded',
      commsStatus: 'up',
    })
  }

  const any = [...participants.values()][0]
  broadcastDelta({
    simulationOverlay: {
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: any?.scenarioId ?? 'default',
      updatedAt: now,
      unitStates,
      rangeFanConfig: {
        enabled: false,
        showLabels: true,
        profiles: RANGE_FAN_PROFILES,
      },
      controlByScope: { ...globalControlScopes },
    },
    launchers: launcherPatches,
    pods: podPatches,
    tasks: taskPatches,
  })
}
setInterval(autopilotTick, TICK_MS)

const CONTROL_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FDC Simulator Control + Map</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <style>
      body { font-family: system-ui, sans-serif; background:#0f1115; color:#e6edf3; margin:0; padding:12px; }
      .card { width:min(1680px, calc(100vw - 24px)); margin:0 auto; border:1px solid #30363d; border-radius:12px; padding:16px; background:#161b22; min-height:calc(100vh - 24px); box-sizing:border-box; }
      h1 { margin:0 0 12px; font-size:1.25rem; }
      .row { display:flex; gap:10px; flex-wrap:wrap; margin:14px 0; }
      button { border:1px solid #30363d; background:#21262d; color:#e6edf3; padding:10px 14px; border-radius:9px; cursor:pointer; font-size:.95rem; font-weight:600; }
      button:hover { background:#30363d; }
      .pill { display:inline-block; padding:3px 10px; border-radius:999px; border:1px solid #30363d; margin-left:8px; font-size:.95rem; }
      pre { background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:12px; overflow:auto; max-height:32vh; font-size:.9rem; }
      .hint { color:#8b949e; font-size:.92rem; margin-top:10px; }
      .split { display:grid; grid-template-columns: 1fr 1.65fr; gap:14px; height:calc(100vh - 220px); min-height:560px; }
      .panel { border:1px solid #30363d; border-radius:10px; padding:12px; background:#0d1117; display:flex; flex-direction:column; min-height:0; }
      .legend { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:10px; font-size:.9rem; color:#c9d1d9; }
      .filters { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0 10px; }
      .filter-pill { display:inline-flex; align-items:center; gap:6px; border:1px solid #30363d; border-radius:999px; padding:4px 9px; background:#161b22; font-size:.82rem; }
      .filter-pill input { width:14px; height:14px; margin:0; }
      .dot { display:inline-flex; width:11px; height:11px; border-radius:999px; margin-right:5px; }
      #mapView { width:100%; height:100%; min-height:560px; border:1px solid #30363d; border-radius:10px; overflow:hidden; flex:1; }
      .sim-marker { width:24px; height:24px; border-radius:999px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:700; border:2px solid rgba(255,255,255,.6); box-shadow:0 1px 3px rgba(0,0,0,.55); }
      .list { max-height:none; flex:1; overflow:auto; font-size:.86rem; border:1px solid #30363d; border-radius:8px; padding:8px; background:#0d1117; }
      .item { display:flex; justify-content:space-between; gap:10px; padding:3px 0; border-bottom:1px solid #21262d; }
      .item:last-child { border-bottom:none; }
      @media (max-width: 980px) {
        body { padding:8px; }
        .card { width:calc(100vw - 16px); min-height:calc(100vh - 16px); }
        .split { grid-template-columns: 1fr; height:auto; min-height:0; }
        #mapView { min-height:420px; height:420px; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>FDC Simulator Control <span id="mode" class="pill">...</span></h1>
      <div class="row">
        <button onclick="sendCmd('start')">Start</button>
        <button onclick="sendCmd('pause')">Pause</button>
        <button onclick="sendCmd('stop')">Stop</button>
        <button onclick="sendCmd('restart')">Restart Sim</button>
      </div>
      <div class="split">
        <div class="panel">
          <pre id="status">Loading...</pre>
          <div class="hint">Start runs autopilot ticks. Pause/Stop freeze updates. Restart resets unit world state.</div>
          <div class="legend" style="margin-top:12px;">
            <span><span class="dot" style="background:#2f81f7;"></span>Line</span>
            <span><span class="dot" style="background:#f0883e;"></span>FDC</span>
            <span><span class="dot" style="background:#2ea043;"></span>Ops</span>
            <span><span class="dot" style="background:#9a6700;"></span>Support</span>
            <span><span class="dot" style="background:#cf222e;"></span>Enemy</span>
          </div>
          <div class="filters">
            <label class="filter-pill"><input id="flt-lineUnit" type="checkbox" checked /> LN</label>
            <label class="filter-pill"><input id="flt-fdcNode" type="checkbox" checked /> FD</label>
            <label class="filter-pill"><input id="flt-opsNode" type="checkbox" checked /> OP</label>
            <label class="filter-pill"><input id="flt-supportUnit" type="checkbox" checked /> SP</label>
            <label class="filter-pill"><input id="flt-enemyUnit" type="checkbox" checked /> EN</label>
          </div>
          <div id="unitList" class="list"></div>
        </div>
        <div class="panel">
          <div id="mapView"></div>
        </div>
      </div>
    </div>
    <script>
      const FORT_BRAGG_CENTER = [35.1415, -79.009];
      const map = L.map('mapView', { zoomControl: true }).setView(FORT_BRAGG_CENTER, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      const markerLayer = L.layerGroup().addTo(map);
      const markers = new Map();
      const roleFilters = {
        lineUnit: true,
        fdcNode: true,
        opsNode: true,
        supportUnit: true,
        enemyUnit: true,
      };

      function colorForRole(role) {
        if (role === 'lineUnit') return '#2f81f7';
        if (role === 'fdcNode') return '#f0883e';
        if (role === 'supportUnit') return '#9a6700';
        if (role === 'enemyUnit') return '#cf222e';
        return '#2ea043';
      }
      function codeForRole(role) {
        if (role === 'lineUnit') return 'LN';
        if (role === 'fdcNode') return 'FD';
        if (role === 'opsNode') return 'OP';
        if (role === 'supportUnit') return 'SP';
        return 'EN';
      }
      function borderForDamage(level, role) {
        if (level === 'destroyed' || level === 'struck_off') return '#000000';
        if (level === 'degraded') return '#d29922';
        return colorForRole(role);
      }
      function latLngFromNorm(xNorm, yNorm) {
        const x = Math.max(0, Math.min(1, Number(xNorm)));
        const y = Math.max(0, Math.min(1, Number(yNorm)));
        const lat = FORT_BRAGG_CENTER[0] + (y - 0.5) * 0.135;
        const lng = FORT_BRAGG_CENTER[1] + (x - 0.5) * 0.165;
        return [lat, lng];
      }
      async function refresh() {
        const [statusRes, overlayRes] = await Promise.all([
          fetch('/api/sim/status'),
          fetch('/api/sim/overlay'),
        ]);
        const status = await statusRes.json();
        const overlay = await overlayRes.json();
        document.getElementById('mode').textContent = status.mode;
        document.getElementById('status').textContent = JSON.stringify({ ...status, scenarioId: overlay.scenarioId, overlayUpdatedAt: overlay.updatedAt }, null, 2);
        const seen = new Set();
        const list = document.getElementById('unitList');
        list.innerHTML = '';
        for (const u of (overlay.unitStates || [])) {
          if (!roleFilters[u.unitRole]) continue;
          seen.add(u.entityRef);
          const html = '<div class="sim-marker" style="background:' + colorForRole(u.unitRole) + ';border-color:' + borderForDamage(u.destructionLevel, u.unitRole) + ';">' + codeForRole(u.unitRole) + '</div>';
          const icon = L.divIcon({ className: 'sim-div-icon', html, iconSize: [24, 24], iconAnchor: [12, 12] });
          const latLng = latLngFromNorm(u.xNorm, u.yNorm);
          let marker = markers.get(u.entityRef);
          if (!marker) {
            marker = L.marker(latLng, { icon });
            marker.addTo(markerLayer);
            markers.set(u.entityRef, marker);
          } else {
            marker.setLatLng(latLng);
            marker.setIcon(icon);
          }
          marker.bindTooltip(u.entityRef + ' | ' + u.unitRole + ' | ' + u.destructionLevel);

          const row = document.createElement('div');
          row.className = 'item';
          row.innerHTML = '<span>' + u.entityRef + '</span><span>' + u.unitRole + ' ? ' + u.destructionLevel + '</span>';
          list.appendChild(row);
        }
        for (const [id, marker] of markers.entries()) {
          if (!seen.has(id)) {
            markerLayer.removeLayer(marker);
            markers.delete(id);
          }
        }
      }
      async function sendCmd(cmd) {
        await fetch('/api/sim/' + cmd, { method: 'POST' });
        await refresh();
      }
      function hookFilter(id, role) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function () {
          roleFilters[role] = !!el.checked;
          refresh();
        });
      }
      hookFilter('flt-lineUnit', 'lineUnit');
      hookFilter('flt-fdcNode', 'fdcNode');
      hookFilter('flt-opsNode', 'opsNode');
      hookFilter('flt-supportUnit', 'supportUnit');
      hookFilter('flt-enemyUnit', 'enemyUnit');
      refresh();
      setInterval(refresh, 1000);
    </script>
  </body>
</html>`

const httpServer = createServer((req, res) => {
  const method = req.method || 'GET'
  const url = req.url || '/'
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (method === 'GET' && (url === '/' || url === '/control')) {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      pragma: 'no-cache',
      expires: '0',
    })
    res.end(CONTROL_HTML)
    return
  }
  if (method === 'GET' && url === '/api/sim/status') {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      pragma: 'no-cache',
      expires: '0',
    })
    res.end(JSON.stringify(simStatusPayload()))
    return
  }
  if (method === 'GET' && url === '/api/sim/overlay') {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      pragma: 'no-cache',
      expires: '0',
    })
    res.end(JSON.stringify(overlaySnapshotPayload()))
    return
  }
  if (method === 'POST' && url === '/api/sim/start') {
    setSimMode('running')
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(simStatusPayload()))
    return
  }
  if (method === 'POST' && url === '/api/sim/pause') {
    setSimMode('paused')
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(simStatusPayload()))
    return
  }
  if (method === 'POST' && url === '/api/sim/stop') {
    setSimMode('stopped')
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(simStatusPayload()))
    return
  }
  if (method === 'POST' && url === '/api/sim/restart') {
    resetSimulationWorld()
    setSimMode('running')
    broadcastWorldStateNow()
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(simStatusPayload()))
    return
  }
  res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: 'not_found', path: url }))
})
httpServer.listen(HTTP_PORT, () => {
  console.log(`[fdc-simulator] control http://127.0.0.1:${HTTP_PORT}`)
})

const wss = new WebSocketServer({ port: PORT })
console.log(`[fdc-simulator] listening ws://127.0.0.1:${PORT} (protocol ${PROTOCOL_VERSION})`)

setInterval(() => {
  const ping = JSON.stringify({ type: 'server.ping', ts: Date.now() })
  for (const { ws } of participants.values()) {
    if (ws.readyState === 1) ws.send(ping)
  }
}, 30000)

wss.on('connection', (ws) => {
  const clientId = crypto.randomUUID()

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(String(data))
    } catch {
      ws.send(JSON.stringify({ type: 'server.error', code: 'bad_json', message: 'Invalid JSON' }))
      return
    }

    if (msg.type === 'client.hello') {
      handleHelloOrRebind(ws, clientId, msg, false)
      return
    }
    if (msg.type === 'client.rebind') {
      handleHelloOrRebind(ws, clientId, msg, true)
      return
    }
    if (msg.type === 'client.pong') {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'server.pong', ts: Date.now() }))
      return
    }

    if (msg.type === 'operator.command') {
      const p = participants.get(clientId)
      const scopeKey = msg.scopeId || p?.orgEntityRef || 'unbound'
      if (scopeKey === 'unbound') {
        ws.send(JSON.stringify({ type: 'operator.command.rejected', commandId: msg.commandId || 'noid', reason: 'no_scope' }))
        return
      }
      ensureScopeDefault(scopeKey)
      ensureDynamic(scopeKey)
      const stationTag = p?.stationInstanceId ? `station:${String(p.stationInstanceId).slice(0, 8)}` : `station:${clientId.slice(0, 8)}`

      if (msg.commandType === 'release_control') {
        globalControlScopes[scopeKey] = { scopeId: scopeKey, mode: 'auto', heldBy: 'sim_autopilot' }
      } else if (msg.commandType === 'hybrid_control') {
        globalControlScopes[scopeKey] = {
          scopeId: scopeKey,
          mode: 'hybrid',
          heldBy: stationTag,
          leaseExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }
      } else {
        globalControlScopes[scopeKey] = { scopeId: scopeKey, mode: 'human', heldBy: stationTag }
      }

      ws.send(JSON.stringify({ type: 'operator.command.accepted', commandId: msg.commandId || 'noid' }))
      broadcastControlState()
      broadcastDelta({
        simulationOverlay: {
          protocolVersion: PROTOCOL_VERSION,
          updatedAt: new Date().toISOString(),
          controlByScope: { [scopeKey]: globalControlScopes[scopeKey] },
        },
      })
    }
  })

  ws.on('close', () => {
    participants.delete(clientId)
    refreshPodOwnerOverrides()
  })
})
