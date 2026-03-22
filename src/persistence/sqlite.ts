import initSqlJs from 'sql.js/dist/sql-wasm.js'
import type { Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { SCHEMA_V1 } from './schema'
import { idbGetSqliteBlob, idbSetSqliteBlob } from './idb'
import type { AppState, CurrentUserRole } from '../types'
import {
  serializeState,
  deserializeState,
  loadFromLocalStorage,
  STORAGE_KEY,
  INITIAL_SETUP_KEY,
  stateHasOrgEntities,
} from '../utils/saveLoad'
import { normalizeLoadedAppState } from '../utils/normalizeAppState'
import { mergePreservedViewRoleAfterSync } from '../utils/roleScope'

let sqlModule: Awaited<ReturnType<typeof initSqlJs>> | null = null
let db: Database | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null

const FLUSH_MS = 400

function ensureDb(): Database {
  if (!db) throw new Error('SQLite not initialized')
  return db
}

export function getDatabase(): Database | null {
  return db
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushToIdb()
  }, FLUSH_MS)
}

async function flushToIdb(): Promise<void> {
  if (!db) return
  try {
    const data = db.export()
    await idbSetSqliteBlob(data)
  } catch (e) {
    console.error('Failed to persist SQLite to IndexedDB:', e)
  }
}

export async function flushPersistenceNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  await flushToIdb()
}

function hasTableColumn(database: Database, table: string, column: string): boolean {
  const r = database.exec(`PRAGMA table_info(${table})`)
  if (!r.length || !r[0].values.length) return false
  for (const row of r[0].values) {
    if (String(row[1]) === column) return true
  }
  return false
}

function runMigrations(database: Database): void {
  database.run(SCHEMA_V1)
  const row = database.exec('SELECT version FROM schema_migrations WHERE version = 1')
  if (!row.length || !row[0].values.length) {
    database.run('INSERT INTO schema_migrations (version) VALUES (1)')
  }
  database.run(`INSERT OR IGNORE INTO sync_meta (id, state_version) VALUES (1, 1)`)
  if (!hasTableColumn(database, 'sync_meta', 'auto_rollup_from_org')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN auto_rollup_from_org INTEGER NOT NULL DEFAULT 1')
  }
  if (!hasTableColumn(database, 'sync_meta', 'last_applied_ingest_state_version')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN last_applied_ingest_state_version INTEGER NOT NULL DEFAULT 0')
  }
  if (!hasTableColumn(database, 'sync_meta', 'dismissed_ingest_state_version')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN dismissed_ingest_state_version INTEGER NOT NULL DEFAULT 0')
  }
  if (!hasTableColumn(database, 'sync_meta', 'incoming_alerts_enabled')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN incoming_alerts_enabled INTEGER NOT NULL DEFAULT 1')
  }
  if (!hasTableColumn(database, 'sync_meta', 'sync_alert_style_json')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN sync_alert_style_json TEXT')
  }
  if (!hasTableColumn(database, 'sync_meta', 'auto_push_enabled')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN auto_push_enabled INTEGER NOT NULL DEFAULT 1')
  }
  if (!hasTableColumn(database, 'sync_meta', 'upstream_notify_roster_id')) {
    database.run('ALTER TABLE sync_meta ADD COLUMN upstream_notify_roster_id TEXT')
  }
  if (!hasTableColumn(database, 'network_roster', 'peer_unit_id')) {
    database.run('ALTER TABLE network_roster ADD COLUMN peer_unit_id TEXT')
  }
  if (!hasTableColumn(database, 'network_roster', 'sync_alerts_enabled')) {
    database.run('ALTER TABLE network_roster ADD COLUMN sync_alerts_enabled INTEGER NOT NULL DEFAULT 1')
  }
  if (!hasTableColumn(database, 'network_roster', 'auto_accept_sync')) {
    database.run('ALTER TABLE network_roster ADD COLUMN auto_accept_sync INTEGER NOT NULL DEFAULT 0')
  }

  const v2 = database.exec('SELECT version FROM schema_migrations WHERE version = 2')
  if (!v2.length || !v2[0].values.length) {
    database.run('UPDATE sync_meta SET auto_rollup_from_org = 1 WHERE id = 1')
    database.run('INSERT INTO schema_migrations (version) VALUES (2)')
  }
}

function migrateFromLocalStorageIfNeeded(database: Database): void {
  const r = database.exec('SELECT json FROM app_state WHERE id = 1')
  if (r.length && r[0].values.length) return

  const legacy = loadFromLocalStorage()
  if (legacy) {
    const json = serializeState(legacy)
    database.run('INSERT OR REPLACE INTO app_state (id, json, updated_at) VALUES (1, ?, ?)', [
      json,
      Date.now(),
    ])
    if (stateHasOrgEntities(legacy)) {
      database.run('UPDATE sync_meta SET initial_setup_complete = 1 WHERE id = 1')
    }
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(INITIAL_SETUP_KEY) === 'true') {
        database.run('UPDATE sync_meta SET initial_setup_complete = 1 WHERE id = 1')
      }
    } catch {
      /* ignore */
    }
  }
}

/** Short display id for sync (8 chars hex) */
function randomUnitId(): string {
  const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return hex.toUpperCase()
}

export async function initPersistence(): Promise<void> {
  if (db) return
  sqlModule = await initSqlJs({ locateFile: () => wasmUrl })
  const existing = await idbGetSqliteBlob()
  if (existing && existing.length > 0) {
    db = new sqlModule.Database(existing)
  } else {
    db = new sqlModule.Database()
  }
  runMigrations(ensureDb())
  migrateFromLocalStorageIfNeeded(ensureDb())

  const meta = ensureDb().exec('SELECT local_unit_id FROM sync_meta WHERE id = 1')
  const lid =
    meta[0]?.values[0]?.[0] != null ? String(meta[0].values[0][0]) : ''
  if (!lid) {
    const id = randomUnitId()
    ensureDb().run('UPDATE sync_meta SET local_unit_id = ? WHERE id = 1', [id])
  }

  await flushToIdb()
}

export function loadAppStateFromDb(): AppState | null {
  const database = ensureDb()
  const r = database.exec('SELECT json FROM app_state WHERE id = 1')
  if (!r.length || !r[0].values.length) return null
  const cell = r[0].values[0][0]
  if (cell == null) return null
  const json = String(cell)
  if (json === '{"empty":true}') return null
  try {
    return deserializeState(json)
  } catch {
    return null
  }
}

export function readInitialSetupCompleteFromDb(): boolean {
  try {
    const database = ensureDb()
    const r = database.exec('SELECT initial_setup_complete FROM sync_meta WHERE id = 1')
    if (!r.length || !r[0].values.length) return false
    return Number(r[0].values[0][0]) === 1
  } catch {
    return false
  }
}

export function writeInitialSetupCompleteToDb(): void {
  ensureDb().run('UPDATE sync_meta SET initial_setup_complete = 1 WHERE id = 1')
  scheduleFlush()
}

export function clearInitialSetupFlagInDb(): void {
  ensureDb().run('UPDATE sync_meta SET initial_setup_complete = 0 WHERE id = 1')
  scheduleFlush()
}

export function saveAppStateToDb(state: AppState): void {
  const database = ensureDb()
  const json = serializeState(state)
  database.run('BEGIN')
  try {
    database.run('INSERT OR REPLACE INTO app_state (id, json, updated_at) VALUES (1, ?, ?)', [
      json,
      Date.now(),
    ])
    database.run('UPDATE sync_meta SET state_version = state_version + 1 WHERE id = 1')
    database.run('COMMIT')
  } catch (e) {
    database.run('ROLLBACK')
    throw e
  }
  scheduleFlush()
}

export function getStateVersion(): number {
  const r = ensureDb().exec('SELECT state_version FROM sync_meta WHERE id = 1')
  if (!r.length || !r[0].values.length) return 1
  return Number(r[0].values[0][0]) || 1
}

export function setStateVersion(v: number): void {
  ensureDb().run('UPDATE sync_meta SET state_version = ? WHERE id = 1', [Math.max(1, Math.floor(v))])
  scheduleFlush()
}

export interface SyncMetaRow {
  stateVersion: number
  localUnitId: string
  skipEchelonEnabled: boolean
  skipEchelonVerified: boolean
  maxSkipHops: number
  syncSharedSecret: string
  peerListenPort: number
  /** When set, sync / UX can prefer Management tree for parent chain (see Network roster). */
  autoRollupFromOrg: boolean
  /** Last ingest snapshot stateVersion we applied from this site’s stored copy. */
  lastAppliedIngestStateVersion: number
  /** Ingest stateVersion user dismissed without applying (hide banner until a newer push). */
  dismissedIngestStateVersion: number
  /** Show banner for unmatched / unknown peer pushes. */
  incomingAlertsEnabled: boolean
  /** JSON for sync banner appearance (Settings). */
  syncAlertStyleJson: string
  /** Periodically push snapshot to roster peers (~90s) when secret + peers are configured. */
  autoPushEnabled: boolean
  /** Roster row id for offline-notify / tab-close; empty = first IP peer in roster order. */
  upstreamNotifyRosterId: string
}

export function getSyncMeta(): SyncMetaRow {
  const database = ensureDb()
  const r = database.exec(
    `SELECT state_version, local_unit_id, skip_echelon_enabled, skip_echelon_verified,
            max_skip_hops, sync_shared_secret, peer_listen_port, auto_rollup_from_org,
            last_applied_ingest_state_version, dismissed_ingest_state_version,
            incoming_alerts_enabled, sync_alert_style_json, auto_push_enabled,
            upstream_notify_roster_id
     FROM sync_meta WHERE id = 1`
  )
  if (!r.length || !r[0].values.length) {
    return {
      stateVersion: 1,
      localUnitId: '',
      skipEchelonEnabled: false,
      skipEchelonVerified: false,
      maxSkipHops: 1,
      syncSharedSecret: '',
      peerListenPort: 8787,
      autoRollupFromOrg: true,
      lastAppliedIngestStateVersion: 0,
      dismissedIngestStateVersion: 0,
      incomingAlertsEnabled: true,
      syncAlertStyleJson: '',
      autoPushEnabled: true,
      upstreamNotifyRosterId: '',
    }
  }
  const row = r[0].values[0]
  return {
    stateVersion: Number(row[0]) || 1,
    localUnitId: String(row[1] ?? ''),
    skipEchelonEnabled: Number(row[2]) === 1,
    skipEchelonVerified: Number(row[3]) === 1,
    maxSkipHops: Math.max(1, Number(row[4]) || 1),
    syncSharedSecret: String(row[5] ?? ''),
    peerListenPort: Number(row[6]) || 8787,
    autoRollupFromOrg: row[7] != null ? Number(row[7]) === 1 : true,
    lastAppliedIngestStateVersion: row[8] != null ? Number(row[8]) : 0,
    dismissedIngestStateVersion: row[9] != null ? Number(row[9]) : 0,
    incomingAlertsEnabled: row[10] != null ? Number(row[10]) === 1 : true,
    syncAlertStyleJson: row[11] != null ? String(row[11]) : '',
    autoPushEnabled: row[12] != null ? Number(row[12]) === 1 : true,
    upstreamNotifyRosterId: row[13] != null ? String(row[13]) : '',
  }
}

export function updateSyncMeta(partial: Partial<Omit<SyncMetaRow, 'stateVersion'>> & { stateVersion?: number }): void {
  const cur = getSyncMeta()
  const next = {
    ...cur,
    ...partial,
  }
  if (partial.syncSharedSecret !== undefined) {
    next.syncSharedSecret = String(partial.syncSharedSecret).trim().replace(/^\uFEFF/, '')
  }
  if (partial.upstreamNotifyRosterId !== undefined) {
    next.upstreamNotifyRosterId = String(partial.upstreamNotifyRosterId).trim()
  }
  ensureDb().run(
    `UPDATE sync_meta SET
      state_version = ?,
      local_unit_id = ?,
      skip_echelon_enabled = ?,
      skip_echelon_verified = ?,
      max_skip_hops = ?,
      sync_shared_secret = ?,
      peer_listen_port = ?,
      auto_rollup_from_org = ?,
      last_applied_ingest_state_version = ?,
      dismissed_ingest_state_version = ?,
      incoming_alerts_enabled = ?,
      sync_alert_style_json = ?,
      auto_push_enabled = ?,
      upstream_notify_roster_id = ?
    WHERE id = 1`,
    [
      next.stateVersion,
      next.localUnitId,
      next.skipEchelonEnabled ? 1 : 0,
      next.skipEchelonVerified ? 1 : 0,
      next.maxSkipHops,
      next.syncSharedSecret,
      next.peerListenPort,
      next.autoRollupFromOrg ? 1 : 0,
      next.lastAppliedIngestStateVersion,
      next.dismissedIngestStateVersion,
      next.incomingAlertsEnabled ? 1 : 0,
      next.syncAlertStyleJson,
      next.autoPushEnabled ? 1 : 0,
      next.upstreamNotifyRosterId || null,
    ]
  )
  scheduleFlush()
}

export interface NetworkRosterRow {
  id: string
  displayName: string
  echelonRole: string
  parentUnitId: string | null
  host: string | null
  port: number | null
  useTls: boolean
  bearer: string
  status: string
  lastSeenMs: number | null
  lastError: string | null
  sortOrder: number
  /** Sender’s localUnitId when they push; used for alerts / auto-accept. */
  peerUnitId: string | null
  syncAlertsEnabled: boolean
  autoAcceptSync: boolean
}

export function listNetworkRoster(): NetworkRosterRow[] {
  const r = ensureDb().exec(
    `SELECT id, display_name, echelon_role, parent_unit_id, host, port, use_tls, bearer,
            status, last_seen_ms, last_error, sort_order,
            peer_unit_id, sync_alerts_enabled, auto_accept_sync
     FROM network_roster ORDER BY sort_order ASC, display_name ASC`
  )
  if (!r.length) return []
  return r[0].values.map((row: (string | number | null | Uint8Array)[]) => ({
    id: String(row[0]),
    displayName: String(row[1]),
    echelonRole: String(row[2] ?? ''),
    parentUnitId: row[3] != null ? String(row[3]) : null,
    host: row[4] != null ? String(row[4]) : null,
    port: row[5] != null ? Number(row[5]) : null,
    useTls: Number(row[6]) === 1,
    bearer: String(row[7] ?? 'ip'),
    status: String(row[8] ?? 'unknown'),
    lastSeenMs: row[9] != null ? Number(row[9]) : null,
    lastError: row[10] != null ? String(row[10]) : null,
    sortOrder: Number(row[11]) || 0,
    peerUnitId: row[12] != null ? String(row[12]) : null,
    syncAlertsEnabled: row[13] != null ? Number(row[13]) === 1 : true,
    autoAcceptSync: row[14] != null ? Number(row[14]) === 1 : false,
  }))
}

export function upsertNetworkRosterRow(row: NetworkRosterRow): void {
  ensureDb().run(
    `INSERT OR REPLACE INTO network_roster
     (id, display_name, echelon_role, parent_unit_id, host, port, use_tls, bearer, status, last_seen_ms, last_error, sort_order,
      peer_unit_id, sync_alerts_enabled, auto_accept_sync)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.displayName,
      row.echelonRole,
      row.parentUnitId,
      row.host,
      row.port,
      row.useTls ? 1 : 0,
      row.bearer,
      row.status,
      row.lastSeenMs,
      row.lastError,
      row.sortOrder,
      row.peerUnitId,
      row.syncAlertsEnabled ? 1 : 0,
      row.autoAcceptSync ? 1 : 0,
    ]
  )
  scheduleFlush()
}

export function deleteNetworkRosterRow(id: string): void {
  ensureDb().run('DELETE FROM network_roster WHERE id = ?', [id])
  scheduleFlush()
}

export function appendAuditLog(category: string, message: string, detail?: string): void {
  ensureDb().run('INSERT INTO audit_log (ts, category, message, detail) VALUES (?, ?, ?, ?)', [
    Date.now(),
    category,
    message,
    detail ?? null,
  ])
  scheduleFlush()
}

export function clearAuditLog(): void {
  ensureDb().run('DELETE FROM audit_log')
  scheduleFlush()
}

export function listAuditLog(limit = 200): { ts: number; category: string; message: string; detail: string | null }[] {
  const r = ensureDb().exec(
    `SELECT ts, category, message, detail FROM audit_log ORDER BY id DESC LIMIT ${Math.min(5000, Math.max(1, limit))}`
  )
  if (!r.length) return []
  return r[0].values.map((row: (string | number | null | Uint8Array)[]) => ({
    ts: Number(row[0]),
    category: String(row[1]),
    message: String(row[2]),
    detail: row[3] != null ? String(row[3]) : null,
  }))
}

export function enqueueSyncOutbox(kind: string, payloadJson: string, targetUnitId?: string): void {
  ensureDb().run(
    'INSERT INTO sync_outbox (created_ms, payload_json, target_unit_id, kind) VALUES (?, ?, ?, ?)',
    [Date.now(), payloadJson, targetUnitId ?? null, kind]
  )
  scheduleFlush()
}

export function listSyncOutbox(limit = 50): { id: number; createdMs: number; kind: string; payloadJson: string; targetUnitId: string | null }[] {
  const r = ensureDb().exec(
    `SELECT id, created_ms, kind, payload_json, target_unit_id FROM sync_outbox ORDER BY id ASC LIMIT ${Math.min(500, Math.max(1, limit))}`
  )
  if (!r.length) return []
  return r[0].values.map((row: (string | number | null | Uint8Array)[]) => ({
    id: Number(row[0]),
    createdMs: Number(row[1]),
    kind: String(row[2]),
    payloadJson: String(row[3]),
    targetUnitId: row[4] != null ? String(row[4]) : null,
  }))
}

export function removeSyncOutboxRow(id: number): void {
  ensureDb().run('DELETE FROM sync_outbox WHERE id = ?', [id])
  scheduleFlush()
}

/**
 * Replace operational DB from full snapshot JSON (sync / ingest).
 * Strips any remote `currentUserRole` and restores `preservedViewRole` when that unit still exists (per-device UX).
 */
export function applySnapshotJson(json: string, preservedViewRole?: CurrentUserRole): AppState {
  const raw = deserializeState(json)
  const withoutRemoteRole: AppState = { ...raw, currentUserRole: undefined }
  const normalized = normalizeLoadedAppState(withoutRemoteRole)
  const final = mergePreservedViewRoleAfterSync(normalized, preservedViewRole)
  saveAppStateToDb(final)
  void flushPersistenceNow()
  return final
}

export function clearAllPersistence(): void {
  const database = ensureDb()
  database.run('BEGIN')
  database.run('DELETE FROM app_state')
  database.run('DELETE FROM network_roster')
  database.run('DELETE FROM audit_log')
  database.run('DELETE FROM sync_outbox')
  database.run(`UPDATE sync_meta SET
    state_version = 1,
    skip_echelon_enabled = 0,
    skip_echelon_verified = 0,
    initial_setup_complete = 0,
    auto_rollup_from_org = 1,
    last_applied_ingest_state_version = 0,
    dismissed_ingest_state_version = 0,
    incoming_alerts_enabled = 1,
    sync_alert_style_json = NULL,
    auto_push_enabled = 1,
    upstream_notify_roster_id = NULL
    WHERE id = 1`)
  database.run('COMMIT')
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(INITIAL_SETUP_KEY)
    }
  } catch {
    /* ignore */
  }
  void flushPersistenceNow()
}

/** Export raw SQLite file for backup */
export function exportDatabaseBytes(): Uint8Array {
  return ensureDb().export()
}
