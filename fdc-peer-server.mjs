/**
 * Self-hosted peer ingest for Walker Track (Node 18+).
 * Run: FDC_SYNC_SECRET=yoursecret node fdc-peer-server.mjs
 * Default: http://0.0.0.0:8787
 *
 * POST /fdc/v1/push — JSON body { kind, fromUnitId, stateVersion, snapshotJson }
 * POST /fdc/v1/ping — JSON body { kind: "ping" } — signed; reachability only (does not mark browser present)
 * POST /fdc/v1/session-ping — JSON { kind: "session-ping" } — marks Walker Track browser tab alive on this host
 * POST /fdc/v1/browser-offline — JSON { kind: "browser-offline", clean?: boolean, fromUnitId?: string }
 * POST /fdc/v1/offline-notify — JSON { kind: "offline-notify", fromUnitId, clean?: boolean } — child tells upstream ingest
 * Header X-FDC-Signature: hex HMAC-SHA256 of raw body when FDC_SYNC_SECRET is set.
 */
import http from 'http'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.FDC_PEER_PORT || process.env.PORT || 8787)
const HOST = process.env.FDC_PEER_HOST || '0.0.0.0'
/** Match browser: trim + strip BOM so env files / copy-paste don’t break HMAC */
const SECRET = (process.env.FDC_SYNC_SECRET || '')
  .trim()
  .replace(/^\uFEFF/, '')

/** If no session-ping / push from the browser in this long, health reports stale (unclean) offline. */
const STALE_AFTER_MS = Number(process.env.FDC_BROWSER_STALE_MS || 135_000)

const storePath = path.join(process.cwd(), '.fdc-peer-last.json')

let last = {
  receivedAt: 0,
  fromUnitId: null,
  stateVersion: 0,
  snapshotJson: null,
  browserLastActivityAt: Date.now(),
  sessionOffline: null,
  offlineNotify: null,
}

function loadStore() {
  try {
    const raw = fs.readFileSync(storePath, 'utf8')
    last = { ...last, ...JSON.parse(raw) }
  } catch {
    /* empty */
  }
  if (typeof last.browserLastActivityAt !== 'number' || !Number.isFinite(last.browserLastActivityAt)) {
    last.browserLastActivityAt = Date.now()
  }
}

function saveStore() {
  try {
    fs.writeFileSync(storePath, JSON.stringify(last, null, 2), 'utf8')
  } catch (e) {
    console.error('fdc-peer: could not write store', e)
  }
}

function touchBrowserSession() {
  last.browserLastActivityAt = Date.now()
  last.sessionOffline = null
  saveStore()
}

function computeBrowserPresence() {
  const now = Date.now()
  if (last.sessionOffline && typeof last.sessionOffline === 'object') {
    return {
      browserPresent: false,
      offlineKind: last.sessionOffline.clean === false ? 'unclean' : 'clean',
    }
  }
  const lastAct = last.browserLastActivityAt || now
  if (now - lastAct > STALE_AFTER_MS) {
    return { browserPresent: false, offlineKind: 'stale' }
  }
  return { browserPresent: true, offlineKind: null }
}

loadStore()

function hmacHex(body) {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex')
}

function verifySig(body, sigHeader) {
  if (!SECRET) return true
  if (!sigHeader || typeof sigHeader !== 'string') return false
  const a = Buffer.from(hmacHex(body), 'hex')
  const b = Buffer.from(sigHeader.trim(), 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** GET /fdc/v1/status — HMAC(secret, '') when FDC_SYNC_SECRET is set */
function verifyGetSig(sigHeader) {
  if (!SECRET) return true
  if (!sigHeader || typeof sigHeader !== 'string') return false
  const a = Buffer.from(hmacHex(''), 'hex')
  const b = Buffer.from(sigHeader.trim(), 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-FDC-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders,
  })
  res.end(body)
}

function readPost(req, res, maxBytes, onBody) {
  const chunks = []
  let total = 0
  req.on('data', (c) => {
    chunks.push(c)
    total += c.length
    if (total > maxBytes) req.destroy()
  })
  req.on('end', () => {
    try {
      onBody(Buffer.concat(chunks).toString('utf8'))
    } catch {
      sendJson(res, 400, { ok: false, error: 'handler_error' })
    }
  })
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/fdc/v1/health') {
    const presence = computeBrowserPresence()
    sendJson(res, 200, {
      ok: true,
      service: 'fdc-peer',
      stateVersion: last.stateVersion,
      fromUnitId: last.fromUnitId,
      signatureRequired: Boolean(SECRET),
      secretCharCount: SECRET.length,
      /** When true, clients should trust browserPresent for “is the Walker Track tab up?” */
      stationSessionTracked: true,
      browserPresent: presence.browserPresent,
      browserOfflineKind: presence.offlineKind,
      browserLastActivityAt: last.browserLastActivityAt,
      staleAfterMs: STALE_AFTER_MS,
      offlineNotify: last.offlineNotify,
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/fdc/v1/status') {
    const sig = req.headers['x-fdc-signature']
    if (!verifyGetSig(sig)) {
      sendJson(res, 401, { ok: false, error: 'bad_signature' })
      return
    }
    sendJson(res, 200, {
      ok: true,
      stateVersion: last.stateVersion,
      fromUnitId: last.fromUnitId,
      receivedAt: last.receivedAt,
      snapshotJson: last.snapshotJson,
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/fdc/v1/ping') {
    readPost(req, res, 65536, (body) => {
      const sig = req.headers['x-fdc-signature']
      if (!verifySig(body, sig)) {
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
          note: 'no snapshot stored; does not affect browser-present',
        })
      } catch {
        sendJson(res, 400, { ok: false, error: 'parse_error' })
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/fdc/v1/session-ping') {
    readPost(req, res, 65536, (body) => {
      const sig = req.headers['x-fdc-signature']
      if (!verifySig(body, sig)) {
        sendJson(res, 401, { ok: false, error: 'bad_signature' })
        return
      }
      try {
        const msg = JSON.parse(body || '{}')
        if (msg.kind !== 'session-ping') {
          sendJson(res, 400, { ok: false, error: 'expected_kind_session_ping' })
          return
        }
        touchBrowserSession()
        sendJson(res, 200, { ok: true, sessionPong: true, receivedAt: Date.now() })
      } catch {
        sendJson(res, 400, { ok: false, error: 'parse_error' })
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/fdc/v1/browser-offline') {
    readPost(req, res, 65536, (body) => {
      const sig = req.headers['x-fdc-signature']
      if (!verifySig(body, sig)) {
        sendJson(res, 401, { ok: false, error: 'bad_signature' })
        return
      }
      try {
        const msg = JSON.parse(body || '{}')
        if (msg.kind !== 'browser-offline') {
          sendJson(res, 400, { ok: false, error: 'expected_kind_browser_offline' })
          return
        }
        last.sessionOffline = {
          clean: msg.clean !== false,
          at: Date.now(),
          fromUnitId: typeof msg.fromUnitId === 'string' ? msg.fromUnitId : null,
        }
        saveStore()
        sendJson(res, 200, { ok: true, noted: true, receivedAt: Date.now() })
      } catch {
        sendJson(res, 400, { ok: false, error: 'parse_error' })
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/fdc/v1/offline-notify') {
    readPost(req, res, 65536, (body) => {
      const sig = req.headers['x-fdc-signature']
      if (!verifySig(body, sig)) {
        sendJson(res, 401, { ok: false, error: 'bad_signature' })
        return
      }
      try {
        const msg = JSON.parse(body || '{}')
        if (msg.kind !== 'offline-notify' || typeof msg.fromUnitId !== 'string' || !msg.fromUnitId.trim()) {
          sendJson(res, 400, { ok: false, error: 'invalid_offline_notify' })
          return
        }
        last.offlineNotify = {
          fromUnitId: msg.fromUnitId.trim().slice(0, 64),
          clean: msg.clean !== false,
          receivedAt: Date.now(),
        }
        saveStore()
        sendJson(res, 200, { ok: true, relayed: true })
      } catch {
        sendJson(res, 400, { ok: false, error: 'parse_error' })
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/fdc/v1/push') {
    readPost(req, res, 50 * 1024 * 1024, (body) => {
      const sig = req.headers['x-fdc-signature']
      if (!verifySig(body, sig)) {
        sendJson(res, 401, { ok: false, error: 'bad_signature' })
        return
      }
      try {
        const msg = JSON.parse(body)
        if (msg.kind !== 'snapshot' || typeof msg.snapshotJson !== 'string') {
          sendJson(res, 400, { ok: false, error: 'invalid_payload' })
          return
        }
        last = {
          ...last,
          receivedAt: Date.now(),
          fromUnitId: msg.fromUnitId ?? null,
          stateVersion: Number(msg.stateVersion) || 0,
          snapshotJson: msg.snapshotJson,
        }
        saveStore()
        sendJson(res, 200, {
          ok: true,
          ackStateVersion: last.stateVersion,
          relayNote: 'stored locally; relay ACK down-chain is app responsibility',
        })
      } catch {
        sendJson(res, 400, { ok: false, error: 'parse_error' })
      }
    })
    return
  }

  sendJson(res, 404, { ok: false, error: 'not_found' })
})

server.listen(PORT, HOST, () => {
  console.log(`Walker Track peer server http://${HOST}:${PORT}`)
  console.log('  GET  /fdc/v1/health')
  console.log('  POST /fdc/v1/ping')
  console.log('  POST /fdc/v1/session-ping')
  console.log('  POST /fdc/v1/browser-offline')
  console.log('  POST /fdc/v1/offline-notify')
  console.log('  POST /fdc/v1/push')
  if (!SECRET) console.warn('  WARNING: FDC_SYNC_SECRET not set — signatures not required')
  else console.log(`  FDC_SYNC_SECRET: loaded (${SECRET.length} chars, must match app Network → Shared secret)`)
})
