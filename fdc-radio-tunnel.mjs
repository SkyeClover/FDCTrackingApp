/**
 * HTTP ↔ serial tunnel for Walker Track peer sync over RT-1523 / USB-serial.
 * All knobs: radio-tunnel-config.mjs (env) and deploy/RADIO-SYNC.md.
 */
import http from 'http'
import { SerialPort } from 'serialport'
import { buildFrame, parseFrames, MSG_REQ_CHUNK, MSG_RESP_CHUNK } from './radio-tunnel-frame.mjs'
import { radioTunnelConfig as cfg } from './radio-tunnel-config.mjs'

const startedAt = Date.now()

/** @type {import('serialport').SerialPort | null} */
let port = null

/** Outgoing waiters (side A — wait for response from serial) */
const pendingHttp = new Map()

const stats = {
  serialBytesIn: 0,
  serialBytesOut: 0,
  framesIn: 0,
  framesOut: 0,
  httpRequests: 0,
  httpErrors: 0,
  dispatchRemoteOk: 0,
  dispatchRemoteFail: 0,
}

let nextReqId = 1

function ts() {
  return new Date().toISOString()
}

function dlog(msg, extra) {
  if (cfg.debug < 1) return
  if (extra !== undefined) console.error(`[${ts()}] fdc-radio-tunnel D ${msg}`, extra)
  else console.error(`[${ts()}] fdc-radio-tunnel D ${msg}`)
}

function hexPreview(buf, max = 64) {
  if (!buf || buf.length === 0) return '(empty)'
  const slice = buf.subarray(0, Math.min(buf.length, max))
  const h = slice.toString('hex')
  return buf.length > max ? `${h}…(+${buf.length - max}b)` : h
}

function allocReqId() {
  const id = nextReqId & 0xffffffff
  nextReqId++
  if (nextReqId > 0xffffffff) nextReqId = 1
  return id >>> 0
}

/** @type {Map<number, { chunks: Buffer[], total: number, msgType: number }>} */
const assemble = new Map()

function handleIncomingFrame(f) {
  const { msgType, reqId, chunkIdx, chunkTot, payload } = f
  stats.framesIn++
  if (cfg.debug >= 1) {
    dlog(
      `frame in type=${msgType} reqId=${reqId} chunk=${chunkIdx + 1}/${chunkTot} payload=${payload.length}b`
    )
  }
  if (chunkTot < 1 || chunkIdx >= chunkTot) return
  let slot = assemble.get(reqId)
  if (!slot || slot.msgType !== msgType || slot.total !== chunkTot) {
    slot = { chunks: new Array(chunkTot), received: 0, total: chunkTot, msgType }
    assemble.set(reqId, slot)
  }
  if (slot.chunks[chunkIdx]) return
  slot.chunks[chunkIdx] = payload
  slot.received++
  if (slot.received < chunkTot) return

  assemble.delete(reqId)
  const full = Buffer.concat(slot.chunks)
  if (full.length > cfg.maxMessageBytes) return

  if (msgType === MSG_REQ_CHUNK) {
    void dispatchRemoteRequest(reqId, full)
  } else if (msgType === MSG_RESP_CHUNK) {
    const pend = pendingHttp.get(reqId)
    if (pend) {
      pendingHttp.delete(reqId)
      clearTimeout(pend.timer)
      try {
        const env = JSON.parse(full.toString('utf8'))
        if (cfg.debug >= 1) dlog(`serial→HTTP resolve reqId=${reqId} status=${env.status}`)
        pend.resolve(env)
      } catch (e) {
        pend.reject(e)
      }
    } else if (cfg.debug >= 1) {
      dlog(`orphan RESP reqId=${reqId} (no pending waiter)`)
    }
  }
}

function fetchOptsWithTimeout(ms) {
  if (!ms || ms <= 0) return {}
  try {
    return { signal: AbortSignal.timeout(ms) }
  } catch {
    return {}
  }
}

async function dispatchRemoteRequest(reqId, rawBuf) {
  let env
  try {
    env = JSON.parse(rawBuf.toString('utf8'))
  } catch {
    await sendErrorResponse(reqId, 400, 'bad json')
    return
  }
  if (cfg.debug >= 1) {
    dlog(`dispatchRemote reqId=${reqId} ${env.method} ${env.path} bodyB64~${(env.bodyB64 || '').length}ch`)
  }
  if (env.v !== 1 || !env.method || !env.path) {
    stats.dispatchRemoteFail++
    await sendErrorResponse(reqId, 400, 'bad envelope')
    return
  }
  const path = String(env.path)
  if (!path.startsWith('/fdc/v1/')) {
    stats.dispatchRemoteFail++
    await sendErrorResponse(reqId, 403, 'path not allowed')
    return
  }
  const url = `${cfg.peerTarget}${path.startsWith('/') ? path : '/' + path}`
  const headers = { ...(env.headers && typeof env.headers === 'object' ? env.headers : {}) }
  const body = env.bodyB64 ? Buffer.from(String(env.bodyB64), 'base64') : undefined
  try {
    const t0 = Date.now()
    const res = await fetch(url, {
      method: env.method,
      headers,
      body: body && body.length ? body : undefined,
      ...fetchOptsWithTimeout(cfg.fetchTimeoutMs),
    })
    const text = await res.text()
    if (cfg.debug >= 1) dlog(`fetch ${url} → ${res.status} in ${Date.now() - t0}ms body=${text.length}b`)
    stats.dispatchRemoteOk++
    const out = {
      v: 1,
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
      bodyB64: Buffer.from(text, 'utf8').toString('base64'),
    }
    await sendResponseChunks(reqId, Buffer.from(JSON.stringify(out), 'utf8'))
  } catch (e) {
    stats.dispatchRemoteFail++
    const msg = e instanceof Error ? e.message : String(e)
    dlog(`dispatchRemote error`, msg)
    await sendErrorResponse(reqId, 502, msg)
  }
}

async function sendErrorResponse(reqId, status, detail) {
  const out = {
    v: 1,
    status,
    headers: { 'content-type': 'application/json' },
    bodyB64: Buffer.from(JSON.stringify({ error: detail }), 'utf8').toString('base64'),
  }
  await sendResponseChunks(reqId, Buffer.from(JSON.stringify(out), 'utf8'))
}

async function sendResponseChunks(reqId, buf) {
  const chunkSize = Math.min(cfg.chunkBytes, cfg.maxFramePayload)
  const total = Math.max(1, Math.ceil(buf.length / chunkSize))
  if (cfg.debug >= 1) dlog(`sendResponseChunks reqId=${reqId} chunks=${total} bytes=${buf.length}`)
  for (let i = 0; i < total; i++) {
    const chunk = buf.subarray(i * chunkSize, (i + 1) * chunkSize)
    const frame = buildFrame(MSG_RESP_CHUNK, reqId, i, total, chunk)
    stats.framesOut++
    await writeSerial(frame)
  }
}

function writeSerial(buf) {
  return new Promise((resolve, reject) => {
    if (!port || !port.writable) {
      reject(new Error('serial not open'))
      return
    }
    stats.serialBytesOut += buf.length
    if (cfg.debug >= 2) dlog(`serial TX ${buf.length}b`, hexPreview(buf, 96))
    port.write(buf, (err) => {
      if (err) reject(err)
      else port.drain(resolve)
    })
  })
}

async function relayOverSerial(reqId, envelopeBuf) {
  const chunkSize = Math.min(cfg.chunkBytes, cfg.maxFramePayload)
  const total = Math.max(1, Math.ceil(envelopeBuf.length / chunkSize))
  if (cfg.debug >= 1) dlog(`relayOverSerial reqId=${reqId} envelope=${envelopeBuf.length}b chunks=${total}`)
  for (let i = 0; i < total; i++) {
    const chunk = envelopeBuf.subarray(i * chunkSize, (i + 1) * chunkSize)
    const frame = buildFrame(MSG_REQ_CHUNK, reqId, i, total, chunk)
    stats.framesOut++
    await writeSerial(frame)
  }
}

async function emitUpstreamMirror(method, path, headers, bodyBuf) {
  if (!cfg.upstream || !cfg.mirrorUpstream) return
  const url = `${cfg.upstream}${path.startsWith('/') ? path : '/' + path}`
  const h = new Headers()
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'host') continue
    if (typeof v === 'string') h.set(k, v)
  }
  if (cfg.debug >= 1) dlog(`upstreamMirror → ${method} ${url}`)
  const run = fetch(url, {
    method,
    headers: h,
    body: bodyBuf && bodyBuf.length ? bodyBuf : undefined,
    ...fetchOptsWithTimeout(cfg.upstreamTimeoutMs),
  })
  if (cfg.mirrorWait) {
    try {
      const res = await run
      if (cfg.debug >= 1) dlog(`upstreamMirror done ${res.status}`)
    } catch (e) {
      if (cfg.debug >= 1) dlog('upstreamMirror failed', e instanceof Error ? e.message : e)
    }
  } else {
    void run.catch((e) => {
      if (cfg.debug >= 1) dlog('upstreamMirror failed', e instanceof Error ? e.message : e)
    })
  }
}

async function relayHttpRequest(method, path, reqHeaders, bodyBuf) {
  if (cfg.passthrough === 'upstream' && cfg.upstream) {
    const url = `${cfg.upstream}${path.startsWith('/') ? path : '/' + path}`
    const h = new Headers()
    for (const [k, v] of Object.entries(reqHeaders)) {
      if (k.toLowerCase() === 'host') continue
      if (typeof v === 'string') h.set(k, v)
    }
    if (cfg.debug >= 1) dlog(`passthrough upstream ${method} ${url}`)
    const res = await fetch(url, {
      method,
      headers: h,
      body: bodyBuf && bodyBuf.length ? bodyBuf : undefined,
      ...fetchOptsWithTimeout(cfg.upstreamTimeoutMs),
    })
    const text = await res.text()
    return { status: res.status, body: text, headers: { 'content-type': res.headers.get('content-type') || 'text/plain' } }
  }

  const reqId = allocReqId()
  const env = {
    v: 1,
    method,
    path,
    headers: reqHeaders,
    bodyB64: bodyBuf && bodyBuf.length ? bodyBuf.toString('base64') : '',
  }
  const envelopeBuf = Buffer.from(JSON.stringify(env), 'utf8')

  if (cfg.upstream) void emitUpstreamMirror(method, path, reqHeaders, bodyBuf)

  const p = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingHttp.delete(reqId)
      dlog(`timeout waiting for serial response reqId=${reqId}`)
      reject(new Error('timeout waiting for serial response'))
    }, cfg.serialResponseTimeoutMs)
    pendingHttp.set(reqId, {
      resolve: (v) => resolve(v),
      reject: (e) => reject(e),
      timer,
    })
  })

  await relayOverSerial(reqId, envelopeBuf)
  const respEnv = await p
  if (respEnv.status === undefined) throw new Error('bad response envelope')
  const status = Number(respEnv.status)
  const bodyText = respEnv.bodyB64 ? Buffer.from(String(respEnv.bodyB64), 'base64').toString('utf8') : ''
  const headers = respEnv.headers && typeof respEnv.headers === 'object' ? respEnv.headers : {}
  return { status, body: bodyText, headers }
}

let serialBuffer = Buffer.alloc(0)

function onSerialData(chunk) {
  stats.serialBytesIn += chunk.length
  if (cfg.debug >= 2) dlog(`serial RX ${chunk.length}b`, hexPreview(chunk, 96))
  serialBuffer = Buffer.concat([serialBuffer, chunk])
  const { frames, rest } = parseFrames(serialBuffer, { maxPayload: cfg.maxFramePayload })
  serialBuffer = rest
  if (cfg.debug >= 1 && serialBuffer.length > cfg.parseBufferWarnBytes) {
    dlog(`warning: serial parse buffer large (${serialBuffer.length}b) — check framing / baud`)
  }
  for (const f of frames) handleIncomingFrame(f)
}

function startSerial() {
  if (!cfg.serialPath) {
    console.error('fdc-radio-tunnel: set FDC_RADIO_SERIAL_PATH (e.g. /dev/ttyUSB0)')
    process.exit(1)
  }
  /** @type {Record<string, unknown>} */
  const openOpts = {
    path: cfg.serialPath,
    baudRate: cfg.baudRate,
    dataBits: cfg.dataBits,
    stopBits: cfg.stopBits,
    parity: cfg.parity,
    rtscts: cfg.rtscts,
    xon: cfg.xonxoff,
    xoff: cfg.xonxoff,
    xany: false,
    hupcl: cfg.hupcl,
    lock: cfg.lock,
    highWaterMark: cfg.highWaterMark,
    autoOpen: true,
  }
  port = new SerialPort(/** @type {any} */ (openOpts))
  port.on('data', onSerialData)
  port.on('error', (err) => {
    stats.httpErrors++
    console.error('serial error:', err)
  })
  return new Promise((resolve, reject) => {
    port.once('open', () => {
      dlog('serial open', {
        path: cfg.serialPath,
        baudRate: cfg.baudRate,
        dataBits: cfg.dataBits,
        parity: cfg.parity,
        stopBits: cfg.stopBits,
        rtscts: cfg.rtscts,
        xonxoff: cfg.xonxoff,
      })
      resolve(undefined)
    })
    port.once('error', reject)
  })
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj, null, cfg.debug >= 1 ? 2 : 0))
}

function clientAllowed(host) {
  if (!cfg.httpLocalhostOnly) return true
  return host === '127.0.0.1' || host === '::1' || host === '::ffff:127.0.0.1'
}

const server = http.createServer(async (req, res) => {
  const host = req.socket.remoteAddress
  if (!clientAllowed(host || '')) {
    res.writeHead(403).end('forbidden (set FDC_RADIO_HTTP_LOCALHOST_ONLY=0 for lab only)')
    return
  }
  if (!req.url) {
    res.writeHead(400).end()
    return
  }

  if (cfg.debug >= 1 && req.method === 'GET' && req.url.startsWith('/__fdc_radio/debug')) {
    json(res, 200, {
      ok: true,
      uptimeMs: Date.now() - startedAt,
      config: {
        tunnelHost: cfg.tunnelHost,
        tunnelPort: cfg.tunnelPort,
        chunkBytes: cfg.chunkBytes,
        maxFramePayload: cfg.maxFramePayload,
        maxMessageBytes: cfg.maxMessageBytes,
        serialPath: cfg.serialPath,
        baudRate: cfg.baudRate,
        dataBits: cfg.dataBits,
        stopBits: cfg.stopBits,
        parity: cfg.parity,
        rtscts: cfg.rtscts,
        xonxoff: cfg.xonxoff,
        lock: cfg.lock,
        hupcl: cfg.hupcl,
        highWaterMark: cfg.highWaterMark,
        peerTarget: cfg.peerTarget,
        upstream: cfg.upstream || null,
        passthrough: cfg.passthrough || null,
        upstreamTimeoutMs: cfg.upstreamTimeoutMs,
        serialResponseTimeoutMs: cfg.serialResponseTimeoutMs,
        fetchTimeoutMs: cfg.fetchTimeoutMs,
        httpLocalhostOnly: cfg.httpLocalhostOnly,
        mirrorUpstream: cfg.mirrorUpstream,
        mirrorWait: cfg.mirrorWait,
        debug: cfg.debug,
      },
      stats: { ...stats, pendingHttpWaiters: pendingHttp.size, assembleSlots: assemble.size },
    })
    return
  }

  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = u.pathname
  if (!pathname.startsWith('/fdc/v1/')) {
    res.writeHead(404).end()
    return
  }

  const chunks = []
  for await (const c of req) chunks.push(c)
  const bodyBuf = Buffer.concat(chunks)

  const headers = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v
  }

  stats.httpRequests++
  if (cfg.debug >= 1) {
    dlog(`HTTP ${req.method} ${pathname + u.search} body=${bodyBuf.length}b`)
  }

  try {
    const out = await relayHttpRequest(req.method || 'GET', pathname + u.search, headers, bodyBuf)
    const ctype = out.headers['content-type'] || out.headers['Content-Type'] || 'application/json'
    res.writeHead(out.status, { 'Content-Type': ctype })
    res.end(out.body)
    if (cfg.debug >= 1) dlog(`HTTP response ${out.status} body=${out.body.length}b`)
  } catch (e) {
    stats.httpErrors++
    const msg = e instanceof Error ? e.message : String(e)
    dlog(`HTTP error`, msg)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: msg }))
  }
})

async function main() {
  if (cfg.debug >= 1) {
    console.error(`[${ts()}] fdc-radio-tunnel debug level ${cfg.debug} (stderr)`)
  }
  if (!cfg.httpLocalhostOnly) {
    console.warn('fdc-radio-tunnel: FDC_RADIO_HTTP_LOCALHOST_ONLY=0 — HTTP API exposed to non-local clients. Lab use only.')
  }
  await startSerial()
  server.listen(cfg.tunnelPort, cfg.tunnelHost, () => {
    const hostLabel = cfg.tunnelHost === '0.0.0.0' ? 'all interfaces' : cfg.tunnelHost
    console.log(`fdc-radio-tunnel listening http://${hostLabel}:${cfg.tunnelPort}`)
    console.log(`  serial ${cfg.serialPath} @ ${cfg.baudRate} → ${cfg.peerTarget}`)
    if (cfg.upstream) console.log(`  FDC_RADIO_UPSTREAM: ${cfg.upstream} (mirror=${cfg.mirrorUpstream} wait=${cfg.mirrorWait})`)
    if (cfg.passthrough === 'upstream') console.log('  FDC_RADIO_PASSTHROUGH=upstream (LAN only)')
    if (cfg.debug >= 1) {
      console.log(`  debug: GET http://127.0.0.1:${cfg.tunnelPort}/__fdc_radio/debug`)
    }
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
