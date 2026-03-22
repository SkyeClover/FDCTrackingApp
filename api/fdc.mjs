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

function hasKvEnv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

function hasRedisUrl() {
  return Boolean(process.env.REDIS_URL?.trim())
}

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

let memoryLast = {
  receivedAt: 0,
  fromUnitId: null,
  stateVersion: 0,
  snapshotJson: null,
}

function hmacHex(body) {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex')
}

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

async function writeKvLast(obj) {
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set('fdc:last', JSON.stringify(obj))
  } catch {
    /* KV optional */
  }
}

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

async function getLast() {
  if (hasRedisUrl()) {
    const j = await readRedisLast()
    if (j && typeof j === 'object') return { ...memoryLast, ...j }
  }
  if (hasKvEnv()) {
    const j = await readKvLast()
    if (j && typeof j === 'object') return { ...memoryLast, ...j }
  }
  return memoryLast
}

async function setLast(next) {
  memoryLast = next
  if (hasRedisUrl()) {
    await writeRedisLast(next)
  } else if (hasKvEnv()) {
    await writeKvLast(next)
  }
}

function sendJson(res, status, obj, extra = {}) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...extra,
  })
  res.end(body)
}

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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const url = new URL(req.url || '/', 'http://n')
  const route = url.searchParams.get('route') || ''

  if (req.method === 'GET' && route === 'health') {
    const last = await getLast()
    sendJson(res, 200, {
      ok: true,
      service: 'fdc-peer',
      stateVersion: last.stateVersion || 0,
      fromUnitId: last.fromUnitId ?? null,
      signatureRequired: Boolean(SECRET),
      secretCharCount: SECRET.length,
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
      const next = {
        receivedAt: Date.now(),
        fromUnitId: msg.fromUnitId ?? null,
        stateVersion: Number(msg.stateVersion) || 0,
        snapshotJson: msg.snapshotJson,
      }
      await setLast(next)
      sendJson(res, 200, {
        ok: true,
        ackStateVersion: next.stateVersion,
        relayNote: `stored (${getStoreHint()}); relay ACK down-chain is app responsibility`,
      })
    } catch {
      sendJson(res, 400, { ok: false, error: 'parse_error' })
    }
    return
  }

  sendJson(res, 404, { ok: false, error: 'not_found' })
}
