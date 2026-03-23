import { Edit2, Rocket, Target, XCircle, CheckCircle, StopCircle } from 'lucide-react'
import type { Task } from '../types'

/**
 * Renders the Fire Mission List Row UI section.
 */
export default function FireMissionListRow({
  mission,
  index,
  isMobile,
  compactUi,
  getLauncherNames,
  formatDateTime,
  endTaskEarly,
  setSelectedTask,
}: {
  mission: Task
  index: number
  isMobile: boolean
  compactUi: boolean
  getLauncherNames: (task: Task) => string
  formatDateTime: (date?: Date) => string
  endTaskEarly: (taskId: string) => void
  setSelectedTask: (task: Task | null) => void
}) {
  return (
    <div
      data-guide={index === 0 ? 'fire-mission-card' : undefined}
      style={{
        padding: compactUi ? '0.65rem 0.75rem' : '1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: compactUi ? '0.65rem' : '1rem',
        alignItems: isMobile ? 'flex-start' : 'center',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onClick={() => setSelectedTask(mission)}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              color: 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: compactUi ? '0.9rem' : '1rem',
            }}
          >
            {mission.targetNumber || mission.name}
          </span>
          {mission.canceled ? (
            <span
              style={{
                backgroundColor: 'var(--warning)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <XCircle size={12} />
              Canceled
            </span>
          ) : mission.status === 'completed' ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <CheckCircle size={12} />
              Completed
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
              }}
            >
              In Progress
            </span>
          )}
          {mission.targetNumber && (
            <span
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
              }}
            >
              TGT #{mission.targetNumber}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '0.5rem',
            fontSize: compactUi ? '0.8rem' : '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Target size={14} />
            <span>
              <strong>Target:</strong> {mission.target || 'Not specified'}
              {mission.targetNumber && ` (TGT #${mission.targetNumber})`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Rocket size={14} />
            <span>
              <strong>Launchers:</strong> {getLauncherNames(mission)}
            </span>
          </div>
          <div>
            <strong>Start:</strong> {formatDateTime(mission.startTime)}
          </div>
          {mission.completedTime && (
            <div>
              <strong>Completed:</strong> {formatDateTime(mission.completedTime)}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
        {mission.status === 'in-progress' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('End this task early?')) {
                endTaskEarly(mission.id)
              }
            }}
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--warning)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <StopCircle size={16} />
            {isMobile ? 'End' : 'End Early'}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedTask(mission)
          }}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <Edit2 size={16} />
          {isMobile ? 'Edit' : 'Edit'}
        </button>
      </div>
    </div>
  )
}
