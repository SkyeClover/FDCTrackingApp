import type { AppState } from '../types'
import { serializeState } from '../utils/saveLoad'
import { hmacSha256Hex } from './hmac'
import type { NetworkRosterRow, SyncMetaRow } from '../persistence/sqlite'

export interface PushResult {
  ok: boolean
  path: string
  status?: number
  detail?: string
  ackVersion?: number
}

/** Public base URL for a roster row (omits :443 / :80 for cleaner Vercel URLs). */
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

/**
 * POST full snapshot to a peer’s FDC ingest API (see fdc-peer-server.mjs).
 */
export async function pushSnapshotToPeer(
  row: NetworkRosterRow,
  meta: SyncMetaRow,
  state: AppState,
  stateVersion: number
): Promise<PushResult> {
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
  const snapshotJson = serializeState(state)
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

/**
 * GET /fdc/v1/status — last stored snapshot (requires HMAC when sync secret is set on server).
 * `base` is origin-like, e.g. https://my-app.vercel.app or http://192.168.1.5:8787
 */
export async function fetchIngestStatus(
  meta: SyncMetaRow,
  base: string
): Promise<{ ok: boolean; snapshotJson?: string; detail?: string; stateVersion?: number }> {
  const root = base.replace(/\/$/, '')
  const url = `${root}/fdc/v1/status`
  const secret = meta.syncSharedSecret || ''
  const sig = secret ? await hmacSha256Hex(secret, '') : ''
  const headers: Record<string, string> = {}
  if (sig) headers['X-FDC-Signature'] = sig
  try {
    const res = await fetch(url, { method: 'GET', headers, credentials: 'omit' })
    const text = await res.text()
    if (!res.ok) {
      return { ok: false, detail: text.slice(0, 240) }
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
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

/** GET /fdc/v1/health — lightweight; no auth. */
export async function fetchIngestHealth(baseRoot: string): Promise<{
  ok: boolean
  stateVersion?: number
  fromUnitId?: string | null
  detail?: string
}> {
  const root = baseRoot.replace(/\/$/, '')
  const url = `${root}/fdc/v1/health`
  try {
    const res = await fetch(url, { method: 'GET', credentials: 'omit' })
    const text = await res.text()
    if (!res.ok) return { ok: false, detail: text.slice(0, 200) }
    const j = JSON.parse(text) as { stateVersion?: number; fromUnitId?: string | null }
    return {
      ok: true,
      stateVersion: typeof j.stateVersion === 'number' ? j.stateVersion : 0,
      fromUnitId: j.fromUnitId ?? null,
    }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

export async function fetchPeerHealth(row: NetworkRosterRow): Promise<{ ok: boolean; latencyMs: number }> {
  const base = baseUrl(row)
  if (!base) return { ok: false, latencyMs: 0 }
  const url = `${base}/fdc/v1/health`
  const t0 = performance.now()
  try {
    const r = await fetch(url, { method: 'GET', credentials: 'omit' })
    return { ok: r.ok, latencyMs: Math.round(performance.now() - t0) }
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - t0) }
  }
}
