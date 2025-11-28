import { POC, Launcher, Pod } from '../types'
import LauncherCard from './LauncherCard'
import { Edit } from 'lucide-react'

interface POCCardProps {
  poc: POC
  launchers: Launcher[]
  pods: Pod[]
  onEdit?: () => void
  onReload?: (launcherId: string) => void
}

export default function POCCard({
  poc,
  launchers,
  pods,
  onEdit,
  onReload,
}: POCCardProps) {
  const pocLaunchers = launchers.filter((l) => l.pocId === poc.id)

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* POC Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
          }}
        >
          {poc.name}
        </h3>
        <button
          onClick={onEdit}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Edit size={14} />
          Edit
        </button>
      </div>

      {/* Launchers Grid */}
      {pocLaunchers.length === 0 ? (
        <p
          style={{
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '1rem',
          }}
        >
          No launchers assigned
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {pocLaunchers.map((launcher) => {
            const pod = pods.find((p) => p.launcherId === launcher.id)
            return (
              <LauncherCard
                key={launcher.id}
                launcher={launcher}
                pod={pod}
                onReload={() => onReload?.(launcher.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

