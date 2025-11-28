export default function Settings() {
  return (
    <div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          color: 'var(--text-primary)',
        }}
      >
        Settings / Help
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
        }}
      >
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
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            Getting Started
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}
          >
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>1. Inventory:</strong> Start by
              creating BOCs, POCs, Launchers, Pods, and Rounds in the Inventory page.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>2. Management:</strong> Use the
              Management panel to assign Pods to Launchers, Launchers to POCs, POCs to BOCs, and
              Tasks to Launchers.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>3. Dashboard:</strong> View an
              overview of all your assets and their current status.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>4. Logs:</strong> Monitor all
              activity and changes in the system.
            </p>
          </div>
        </div>

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
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            About
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>FDC Tracker</strong>
            </p>
            <p>Version 1.0.0</p>
            <p>
              A tracking application for rounds, pods, and launchers. Designed for AFATDS Operators
              to manage ammunition tracking and report generation.
            </p>
          </div>
        </div>

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
              marginBottom: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            Terminology
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>BOC:</strong> Battery Operations
              Center
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>POC:</strong> PLT Operations Center (PLT FDC)
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Launcher:</strong> Artillery
              launcher system
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Pod:</strong> Container for rounds
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Round:</strong> Individual
              ammunition unit
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

