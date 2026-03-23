import { useCallback, useMemo, useState } from 'react'
import { getSyncMeta, updateSyncMeta } from '../../persistence/sqlite'
import { DEFAULT_SYNC_ALERT_STYLE, parseSyncAlertStyle } from '../../lib/syncAlertStyle'

/**
 * Renders the Sync Alert Settings UI section.
 */
export function SyncAlertSettings() {
  const initial = useMemo(() => getSyncMeta(), [])
  const parsed = useMemo(() => parseSyncAlertStyle(initial.syncAlertStyleJson), [initial.syncAlertStyleJson])

  const [durationMs, setDurationMs] = useState(parsed.durationMs)
  const [background, setBackground] = useState(parsed.background)
  const [border, setBorder] = useState(parsed.border)
  const [color, setColor] = useState(parsed.color)

  const persist = useCallback(() => {
    updateSyncMeta({
      syncAlertStyleJson: JSON.stringify({
        durationMs,
        background,
        border,
        color,
      }),
    })
  }, [durationMs, background, border, color])

  const previewStyle = useMemo(
    () => ({
      ...parseSyncAlertStyle(
        JSON.stringify({
          durationMs,
          background,
          border,
          color,
        })
      ),
    }),
    [durationMs, background, border, color]
  )

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          marginBottom: '0.75rem',
          color: 'var(--text-primary)',
        }}
      >
        Sync notifications
      </h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.45 }}>
        Banners only appear when the sender’s Local unit ID matches a Network roster row’s <strong>Peer unit ID</strong> and
        that row has <strong>Alerts</strong> on. Auto-accept is per row on Network. Below adjusts banner appearance only.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <span>Auto-dismiss notice (ms)</span>
          <input
            type="number"
            min={2000}
            max={120000}
            step={1000}
            value={durationMs}
            onChange={(e) => setDurationMs(Math.max(2000, parseInt(e.target.value, 10) || DEFAULT_SYNC_ALERT_STYLE.durationMs))}
            style={{ maxWidth: '10rem', padding: '0.35rem' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <span>Background (CSS)</span>
          <input
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <span>Border (CSS)</span>
          <input
            value={border}
            onChange={(e) => setBorder(e.target.value)}
            style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          <span>Text color (CSS)</span>
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ padding: '0.35rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </label>
      </div>

      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Preview</p>
      <div
        style={{
          alignSelf: 'flex-start',
          maxWidth: 'min(360px, 100%)',
          padding: '0.65rem 0.75rem',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          background: previewStyle.background,
          border: previewStyle.border,
          color: previewStyle.color,
          fontSize: '0.82rem',
        }}
      >
        Incoming sync (v12) from Example unit — preview only.
      </div>

      <button
        type="button"
        onClick={persist}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          border: 'none',
          background: 'var(--accent-color, #336)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        Save notification appearance
      </button>
    </div>
  )
}
