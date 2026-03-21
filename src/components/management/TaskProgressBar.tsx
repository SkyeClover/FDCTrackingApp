import { memo } from 'react'

type Props = {
  taskId: string
  taskName: string
  taskProgress: { [key: string]: number }
  taskStatus?: 'pending' | 'in-progress' | 'completed'
  onCancel?: (taskId: string) => void
  onClear?: (launcherId: string) => void
  launcherId?: string
}

const TaskProgressBar = memo(
  ({ taskId, taskName, taskProgress, taskStatus, onCancel, onClear, launcherId }: Props) => {
    const progress = taskProgress[taskId] ?? 0
    const isCompleted = taskStatus === 'completed' || progress >= 100
    return (
      <div style={{ marginTop: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            gap: '0.5rem',
            minWidth: 0,
          }}
        >
          <p
            style={{
              fontSize: '0.85rem',
              color: isCompleted ? 'var(--success)' : 'var(--text-secondary)',
              margin: 0,
              fontWeight: isCompleted ? '600' : 'normal',
              flex: 1,
              minWidth: 0,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {isCompleted ? '✓ ' : ''}
            {progress.toFixed(0)}% - {taskName}
            {isCompleted ? ' (Complete)' : ''}
          </p>
          {isCompleted && onClear && launcherId ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear(launcherId)
              }}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Clear
            </button>
          ) : onCancel && !isCompleted ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCancel(taskId)
              }}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: 'var(--danger)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
        <div
          style={{
            width: '100%',
            height: '10px',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '5px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, progress)}%`,
              height: '100%',
              backgroundColor: isCompleted ? 'var(--success)' : 'var(--accent)',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
    )
  }
)

TaskProgressBar.displayName = 'TaskProgressBar'

export default TaskProgressBar
