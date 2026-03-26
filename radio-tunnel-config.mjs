/**
 * Central env parsing for fdc-radio-tunnel (serial, HTTP, framing, lab toggles).
 * All keys are documented in deploy/RADIO-SYNC.md and .env.radio-tunnel.example.
 */
function envString(name, fallback = '') {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  return String(v).trim()
}

function envInt(name, fallback, min, max) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = parseInt(String(raw), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function envFloat(name, fallback, min, max) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = parseFloat(String(raw))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** @param {string} name @param {boolean} fallback */
function envBool(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const s = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(s)) return true
  if (['0', 'false', 'no', 'off'].includes(s)) return false
  return fallback
}

const ABS_MAX_FRAME = 16 * 1024 * 1024
const ABS_MAX_MESSAGE = 64 * 1024 * 1024

function parseParity(s) {
  const p = s.toLowerCase()
  if (['none', 'n'].includes(p)) return 'none'
  if (['even', 'e'].includes(p)) return 'even'
  if (['odd', 'o'].includes(p)) return 'odd'
  if (['mark', 'm'].includes(p)) return 'mark'
  if (['space', 's'].includes(p)) return 'space'
  return 'none'
}

function parseStopBits(s) {
  const n = parseFloat(s)
  if (n === 1.5) return 1.5
  if (n >= 2) return 2
  return 1
}

export function loadRadioTunnelConfig() {
  const tunnelHost = envString('FDC_RADIO_TUNNEL_HOST', '127.0.0.1') || '127.0.0.1'
  const tunnelPort = envInt('FDC_RADIO_TUNNEL_PORT', 8789, 1, 65535)

  const maxFramePayload = envInt('FDC_RADIO_MAX_FRAME_PAYLOAD', 65520, 512, ABS_MAX_FRAME)
  let chunkBytes = envInt('FDC_RADIO_CHUNK_BYTES', 32000, 256, ABS_MAX_FRAME)
  if (chunkBytes > maxFramePayload) chunkBytes = maxFramePayload

  const maxMessageBytes = envInt('FDC_RADIO_MAX_MESSAGE_BYTES', 48 * 1024 * 1024, 64 * 1024, ABS_MAX_MESSAGE)

  const serialPath = envString('FDC_RADIO_SERIAL_PATH', '')
  const baudRate = envInt('FDC_RADIO_BAUD', 115200, 50, 8_000_000)
  const dataBits = envInt('FDC_RADIO_DATA_BITS', 8, 5, 8)
  const stopBits = parseStopBits(envString('FDC_RADIO_STOP_BITS', '1'))
  const parity = parseParity(envString('FDC_RADIO_PARITY', 'none'))
  const rtscts = envBool('FDC_RADIO_RTSCTS', false)
  const xonxoff = envBool('FDC_RADIO_XONXOFF', false)
  const lock = envBool('FDC_RADIO_LOCK', true)
  const hupcl = envBool('FDC_RADIO_HUPCL', true)
  const highWaterMark = envInt('FDC_RADIO_HIGH_WATER_MARK', 65536, 4096, 8 * 1024 * 1024)

  const peerTarget = (envString('FDC_PEER_TARGET', 'http://127.0.0.1:8787') || 'http://127.0.0.1:8787').replace(
    /\/$/,
    ''
  )
  const upstream = envString('FDC_RADIO_UPSTREAM', '').replace(/\/$/, '')
  const passthrough = envString('FDC_RADIO_PASSTHROUGH', '').toLowerCase()
  const upstreamTimeoutMs = envInt('FDC_RADIO_UPSTREAM_TIMEOUT_MS', 60_000, 1000, 600_000)

  const serialResponseTimeoutMs = envInt('FDC_RADIO_SERIAL_RESPONSE_TIMEOUT_MS', 120_000, 5000, 3_600_000)
  const fetchTimeoutMs = envInt('FDC_RADIO_FETCH_TIMEOUT_MS', 120_000, 0, 3_600_000)

  const parseBufferWarnBytes = envInt('FDC_RADIO_PARSE_BUFFER_WARN_BYTES', 256 * 1024, 4096, 32 * 1024 * 1024)

  const httpLocalhostOnly = envBool('FDC_RADIO_HTTP_LOCALHOST_ONLY', true)
  const debug = envInt('FDC_RADIO_DEBUG', 0, 0, 2)

  const mirrorUpstream = envBool('FDC_RADIO_MIRROR_UPSTREAM', true)
  const mirrorWait = envBool('FDC_RADIO_MIRROR_WAIT', false)

  return {
    tunnelHost,
    tunnelPort,
    maxFramePayload,
    chunkBytes,
    maxMessageBytes,
    serialPath,
    baudRate,
    dataBits,
    stopBits,
    parity,
    rtscts,
    xonxoff,
    lock,
    hupcl,
    highWaterMark,
    peerTarget,
    upstream,
    passthrough,
    upstreamTimeoutMs,
    serialResponseTimeoutMs,
    fetchTimeoutMs,
    parseBufferWarnBytes,
    httpLocalhostOnly,
    debug,
    mirrorUpstream,
    mirrorWait,
  }
}

/** Singleton for tunnel process */
export const radioTunnelConfig = loadRadioTunnelConfig()
