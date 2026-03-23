/**
 * Vercel serverless: same contract as fdc-peer-server.mjs (GET/POST /fdc/v1/*, incl. /ping).
 * Rewrites in vercel.json map /fdc/v1/* → /api/fdc?route=*
 *
 * Storage (first match wins):
 * - REDIS_URL — Redis Cloud / any TCP Redis (ioredis), e.g. redis:// or rediss://
 * - KV_REST_API_URL + KV_REST_API_TOKEN — Upstash REST via @vercel/kv
 * Otherwise in-memory (unreliable across cold starts).
 */
import crypto from 'node:crypto'

/** Upstash/Vercel marketplace often sets UPSTASH_*; @vercel/kv expects KV_REST_* */
if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_URL) {
  process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_URL
}
if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_TOKEN) {
  process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
}

/** Vercel “Redis” integration often injects a custom name like walkertrackRedIS_REDIS_URL */
if (!process.env.REDIS_URL && process.env.walkertrackRedIS_REDIS_URL) {
  process.env.REDIS_URL = process.env.walkertrackRedIS_REDIS_URL.trim()
}
if (!process.env.REDIS_URL) {
  for (const key of Object.keys(process.env)) {
    if (!key.endsWith('REDIS_URL') || key.includes('REST')) continue
    const v = process.env[key]?.trim()
    if (v && /^(redis|rediss):\/\//.test(v)) {
      process.env.REDIS_URL = v
      break
    }
  }
}

const SECRET = (process.env.FDC_SYNC_SECRET || '')
  .trim()
  .replace(/^\uFEFF/, '')

/**
 * Determines whether has kv env is true in the current context.
 */
function hasKvEnv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * Determines whether has redis url is true in the current context.
 */
function hasRedisUrl() {
  return Boolean(process.env.REDIS_URL?.trim())
}

/**
 * Returns store hint for downstream consumers.
 */
function getStoreHint() {
  if (hasRedisUrl()) return 'redis'
  if (hasKvEnv()) return 'kv'
  return 'memory'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-FDC-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const STALE_AFTER_MS = Number(process.env.FDC_BROWSER_STALE_MS || 135000)

/**
 * Implements default state for this module.
 */
function defaultState() {
  return {
    receivedAt: 0,
    fromUnitId: null,
    stateVersion: 0,
    snapshotJson: null,
    sessions: {},
    offlineNotify: null,
    browserLastActivityAt: 0,
    sessionOffline: null,
  }
}

let memoryLast = defaultState()

/**
 * Implements norm unit for this module.
 */
function normUnit(s) {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/\s/g, '').toUpperCase()
}

/**
 * Implements hmac hex for this module.
 */
function hmacHex(body) {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex')
}

/**
 * Implements verify post sig for this module.
 */
function verifyPostSig(body, sigHeader) {
  if (!SECRET) return true
  if (!sigHeader || typeof sigHeader !== 'string') return false
  const a = Buffer.from(hmacHex(body), 'hex')
  const b = Buffer.from(sigHeader.trim(), 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** GET /fdc/v1/status uses same secret as POST body: HMAC(secret, '') */
function verifyGetSig(sigHeader) {
  if (!SECRET) return true
  if (!sigHeader || typeof sigHeader !== 'string') return false
  const a = Buffer.from(hmacHex(''), 'hex')
  const b = Buffer.from(sigHeader.trim(), 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Implements read kv last for this module.
 */
async function readKvLast() {
  try {
    const { kv } = await import('@vercel/kv')
    const raw = await kv.get('fdc:last')
    if (!raw || typeof raw !== 'string') return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Implements write kv last for this module.
 */
async function writeKvLast(obj) {
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set('fdc:last', JSON.stringify(obj))
  } catch {
    /* KV optional */
  }
}

/**
 * Implements read redis last for this module.
 */
async function readRedisLast() {
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    const { default: Redis } = await import('ioredis')
    const client = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 15000 })
    try {
      const raw = await client.get('fdc:last')
      if (!raw || typeof raw !== 'string') return null
      return JSON.parse(raw)
    } finally {
      await client.quit()
    }
  } catch (e) {
    console.error('fdc redis read', e)
    return null
  }
}

/**
 * Implements write redis last for this module.
 */
async function writeRedisLast(obj) {
  const url = process.env.REDIS_URL
  if (!url) return
  try {
    const { default: Redis } = await import('ioredis')
    const client = new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 15000 })
    try {
      await client.set('fdc:last', JSON.stringify(obj))
    } finally {
      await client.quit()
    }
  } catch (e) {
    console.error('fdc redis write', e)
  }
}

/**
 * Returns last for downstream consumers.
 */
async function getLast() {
  const d = defaultState()
  let j = null
  if (hasRedisUrl()) {
    j = await readRedisLast()
  } else if (hasKvEnv()) {
    j = await readKvLast()
  }
  const merged = { ...d, ...memoryLast, ...(j && typeof j === 'object' ? j : {}) }
  if (!merged.sessions || typeof merged.sessions !== 'object') merged.sessions = {}
  return merged
}

/**
 * Implements persist state for this module.
 */
async function persistState(s) {
  memoryLast = s
  if (hasRedisUrl()) {
    await writeRedisLast(s)
  } else if (hasKvEnv()) {
    await writeKvLast(s)
  }
}

/**
 * Implements update state for this module.
 */
async function updateState(fn) {
  const s = await getLast()
  fn(s)
  if (!s.sessions || typeof s.sessions !== 'object') s.sessions = {}
  await persistState(s)
}

/**
 * Implements compute global presence for this module.
 */
function computeGlobalPresence(s) {
  const now = Date.now()
  if (s.sessionOffline && typeof s.sessionOffline === 'object') {
    return {
      browserPresent: false,
      offlineKind: s.sessionOffline.clean === false ? 'unclean' : 'clean',
    }
  }
  const raw = s.browserLastActivityAt
  if (typeof raw !== 'number' || raw <= 0 || now - raw > STALE_AFTER_MS) {
    return { browserPresent: false, offlineKind: 'stale' }
  }
  return { browserPresent: true, offlineKind: null }
}

/**
 * Implements presence for for unit for this module.
 */
function presenceForForUnit(s, forUnitRaw) {
  const key = normUnit(forUnitRaw)
  if (!key) return computeGlobalPresence(s)
  const ent = s.sessions[key]
  if (!ent || typeof ent.browserLastActivityAt !== 'number') {
    return { browserPresent: false, offlineKind: 'stale' }
  }
  if (ent.sessionOffline && typeof ent.sessionOffline === 'object') {
    return {
      browserPresent: false,
      offlineKind: ent.sessionOffline.clean === false ? 'unclean' : 'clean',
    }
  }
  if (Date.now() - ent.browserLastActivityAt > STALE_AFTER_MS) {
    return { browserPresent: false, offlineKind: 'stale' }
  }
  return { browserPresent: true, offlineKind: null }
}

/**
 * Implements send json for this module.
 */
function sendJson(res, status, obj, extra = {}) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...extra,
  })
  res.end(body)
}

/**
 * Implements read body for this module.
 */
function readBody(req, maxBytes = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (c) => {
      chunks.push(c)
      total += c.length
      if (total > maxBytes) {
        req.destroy()
        reject(new Error('payload_too_large'))
      }
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Implements handler for this module.
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const url = new URL(req.url || '/', 'http://n')
  const route = url.searchParams.get('route') || ''

  if (req.method === 'GET' && route === 'health') {
    const forQ = (url.searchParams.get('forUnit') || '').trim()
    const last = await getLast()
    const presence = forQ ? presenceForForUnit(last, forQ) : computeGlobalPresence(last)
    const k = normUnit(forQ)
    const lastAct = forQ
      ? last.sessions[k]?.browserLastActivityAt ?? 0
      : last.browserLastActivityAt ?? 0
    const snapMis =
      Boolean(forQ) && Boolean(last.fromUnitId) && normUnit(last.fromUnitId) !== normUnit(forQ)
    /** Without forUnit on a shared host we cannot attribute tab presence to a roster row (set Peer unit ID). */
    const stationSessionTracked = forQ ? true : false
    sendJson(res, 200, {
      ok: true,
      service: 'fdc-peer',
      stateVersion: last.stateVersion || 0,
      fromUnitId: last.fromUnitId ?? null,
      signatureRequired: Boolean(SECRET),
      secretCharCount: SECRET.length,
      stationSessionTracked,
      forUnit: forQ || null,
      snapshotUnitMismatch: snapMis,
      browserPresent: presence.browserPresent,
      browserOfflineKind: presence.offlineKind,
      browserLastActivityAt: lastAct,
      staleAfterMs: STALE_AFTER_MS,
      offlineNotify: last.offlineNotify ?? null,
    })
    return
  }

  if (req.method === 'GET' && route === 'status') {
    const sig = req.headers['x-fdc-signature']
    if (!verifyGetSig(sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    const last = await getLast()
    sendJson(res, 200, {
      ok: true,
      stateVersion: last.stateVersion || 0,
      fromUnitId: last.fromUnitId,
      receivedAt: last.receivedAt,
      snapshotJson: last.snapshotJson,
    })
    return
  }

  if (req.method === 'POST' && route === 'ping') {
    let body
    try {
      body = await readBody(req, 65536)
    } catch (e) {
      sendJson(res, 413, { ok: false, error: e instanceof Error ? e.message : 'too_large' })
      return
    }
    const sig = req.headers['x-fdc-signature']
    if (!verifyPostSig(body, sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    try {
      const msg = JSON.parse(body || '{}')
      if (msg.kind !== 'ping') {
        sendJson(res, 400, { ok: false, error: 'expected_kind_ping' })
        return
      }
      sendJson(res, 200, {
        ok: true,
        pong: true,
        receivedAt: Date.now(),
        note: 'no snapshot stored',
      })
    } catch {
      sendJson(res, 400, { ok: false, error: 'parse_error' })
    }
    return
  }

  if (req.method === 'POST' && route === 'session-ping') {
    let body
    try {
      body = await readBody(req, 65536)
    } catch (e) {
      sendJson(res, 413, { ok: false, error: e instanceof Error ? e.message : 'too_large' })
      return
    }
    const sig = req.headers['x-fdc-signature']
    if (!verifyPostSig(body, sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    try {
      const msg = JSON.parse(body || '{}')
      if (msg.kind !== 'session-ping') {
        sendJson(res, 400, { ok: false, error: 'expected_kind_session_ping' })
        return
      }
      const uid =
        typeof msg.unitId === 'string'
          ? msg.unitId
          : typeof msg.fromUnitId === 'string'
            ? msg.fromUnitId
            : ''
      await updateState((s) => {
        const key = normUnit(uid)
        if (key) {
          s.sessions[key] = s.sessions[key] || {}
          s.sessions[key].browserLastActivityAt = Date.now()
          s.sessions[key].sessionOffline = null
        } else {
          s.browserLastActivityAt = Date.now()
          s.sessionOffline = null
        }
      })
      sendJson(res, 200, { ok: true, sessionPong: true, receivedAt: Date.now() })
    } catch {
      sendJson(res, 400, { ok: false, error: 'parse_error' })
    }
    return
  }

  if (req.method === 'POST' && route === 'browser-offline') {
    let body
    try {
      body = await readBody(req, 65536)
    } catch (e) {
      sendJson(res, 413, { ok: false, error: e instanceof Error ? e.message : 'too_large' })
      return
    }
    const sig = req.headers['x-fdc-signature']
    if (!verifyPostSig(body, sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    try {
      const msg = JSON.parse(body || '{}')
      if (msg.kind !== 'browser-offline') {
        sendJson(res, 400, { ok: false, error: 'expected_kind_browser_offline' })
        return
      }
      const uid = typeof msg.fromUnitId === 'string' ? msg.fromUnitId : ''
      const off = {
        clean: msg.clean !== false,
        at: Date.now(),
        fromUnitId: uid || null,
      }
      await updateState((s) => {
        const key = normUnit(uid)
        if (key) {
          s.sessions[key] = s.sessions[key] || {}
          s.sessions[key].sessionOffline = off
        } else {
          s.sessionOffline = off
        }
      })
      sendJson(res, 200, { ok: true, noted: true, receivedAt: Date.now() })
    } catch {
      sendJson(res, 400, { ok: false, error: 'parse_error' })
    }
    return
  }

  if (req.method === 'POST' && route === 'offline-notify') {
    let body
    try {
      body = await readBody(req, 65536)
    } catch (e) {
      sendJson(res, 413, { ok: false, error: e instanceof Error ? e.message : 'too_large' })
      return
    }
    const sig = req.headers['x-fdc-signature']
    if (!verifyPostSig(body, sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    try {
      const msg = JSON.parse(body || '{}')
      if (msg.kind !== 'offline-notify' || typeof msg.fromUnitId !== 'string' || !msg.fromUnitId.trim()) {
        sendJson(res, 400, { ok: false, error: 'invalid_offline_notify' })
        return
      }
      await updateState((s) => {
        s.offlineNotify = {
          fromUnitId: msg.fromUnitId.trim().slice(0, 64),
          clean: msg.clean !== false,
          receivedAt: Date.now(),
        }
      })
      sendJson(res, 200, { ok: true, relayed: true })
    } catch {
      sendJson(res, 400, { ok: false, error: 'parse_error' })
    }
    return
  }

  if (req.method === 'POST' && route === 'push') {
    let body
    try {
      body = await readBody(req)
    } catch (e) {
      sendJson(res, 413, { ok: false, error: e instanceof Error ? e.message : 'too_large' })
      return
    }
    const sig = req.headers['x-fdc-signature']
    if (!verifyPostSig(body, sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    try {
      const msg = JSON.parse(body)
      if (msg.kind !== 'snapshot' || typeof msg.snapshotJson !== 'string') {
        sendJson(res, 400, { ok: false, error: 'invalid_payload' })
        return
      }
      const sv = Number(msg.stateVersion) || 0
      await updateState((s) => {
        Object.assign(s, {
          receivedAt: Date.now(),
          fromUnitId: msg.fromUnitId ?? null,
          stateVersion: sv,
          snapshotJson: msg.snapshotJson,
        })
      })
      sendJson(res, 200, {
        ok: true,
        ackStateVersion: sv,
        relayNote: `stored (${getStoreHint()}); relay ACK down-chain is app responsibility`,
      })
    } catch {
      sendJson(res, 400, { ok: false, error: 'parse_error' })
    }
    return
  }

  sendJson(res, 404, { ok: false, error: 'not_found' })
}
