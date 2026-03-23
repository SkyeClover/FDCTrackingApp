/** Default look for sync inbox banners (Settings can override via JSON). */
export const DEFAULT_SYNC_ALERT_STYLE: SyncAlertStyle = {
  durationMs: 6000,
  background: 'var(--bg-secondary)',
  border: '1px solid var(--accent-color, #336)',
  color: 'var(--text-primary)',
}

export interface SyncAlertStyle {
  durationMs: number
  background: string
  border: string
  color: string
}

/**
 * Implements parse sync alert style for this module.
 */
export function parseSyncAlertStyle(json: string | null | undefined): SyncAlertStyle {
  if (!json?.trim()) {
    return { ...DEFAULT_SYNC_ALERT_STYLE }
  }
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    return {
      ...DEFAULT_SYNC_ALERT_STYLE,
      durationMs: typeof o.durationMs === 'number' ? o.durationMs : DEFAULT_SYNC_ALERT_STYLE.durationMs,
      background: typeof o.background === 'string' ? o.background : DEFAULT_SYNC_ALERT_STYLE.background,
      border: typeof o.border === 'string' ? o.border : DEFAULT_SYNC_ALERT_STYLE.border,
      color: typeof o.color === 'string' ? o.color : DEFAULT_SYNC_ALERT_STYLE.color,
    }
  } catch {
    return { ...DEFAULT_SYNC_ALERT_STYLE }
  }
}

/**
 * Implements normalize peer unit id for this module.
 */
export function normalizePeerUnitId(a: string | null | undefined): string {
  return (a ?? '').replace(/\s/g, '').toUpperCase()
}
