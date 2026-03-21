/**
 * Fetch system/network info from the local device agent (same host as browser),
 * with optional kiosk (:3001) and dev Pi-proxy (:3002) fallbacks.
 */

export interface DeviceSystemInfo {
  ipAddress: string
  macAddress: string
  networkInterface: string
  networkStatus: string
  hostname?: string
  platform?: string
}

/**
 * Browsers cannot reach a localhost agent from a public origin (e.g. Vercel).
 * Skip fetches in that case to avoid useless ERR_CONNECTION_REFUSED noise.
 * Local dev: localhost / 127.0.0.1 still tries; LAN dev in non-prod still tries.
 */
export function shouldAttemptLocalAgentFetch(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return true
  if (import.meta.env.PROD) return false
  return true
}

function getAgentOrigin(): string {
  const env = import.meta.env.VITE_DEVICE_AGENT_ORIGIN
  if (env && typeof env === 'string' && env.length > 0) return env.replace(/\/$/, '')
  return 'http://127.0.0.1:3940'
}

const usePiProxyFirst = import.meta.env.VITE_USE_PI_PROXY_SYSTEM_INFO === 'true'

/** Short timeout so offline agents fail fast (reduces console noise from hanging requests). */
const FETCH_TIMEOUT_MS = 2800

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  const c = new AbortController()
  setTimeout(() => c.abort(), ms)
  return c.signal
}

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
 * Order: [Pi proxy dev] optional → device agent (3940) → legacy kiosk (3001).
 */
export async function fetchLocalSystemInfo(): Promise<DeviceSystemInfo> {
  if (!shouldAttemptLocalAgentFetch()) {
    throw new Error('HOSTED_NO_LOCAL_AGENT')
  }
  const urls: string[] = []
  if (usePiProxyFirst) urls.push('http://localhost:3002/system-info')
  urls.push(`${getAgentOrigin()}/system-info`)
  urls.push('http://localhost:3001/system-info')

  let lastErr: Error | null = null
  for (const url of urls) {
    try {
      return await tryFetch(url)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  if (import.meta.env.DEV && lastErr) {
    console.debug(
      '[device-agent] No /system-info responded. Start `npm run device-agent` (3940), Pi kiosk :3001, or pi-proxy :3002 when using VITE_USE_PI_PROXY_SYSTEM_INFO.'
    )
  }
  throw lastErr ?? new Error('No system-info endpoint available')
}

/** Raw JSON from Pi kiosk (full) or device-agent (partial); SystemInfo page maps fields. */
export async function fetchSystemInfoPayload(): Promise<Record<string, unknown>> {
  if (!shouldAttemptLocalAgentFetch()) {
    throw new Error('HOSTED_NO_LOCAL_AGENT')
  }
  const urls: string[] = []
  if (usePiProxyFirst) urls.push('http://localhost:3002/system-info')
  urls.push(`${getAgentOrigin()}/system-info`)
  urls.push('http://localhost:3001/system-info')

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
    console.debug(
      '[device-agent] No /system-info responded. Start `npm run device-agent` (3940), Pi kiosk :3001, or pi-proxy :3002 when using VITE_USE_PI_PROXY_SYSTEM_INFO.'
    )
  }
  throw lastErr ?? new Error('No system-info endpoint available')
}
