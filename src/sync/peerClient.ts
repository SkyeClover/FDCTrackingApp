import type { AppState } from '../types'
import { serializeStateForPeerSync } from '../utils/saveLoad'
import { hmacSha256Hex } from './hmac'
import { listNetworkRoster, type NetworkRosterRow, type SyncMetaRow } from '../persistence/sqlite'

export interface PushResult {
  ok: boolean
  path: string
  status?: number
  detail?: string
  ackVersion?: number
}

/** Public base URL for a roster row (omits default HTTPS/HTTP ports when building URLs). */
export function peerBaseUrl(row: NetworkRosterRow): string | null {
  if (!row.host || row.port == null) return null
  const scheme = row.useTls ? 'https' : 'http'
  const defaultPort = row.useTls ? 443 : 80
  const portPart = row.port === defaultPort ? '' : `:${row.port}`
  return `${scheme}://${row.host}${portPart}`
}

function baseUrl(row: NetworkRosterRow): string | null {
  return peerBaseUrl(row)
}

const DEFAULT_PEER_LISTEN_PORT = 8787

/**
 * Bases to try for “this device’s” ingest (health / pull).
 * Hosted sites use the page origin only. Pi / LAN often serves the UI on :3000 (etc.) and
 * fdc-peer-server on `peerListenPort` — same hostname, different port.
 */
export function getIngestBaseCandidates(pageOrigin: string, peerListenPort: number): string[] {
  const port = Number.isFinite(peerListenPort) && peerListenPort > 0 ? peerListenPort : DEFAULT_PEER_LISTEN_PORT
  let u: URL
  try {
    u = new URL(pageOrigin)
  } catch {
    return [pageOrigin.replace(/\/$/, '')]
  }
  const pagePort = u.port || (u.protocol === 'https:' ? '443' : '80')
  const primary = `${u.protocol}//${u.host}`.replace(/\/$/, '')
  const bases: string[] = [primary]
  if (pagePort === String(port)) return bases

  const host = u.hostname
  const localSplitStack =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /\.local$/i.test(host)

  if (localSplitStack) {
    const alt = `${u.protocol}//${host}:${port}`.replace(/\/$/, '')
    if (alt !== primary) bases.push(alt)
  }
  return bases
}

/**
 * POST full snapshot to a peer’s FDC ingest API (see fdc-peer-server.mjs).
 */
/** Signed “are you up?” — does not write a snapshot on the peer. */
export async function sendPeerPing(
  row: NetworkRosterRow,
  meta: SyncMetaRow
): Promise<{ ok: boolean; path: string; detail?: string; latencyMs?: number }> {
  if (!meta.syncSharedSecret?.trim()) {
    return { ok: false, path: row.displayName, detail: 'Shared secret not set (Network → Sync).' }
  }
  const base = baseUrl(row)
  if (!base) {
    return { ok: false, path: row.displayName, detail: 'Missing host/port' }
  }
  if (row.bearer !== 'ip') {
    return {
      ok: false,
      path: `${base}/fdc/v1/ping`,
      detail: `Bearer "${row.bearer}" not supported (use IP/LAN).`,
    }
  }

  const path = `${base}/fdc/v1/ping`
  const body = JSON.stringify({ kind: 'ping' as const })
  const secret = meta.syncSharedSecret || ''
  const sig = secret ? await hmacSha256Hex(secret, body) : ''

  const t0 = performance.now()
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (sig) headers['X-FDC-Signature'] = sig

    const res = await fetch(path, {
      method: 'POST',
      headers,
      body,
      credentials: 'omit',
    })
    const text = await res.text()
    const latencyMs = Math.round(performance.now() - t0)
    if (!res.ok) {
      return { ok: false, path, detail: text.slice(0, 200), latencyMs }
    }
    try {
      const j = JSON.parse(text) as { pong?: boolean }
      if (!j.pong) return { ok: false, path, detail: 'Unexpected response', latencyMs }
    } catch {
      return { ok: false, path, detail: 'Invalid JSON response', latencyMs }
    }
    return { ok: true, path, detail: `pong (${latencyMs} ms)`, latencyMs }
  } catch (e) {
    return {
      ok: false,
      path,
      detail: e instanceof Error ? e.message : String(e),
      latencyMs: Math.round(performance.now() - t0),
    }
  }
}

export async function pushSnapshotToPeer(
  row: NetworkRosterRow,
  meta: SyncMetaRow,
  state: AppState,
  stateVersion: number
): Promise<PushResult> {
  if (!meta.syncSharedSecret?.trim()) {
    return { ok: false, path: row.displayName, detail: 'Shared secret not set (Network → Sync).' }
  }
  const base = baseUrl(row)
  if (!base) {
    return { ok: false, path: row.displayName, detail: 'Missing host/port' }
  }
  if (row.bearer !== 'ip') {
    return {
      ok: false,
      path: `${base}/fdc/v1/push`,
      detail: `Bearer "${row.bearer}" not supported in browser MVP (use IP/LAN).`,
    }
  }

  const path = `${base}/fdc/v1/push`
  const snapshotJson = serializeStateForPeerSync(state)
  const bodyObj = {
    kind: 'snapshot' as const,
    fromUnitId: meta.localUnitId,
    stateVersion,
    snapshotJson,
  }
  const body = JSON.stringify(bodyObj)
  const secret = meta.syncSharedSecret || ''
  const sig = secret ? await hmacSha256Hex(secret, body) : ''

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (sig) headers['X-FDC-Signature'] = sig

    const res = await fetch(path, {
      method: 'POST',
      headers,
      body,
      credentials: 'omit',
    })
    const text = await res.text()
    let ackVersion: number | undefined
    try {
      const j = JSON.parse(text) as { ok?: boolean; ackStateVersion?: number }
      if (typeof j.ackStateVersion === 'number') ackVersion = j.ackStateVersion
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return { ok: false, path, status: res.status, detail: text.slice(0, 200) }
    }
    return { ok: true, path, ackVersion, detail: 'ACK received' }
  } catch (e) {
    return {
      ok: false,
      path,
      detail: e instanceof Error ? e.message : String(e),
    }
  }
}

async function fetchIngestStatusAtBase(
  meta: SyncMetaRow,
  baseRoot: string
): Promise<{ ok: boolean; snapshotJson?: string; detail?: string; stateVersion?: number }> {
  if (!meta.syncSharedSecret?.trim()) {
    return { ok: false, detail: 'Shared secret not set (Network → Sync).' }
  }
  const root = baseRoot.replace(/\/$/, '')
  const url = `${root}/fdc/v1/status`
  const secret = meta.syncSharedSecret || ''
  const sig = secret ? await hmacSha256Hex(secret, '') : ''
  const headers: Record<string, string> = {}
  if (sig) headers['X-FDC-Signature'] = sig
  try {
    const res = await fetch(url, { method: 'GET', headers, credentials: 'omit' })
    const text = await res.text()
    if (!res.ok) {
      return { ok: false, detail: `${text.slice(0, 220)} (${url})` }
    }
    const j = JSON.parse(text) as { snapshotJson?: string; stateVersion?: number }
    if (typeof j.snapshotJson !== 'string' || j.snapshotJson.length === 0) {
      return { ok: false, detail: 'No snapshot in ingest yet (nothing pushed to this URL).' }
    }
    return {
      ok: true,
      snapshotJson: j.snapshotJson,
      stateVersion: typeof j.stateVersion === 'number' ? j.stateVersion : undefined,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, detail: `${msg} (${url})` }
  }
}

/**
 * GET /fdc/v1/status — tries the page origin, then on LAN/Pi the same host on `meta.peerListenPort`
 * when the UI is not served from the peer port (e.g. :3000 vs :8787).
 */
export async function fetchIngestStatus(
  meta: SyncMetaRow,
  pageOrigin: string
): Promise<{ ok: boolean; snapshotJson?: string; detail?: string; stateVersion?: number }> {
  const listenPort = meta.peerListenPort || DEFAULT_PEER_LISTEN_PORT
  const bases = getIngestBaseCandidates(pageOrigin, listenPort)
  let last: { ok: boolean; snapshotJson?: string; detail?: string; stateVersion?: number } = {
    ok: false,
    detail: 'Could not load ingest.',
  }
  for (const base of bases) {
    last = await fetchIngestStatusAtBase(meta, base)
    if (last.ok) return last
  }
  if (bases.length > 1 && last.detail) {
    last = { ...last, detail: `${last.detail} Tried: ${bases.join(' → ')}` }
  }
  return last
}

export type IngestOfflineNotify = {
  fromUnitId: string
  clean: boolean
  receivedAt: number
}

async function fetchIngestHealthAtBase(baseRoot: string): Promise<{
  ok: boolean
  stateVersion?: number
  fromUnitId?: string | null
  detail?: string
  browserPresent?: boolean
  browserOfflineKind?: 'clean' | 'stale' | 'unclean' | null
  offlineNotify?: IngestOfflineNotify | null
}> {
  const root = baseRoot.replace(/\/$/, '')
  const url = `${root}/fdc/v1/health`
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'omit' })
    const text = await res.text()
    if (!res.ok) return { ok: false, detail: `${text.slice(0, 180)} (${url})` }
    const j = JSON.parse(text) as {
      stateVersion?: number
      fromUnitId?: string | null
      browserPresent?: boolean
      browserOfflineKind?: string | null
      offlineNotify?: { fromUnitId?: string; clean?: boolean; receivedAt?: number } | null
    }
    let offlineNotify: IngestOfflineNotify | null | undefined
    if (j.offlineNotify && typeof j.offlineNotify.fromUnitId === 'string' && j.offlineNotify.receivedAt != null) {
      offlineNotify = {
        fromUnitId: j.offlineNotify.fromUnitId,
        clean: j.offlineNotify.clean !== false,
        receivedAt: Number(j.offlineNotify.receivedAt) || 0,
      }
    } else {
      offlineNotify = undefined
    }
    const kind = j.browserOfflineKind
    const browserOfflineKind =
      kind === 'clean' || kind === 'stale' || kind === 'unclean' ? kind : null
    return {
      ok: true,
      stateVersion: Number(j.stateVersion) || 0,
      fromUnitId: j.fromUnitId ?? null,
      browserPresent: typeof j.browserPresent === 'boolean' ? j.browserPresent : true,
      browserOfflineKind,
      offlineNotify: offlineNotify ?? null,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, detail: `${msg} (${url})` }
  }
}

/** GET /fdc/v1/health — same multi-base behavior as {@link fetchIngestStatus}. */
export async function fetchIngestHealth(
  pageOrigin: string,
  peerListenPort: number = DEFAULT_PEER_LISTEN_PORT
): Promise<{
  ok: boolean
  stateVersion?: number
  fromUnitId?: string | null
  detail?: string
  browserPresent?: boolean
  browserOfflineKind?: 'clean' | 'stale' | 'unclean' | null
  offlineNotify?: IngestOfflineNotify | null
}> {
  const bases = getIngestBaseCandidates(pageOrigin, peerListenPort)
  let last: {
    ok: boolean
    stateVersion?: number
    fromUnitId?: string | null
    detail?: string
    browserPresent?: boolean
    browserOfflineKind?: 'clean' | 'stale' | 'unclean' | null
    offlineNotify?: IngestOfflineNotify | null
  } = { ok: false, detail: 'Could not reach ingest health.' }
  for (const base of bases) {
    last = await fetchIngestHealthAtBase(base)
    if (last.ok) return last
  }
  if (bases.length > 1 && last.detail) {
    last = { ...last, detail: `${last.detail} Tried: ${bases.join(' → ')}` }
  }
  return last
}

/** GET health for a roster peer — transport up + browser tab presence when ingest supports it. */
export async function fetchPeerHealth(row: NetworkRosterRow): Promise<{
  transportOk: boolean
  /** Peer runs a ingest build that tracks the Walker Track tab (session-ping / offline). */
  stationSessionTracked: boolean
  /** Meaningful when stationSessionTracked; otherwise assume true for legacy (snapshot push still allowed). */
  browserPresent: boolean
  browserOfflineKind: 'clean' | 'stale' | 'unclean' | null
  /** Last snapshot on ingest was pushed with a different Local unit ID than this row’s Peer unit ID. */
  snapshotUnitMismatch: boolean
  latencyMs: number
}> {
  const base = baseUrl(row)
  if (!base) {
    return {
      transportOk: false,
      stationSessionTracked: false,
      browserPresent: false,
      browserOfflineKind: null,
      snapshotUnitMismatch: false,
      latencyMs: 0,
    }
  }
  const peerUid = row.peerUnitId?.trim()
  const url = peerUid
    ? `${base}/fdc/v1/health?forUnit=${encodeURIComponent(peerUid)}`
    : `${base}/fdc/v1/health`
  const t0 = performance.now()
  try {
    const r = await fetch(url, { method: 'GET', credentials: 'omit' })
    const latencyMs = Math.round(performance.now() - t0)
    if (!r.ok) {
      return {
        transportOk: false,
        stationSessionTracked: false,
        browserPresent: false,
        browserOfflineKind: null,
        snapshotUnitMismatch: false,
        latencyMs,
      }
    }
    const text = await r.text()
    let stationSessionTracked = false
    let browserPresent = true
    let browserOfflineKind: 'clean' | 'stale' | 'unclean' | null = null
    let snapshotUnitMismatch = false
    try {
      const j = JSON.parse(text) as {
        stationSessionTracked?: boolean
        browserPresent?: boolean
        browserOfflineKind?: string | null
        snapshotUnitMismatch?: boolean
      }
      if (j.stationSessionTracked === true) {
        stationSessionTracked = true
        browserPresent = typeof j.browserPresent === 'boolean' ? j.browserPresent : false
      }
      if (j.snapshotUnitMismatch === true) snapshotUnitMismatch = true
      const k = j.browserOfflineKind
      if (k === 'clean' || k === 'stale' || k === 'unclean') browserOfflineKind = k
    } catch {
      /* legacy health JSON — no tab tracking */
    }
    return {
      transportOk: true,
      stationSessionTracked,
      browserPresent,
      browserOfflineKind,
      snapshotUnitMismatch,
      latencyMs,
    }
  } catch {
    return {
      transportOk: false,
      stationSessionTracked: false,
      browserPresent: false,
      browserOfflineKind: null,
      snapshotUnitMismatch: false,
      latencyMs: Math.round(performance.now() - t0),
    }
  }
}

/** Roster row that receives clean / tab-close offline-notify (explicit id, else first IP peer in roster order). */
export function resolveUpstreamNotifyRosterRow(meta: SyncMetaRow): NetworkRosterRow | null {
  const roster = listNetworkRoster()
  const pick = (r: NetworkRosterRow) => Boolean(r.host && r.port != null && r.bearer === 'ip')
  const id = meta.upstreamNotifyRosterId?.trim()
  if (id) {
    const row = roster.find((r) => r.id === id)
    if (row && pick(row)) return row
  }
  return roster.find(pick) ?? null
}

async function postSignedToUrl(
  url: string,
  bodyObj: Record<string, unknown>,
  secret: string
): Promise<{ ok: boolean; status: number; detail: string }> {
  const body = JSON.stringify(bodyObj)
  const sig = secret ? await hmacSha256Hex(secret, body) : ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sig) headers['X-FDC-Signature'] = sig
  try {
    const res = await fetch(url, { method: 'POST', headers, body, credentials: 'omit' })
    const text = await res.text()
    return { ok: res.ok, status: res.status, detail: text.slice(0, 300) }
  } catch (e) {
    return { ok: false, status: 0, detail: e instanceof Error ? e.message : String(e) }
  }
}

/** Heartbeat this tab to the local peer ingest (session-ping). No-op if secret missing. */
export async function sessionPingLocalIngest(
  pageOrigin: string,
  peerListenPort: number,
  meta: SyncMetaRow
): Promise<void> {
  if (!meta.syncSharedSecret?.trim()) return
  const bases = getIngestBaseCandidates(pageOrigin, peerListenPort || DEFAULT_PEER_LISTEN_PORT)
  const uid = meta.localUnitId?.trim()
  const body = {
    kind: 'session-ping' as const,
    ...(uid ? { unitId: uid } : {}),
  }
  const secret = meta.syncSharedSecret
  for (const base of bases) {
    const root = base.replace(/\/$/, '')
    const r = await postSignedToUrl(`${root}/fdc/v1/session-ping`, body, secret)
    if (r.ok) return
  }
}

/**
 * Mark local browser session offline on this machine’s ingest (tab close / clean disconnect).
 * Uses fetch keepalive when requested so the request may complete after unload.
 */
export async function reportBrowserOfflineLocalIngest(
  pageOrigin: string,
  peerListenPort: number,
  meta: SyncMetaRow,
  options: { clean: boolean; keepalive?: boolean }
): Promise<void> {
  if (!meta.syncSharedSecret?.trim()) return
  const bases = getIngestBaseCandidates(pageOrigin, peerListenPort || DEFAULT_PEER_LISTEN_PORT)
  const bodyObj = {
    kind: 'browser-offline' as const,
    clean: options.clean,
    fromUnitId: meta.localUnitId?.trim() || undefined,
  }
  const body = JSON.stringify(bodyObj)
  const secret = meta.syncSharedSecret
  const sig = secret ? await hmacSha256Hex(secret, body) : ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sig) headers['X-FDC-Signature'] = sig
  for (const base of bases) {
    const root = base.replace(/\/$/, '')
    const url = `${root}/fdc/v1/browser-offline`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        credentials: 'omit',
        keepalive: Boolean(options.keepalive),
      })
      if (res.ok) return
    } catch {
      /* try next base */
    }
  }
}

/** POST offline-notify to {@link resolveUpstreamNotifyRosterRow}. */
export async function notifyUpstreamOffline(
  meta: SyncMetaRow,
  options: { clean: boolean; keepalive?: boolean }
): Promise<{ ok: boolean; detail: string }> {
  if (!meta.syncSharedSecret?.trim()) {
    return { ok: false, detail: 'No shared secret' }
  }
  const row = resolveUpstreamNotifyRosterRow(meta)
  if (!row) {
    return {
      ok: false,
      detail:
        'No upstream for sign-off — pick “Upstream for sign-off” below or add a roster row with host, port, IP/LAN.',
    }
  }
  const base = peerBaseUrl(row)
  if (!base) return { ok: false, detail: 'Bad peer URL' }
  const bodyObj = {
    kind: 'offline-notify' as const,
    fromUnitId: meta.localUnitId?.trim() || 'unknown',
    clean: options.clean,
  }
  const body = JSON.stringify(bodyObj)
  const secret = meta.syncSharedSecret
  const sig = secret ? await hmacSha256Hex(secret, body) : ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (sig) headers['X-FDC-Signature'] = sig
  const url = `${base.replace(/\/$/, '')}/fdc/v1/offline-notify`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      credentials: 'omit',
      keepalive: Boolean(options.keepalive),
    })
    const text = await res.text()
    if (!res.ok) return { ok: false, detail: text.slice(0, 200) }
    return { ok: true, detail: row.displayName }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}
