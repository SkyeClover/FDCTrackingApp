#!/usr/bin/env node
/**
 * Live smoke tests against a running fdc-peer-server and/or fdc-radio-tunnel.
 *
 * Usage:
 *   1) Peer only (LAN):
 *        FDC_SYNC_SECRET=yoursecret node scripts/radio-tunnel-smoke.mjs --url http://127.0.0.1:8787
 *   2) Tunnel (passthrough, no serial):
 *        FDC_RADIO_PASSTHROUGH=upstream FDC_RADIO_UPSTREAM=http://127.0.0.1:8787 \\
 *          FDC_RADIO_SERIAL_PATH=COM0 node fdc-radio-tunnel.mjs   # still needs serial on Windows — use Linux or skip
 *      Better: test tunnel with passthrough on Fedora after setting upstream:
 *        node scripts/radio-tunnel-smoke.mjs --url http://127.0.0.1:8789
 *
 * Env:
 *   FDC_SYNC_SECRET  — required for signed POST /fdc/v1/ping
 */

const secret = (process.env.FDC_SYNC_SECRET || '').trim().replace(/^\uFEFF/, '')

async function hmacHex(body) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Buffer.from(sig).toString('hex')
}

async function main() {
  const args = process.argv.slice(2)
  let base = 'http://127.0.0.1:8787'
  const i = args.indexOf('--url')
  if (i >= 0 && args[i + 1]) base = args[i + 1].replace(/\/$/, '')

  console.log(`radio-tunnel-smoke: base=${base}`)

  // GET health
  const healthUrl = `${base}/fdc/v1/health`
  const h = await fetch(healthUrl)
  const ht = await h.text()
  console.log(`GET ${healthUrl} → ${h.status} ${ht.slice(0, 200)}${ht.length > 200 ? '…' : ''}`)

  // GET debug (tunnel only)
  const dbgUrl = `${base}/__fdc_radio/debug`
  const d = await fetch(dbgUrl)
  if (d.ok) {
    const dj = await d.json()
    console.log(`GET ${dbgUrl} →`, JSON.stringify(dj, null, 2))
  } else {
    console.log(`GET ${dbgUrl} → ${d.status} (expected 404 if not tunnel)`)
  }

  if (!secret) {
    console.warn('\nFDC_SYNC_SECRET not set — skip signed POST /fdc/v1/ping')
    return
  }

  const body = JSON.stringify({ kind: 'ping' })
  const sig = await hmacHex(body)
  const pingUrl = `${base}/fdc/v1/ping`
  const p = await fetch(pingUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-FDC-Signature': sig },
    body,
  })
  const pt = await p.text()
  console.log(`POST ${pingUrl} → ${p.status} ${pt}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
