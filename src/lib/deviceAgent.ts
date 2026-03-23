/**
 * Fetch system/network info from optional local HTTP endpoints on the same machine as the browser:
 * `VITE_DEVICE_AGENT_ORIGIN` (default :3940), then kiosk sidecar (default 127.0.0.1:3001).
 */

import { getKioskSidecarOrigin } from './kioskSidecar'

export interface DeviceSystemInfo {
  ipAddress: string
  macAddress: string
  networkInterface: string
  networkStatus: string
  hostname?: string
  platform?: string
}

/**
 * Determines whether is private lan or local hostname is true in the current context.
 */
function isPrivateLanOrLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true
  if (h.endsWith('.local')) return true
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (!m) return false
  const o = m.slice(1, 5).map((x) => parseInt(x, 10))
  const [a, b] = [o[0], o[1]]
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

/**
 * Skip local-agent fetches on public hosted origins to avoid pointless connection attempts.
 * Allow on localhost, RFC1918 LAN IPs, and *.local — required for Pi kiosk in production
 * (browser at http://192.168.x.x:3000 still talks to sidecar at 127.0.0.1:3001).
 */
export function shouldAttemptLocalAgentFetch(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  if (isPrivateLanOrLocalHostname(h)) return true
  if (import.meta.env.DEV) return true
  return false
}

/**
 * Returns agent origin for downstream consumers.
 */
function getAgentOrigin(): string {
  const env = import.meta.env.VITE_DEVICE_AGENT_ORIGIN
  if (env && typeof env === 'string' && env.length > 0) return env.replace(/\/$/, '')
  return 'http://127.0.0.1:3940'
}

/** Short timeout so offline agents fail fast (reduces console noise from hanging requests). */
const FETCH_TIMEOUT_MS = 2800

/**
 * Implements abort after for this module.
 */
function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

/**
 * Implements try fetch for this module.
 */
async function tryFetch(url: string): Promise<DeviceSystemInfo> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    signal: abortAfter(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (!data || typeof data !== 'object') throw new Error('Invalid response')
  return {
    ipAddress: String(data.ipAddress ?? 'N/A'),
    macAddress: String(data.macAddress ?? 'N/A'),
    networkInterface: String(data.networkInterface ?? 'N/A'),
    networkStatus: String(data.networkStatus ?? 'N/A'),
    hostname: data.hostname != null ? String(data.hostname) : undefined,
    platform: data.platform != null ? String(data.platform) : undefined,
  }
}

/**
 * Order: device agent (VITE_DEVICE_AGENT_ORIGIN or :3940) → kiosk sidecar (VITE_KIOSK_SIDECAR_ORIGIN or :3001).
 */
export async function fetchLocalSystemInfo(): Promise<DeviceSystemInfo> {
  if (!shouldAttemptLocalAgentFetch()) {
    throw new Error('HOSTED_NO_LOCAL_AGENT')
  }
  const kioskOrigin = getKioskSidecarOrigin()
  const urls: string[] = [`${getAgentOrigin()}/system-info`, `${kioskOrigin}/system-info`]

  let lastErr: Error | null = null
  for (const url of urls) {
    try {
      return await tryFetch(url)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  if (import.meta.env.DEV && lastErr) {
    console.debug('[system-info] No local stats endpoint (kiosk helper or dev stub).')
  }
  throw lastErr ?? new Error('No system-info endpoint available')
}

/** Raw JSON from kiosk sidecar (full) or device-agent stub (partial); SystemInfo page maps fields. */
export async function fetchSystemInfoPayload(): Promise<Record<string, unknown>> {
  if (!shouldAttemptLocalAgentFetch()) {
    throw new Error('HOSTED_NO_LOCAL_AGENT')
  }
  const kioskOrigin = getKioskSidecarOrigin()
  const urls: string[] = [`${getAgentOrigin()}/system-info`, `${kioskOrigin}/system-info`]

  let lastErr: Error | null = null
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: abortAfter(FETCH_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data && typeof data === 'object') return data as Record<string, unknown>
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  if (import.meta.env.DEV && lastErr) {
    console.debug('[system-info] No local stats endpoint (kiosk helper or dev stub).')
  }
  throw lastErr ?? new Error('No system-info endpoint available')
}
