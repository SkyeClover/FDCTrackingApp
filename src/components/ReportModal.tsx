import { useState, useMemo } from 'react'
import { POC, BOC, Launcher, Pod, RoundType } from '../types'
import { X, Copy, Printer } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'

interface ReportModalProps {
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  isOpen: boolean
  onClose: () => void
}

export default function ReportModal({ bocs, pocs, launchers, pods, isOpen, onClose }: ReportModalProps) {
  const { roundTypes } = useAppData()
  const [selectedBOC, setSelectedBOC] = useState<string>('')
  const [selectedPOC, setSelectedPOC] = useState<string>('')
  
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])
  
  if (!isOpen) return null

  // Filter POCs based on selection
  const filteredPOCs = pocs.filter((poc) => {
    if (selectedBOC && poc.bocId !== selectedBOC) return false
    if (selectedPOC && poc.id !== selectedPOC) return false
    return true
  })

  // Get pods for a POC (common sense: pods on launchers belong to that launcher's POC)
  const getPOCPods = (poc: POC) => {
    return pods.filter((p) => {
      if (p.pocId === poc.id) return true
      if (p.launcherId) {
        const launcher = launchers.find((l) => l.id === p.launcherId)
        return launcher?.pocId === poc.id
      }
      return false
    })
  }

  // Generate ASCII report
  const generateASCIIReport = () => {
    let report = '='.repeat(80) + '\n'
    report += 'FDC TRACKER - AMMUNITION STATUS REPORT\n'
    report += `Generated: ${new Date().toLocaleString()}\n`
    if (selectedBOC || selectedPOC) {
      if (selectedBOC) {
        const boc = bocs.find((b) => b.id === selectedBOC)
        report += `Filter: BOC ${boc?.name || selectedBOC}\n`
      }
      if (selectedPOC) {
        const poc = pocs.find((p) => p.id === selectedPOC)
        report += `Filter: POC ${poc?.name || selectedPOC}\n`
      }
    }
    report += '='.repeat(80) + '\n\n'

    filteredPOCs.forEach((poc) => {
      const pocPods = getPOCPods(poc)
      const pocLaunchers = launchers.filter((l) => l.pocId === poc.id)
      const podsOnGround = pocPods.filter((p) => !p.launcherId)
      const podsOnLaunchers = pocPods.filter((p) => p.launcherId)

      report += `POC: ${poc.name}\n`
      report += '-'.repeat(80) + '\n'
      report += `  Launchers: ${pocLaunchers.length}\n`
      report += `  Pods On Ground: ${podsOnGround.length}\n`
      report += `  Pods On Launchers: ${podsOnLaunchers.length}\n`
      report += `  Total Pods: ${pocPods.length}\n\n`

      // Pods by round type
      roundTypeOptions.forEach((option) => {
        const podsOfType = pocPods.filter((p) => p.rounds[0]?.type === option.value)
        if (podsOfType.length > 0) {
          const totalRounds = podsOfType.reduce((sum, p) => sum + p.rounds.length, 0)
          const availableRounds = podsOfType.reduce(
            (sum, p) => sum + p.rounds.filter((r) => r.status === 'available').length,
            0
          )
          const usedRounds = podsOfType.reduce(
            (sum, p) => sum + p.rounds.filter((r) => r.status === 'used').length,
            0
          )

          report += `  ${option.label}:\n`
          report += `    Pods: ${podsOfType.length}\n`
          report += `    Total Rounds: ${totalRounds}\n`
          report += `    Available: ${availableRounds}\n`
          report += `    Used: ${usedRounds}\n\n`
        }
      })

      // Launcher details
      if (pocLaunchers.length > 0) {
        report += '  Launcher Details:\n'
        pocLaunchers.forEach((launcher) => {
          const pod = pods.find((p) => p.launcherId === launcher.id)
          const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length || 0
          const roundType = pod?.rounds[0]?.type || 'N/A'
          const status = launcher.status === 'active' ? 'ACTIVE' : launcher.status.toUpperCase()
          report += `    ${launcher.name}: ${roundType} - ${availableRounds}/6 rounds - ${status}\n`
        })
        report += '\n'
      }

      report += '\n'
    })

    report += '='.repeat(80) + '\n'
    return report
  }

  const handleCopyASCII = () => {
    const asciiReport = generateASCIIReport()
    navigator.clipboard.writeText(asciiReport)
    alert('ASCII report copied to clipboard!')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '2px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              Ammunition Status Report
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
              Generated: {new Date().toLocaleString()}
            </p>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={selectedBOC}
                onChange={(e) => {
                  setSelectedBOC(e.target.value)
                  setSelectedPOC('') // Clear POC when BOC changes
                }}
                style={{
                  padding: '0.4rem 0.6rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">All BOCs</option>
                {bocs.map((boc) => (
                  <option key={boc.id} value={boc.id}>
                    {boc.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedPOC}
                onChange={(e) => setSelectedPOC(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">All POCs</option>
                {pocs
                  .filter((poc) => !selectedBOC || poc.bocId === selectedBOC)
                  .map((poc) => (
                    <option key={poc.id} value={poc.id}>
                      {poc.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleCopyASCII}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <Copy size={16} />
              Copy ASCII
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Visual Report */}
        <div style={{ marginBottom: '1rem' }} className="print-report">
          {filteredPOCs.length === 0 ? (
            <div
              style={{
                padding: '1rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}
            >
              No POCs match the selected filters
            </div>
          ) : (
            filteredPOCs.map((poc) => {
            const pocPods = getPOCPods(poc)
            const pocLaunchers = launchers.filter((l) => l.pocId === poc.id)
            const podsOnGround = pocPods.filter((p) => !p.launcherId)
            const podsOnLaunchers = pocPods.filter((p) => p.launcherId)

            return (
              <div
                key={poc.id}
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  pageBreakInside: 'avoid',
                }}
              >
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  {poc.name}
                </h3>

                {/* Summary - Compact */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Launchers</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{pocLaunchers.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>On Ground</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{podsOnGround.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>On Launchers</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{podsOnLaunchers.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Total Pods</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{pocPods.length}</div>
                  </div>
                </div>

                {/* Rounds by Type - Compact Table */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Rounds by Type
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '0.5rem',
                    }}
                  >
                    {roundTypeOptions.map((option) => {
                      const podsOfType = pocPods.filter((p) => p.rounds[0]?.type === option.value)
                      if (podsOfType.length === 0) return null

                      const totalRounds = podsOfType.reduce((sum, p) => sum + p.rounds.length, 0)
                      const availableRounds = podsOfType.reduce(
                        (sum, p) => sum + p.rounds.filter((r) => r.status === 'available').length,
                        0
                      )
                      const usedRounds = podsOfType.reduce(
                        (sum, p) => sum + p.rounds.filter((r) => r.status === 'used').length,
                        0
                      )

                      return (
                        <div
                          key={option.value}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            {option.label}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>P:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{podsOfType.length}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>T:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{totalRounds}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--success)' }}>A:</span>
                            <span style={{ fontWeight: '600', color: 'var(--success)' }}>{availableRounds}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--danger)' }}>U:</span>
                            <span style={{ fontWeight: '600', color: 'var(--danger)' }}>{usedRounds}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Launcher Details - Compact */}
                {pocLaunchers.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Launchers
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.5rem',
                      }}
                    >
                      {pocLaunchers.map((launcher) => {
                        const pod = pods.find((p) => p.launcherId === launcher.id)
                        const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length || 0
                        const roundType = pod?.rounds[0]?.type || 'N/A'
                        const status = launcher.status === 'active' ? 'ACTIVE' : launcher.status.toUpperCase()

                        return (
                          <div
                            key={launcher.id}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: 'var(--bg-tertiary)',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              fontSize: '0.75rem',
                            }}
                          >
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{launcher.name}</div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {roundType} - {availableRounds}/6
                            </div>
                            <div
                              style={{
                                color: launcher.status === 'active' ? 'var(--accent)' : 'var(--text-secondary)',
                                marginTop: '0.15rem',
                                fontWeight: '500',
                                fontSize: '0.7rem',
                              }}
                            >
                              {status}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
          )}
        </div>

        {/* ASCII Report Preview */}
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}
        >
          <h4
            style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            ASCII Report (Click "Copy ASCII" to copy)
          </h4>
          <pre
            style={{
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-primary)',
              padding: '0.75rem',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '250px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {generateASCIIReport()}
          </pre>
        </div>
      </div>
    </div>
  )
}

