import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAppData } from '../context/AppDataContext'
import {
  FDC_SIM_PROTOCOL_VERSION,
  parseServerMessage,
  type SimOperatorCommand,
  type SimWsServerMessage,
} from './contracts'
import type { SimControlState } from '../types'
import {
  getSyncMeta,
  listNetworkRoster,
  updateSyncMeta,
  upsertNetworkRosterRow,
  type NetworkRosterRow,
} from '../persistence/sqlite'
import { ensureBocPocRosterFromOrg } from '../components/network/rosterFromOrg'
import { buildDemoSeedState } from '../utils/demoSeed'
import { stateHasOrgEntities } from '../utils/saveLoad'
import { echelonRoleValue, getParentUnitIdForEchelonRole, type OrgUnitsSlice } from '../components/network/echelonRoleUi'

const LS_URL = 'fdc.sim.wsUrl'
const LS_AUTO = 'fdc.sim.autoConnect'
const LS_SCENARIO = 'fdc.sim.scenarioId'

export type SimConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface SimulationContextValue {
  connectionStatus: SimConnectionStatus
  lastError: string | null
  scenarioId: string
  setScenarioId: (id: string) => void
  targetUrl: string
  setTargetUrl: (url: string) => void
  autoConnect: boolean
  setAutoConnect: (v: boolean) => void
  simAppVersion: string | null
  protocolVersion: number | null
  connect: () => void
  disconnect: () => void
  sendOperatorCommand: (cmd: Omit<SimOperatorCommand, 'type'>) => void
  controlScopes: Record<string, SimControlState>
  lastSequence: number
}

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined)

/**
 * Implements default ws url for this module.
 */
function defaultWsUrl(): string {
  try {
    const env = import.meta.env.VITE_SIM_WS_URL as string | undefined
    if (env && typeof env === 'string') return env
  } catch {
    /* ignore */
  }
  return 'ws://127.0.0.1:8765'
}

/**
 * Renders the Simulation Provider UI section.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const {
    applySimulationDelta,
    applySnapshotFromJson,
    currentUserRole,
    addLog,
    brigades,
    battalions,
    bocs,
    pocs,
    launchers,
    pods,
    rsvs,
  } = useAppData()

  // --- Local state and callbacks ---
  const [targetUrl, setTargetUrlState] = useState(() => {
    try {
      return localStorage.getItem(LS_URL) || defaultWsUrl()
    } catch {
      return defaultWsUrl()
    }
  })
  const [scenarioId, setScenarioIdState] = useState(() => {
    try {
      return localStorage.getItem(LS_SCENARIO) || 'default'
    } catch {
      return 'default'
    }
  })
  const [autoConnect, setAutoConnectState] = useState(() => {
    try {
      return localStorage.getItem(LS_AUTO) === '1'
    } catch {
      return false
    }
  })

  const [connectionStatus, setConnectionStatus] = useState<SimConnectionStatus>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)
  const [simAppVersion, setSimAppVersion] = useState<string | null>(null)
  const [protocolVersion, setProtocolVersion] = useState<number | null>(null)
  const [controlScopes, setControlScopes] = useState<Record<string, SimControlState>>({})
  const [lastSequence, setLastSequence] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const manualDisconnectRef = useRef(false)
  const stationInstanceIdRef = useRef<string | null>(null)
  const lastBindSentRef = useRef<string | null>(null)
  const autoBootstrapTriedRef = useRef(false)

  const knownEntityRefs = useMemo(() => {
    const refs = new Set<string>()
    for (const bde of brigades) refs.add(`brigade:${bde.id}`)
    for (const bn of battalions) refs.add(`battalion:${bn.id}`)
    for (const boc of bocs) refs.add(`boc:${boc.id}`)
    for (const poc of pocs) refs.add(`poc:${poc.id}`)
    for (const l of launchers) refs.add(`launcher:${l.id}`)
    for (const p of pods) refs.add(`pod:${p.id}`)
    for (const r of rsvs) refs.add(`rsv:${r.id}`)
    return [...refs].sort((a, b) => a.localeCompare(b))
  }, [brigades, battalions, bocs, pocs, launchers, pods, rsvs])

  const knownPodOwners = useMemo(() => {
    const rows: { podRef: string; supportRef: string }[] = []
    for (const p of pods) {
      if (p.rsvId) {
        rows.push({ podRef: `pod:${p.id}`, supportRef: `rsv:${p.rsvId}` })
      } else if (p.pocId) {
        rows.push({ podRef: `pod:${p.id}`, supportRef: `poc:${p.pocId}` })
      } else if (p.ammoPltId) {
        rows.push({ podRef: `pod:${p.id}`, supportRef: `ammo-plt:${p.ammoPltId}` })
      }
    }
    rows.sort((a, b) => (a.podRef + a.supportRef).localeCompare(b.podRef + b.supportRef))
    return rows
  }, [pods])

  const orgRoleKey = useMemo(
    () =>
      [
        ...bocs.map((v) => `boc:${v.id}`),
        ...pocs.map((v) => `poc:${v.id}`),
      ]
        .sort((a, b) => a.localeCompare(b))
        .join('|'),
    [bocs, pocs]
  )
  const hasOrgEntities = useMemo(
    () =>
      stateHasOrgEntities({
        brigades,
        battalions,
        bocs,
        pocs,
        launchers,
      }),
    [brigades, battalions, bocs, pocs, launchers]
  )

  const getStationInstanceId = useCallback((): string => {
    if (!stationInstanceIdRef.current) {
      stationInstanceIdRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `station-${Date.now()}`
    }
    return stationInstanceIdRef.current
  }, [])

  const setTargetUrl = useCallback((url: string) => {
    setTargetUrlState(url)
    try {
      localStorage.setItem(LS_URL, url)
    } catch {
      /* ignore */
    }
  }, [])

  const setScenarioId = useCallback((id: string) => {
    setScenarioIdState(id)
    try {
      localStorage.setItem(LS_SCENARIO, id)
    } catch {
      /* ignore */
    }
  }, [])

  const setAutoConnect = useCallback((v: boolean) => {
    setAutoConnectState(v)
    try {
      localStorage.setItem(LS_AUTO, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const tearDownSocket = useCallback((userIntent: boolean) => {
    if (userIntent) manualDisconnectRef.current = true
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    const w = wsRef.current
    wsRef.current = null
    if (w && (w.readyState === WebSocket.OPEN || w.readyState === WebSocket.CONNECTING)) {
      w.close()
    }
    setConnectionStatus('disconnected')
    setControlScopes({})
  }, [])

  const disconnect = useCallback(() => {
    tearDownSocket(true)
  }, [tearDownSocket])

  const computeBinding = useCallback(() => {
    const meta = getSyncMeta()
    const orgFromRole = currentUserRole ? `${currentUserRole.type}:${currentUserRole.id}` : ''
    const orgEntityRef = orgFromRole || meta.localUnitId || 'unbound'
    return { orgEntityRef, scenarioId, knownEntityRefs, knownPodOwners }
  }, [currentUserRole, scenarioId, knownEntityRefs, knownPodOwners])

  const sendRebind = useCallback(
    (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const { orgEntityRef, scenarioId: sc, knownEntityRefs: refs, knownPodOwners: podOwners } = computeBinding()
      const key = `${orgEntityRef}|${sc}|${refs.join(',')}|${podOwners
        .map((p) => `${p.podRef}>${p.supportRef}`)
        .join(',')}`
      if (lastBindSentRef.current === key) return
      lastBindSentRef.current = key
      ws.send(
        JSON.stringify({
          type: 'client.rebind',
          protocolVersion: FDC_SIM_PROTOCOL_VERSION,
          scenarioId: sc,
          orgEntityRef,
          stationInstanceId: getStationInstanceId(),
          knownEntityRefs: refs,
          knownPodOwners: podOwners,
        })
      )
    },
    [computeBinding, getStationInstanceId]
  )

  const sendHello = useCallback(
    (ws: WebSocket) => {
      const { orgEntityRef, scenarioId: sc, knownEntityRefs: refs, knownPodOwners: podOwners } = computeBinding()
      lastBindSentRef.current = `${orgEntityRef}|${sc}|${refs.join(',')}|${podOwners
        .map((p) => `${p.podRef}>${p.supportRef}`)
        .join(',')}`
      ws.send(
        JSON.stringify({
          type: 'client.hello',
          protocolVersion: FDC_SIM_PROTOCOL_VERSION,
          scenarioId: sc,
          orgEntityRef,
          stationInstanceId: getStationInstanceId(),
          participationMode: 'mirror',
          knownEntityRefs: refs,
          knownPodOwners: podOwners,
        })
      )
    },
    [computeBinding, getStationInstanceId]
  )

  const handleServerMessage = useCallback(
    (msg: SimWsServerMessage) => {
      if (msg.type === 'server.welcome') {
        setProtocolVersion(msg.protocolVersion)
        setSimAppVersion(msg.simAppVersion)
        return
      }
      if (msg.type === 'server.rebound') {
        addLog({ type: 'info', message: `Simulation re-bound: ${msg.orgEntityRef} � scenario ${msg.scenarioId}` })
        return
      }
      if (msg.type === 'fdc.sim.v1.delta') {
        setLastSequence(msg.sequence)
        applySimulationDelta(msg.payload)
        return
      }
      if (msg.type === 'control.state') {
        setControlScopes((prev) => ({ ...prev, ...msg.scopes }))
        return
      }
      if (msg.type === 'operator.command.accepted') {
        const cid = msg.commandId ?? 'noid'
        addLog({ type: 'success', message: `Simulation command accepted (${cid.slice(0, 8)}?)` })
        return
      }
      if (msg.type === 'operator.command.rejected') {
        const cid = msg.commandId ?? 'noid'
        addLog({ type: 'warning', message: `Simulation command rejected: ${msg.reason ?? 'unknown'} (${cid.slice(0, 8)}?)` })
        return
      }
      if (msg.type === 'server.error') {
        setLastError(`${msg.code}: ${msg.message}`)
        return
      }
      if (msg.type === 'server.ping') {
        const w = wsRef.current
        if (w?.readyState === WebSocket.OPEN) {
          w.send(JSON.stringify({ type: 'client.pong', ts: Date.now() }))
        }
      }
    },
    [applySimulationDelta, addLog]
  )

  const connect = useCallback(() => {
    manualDisconnectRef.current = false
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    setConnectionStatus('connecting')
    setLastError(null)

    let ws: WebSocket
    try {
      ws = new WebSocket(targetUrl)
    } catch (e) {
      setConnectionStatus('error')
      setLastError(e instanceof Error ? e.message : 'WebSocket construct failed')
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      sendHello(ws)
    }

    ws.onmessage = (ev) => {
      const parsed = parseServerMessage(String(ev.data))
      if (parsed) handleServerMessage(parsed)
    }

    ws.onerror = () => {
      setLastError('WebSocket error')
    }

    ws.onclose = () => {
      if (wsRef.current !== ws) return
      wsRef.current = null
      if (!manualDisconnectRef.current && autoConnect) {
        setConnectionStatus('connecting')
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, 3000)
      } else {
        setConnectionStatus(manualDisconnectRef.current ? 'disconnected' : 'error')
      }
    }
  }, [autoConnect, handleServerMessage, sendHello, targetUrl])

  // --- Side effects ---
  useEffect(() => {
    const w = wsRef.current
    if (!w || w.readyState !== WebSocket.OPEN) return
    sendRebind(w)
  }, [connectionStatus, computeBinding, sendRebind])

  useEffect(() => {
        /**
     * Implements on meta for this module.
     */
const onMeta = () => {
      const w = wsRef.current
      if (!w || w.readyState !== WebSocket.OPEN) return
      sendRebind(w)
    }
    window.addEventListener('fdc-sync-meta-changed', onMeta)
    return () => window.removeEventListener('fdc-sync-meta-changed', onMeta)
  }, [sendRebind])

  const sendOperatorCommand = useCallback((cmd: Omit<SimOperatorCommand, 'type'>) => {
    const w = wsRef.current
    if (!w || w.readyState !== WebSocket.OPEN) return
    const full: SimOperatorCommand = { type: 'operator.command', ...cmd }
    w.send(JSON.stringify(full))
  }, [])

  useEffect(() => {
    if (!orgRoleKey) return
    const { added } = ensureBocPocRosterFromOrg(
      {
        brigades,
        battalions,
        bocs,
        pocs,
      },
      true
    )
    if (added > 0) {
      addLog({
        type: 'info',
        message: `Auto-added ${added} POC/BOC network roster entr${added === 1 ? 'y' : 'ies'} from org`,
      })
    }
  }, [orgRoleKey, brigades, battalions, bocs, pocs, addLog])

  useEffect(() => {
    if (connectionStatus !== 'connected') return
    if (hasOrgEntities) return
    if (autoBootstrapTriedRef.current) return
    autoBootstrapTriedRef.current = true
    const seeded = buildDemoSeedState()
    const ok = applySnapshotFromJson(JSON.stringify(seeded))
    if (!ok) {
      addLog({ type: 'warning', message: 'Simulation auto-bootstrap failed (demo seed apply failed)' })
      autoBootstrapTriedRef.current = false
      return
    }

    const org: OrgUnitsSlice = {
      brigades: seeded.brigades,
      battalions: seeded.battalions,
      bocs: seeded.bocs,
      pocs: seeded.pocs,
    }
    const existing = listNetworkRoster()
    const byRole = new Set(existing.map((r) => r.echelonRole))
    let maxSort = existing.reduce((m, r) => Math.max(m, r.sortOrder ?? 0), 0)
        /**
     * Implements add role row for this module.
     */
const addRoleRow = (type: 'brigade' | 'battalion' | 'boc' | 'poc', id: string, name: string) => {
      const role = echelonRoleValue(type, id)
      if (byRole.has(role)) return
      maxSort += 1
      const row: NetworkRosterRow = {
        id: crypto.randomUUID(),
        displayName: name,
        echelonRole: role,
        parentUnitId: getParentUnitIdForEchelonRole(role, org),
        host: '127.0.0.1',
        port: 8787,
        useTls: false,
        bearer: 'ip',
        status: 'unknown',
        lastSeenMs: null,
        lastError: null,
        sortOrder: maxSort,
        peerUnitId: role,
        syncAlertsEnabled: true,
        autoAcceptSync: false,
        stationOfflineSinceMs: null,
      }
      upsertNetworkRosterRow(row)
      byRole.add(role)
    }
    for (const bde of seeded.brigades) addRoleRow('brigade', bde.id, bde.name)
    for (const bn of seeded.battalions) addRoleRow('battalion', bn.id, bn.name)
    for (const boc of seeded.bocs) addRoleRow('boc', boc.id, boc.name)
    for (const poc of seeded.pocs) addRoleRow('poc', poc.id, poc.name)
    const meta = getSyncMeta()
    if (!meta.localUnitId && seeded.pocs[0]) {
      updateSyncMeta({ localUnitId: `poc:${seeded.pocs[0].id}` })
    }
    addLog({
      type: 'success',
      message: 'Simulation auto-bootstrap loaded demo force and network roster',
    })
  }, [connectionStatus, hasOrgEntities, applySnapshotFromJson, addLog])

  useEffect(() => {
    if (!autoConnect) return undefined
    manualDisconnectRef.current = false
    const t = window.setTimeout(() => connect(), 400)
    return () => {
      window.clearTimeout(t)
      tearDownSocket(false)
    }
  }, [autoConnect, connect, tearDownSocket])

  const value = useMemo<SimulationContextValue>(
    () => ({
      connectionStatus,
      lastError,
      scenarioId,
      setScenarioId,
      targetUrl,
      setTargetUrl,
      autoConnect,
      setAutoConnect,
      simAppVersion,
      protocolVersion,
      connect,
      disconnect,
      sendOperatorCommand,
      controlScopes,
      lastSequence,
    }),
    [
      connectionStatus,
      lastError,
      scenarioId,
      setScenarioId,
      targetUrl,
      setTargetUrl,
      autoConnect,
      setAutoConnect,
      simAppVersion,
      protocolVersion,
      connect,
      disconnect,
      sendOperatorCommand,
      controlScopes,
      lastSequence,
    ]
  )

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

/**
 * Manages simulation state and behavior for this hook.
 */
export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider')
  return ctx
}
