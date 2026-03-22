/**
 * Optional kiosk / device companion HTTP API (typically 127.0.0.1:3001 on the same machine as the browser).
 * Override with VITE_KIOSK_SIDECAR_ORIGIN if needed.
 */
export function getKioskSidecarOrigin(): string {
  const raw = import.meta.env.VITE_KIOSK_SIDECAR_ORIGIN
  if (raw && String(raw).trim()) return String(raw).replace(/\/$/, '')
  return 'http://127.0.0.1:3001'
}
