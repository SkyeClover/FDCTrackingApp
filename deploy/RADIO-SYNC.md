# RT-1523 / serial radio sync

Peer sync uses HTTP to `fdc-peer-server` (`/fdc/v1/ping`, `/fdc/v1/push`, `GET /fdc/v1/health`). The **fdc-radio-tunnel** daemon carries those requests over a **USB–serial** link to the radio data port; the remote station runs the same tunnel, which forwards to its local **`http://127.0.0.1:8787`**.

The browser does not open the serial port. Set the network roster to **RT-1523 (serial tunnel)** with **host** `127.0.0.1` and **port** = `FDC_RADIO_TUNNEL_PORT` (default **8789**).

**Full env template:** [`.env.radio-tunnel.example`](../.env.radio-tunnel.example) in the repo (copy and export in your shell). **Print resolved config:** `npm run radio-tunnel:config`.

## Prerequisites

- Node.js 18+ on both ends (Raspberry Pi 5 and Fedora ThinkPad are supported).
- `npm install` in the repo root (installs **`serialport`**, a native module — on Pi/Fedora install `build-essential` / `gcc-c++` / `python3` if prebuilds miss).
- **`fdc-peer-server`** running on each machine (`deploy/pi-install-all.sh` or `deploy/fedora-install-peer.sh`).
- USB cable from computer to radio data port; baud must match the radio **DATA** configuration (start with **`FDC_RADIO_BAUD=115200`** and adjust per your TM).

## Environment variables (reference)

Implementation: `radio-tunnel-config.mjs`. **Both ends of a radio link should use the same framing** (`FDC_RADIO_CHUNK_BYTES`, `FDC_RADIO_MAX_FRAME_PAYLOAD`) unless you only change one side in a lab.

### HTTP (`fdc-radio-tunnel` listener)

| Variable | Default | Meaning |
|----------|---------|---------|
| `FDC_RADIO_TUNNEL_HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` only to expose the tunnel on all interfaces (firewall + lab risk). |
| `FDC_RADIO_TUNNEL_PORT` | `8789` | TCP port for the tunnel HTTP API. |
| `FDC_RADIO_HTTP_LOCALHOST_ONLY` | `1` | If `1`, only `127.0.0.1` / `::1` may connect. Set `0` to allow remote clients (e.g. another VM hitting your machine) — **not** for production. |

### Framing (serial wire format)

| Variable | Default | Meaning |
|----------|---------|---------|
| `FDC_RADIO_CHUNK_BYTES` | `32000` | Size of each chunk when splitting JSON envelopes. Lower this on noisy/slow links. Min 256; capped by max frame. |
| `FDC_RADIO_MAX_FRAME_PAYLOAD` | `65520` | Max bytes per frame payload. **Both stations must match.** |
| `FDC_RADIO_MAX_MESSAGE_BYTES` | `50331648` | Max reassembled JSON envelope (request/response) before drop. |

### Serial port (match radio DATA + USB adapter)

| Variable | Default | Meaning |
|----------|---------|---------|
| `FDC_RADIO_SERIAL_PATH` | (required) | e.g. `/dev/ttyUSB0`, `/dev/ttyACM0`, Windows `COM3`. |
| `FDC_RADIO_BAUD` | `115200` | Bit rate — must match radio **DATA** (try `9600`, `19200`, `57600`, `115200` as needed). |
| `FDC_RADIO_DATA_BITS` | `8` | `5`–`8`. |
| `FDC_RADIO_STOP_BITS` | `1` | `1`, `1.5`, or `2`. |
| `FDC_RADIO_PARITY` | `none` | `none`, `even`, `odd`, `mark`, `space`. |
| `FDC_RADIO_RTSCTS` | `0` | `1` = hardware flow control. |
| `FDC_RADIO_XONXOFF` | `0` | `1` = software XON/XOFF. |
| `FDC_RADIO_LOCK` | `1` | Exclusive lock on the device (platform-dependent). |
| `FDC_RADIO_HUPCL` | `1` | Lower modem control lines on close. |
| `FDC_RADIO_HIGH_WATER_MARK` | `65536` | Stream high-water mark (bytes). |

### Peer ingest & timeouts

| Variable | Default | Meaning |
|----------|---------|---------|
| `FDC_PEER_TARGET` | `http://127.0.0.1:8787` | Local `fdc-peer-server` base URL (remote tunnel forwards here). |
| `FDC_RADIO_SERIAL_RESPONSE_TIMEOUT_MS` | `120000` | Max wait for a full response over serial after a request. |
| `FDC_RADIO_FETCH_TIMEOUT_MS` | `120000` | Max wait for `fetch()` to **local** ingest when executing a request received over serial. `0` = no AbortSignal timeout. |
| `FDC_RADIO_PARSE_BUFFER_WARN_BYTES` | `262144` | Log a warning if the serial parse buffer grows past this (framing/baud issues). |

### Upstream / “network” playbooks

| Variable | Default | Meaning |
|----------|---------|---------|
| `FDC_RADIO_UPSTREAM` | (empty) | If set (e.g. `http://192.168.1.10:8787`), optionally **mirror** the same HTTP to a LAN peer. |
| `FDC_RADIO_UPSTREAM_TIMEOUT_MS` | `60000` | Timeout for upstream mirror `fetch`. |
| `FDC_RADIO_MIRROR_UPSTREAM` | `1` | `0` = do not mirror to upstream (serial only). |
| `FDC_RADIO_MIRROR_WAIT` | `0` | `1` = await upstream mirror (slower; debugging). `0` = fire-and-forget. |
| `FDC_RADIO_PASSTHROUGH` | (empty) | If `upstream`, satisfy HTTP from **`FDC_RADIO_UPSTREAM` only** (no serial) — bench LAN. |

### Debug

| Variable | Default | Meaning |
|----------|---------|---------|
| `FDC_RADIO_DEBUG` | `0` | `1` = stderr logs (HTTP, frames, timings). `2` = also hex previews of serial TX/RX. Debug endpoint requires `>=1`. |

## Debugging and tests

**Dump effective config (no serial open):**

```bash
npm run radio-tunnel:config
FDC_RADIO_BAUD=9600 npm run radio-tunnel:config
```

**Frame codec (no hardware):**

```bash
npm run radio-tunnel:selftest
```

**Verbose tunnel (stderr):**

```bash
FDC_RADIO_DEBUG=1 FDC_RADIO_SERIAL_PATH=/dev/ttyUSB0 npm run radio-tunnel
# Windows PowerShell:
# $env:FDC_RADIO_DEBUG=1; $env:FDC_RADIO_SERIAL_PATH="COM3"; npm run radio-tunnel
```

**Stats JSON (localhost only, requires `FDC_RADIO_DEBUG>=1`):**

```bash
curl -s "http://127.0.0.1:8789/__fdc_radio/debug" | jq .
```

**HTTP smoke against peer or tunnel** (set `FDC_SYNC_SECRET` to match ingest for signed ping):

```bash
FDC_SYNC_SECRET=yoursecret npm run radio-tunnel:smoke -- --url http://127.0.0.1:8787
# tunnel on 8789:
FDC_SYNC_SECRET=yoursecret npm run radio-tunnel:smoke -- --url http://127.0.0.1:8789
```

## Roster example (each browser)

| Field | Value |
|-------|--------|
| Host | `127.0.0.1` |
| Port | `8789` (or your `FDC_RADIO_TUNNEL_PORT`) |
| Bearer | RT-1523 (serial tunnel) |
| TLS | off |

Shared passphrase must match **`FDC_SYNC_SECRET`** on both **`fdc-peer-server`** instances.

## Install services

**Pi:** after `npm install` and `sudo bash deploy/pi-install-all.sh`, optionally:

```bash
sudo bash ~/FDCTrackingApp/deploy/pi-install-radio-tunnel.sh
sudo nano /etc/default/fdc-radio-tunnel   # set FDC_RADIO_SERIAL_PATH
sudo systemctl enable --now fdc-radio-tunnel.service
```

**Fedora:** `sudo bash deploy/fedora-install-peer.sh`, then the same `pi-install-radio-tunnel.sh` step (the unit is identical).

Firewall: with default **`FDC_RADIO_TUNNEL_HOST=127.0.0.1`**, you do **not** need to open `8789` on the firewall. If you bind **`0.0.0.0`**, open the tunnel port deliberately. Open **3000** (web) and **8787** (peer) as in `fedora-install-peer.sh` / Pi UFW docs.

## Ordering

Start **`fdc-peer-server`** before **`fdc-radio-tunnel`** (systemd `After=fdc-peer-server.service` on Pi install script).

## Loopback test (no RF)

Use two USB–serial adapters wired TX↔RX and GND, or two `socat` PTY pairs. Run **`fdc-peer-server`** on both machines (or one machine, two ports — advanced). Run **two** tunnel processes with different `FDC_RADIO_SERIAL_PATH` pointing at each end of the link. From a browser (or `curl`) on station A:

```bash
curl -s "http://127.0.0.1:8789/fdc/v1/health"
```

You should see JSON from the **remote** ingest when the link is correct.

## Operational note

Radio **COMSEC**, hopping, and waveform settings are outside this app; only the serial bit rate and wiring are relevant here.

## Browser peer sync over RT-1523 (Walker Track)

The app’s **push** / **ping** to a roster row with bearer **RT-1523** uses:

- **Compact JSON** snapshots (no pretty-printing) for all peer sync, and **only the last 40 audit log lines** when the bearer is radio (smaller payloads over `fdc-radio-tunnel`).
- **Automatic retries** with exponential backoff on **`POST /fdc/v1/push`** and **`POST /fdc/v1/ping`** (constants in `src/sync/radioPlaceholder.ts`). IP/LAN rows are still single-attempt except where you re-run manually.

Tune tunnel chunking/timeouts via env vars above if the link still drops mid-transfer.
