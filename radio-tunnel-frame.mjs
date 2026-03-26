/**
 * Shared FDC1 binary framing for fdc-radio-tunnel (tests + daemon).
 */
export const MAGIC = Buffer.from('FDC1', 'ascii')
export const HDR_LEN = 18
export const VERSION = 1
export const MSG_REQ_CHUNK = 1
export const MSG_RESP_CHUNK = 2
/** Default max bytes per frame payload (overridable via {@link parseFrames} options). */
export const DEFAULT_MAX_FRAME_PAYLOAD = 65520

/**
 * @param {number} msgType
 * @param {number} reqId
 * @param {number} chunkIdx
 * @param {number} chunkTot
 * @param {Buffer} payload
 */
export function buildFrame(msgType, reqId, chunkIdx, chunkTot, payload) {
  const buf = Buffer.allocUnsafe(HDR_LEN + payload.length)
  MAGIC.copy(buf, 0)
  buf[4] = VERSION
  buf[5] = msgType
  buf.writeUInt32BE(reqId, 6)
  buf.writeUInt16BE(chunkIdx, 10)
  buf.writeUInt16BE(chunkTot, 12)
  buf.writeUInt32BE(payload.length, 14)
  payload.copy(buf, HDR_LEN)
  return buf
}

/**
 * @param {Buffer} buffer
 * @param {{ maxPayload?: number }} [options]
 * @returns {{ frames: Array<{ msgType: number, reqId: number, chunkIdx: number, chunkTot: number, payload: Buffer }>, rest: Buffer }}
 */
export function parseFrames(buffer, options = {}) {
  const maxPayload = options.maxPayload ?? DEFAULT_MAX_FRAME_PAYLOAD
  const frames = []
  let offset = 0
  while (offset + HDR_LEN <= buffer.length) {
    if (buffer.subarray(offset, offset + 4).compare(MAGIC) !== 0) {
      offset += 1
      continue
    }
    const ver = buffer[offset + 4]
    const msgType = buffer[offset + 5]
    if (ver !== VERSION || (msgType !== MSG_REQ_CHUNK && msgType !== MSG_RESP_CHUNK)) {
      offset += 1
      continue
    }
    const reqId = buffer.readUInt32BE(offset + 6)
    const chunkIdx = buffer.readUInt16BE(offset + 10)
    const chunkTot = buffer.readUInt16BE(offset + 12)
    const payLen = buffer.readUInt32BE(offset + 14)
    if (payLen > maxPayload) {
      offset += 1
      continue
    }
    if (offset + HDR_LEN + payLen > buffer.length) break
    const payload = buffer.subarray(offset + HDR_LEN, offset + HDR_LEN + payLen)
    frames.push({ msgType, reqId, chunkIdx, chunkTot, payload })
    offset += HDR_LEN + payLen
  }
  return { frames, rest: buffer.subarray(offset) }
}
