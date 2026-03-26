/**
 * RT-1523 / serial tunnel bearer — same HTTP sync contract as IP; traffic goes to
 * `fdc-radio-tunnel.mjs` on localhost (see deploy/RADIO-SYNC.md).
 */
export const RADIO_BEARER_ID = 'radio1523' as const

/**
 * Determines whether is radio bearer is true in the current context.
 */
export function isRadioBearer(bearer: string): boolean {
  return bearer === RADIO_BEARER_ID || bearer === '1523'
}

/**
 * Bearer types the browser may use for peer ping/push (HTTP to host:port).
 */
export function isPeerSyncBearerSupported(bearer: string): boolean {
  return bearer === 'ip' || isRadioBearer(bearer)
}

/** POST /fdc/v1/push retries when bearer is RT-1523 (radio drops). */
export const RADIO_PEER_PUSH_MAX_ATTEMPTS = 6
/** Initial backoff delay between push retries (ms); jittered. */
export const RADIO_PEER_PUSH_RETRY_DELAY_MS = 900
/** Signed ping retries for radio roster rows. */
export const RADIO_PEER_PING_MAX_ATTEMPTS = 5
export const RADIO_PEER_PING_RETRY_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Exponential backoff with jitter: delay * 2^attempt + random 0..250ms */
export function radioRetryDelayMs(attemptIndex: number, baseMs: number): Promise<void> {
  const exp = baseMs * Math.pow(2, Math.min(attemptIndex, 5))
  const jitter = Math.floor(Math.random() * 250)
  return sleep(exp + jitter)
}
