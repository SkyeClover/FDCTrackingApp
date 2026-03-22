import { useState, useMemo } from 'react'
import { POC, BOC, Launcher, Pod, RSV } from '../types'
import { X, Copy, Printer } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'
import { useIsMobile } from '../hooks/useIsMobile'
import { useModal } from '../hooks/useModal'
import { useSwipe } from '../hooks/useSwipe'

interface ReportModalProps {
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rsvs?: RSV[]
  isOpen: boolean
  onClose: () => void
}

export default function ReportModal({ bocs, pocs, launchers, pods, rsvs = [], isOpen, onClose }: ReportModalProps) {
  const { roundTypes, ammoPltBocId } = useAppData()
  const AMMO_PLT_ID = 'ammo-plt-1'
  const [selectedBOC, setSelectedBOC] = useState<string>('')
  const [selectedPOC, setSelectedPOC] = useState<string>('')
  const [printTime, setPrintTime] = useState<string>('')
  const isMobile = useIsMobile()
  
  // Handle ESC key and body scroll lock
  useModal(isOpen, onClose)

  // Swipe down to close on mobile
  const modalContentRef = useSwipe({
    onSwipeDown: isMobile ? onClose : undefined,
    threshold: 100,
    velocityThreshold: 0.2,
  })
  
  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])
  
  if (!isOpen) return null

  // Filter POCs based on selection
  const filteredPOCs = pocs.filter((poc) => {
    if (selectedBOC && poc.bocId !== selectedBOC) return false
    if (selectedPOC && poc.id !== selectedPOC) return false
    return true
  })

  // Get pods for a POC (common sense: pods on launchers belong to that launcher's POC)
  // Also include pods on RSVs assigned to this POC or its BOC
  const getPOCPods = (poc: POC) => {
    return pods.filter((p) => {
      if (p.pocId === poc.id) return true
      if (p.launcherId) {
        const launcher = launchers.find((l) => l.id === p.launcherId)
        return launcher?.pocId === poc.id
      }
      // Include pods on RSVs assigned to this POC or its BOC
      if (p.rsvId) {
        const rsv = rsvs.find((r) => r.id === p.rsvId)
        if (rsv) {
          if (rsv.pocId === poc.id) return true
          if (rsv.bocId === poc.bocId) return true
        }
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
      
      // Get RSVs assigned to this POC or its BOC
      const pocRSVs = rsvs.filter((r) => {
        if (r.pocId === poc.id) return true
        if (r.bocId === poc.bocId) return true
        return false
      })
      
      // Separate pods in stock (directly assigned to POC) from pods on RSVs
      const podsInStock = podsOnGround.filter((p) => p.pocId === poc.id && !p.rsvId)
      const podsOnRSVs = podsOnGround.filter((p) => p.rsvId)

      report += `POC: ${poc.name}\n`
      report += '-'.repeat(80) + '\n'
      report += `  Launchers: ${pocLaunchers.length}\n`
      report += `  RSVs: ${pocRSVs.length}\n`
      report += `  Pods In Stock: ${podsInStock.length}\n`
      report += `  Pods On RSVs: ${podsOnRSVs.length}\n`
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

      // RSV details with pod listings
      if (pocRSVs.length > 0) {
        report += '  RSV Details:\n'
        pocRSVs.forEach((rsv) => {
          const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
          report += `    ${rsv.name}: ${rsvPods.length} pod${rsvPods.length !== 1 ? 's' : ''}\n`
          if (rsvPods.length > 0) {
            rsvPods.forEach((pod) => {
              const roundType = pod.rounds[0]?.type || 'N/A'
              const totalRounds = pod.rounds.length
              const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
              report += `      - ${pod.name}: ${roundType} - ${availableRounds}/${totalRounds} rounds\n`
            })
          }
        })
        report += '\n'
      }

      report += '\n'
    })

    // Include Ammo PLT if its BOC is selected
    if (selectedBOC && ammoPltBocId === selectedBOC) {
      const ammoPltRSVs = rsvs.filter((r) => r.ammoPltId === AMMO_PLT_ID)
      const ammoPltPods = pods.filter((p) => {
        if (p.ammoPltId === AMMO_PLT_ID) return true
        if (p.rsvId) {
          const rsv = rsvs.find((r) => r.id === p.rsvId)
          if (rsv && rsv.ammoPltId === AMMO_PLT_ID) return true
        }
        return false
      })
      const podsOnGround = ammoPltPods.filter((p) => !p.launcherId)
      const podsOnLaunchers = ammoPltPods.filter((p) => p.launcherId)
      
      // Separate pods in stock (directly assigned to ammo plt) from pods on RSVs
      const podsInStock = podsOnGround.filter((p) => p.ammoPltId === AMMO_PLT_ID && !p.rsvId)
      const podsOnRSVs = podsOnGround.filter((p) => p.rsvId)

      report += `AMMO PLT\n`
      report += '-'.repeat(80) + '\n'
      report += `  RSVs: ${ammoPltRSVs.length}\n`
      report += `  Pods In Stock: ${podsInStock.length}\n`
      report += `  Pods On RSVs: ${podsOnRSVs.length}\n`
      report += `  Pods On Launchers: ${podsOnLaunchers.length}\n`
      report += `  Total Pods: ${ammoPltPods.length}\n\n`

      // Pods by round type
      roundTypeOptions.forEach((option) => {
        const podsOfType = ammoPltPods.filter((p) => p.rounds[0]?.type === option.value)
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

      // RSV details with pod listings
      if (ammoPltRSVs.length > 0) {
        report += '  RSV Details:\n'
        ammoPltRSVs.forEach((rsv) => {
          const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
          report += `    ${rsv.name}: ${rsvPods.length} pod${rsvPods.length !== 1 ? 's' : ''}\n`
          if (rsvPods.length > 0) {
            rsvPods.forEach((pod) => {
              const roundType = pod.rounds[0]?.type || 'N/A'
              const totalRounds = pod.rounds.length
              const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
              report += `      - ${pod.name}: ${roundType} - ${availableRounds}/${totalRounds} rounds\n`
            })
          }
        })
        report += '\n'
      }

      report += '\n'
    }

    report += '='.repeat(80) + '\n'
    return report
  }

  const handleCopyASCII = () => {
    const asciiReport = generateASCIIReport()
    navigator.clipboard.writeText(asciiReport)
    alert('ASCII report copied to clipboard!')
  }

  /** Build a self-contained HTML document for printing (no dependency on app layout/CSS). */
  const buildPrintDocumentHtml = (printedAt: string): string => {
    const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const sections: string[] = []

    // Header
    let metaHtml = `<p style="margin:0.25rem 0;font-size:11pt;color:#333;">Generated: ${esc(new Date().toLocaleString())}</p>`
    metaHtml += `<p style="margin:0.25rem 0;font-size:11pt;color:#333;">Printed: ${esc(printedAt)}</p>`
    if (selectedBOC) {
      const boc = bocs.find((b) => b.id === selectedBOC)
      metaHtml += `<p style="margin:0.25rem 0;font-size:11pt;color:#333;">Filter: BOC ${esc(boc?.name || selectedBOC)}</p>`
    }
    if (selectedPOC) {
      const poc = pocs.find((p) => p.id === selectedPOC)
      metaHtml += `<p style="margin:0.25rem 0;font-size:11pt;color:#333;">Filter: POC ${esc(poc?.name || selectedPOC)}</p>`
    }
    sections.push(`
      <div class="report-header">
        <h1>Walker Track &ndash; Ammunition Status Report</h1>
        <div class="report-meta">${metaHtml}</div>
      </div>
    `)

    if (filteredPOCs.length === 0) {
      sections.push('<p class="report-empty">No POCs match the selected filters.</p>')
    } else {
      filteredPOCs.forEach((poc) => {
        const pocPods = getPOCPods(poc)
        const pocLaunchers = launchers.filter((l) => l.pocId === poc.id)
        const podsOnGround = pocPods.filter((p) => !p.launcherId)
        const podsOnLaunchers = pocPods.filter((p) => p.launcherId)
        const pocRSVs = rsvs.filter((r) => r.pocId === poc.id || r.bocId === poc.bocId)
        const podsInStock = podsOnGround.filter((p) => p.pocId === poc.id && !p.rsvId)
        const podsOnRSVs = podsOnGround.filter((p) => p.rsvId)

        let sectionHtml = `
          <div class="report-section">
            <h2>${esc(poc.name)}</h2>
            <div class="report-grid">
              <div class="report-card"><span class="label">Launchers</span><span class="value">${pocLaunchers.length}</span></div>
              <div class="report-card"><span class="label">RSVs</span><span class="value">${pocRSVs.length}</span></div>
              <div class="report-card"><span class="label">In Stock</span><span class="value">${podsInStock.length}</span></div>
              <div class="report-card"><span class="label">On RSVs</span><span class="value">${podsOnRSVs.length}</span></div>
              <div class="report-card"><span class="label">On Launchers</span><span class="value">${podsOnLaunchers.length}</span></div>
              <div class="report-card"><span class="label">Total Pods</span><span class="value">${pocPods.length}</span></div>
            </div>
        `
        roundTypeOptions.forEach((option) => {
          const podsOfType = pocPods.filter((p) => p.rounds[0]?.type === option.value)
          if (podsOfType.length === 0) return
          const totalRounds = podsOfType.reduce((sum, p) => sum + p.rounds.length, 0)
          const availableRounds = podsOfType.reduce((sum, p) => sum + p.rounds.filter((r) => r.status === 'available').length, 0)
          const usedRounds = podsOfType.reduce((sum, p) => sum + p.rounds.filter((r) => r.status === 'used').length, 0)
          sectionHtml += `
            <div class="round-type-card">
              <strong>${esc(option.label)}</strong>
              <div>Pods: ${podsOfType.length} &bull; Total: ${totalRounds} &bull; Available: ${availableRounds} &bull; Used: ${usedRounds}</div>
            </div>
          `
        })
        if (pocLaunchers.length > 0) {
          sectionHtml += '<div class="subsection-title">Launchers</div><div class="report-grid compact">'
          pocLaunchers.forEach((launcher) => {
            const pod = pods.find((p) => p.launcherId === launcher.id)
            const availableRounds = pod?.rounds.filter((r) => r.status === 'available').length ?? 0
            const roundType = pod?.rounds[0]?.type ?? 'N/A'
            sectionHtml += `<div class="report-card">${esc(launcher.name)}: ${esc(roundType)} &ndash; ${availableRounds}/6</div>`
          })
          sectionHtml += '</div>'
        }
        if (pocRSVs.length > 0) {
          sectionHtml += '<div class="subsection-title">RSVs</div>'
          pocRSVs.forEach((rsv) => {
            const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
            sectionHtml += `<div class="report-card"><strong>${esc(rsv.name)}</strong> (${rsvPods.length} pod${rsvPods.length !== 1 ? 's' : ''})</div>`
          })
        }
        sectionHtml += '</div>'
        sections.push(sectionHtml)
      })

      if (selectedBOC && ammoPltBocId === selectedBOC) {
        const ammoPltRSVs = rsvs.filter((r) => r.ammoPltId === AMMO_PLT_ID)
        const ammoPltPods = pods.filter((p) => {
          if (p.ammoPltId === AMMO_PLT_ID) return true
          if (p.rsvId) {
            const r = rsvs.find((rv) => rv.id === p.rsvId)
            return r?.ammoPltId === AMMO_PLT_ID
          }
          return false
        })
        const podsOnGround = ammoPltPods.filter((p) => !p.launcherId)
        const podsOnLaunchers = ammoPltPods.filter((p) => p.launcherId)
        const podsInStock = podsOnGround.filter((p) => p.ammoPltId === AMMO_PLT_ID && !p.rsvId)
        const podsOnRSVs = podsOnGround.filter((p) => p.rsvId)
        let ammoHtml = `
          <div class="report-section">
            <h2>Ammo PLT</h2>
            <div class="report-grid">
              <div class="report-card"><span class="label">RSVs</span><span class="value">${ammoPltRSVs.length}</span></div>
              <div class="report-card"><span class="label">In Stock</span><span class="value">${podsInStock.length}</span></div>
              <div class="report-card"><span class="label">On RSVs</span><span class="value">${podsOnRSVs.length}</span></div>
              <div class="report-card"><span class="label">On Launchers</span><span class="value">${podsOnLaunchers.length}</span></div>
              <div class="report-card"><span class="label">Total Pods</span><span class="value">${ammoPltPods.length}</span></div>
            </div>
        `
        ammoPltRSVs.forEach((rsv) => {
          const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
          ammoHtml += `<div class="report-card"><strong>${esc(rsv.name)}</strong> (${rsvPods.length} pod${rsvPods.length !== 1 ? 's' : ''})</div>`
        })
        ammoHtml += '</div>'
        sections.push(ammoHtml)
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Walker Track – Ammunition Status Report</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; font-size: 11pt; line-height: 1.4; }
    .report { max-width: 100%; margin: 0; padding: 0.5in; box-sizing: border-box; }
    .report-header { margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 3px solid #000; }
    .report-header h1 { font-size: 18pt; font-weight: bold; margin: 0 0 0.5rem 0; }
    .report-meta { font-size: 10pt; color: #333; }
    .report-meta p { margin: 0.15rem 0; }
    .report-empty { font-style: italic; color: #555; }
    .report-section { margin-bottom: 1.25rem; padding: 0.75rem; border: 1px solid #ccc; page-break-inside: avoid; }
    .report-section h2 { font-size: 14pt; font-weight: bold; margin: 0 0 0.75rem 0; border-bottom: 2px solid #666; padding-bottom: 0.35rem; }
    .report-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 0.75rem; }
    .report-grid.compact { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .report-card { padding: 0.5rem; border: 1px solid #ddd; background: #f9f9f9; }
    .report-card .label { display: block; font-size: 9pt; color: #666; }
    .report-card .value { font-weight: bold; }
    .round-type-card { padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #ddd; background: #f5f5f5; }
    .round-type-card strong { display: block; margin-bottom: 0.25rem; }
    .subsection-title { font-size: 10pt; font-weight: 600; margin: 0.75rem 0 0.35rem 0; }
  </style>
</head>
<body>
  <div class="report">
    ${sections.join('\n')}
  </div>
</body>
</html>`
  }

  const handlePrint = () => {
    const printedAt = new Date().toLocaleString()
    setPrintTime(printedAt)
    const html = buildPrintDocumentHtml(printedAt)
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups to print the report.')
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    win.onafterprint = () => win.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div
      className="fdc-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isMobile ? 'var(--bg-primary)' : 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : '1rem',
      }}
      onClick={isMobile ? undefined : onClose}
    >
      <div
        ref={modalContentRef}
        className="touch-kbd-scroll"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: isMobile ? '0' : '12px',
          padding: isMobile ? '1rem' : '2rem',
          maxWidth: isMobile ? '100%' : '1000px',
          width: '100%',
          maxHeight: isMobile ? '100%' : '90vh',
          height: isMobile ? '100%' : 'auto',
          overflow: 'auto',
          border: isMobile ? 'none' : '2px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          touchAction: isMobile ? 'pan-y' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="no-print" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? '1rem' : '0',
          marginBottom: '1rem',
        }}>
          <div style={{ flex: 1, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2
                style={{
                  fontSize: isMobile ? '1.1rem' : '1.25rem',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Ammunition Status Report
              </h2>
              {!isMobile && (
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
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.7rem' : '0.75rem', marginBottom: '0.75rem' }}>
              Generated: {new Date().toLocaleString()}
            </p>
            
            {/* Filters */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <select
                value={selectedBOC}
                onChange={(e) => {
                  setSelectedBOC(e.target.value)
                  setSelectedPOC('') // Clear POC when BOC changes
                }}
                style={{
                  padding: isMobile ? '0.5rem' : '0.4rem 0.6rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '0.9rem' : '0.85rem',
                  cursor: 'pointer',
                  flex: isMobile ? '1' : 'none',
                  width: isMobile ? '100%' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
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
                  padding: isMobile ? '0.5rem' : '0.4rem 0.6rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '0.9rem' : '0.85rem',
                  cursor: 'pointer',
                  flex: isMobile ? '1' : 'none',
                  width: isMobile ? '100%' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
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
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem',
            flexDirection: isMobile ? 'row' : 'row',
            width: isMobile ? '100%' : 'auto',
          }}>
            <button
              onClick={handleCopyASCII}
              style={{
                flex: isMobile ? 1 : 'none',
                padding: isMobile ? '0.75rem' : '0.5rem 1rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                minHeight: isMobile ? '44px' : 'auto',
              }}
            >
              <Copy size={isMobile ? 18 : 16} />
              {isMobile ? 'Copy' : 'Copy ASCII'}
            </button>
            <button
              onClick={handlePrint}
              style={{
                flex: isMobile ? 1 : 'none',
                padding: isMobile ? '0.75rem' : '0.5rem 1rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                minHeight: isMobile ? '44px' : 'auto',
              }}
            >
              <Printer size={isMobile ? 18 : 16} />
              Print
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  minWidth: '44px',
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Print area: header + report (only this region is visible when printing) */}
        <div className="print-area">
          {/* Print Header - Only visible when printing */}
          <div className="print-report-header" style={{ display: 'none' }}>
            <h2>Walker Track – Ammunition Status Report</h2>
            <p>Generated: {new Date().toLocaleString()}</p>
            {printTime && (
              <p>Printed: {printTime}</p>
            )}
            {selectedBOC && (
              <p>Filter: BOC {bocs.find((b) => b.id === selectedBOC)?.name || selectedBOC}</p>
            )}
            {selectedPOC && (
              <p>Filter: POC {pocs.find((p) => p.id === selectedPOC)?.name || selectedPOC}</p>
            )}
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
            
            // Get RSVs assigned to this POC or its BOC
            const pocRSVs = rsvs.filter((r) => {
              if (r.pocId === poc.id) return true
              if (r.bocId === poc.bocId) return true
              return false
            })
            
            // Separate pods in stock (directly assigned to POC) from pods on RSVs
            const podsInStock = podsOnGround.filter((p) => p.pocId === poc.id && !p.rsvId)
            const podsOnRSVs = podsOnGround.filter((p) => p.rsvId)

            return (
              <div
                key={poc.id}
                style={{
                  marginBottom: '1rem',
                  padding: isMobile ? '0.5rem' : '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  pageBreakInside: 'avoid',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <h3
                  style={{
                    fontSize: isMobile ? '0.9rem' : '1rem',
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
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Launchers</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{pocLaunchers.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>RSVs</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{pocRSVs.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>In Stock</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{podsInStock.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>On RSVs</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{podsOnRSVs.length}</div>
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
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
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
                            padding: isMobile ? '0.4rem' : '0.5rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            {option.label}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Pods:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{podsOfType.length}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Total:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{totalRounds}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--success)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Available:</span>
                            <span style={{ fontWeight: '600', color: 'var(--success)' }}>{availableRounds}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--danger)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Used:</span>
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
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
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
                              padding: isMobile ? '0.4rem' : '0.5rem',
                              backgroundColor: 'var(--bg-tertiary)',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              fontSize: isMobile ? '0.7rem' : '0.75rem',
                              width: '100%',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
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

                {/* RSV Details - Compact */}
                {(() => {
                  // Get RSVs assigned to this POC or its BOC
                  const pocRSVs = rsvs.filter((r) => {
                    if (r.pocId === poc.id) return true
                    if (r.bocId === poc.bocId) return true
                    return false
                  })

                  if (pocRSVs.length === 0) return null

                  return (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        RSVs
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        {pocRSVs.map((rsv) => {
                          const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
                          return (
                            <div
                              key={rsv.id}
                              style={{
                                padding: isMobile ? '0.4rem' : '0.5rem',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                fontSize: isMobile ? '0.7rem' : '0.75rem',
                                width: '100%',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                {rsv.name} ({rsvPods.length} pod{rsvPods.length !== 1 ? 's' : ''})
                              </div>
                              {rsvPods.length > 0 && (
                                <div style={{ marginLeft: '0.5rem', marginTop: '0.25rem' }}>
                                  {rsvPods.map((pod) => {
                                    const roundType = pod.rounds[0]?.type || 'N/A'
                                    const totalRounds = pod.rounds.length
                                    const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                                    return (
                                      <div
                                        key={pod.id}
                                        style={{
                                          color: 'var(--text-secondary)',
                                          fontSize: isMobile ? '0.65rem' : '0.7rem',
                                          marginBottom: '0.15rem',
                                        }}
                                      >
                                        • {pod.name}: {roundType} - {availableRounds}/{totalRounds} rounds
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })
          )}

          {/* Ammo PLT Section - Show if its BOC is selected */}
          {selectedBOC && ammoPltBocId === selectedBOC && (() => {
            const ammoPltRSVs = rsvs.filter((r) => r.ammoPltId === AMMO_PLT_ID)
            const ammoPltPods = pods.filter((p) => {
              if (p.ammoPltId === AMMO_PLT_ID) return true
              if (p.rsvId) {
                const rsv = rsvs.find((r) => r.id === p.rsvId)
                if (rsv && rsv.ammoPltId === AMMO_PLT_ID) return true
              }
              return false
            })
            const podsOnGround = ammoPltPods.filter((p) => !p.launcherId)
            const podsOnLaunchers = ammoPltPods.filter((p) => p.launcherId)
            
            // Separate pods in stock (directly assigned to ammo plt) from pods on RSVs
            const podsInStock = podsOnGround.filter((p) => p.ammoPltId === AMMO_PLT_ID && !p.rsvId)
            const podsOnRSVs = podsOnGround.filter((p) => p.rsvId)

            return (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: isMobile ? '0.5rem' : '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  pageBreakInside: 'avoid',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <h3
                  style={{
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: 'bold',
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Ammo PLT
                </h3>

                {/* Summary - Compact */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>RSVs</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{ammoPltRSVs.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>In Stock</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{podsInStock.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>On RSVs</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{podsOnRSVs.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>On Launchers</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{podsOnLaunchers.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>Total Pods</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{ammoPltPods.length}</div>
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
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '0.5rem',
                    }}
                  >
                    {roundTypeOptions.map((option) => {
                      const podsOfType = ammoPltPods.filter((p) => p.rounds[0]?.type === option.value)
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
                            padding: isMobile ? '0.4rem' : '0.5rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            fontSize: isMobile ? '0.7rem' : '0.75rem',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            {option.label}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Pods:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{podsOfType.length}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Total:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{totalRounds}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--success)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Available:</span>
                            <span style={{ fontWeight: '600', color: 'var(--success)' }}>{availableRounds}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--danger)', fontSize: isMobile ? '0.65rem' : '0.7rem' }}>Used:</span>
                            <span style={{ fontWeight: '600', color: 'var(--danger)' }}>{usedRounds}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* RSV Details - Compact */}
                {ammoPltRSVs.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      RSVs
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      {ammoPltRSVs.map((rsv) => {
                        const rsvPods = pods.filter((p) => p.rsvId === rsv.id && !p.launcherId)
                        return (
                          <div
                            key={rsv.id}
                            style={{
                              padding: isMobile ? '0.4rem' : '0.5rem',
                              backgroundColor: 'var(--bg-tertiary)',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              fontSize: isMobile ? '0.7rem' : '0.75rem',
                              width: '100%',
                              maxWidth: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                              {rsv.name} ({rsvPods.length} pod{rsvPods.length !== 1 ? 's' : ''})
                            </div>
                            {rsvPods.length > 0 && (
                              <div style={{ marginLeft: '0.5rem', marginTop: '0.25rem' }}>
                                {rsvPods.map((pod) => {
                                  const roundType = pod.rounds[0]?.type || 'N/A'
                                  const totalRounds = pod.rounds.length
                                  const availableRounds = pod.rounds.filter((r) => r.status === 'available').length
                                  return (
                                    <div
                                      key={pod.id}
                                      style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: isMobile ? '0.65rem' : '0.7rem',
                                        marginBottom: '0.15rem',
                                      }}
                                    >
                                      • {pod.name}: {roundType} - {availableRounds}/{totalRounds} rounds
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        </div>

        {/* ASCII Report Preview */}
        <div className="no-print"
          style={{
            marginTop: '1rem',
            padding: isMobile ? '0.5rem' : '0.75rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <h4
            style={{
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            ASCII Report {isMobile ? '(Tap Copy)' : '(Click "Copy ASCII" to copy)'}
          </h4>
          <pre
            style={{
              fontSize: isMobile ? '0.65rem' : '0.7rem',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-primary)',
              padding: isMobile ? '0.5rem' : '0.75rem',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: isMobile ? '200px' : '250px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowX: 'auto',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {generateASCIIReport()}
          </pre>
        </div>
      </div>
    </div>
  )
}

