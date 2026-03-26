#!/usr/bin/env node
/**
 * Unit-style tests for radio-tunnel-frame.mjs (no serial, no HTTP).
 *   node scripts/radio-tunnel-selftest.mjs
 */
import assert from 'assert'
import {
  buildFrame,
  parseFrames,
  MSG_REQ_CHUNK,
  MSG_RESP_CHUNK,
  HDR_LEN,
} from '../radio-tunnel-frame.mjs'

function test(name, fn) {
  try {
    fn()
    console.log(`ok  ${name}`)
  } catch (e) {
    console.error(`FAIL ${name}`, e)
    process.exit(1)
  }
}

test('parseFrames single frame round-trip', () => {
  const payload = Buffer.from('hello')
  const f = buildFrame(MSG_REQ_CHUNK, 42, 0, 1, payload)
  assert.strictEqual(f.length, HDR_LEN + 5)
  const { frames, rest } = parseFrames(f)
  assert.strictEqual(frames.length, 1)
  assert.strictEqual(frames[0].reqId, 42)
  assert.strictEqual(frames[0].msgType, MSG_REQ_CHUNK)
  assert.strictEqual(frames[0].chunkIdx, 0)
  assert.strictEqual(frames[0].chunkTot, 1)
  assert.deepStrictEqual(frames[0].payload, payload)
  assert.strictEqual(rest.length, 0)
})

test('parseFrames with garbage prefix', () => {
  const payload = Buffer.from('x')
  const frame = buildFrame(MSG_RESP_CHUNK, 7, 0, 1, payload)
  const garbage = Buffer.concat([Buffer.from([0xff, 0xfe]), frame])
  const { frames, rest } = parseFrames(garbage)
  assert.strictEqual(frames.length, 1)
  assert.strictEqual(frames[0].reqId, 7)
  assert.strictEqual(rest.length, 0)
})

test('parseFrames multiple frames in one buffer', () => {
  const a = buildFrame(MSG_REQ_CHUNK, 1, 0, 1, Buffer.from('a'))
  const b = buildFrame(MSG_REQ_CHUNK, 2, 0, 1, Buffer.from('b'))
  const { frames } = parseFrames(Buffer.concat([a, b]))
  assert.strictEqual(frames.length, 2)
  assert.strictEqual(frames[0].reqId, 1)
  assert.strictEqual(frames[1].reqId, 2)
})

test('split payload reassembles like tunnel (3 chunks)', () => {
  const big = Buffer.alloc(70000, 0xab)
  const chunkSize = 32000
  const total = Math.ceil(big.length / chunkSize)
  assert.strictEqual(total, 3)
  const frames = []
  for (let i = 0; i < total; i++) {
    const chunk = big.subarray(i * chunkSize, (i + 1) * chunkSize)
    frames.push(buildFrame(MSG_REQ_CHUNK, 99, i, total, chunk))
  }
  const buf = Buffer.concat(frames)
  const parsed = parseFrames(buf)
  assert.strictEqual(parsed.frames.length, 3)
  const merged = Buffer.concat(parsed.frames.map((f) => f.payload))
  assert.deepStrictEqual(merged, big)
})

console.log('\nradio-tunnel-selftest: all passed\n')
