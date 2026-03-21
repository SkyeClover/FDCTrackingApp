import type { SyncMetaRow } from '../persistence/sqlite'

/** Sync HMAC requires a non-empty shared secret in Settings / Network → Sync. */
export function isSyncSharedSecretConfigured(meta: SyncMetaRow): boolean {
  return typeof meta.syncSharedSecret === 'string' && meta.syncSharedSecret.trim().length > 0
}
