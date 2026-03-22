import { useMemo, useState } from 'react'
import { clearAuditLog, listAuditLog } from '../../persistence/sqlite'
import { CollapsibleCard } from './CollapsibleCard'

type Props = {
  refreshKey: number
  syncOutputPath: string
  syncOutputLoggedAt: string
  onClearSyncOutput: () => void
}

export function NetworkLogsSection({
  refreshKey,
  syncOutputPath,
  syncOutputLoggedAt,
  onClearSyncOutput,
}: Props) {
  const [localTick, setLocalTick] = useState(0)
  const auditEntries = useMemo(() => listAuditLog(200), [refreshKey, localTick])
  const hasSyncOutput = !!syncOutputPath.trim() || !!syncOutputLoggedAt.trim()

  return (
    <>
      <CollapsibleCard
        title="Last sync output"
        defaultOpen
        headerRight={
          <button type="button" title="Clear sync output" onClick={onClearSyncOutput} style={{ fontSize: '0.72rem' }}>
            Clear
          </button>
        }
      >
        {hasSyncOutput ? (
          <pre
            style={{
              margin: 0,
              padding: '0.2rem 0.1rem',
              fontSize: '0.78rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 'min(35vh, 260px)',
              overflow: 'auto',
              color: 'var(--text-secondary)',
            }}
          >
            {syncOutputLoggedAt ? `[${syncOutputLoggedAt}] ` : ''}
            Paths / results:{'\n'}
            {syncOutputPath}
          </pre>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            No sync output yet.
          </p>
        )}
      </CollapsibleCard>

      <CollapsibleCard
        title="Sync & network log (SQLite)"
        defaultOpen
        headerRight={
          <button
            type="button"
            title="Clear my sync & network log"
            onClick={() => {
              clearAuditLog()
              setLocalTick((t) => t + 1)
            }}
            style={{ fontSize: '0.72rem' }}
          >
            Clear
          </button>
        }
      >
        <pre
          style={{
            margin: 0,
            padding: '0.2rem 0.1rem',
            fontSize: '0.78rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 'min(42vh, 320px)',
            overflow: 'auto',
            color: 'var(--text-secondary)',
          }}
        >
          {auditEntries.length === 0
            ? 'No sync/network log entries yet.'
            : auditEntries
                .map((entry) => {
                  const t = new Date(entry.ts).toLocaleString()
                  const head = `${t}  [${entry.category}] ${entry.message}`
                  return entry.detail ? `${head}\n  ${entry.detail}` : head
                })
                .join('\n\n')}
        </pre>
      </CollapsibleCard>
    </>
  )
}
