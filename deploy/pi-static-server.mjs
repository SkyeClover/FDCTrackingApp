/**
 * Minimal static server for Pi kiosk (Walker Track dist/).
 * Serves correct Content-Type for .wasm / SPA fallback to index.html.
 * Run from repo root: node deploy/pi-static-server.mjs
 * Env: PORT (default 3000), FDC_STATIC_ROOT (default <repo>/dist)
 */
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const DIST = process.env.FDC_STATIC_ROOT
  ? path.resolve(process.env.FDC_STATIC_ROOT)
  : path.join(REPO_ROOT, 'dist')
const PORT = Number(process.env.PORT || process.env.FDC_WEB_PORT || 3000)
const HOST = process.env.FDC_STATIC_HOST || '0.0.0.0'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

/**
 * Implements safe join for this module.
 */
function safeJoin(base, reqPath) {
  const rel = decodeURIComponent(reqPath.split('?')[0] || '/')
  const clean = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '')
  const abs = path.join(base, clean)
  if (!abs.startsWith(base)) return null
  return abs
}

/**
 * Implements send index html for this module.
 */
function sendIndexHtml(req, res) {
  const indexHtml = path.join(DIST, 'index.html')
  fs.stat(indexHtml, (e2, st2) => {
    if (!e2 && st2.isFile()) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      if (req.method === 'HEAD') return res.end()
      fs.createReadStream(indexHtml).pipe(res)
      return
    }
    res.writeHead(404)
    res.end('Not found')
  })
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    return res.end()
  }

  const urlPath = req.url === '/' ? '/index.html' : req.url
  const abs = safeJoin(DIST, urlPath)
  if (!abs) {
    res.writeHead(403)
    return res.end()
  }

  fs.stat(abs, (err, st) => {
    if (!err && st.isFile()) {
      const ext = path.extname(abs).toLowerCase()
      const type = MIME[ext] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
      if (req.method === 'HEAD') return res.end()
      fs.createReadStream(abs).pipe(res)
      return
    }
    sendIndexHtml(req, res)
  })
})

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`Walker Track: missing ${path.join(DIST, 'index.html')} — run npm run build`)
  process.exit(1)
}

server.listen(PORT, HOST, () => {
  console.log(`Walker Track static http://${HOST}:${PORT} → ${DIST}`)
})
