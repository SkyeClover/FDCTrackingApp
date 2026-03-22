/**
 * Self-hosted peer ingest for Walker Track (Node 18+).
 * Run: FDC_SYNC_SECRET=yoursecret node fdc-peer-server.mjs
 * Default: http://0.0.0.0:8787
 *
 * POST /fdc/v1/push — JSON body { kind, fromUnitId, stateVersion, snapshotJson }
 * POST /fdc/v1/ping — JSON body { kind: "ping" } — signed; does not store a snapshot
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

const storePath = path.join(process.cwd(), '.fdc-peer-last.json')

let last = {
  receivedAt: 0,
  fromUnitId: null,
  stateVersion: 0,
  snapshotJson: null,
}

function loadStore() {
  try {
    const raw = fs.readFileSync(storePath, 'utf8')
    last = { ...last, ...JSON.parse(raw) }
  } catch {
    /* empty */
  }
}

function saveStore() {
  try {
    fs.writeFileSync(storePath, JSON.stringify(last, null, 2), 'utf8')
  } catch (e) {
    console.error('fdc-peer: could not write store', e)
  }
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

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/fdc/v1/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'fdc-peer',
      stateVersion: last.stateVersion,
      fromUnitId: last.fromUnitId,
      signatureRequired: Boolean(SECRET),
      /** Non-zero = secret loaded (length only; value never exposed) */
      secretCharCount: SECRET.length,
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
    const chunks = []
    let total = 0
    req.on('data', (c) => {
      chunks.push(c)
      total += c.length
      if (total > 65536) req.destroy()
    })
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
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
          note: 'no snapshot stored',
        })
      } catch {
        sendJson(res, 400, { ok: false, error: 'parse_error' })
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/fdc/v1/push') {
    const chunks = []
    let total = 0
    req.on('data', (c) => {
      chunks.push(c)
      total += c.length
      if (total > 50 * 1024 * 1024) req.destroy()
    })
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
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
  console.log('  POST /fdc/v1/push')
  if (!SECRET) console.warn('  WARNING: FDC_SYNC_SECRET not set — signatures not required')
  else console.log(`  FDC_SYNC_SECRET: loaded (${SECRET.length} chars, must match app Network → Shared secret)`)
})
