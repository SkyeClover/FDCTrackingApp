/**
 * Pi / kiosk companion — HTTP on 127.0.0.1 only (not exposed on LAN).
 * System info, Onboard toggle, restart app / Pi, exit kiosk.
 *
 * Run: FDC_APP_ROOT=/home/walker-ranger/FDCTrackingApp node fdc-pi-sidecar.cjs
 * Env:
 *   FDC_APP_SERVICE — systemd unit for POST /restart-app (default: fdc-tracker.service)
 *   FDC_EXIT_CMD    — optional shell command for POST /exit instead of killing Chromium
 */
const http = require('http')
const { execFile, exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const os = require('os')

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

const HOST = process.env.FDC_SIDECAR_HOST || '127.0.0.1'
const PORT = Number(process.env.FDC_SIDECAR_PORT || 3001)
const APP_ROOT = process.env.FDC_APP_ROOT || process.cwd()
const APP_SERVICE_RAW = process.env.FDC_APP_SERVICE || 'fdc-tracker.service'
const APP_SERVICE = /^[a-zA-Z0-9_.@-]+$/.test(APP_SERVICE_RAW) ? APP_SERVICE_RAW : 'fdc-tracker.service'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

/**
 * Implements json for this module.
 */
function json(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'Content-Type': 'application/json', ...cors })
  res.end(body)
}

/**
 * Implements sh for this module.
 */
async function sh(cmd, timeout = 8000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    })
    return { out: (stdout || '').trim(), err: (stderr || '').trim(), ok: true }
  } catch (e) {
    return {
      out: (e.stdout || '').trim(),
      err: (e.stderr || e.message || '').trim(),
      ok: false,
    }
  }
}

/**
 * Implements try file cmd for this module.
 */
async function tryFileCmd(cmd, args, timeout = 4000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout, encoding: 'utf8' })
    return (stdout || '').trim()
  } catch {
    return ''
  }
}

/**
 * Implements collect system info for this module.
 */
async function collectSystemInfo() {
  const cpuTemp =
    (await tryFileCmd('vcgencmd', ['measure_temp']))
      .replace('temp=', '')
      .replace("'C", '°C') || 'N/A'
  let cpuVoltage = 'N/A'
  const vCore = await tryFileCmd('vcgencmd', ['measure_volts', 'core'])
  if (vCore) cpuVoltage = vCore.replace('volt=', '')

  let cpuLoad = 'N/A'
  const la = await tryFileCmd('cat', ['/proc/loadavg'])
  if (la) {
    const one = parseFloat(la.split(/\s+/)[0])
    if (!Number.isNaN(one)) cpuLoad = `${Math.min(100, Math.round(one * 25))}%`
  }

  let memoryTotal = '0'
  let memoryUsed = '0'
  let memoryFree = '0'
  const meminfo = await tryFileCmd('cat', ['/proc/meminfo'])
  if (meminfo) {
        /**
     * Implements parse for this module.
     */
const parse = (label) => {
      const m = meminfo.match(new RegExp(`^${label}:\\s+(\\d+)\\s+kB`, 'm'))
      return m ? BigInt(m[1]) * 1024n : 0n
    }
    const total = parse('MemTotal')
    const avail = parse('MemAvailable')
    const free = parse('MemFree')
    const used = total > avail ? total - avail : total - free
    memoryTotal = String(total)
    memoryUsed = String(used > 0n ? used : 0n)
    memoryFree = String(avail || free)
  }

  let diskTotal = '0'
  let diskUsed = '0'
  let diskFree = '0'
  const df = await tryFileCmd('df', ['-B1', '/'])
  if (df) {
    const lines = df.split('\n').filter(Boolean)
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/)
      if (parts.length >= 4) {
        diskTotal = parts[1]
        diskUsed = parts[2]
        diskFree = parts[3]
      }
    }
  }

  let uptime = 'N/A'
  const upPretty = await tryFileCmd('uptime', ['-p'])
  if (upPretty) uptime = upPretty
  else {
    const rawUp = await tryFileCmd('cat', ['/proc/uptime'])
    const sec = rawUp.split(/\s+/)[0]
    if (sec && !Number.isNaN(Number(sec))) uptime = `${Math.floor(Number(sec))}s (uptime)`
  }

  const hostname = (await tryFileCmd('hostname', [])) || os.hostname()

  let osVersion = 'N/A'
  try {
    const rel = await fs.promises.readFile('/etc/os-release', 'utf8')
    const pm = rel.match(/^PRETTY_NAME="([^"]+)"/m)
    osVersion = pm ? pm[1] : 'Linux'
  } catch {
    osVersion = 'Linux'
  }

  let cpuModel = 'N/A'
  try {
    const ci = await fs.promises.readFile('/proc/cpuinfo', 'utf8')
    const mm = ci.match(/^Model\s*:\s*(.+)$/m) || ci.match(/^model name\s*:\s*(.+)$/im)
    if (mm) cpuModel = mm[1].trim()
  } catch {
    /* ignore */
  }

  const hi = await tryFileCmd('hostname', ['-I'])
  const ips = hi.split(/\s+/).filter(Boolean).filter((ip) => !ip.startsWith('127.'))
  const ipAddress = ips[0] || 'N/A'

  let iface = 'eth0'
  const route = await tryFileCmd('ip', ['route', 'show', 'default'])
  const rm = route.match(/\bdev\s+(\S+)/)
  if (rm) iface = rm[1]

  let macAddress = 'N/A'
  const link = await tryFileCmd('ip', ['link', 'show', 'dev', iface])
  const lmac = link.match(/link\/ether\s+([0-9a-f:]+)/i)
  if (lmac) macAddress = lmac[1]

  return {
    cpuTemp,
    cpuVoltage,
    cpuLoad,
    memoryTotal,
    memoryUsed,
    memoryFree,
    diskTotal,
    diskUsed,
    diskFree,
    uptime,
    hostname,
    osVersion,
    cpuModel,
    ipAddress,
    macAddress,
    networkInterface: iface,
    networkStatus: ipAddress !== 'N/A' ? 'Connected' : 'Unknown',
    platform: 'linux',
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const p = url.pathname

  try {
    if (req.method === 'GET' && p === '/health') {
      json(res, 200, {
        ok: true,
        service: 'fdc-pi-sidecar',
        appRoot: APP_ROOT,
        appService: APP_SERVICE,
      })
      return
    }

    if (req.method === 'GET' && p === '/system-info') {
      const data = await collectSystemInfo()
      json(res, 200, data)
      return
    }

    if (req.method === 'POST' && p === '/keyboard-toggle') {
      const r = await sh(
        'bash -lc "export DISPLAY=:0; if pgrep -x onboard >/dev/null 2>&1; then pkill onboard; exit 0; else nohup onboard >/dev/null 2>&1 & exit 0; fi"',
        6000
      )
      json(res, 200, { success: r.ok, error: r.ok ? undefined : r.err || 'keyboard_toggle_failed' })
      return
    }

    if (req.method === 'POST' && p === '/restart-app') {
      const r = await sh(`sudo -n systemctl restart ${APP_SERVICE}`, 15000)
      json(res, 200, {
        success: r.ok,
        error: r.ok ? undefined : r.err || 'sudo systemctl restart failed (NOPASSWD for systemctl?)',
      })
      return
    }

    if (req.method === 'POST' && p === '/restart-pi') {
      const r = await sh('sudo -n /sbin/shutdown -r +0 || sudo -n /usr/sbin/shutdown -r +0', 5000)
      json(res, 200, {
        success: r.ok,
        error: r.ok ? undefined : r.err || 'sudo reboot failed (NOPASSWD?)',
      })
      return
    }

    if (req.method === 'POST' && p === '/exit') {
      const custom = process.env.FDC_EXIT_CMD
      const r = custom
        ? await sh(custom, 8000)
        : await sh(
            'bash -lc "pkill -f chromium || pkill -f chromium-browser || pkill -f chrome || true"',
            5000
          )
      json(res, 200, { success: true })
      return
    }

    json(res, 404, { ok: false, error: 'not_found' })
  } catch (e) {
    json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`fdc-pi-sidecar http://${HOST}:${PORT} (app root ${APP_ROOT}, restart unit ${APP_SERVICE})`)
})
