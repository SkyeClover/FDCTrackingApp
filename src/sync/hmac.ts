const enc = new TextEncoder()

/**
 * Implements hmac sha256 hex for this module.
 */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const keyMaterial = secret.trim().replace(/^\uFEFF/, '')
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(keyMaterial),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
