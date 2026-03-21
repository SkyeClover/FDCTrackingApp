/** SQLite DDL — version 1. Bump via migrations in sqlite.ts */
export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state_version INTEGER NOT NULL DEFAULT 1,
  local_unit_id TEXT,
  skip_echelon_enabled INTEGER NOT NULL DEFAULT 0,
  skip_echelon_verified INTEGER NOT NULL DEFAULT 0,
  max_skip_hops INTEGER NOT NULL DEFAULT 1,
  sync_shared_secret TEXT,
  peer_listen_port INTEGER DEFAULT 8787,
  initial_setup_complete INTEGER NOT NULL DEFAULT 0,
  auto_rollup_from_org INTEGER NOT NULL DEFAULT 1,
  last_applied_ingest_state_version INTEGER NOT NULL DEFAULT 0,
  dismissed_ingest_state_version INTEGER NOT NULL DEFAULT 0,
  incoming_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  sync_alert_style_json TEXT,
  auto_push_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS network_roster (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  echelon_role TEXT NOT NULL DEFAULT '',
  parent_unit_id TEXT,
  host TEXT,
  port INTEGER,
  use_tls INTEGER DEFAULT 0,
  bearer TEXT DEFAULT 'ip',
  status TEXT DEFAULT 'unknown',
  last_seen_ms INTEGER,
  last_error TEXT,
  sort_order INTEGER DEFAULT 0,
  peer_unit_id TEXT,
  sync_alerts_enabled INTEGER NOT NULL DEFAULT 1,
  auto_accept_sync INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  detail TEXT
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_ms INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  target_unit_id TEXT,
  kind TEXT NOT NULL
);
`
