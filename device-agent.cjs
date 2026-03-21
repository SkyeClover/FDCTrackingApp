/**
 * Local device agent — serves /system-info for the machine running this process.
 * Run: npm run device-agent
 * Default: http://127.0.0.1:3940
 */
const http = require('http')
const os = require('os')

const PORT = Number(process.env.FDC_DEVICE_AGENT_PORT || 3940)
const HOST = process.env.FDC_DEVICE_AGENT_HOST || '127.0.0.1'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function getSystemInfo() {
  const ifaces = os.networkInterfaces()
  let ipAddress = 'N/A'
  let macAddress = 'N/A'
  let networkInterface = 'N/A'
  for (const [name, addrs] of Object.entries(ifaces || {})) {
    for (const addr of addrs || []) {
      const fam = addr.family
      const isV4 = fam === 'IPv4' || fam === 4
      if (isV4 && !addr.internal) {
        ipAddress = addr.address
        macAddress = addr.mac && addr.mac !== '00:00:00:00:00:00' ? addr.mac : macAddress
        networkInterface = name
        break
      }
    }
    if (ipAddress !== 'N/A') break
  }
  return {
    ipAddress,
    macAddress,
    networkInterface,
    networkStatus: 'connected',
    hostname: os.hostname(),
    platform: os.platform(),
  }
}

const server = http.createServer((req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  const url = req.url?.split('?')[0] || ''

  if (url === '/system-info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(getSystemInfo()))
    return
  }

  if (url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'fdc-device-agent' }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not_found' }))
})

server.listen(PORT, HOST, () => {
  console.log(`Walker Track device-agent listening on http://${HOST}:${PORT}`)
  console.log('  GET /system-info')
})
