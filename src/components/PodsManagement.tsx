import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Pod, RoundType } from '../types'
import { Plus, Search, Trash2 } from 'lucide-react'
import { getEnabledRoundTypeOptions } from '../constants/roundTypes'

type PodGroup =
  | 'all'
  | 'ammo-plt'
  | 'on-hand-poc'
  | 'boc'
  | 'battalion'
  | 'brigade'
  | 'rsv'
  | 'launcher'
  | 'unassigned'

interface PodsManagementProps {
  onAddPod?: () => void
}

const AMMO_PLT_ID = 'ammo-plt-1'

function splitAssignValue(raw: string): [string, string] {
  const i = raw.indexOf('|')
  if (i < 0) return [raw, '']
  return [raw.slice(0, i), raw.slice(i + 1)]
}

export default memo(function PodsManagement({ onAddPod }: PodsManagementProps) {
  const {
    pods,
    pocs,
    bocs,
    battalions,
    brigades,
    rsvs,
    launchers,
    assignPodToPOC,
    assignPodToRSV,
    assignPodToAmmoPlt,
    assignPodToLauncher,
    assignPodToBOC,
    assignPodToBattalion,
    assignPodToBrigade,
    deletePod,
    roundTypes,
  } = useAppData()

  const [selectedGroup, setSelectedGroup] = useState<PodGroup>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoundType, setSelectedRoundType] = useState<RoundType | 'all'>('all')
  const [selectedPodIds, setSelectedPodIds] = useState<Set<string>>(new Set())
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  const roundTypeOptions = useMemo(() => getEnabledRoundTypeOptions(roundTypes), [roundTypes])

  const podPrimaryGroup = useCallback((pod: Pod): PodGroup => {
    if (pod.launcherId) return 'launcher'
    if (pod.rsvId) return 'rsv'
    if (pod.ammoPltId === AMMO_PLT_ID) return 'ammo-plt'
    if (pod.pocId) return 'on-hand-poc'
    if (pod.bocId) return 'boc'
    if (pod.battalionId) return 'battalion'
    if (pod.brigadeId) return 'brigade'
    if (pod.ammoPltId) return 'ammo-plt'
    return 'unassigned'
  }, [])

  const groupedPods = useMemo(() => {
    const groups: Record<PodGroup, Pod[]> = {
      all: [],
      'ammo-plt': [],
      'on-hand-poc': [],
      boc: [],
      battalion: [],
      brigade: [],
      rsv: [],
      launcher: [],
      unassigned: [],
    }

    pods.forEach((pod) => {
      groups.all.push(pod)
      groups[podPrimaryGroup(pod)].push(pod)
    })

    return groups
  }, [pods, podPrimaryGroup])

  const filteredPods = useMemo(() => {
    let filtered = groupedPods[selectedGroup]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (pod) =>
          pod.name.toLowerCase().includes(query) ||
          pod.uuid.toLowerCase().includes(query)
      )
    }

    if (selectedRoundType !== 'all') {
      filtered = filtered.filter((pod) => pod.rounds[0]?.type === selectedRoundType)
    }

    return filtered
  }, [groupedPods, selectedGroup, searchQuery, selectedRoundType])

  const getPodAssignment = useCallback(
    (pod: Pod) => {
      if (pod.launcherId) {
        const launcher = launchers.find((l) => l.id === pod.launcherId)
        return {
          type: 'launcher' as const,
          selectValue: `launcher|${pod.launcherId}`,
          location: 'On launcher',
          detail: launcher?.name || 'Unknown launcher',
        }
      }
      if (pod.rsvId) {
        const rsv = rsvs.find((r) => r.id === pod.rsvId)
        return {
          type: 'rsv' as const,
          selectValue: `rsv|${pod.rsvId}`,
          location: 'On RSV',
          detail: rsv?.name || 'Unknown RSV',
        }
      }
      if (pod.ammoPltId === AMMO_PLT_ID) {
        return {
          type: 'ammo-plt' as const,
          selectValue: `ammo-plt|${AMMO_PLT_ID}`,
          location: 'Ammo PLT',
          detail: 'Ammo platoon stock',
        }
      }
      if (pod.pocId) {
        const poc = pocs.find((p) => p.id === pod.pocId)
        return {
          type: 'poc' as const,
          selectValue: `poc|${pod.pocId}`,
          location: 'On hand (PLT)',
          detail: poc?.name || 'Unknown PLT',
        }
      }
      if (pod.bocId) {
        const boc = bocs.find((b) => b.id === pod.bocId)
        return {
          type: 'boc' as const,
          selectValue: `boc|${pod.bocId}`,
          location: 'Battery pool',
          detail: boc?.name || 'Unknown BOC',
        }
      }
      if (pod.battalionId) {
        const bn = battalions.find((b) => b.id === pod.battalionId)
        return {
          type: 'battalion' as const,
          selectValue: `battalion|${pod.battalionId}`,
          location: 'Bn holding',
          detail: bn?.name || 'Unknown Bn',
        }
      }
      if (pod.brigadeId) {
        const bde = brigades.find((b) => b.id === pod.brigadeId)
        return {
          type: 'brigade' as const,
          selectValue: `brigade|${pod.brigadeId}`,
          location: 'Bde holding',
          detail: bde?.name || 'Unknown Bde',
        }
      }
      if (pod.ammoPltId) {
        return {
          type: 'ammo-plt' as const,
          selectValue: `ammo-plt|${pod.ammoPltId}`,
          location: 'Ammo PLT',
          detail: 'Invalid / legacy ammo PLT id',
        }
      }
      return {
        type: 'unassigned' as const,
        selectValue: 'unassigned|',
        location: 'Unassigned',
        detail: '—',
      }
    },
    [launchers, rsvs, pocs, bocs, battalions, brigades]
  )

  const handleAssignmentChange = useCallback(
    (podId: string, assignmentType: string, assignmentId: string) => {
      assignPodToPOC(podId, '')
      assignPodToRSV(podId, '')
      assignPodToAmmoPlt(podId, '')
      assignPodToLauncher(podId, '')
      assignPodToBOC(podId, '')
      assignPodToBattalion(podId, '')
      assignPodToBrigade(podId, '')

      switch (assignmentType) {
        case 'ammo-plt':
          assignPodToAmmoPlt(podId, assignmentId)
          break
        case 'poc':
          assignPodToPOC(podId, assignmentId)
          break
        case 'boc':
          assignPodToBOC(podId, assignmentId)
          break
        case 'battalion':
          assignPodToBattalion(podId, assignmentId)
          break
        case 'brigade':
          assignPodToBrigade(podId, assignmentId)
          break
        case 'rsv':
          assignPodToRSV(podId, assignmentId)
          break
        case 'launcher':
          assignPodToLauncher(podId, assignmentId)
          break
        default:
          break
      }
    },
    [
      assignPodToPOC,
      assignPodToRSV,
      assignPodToAmmoPlt,
      assignPodToLauncher,
      assignPodToBOC,
      assignPodToBattalion,
      assignPodToBrigade,
    ]
  )

  const getPodRoundType = (pod: Pod): RoundType | 'Unknown' => pod.rounds[0]?.type || 'Unknown'

  const getAvailableRounds = (pod: Pod): number => pod.rounds.filter((r) => r.status === 'available').length

  const groupCounts = useMemo(
    () => ({
      all: groupedPods.all.length,
      'ammo-plt': groupedPods['ammo-plt'].length,
      'on-hand-poc': groupedPods['on-hand-poc'].length,
      boc: groupedPods.boc.length,
      battalion: groupedPods.battalion.length,
      brigade: groupedPods.brigade.length,
      rsv: groupedPods.rsv.length,
      launcher: groupedPods.launcher.length,
      unassigned: groupedPods.unassigned.length,
    }),
    [groupedPods]
  )

  const groupLabels: Record<PodGroup, string> = {
    all: 'All',
    'ammo-plt': 'Ammo PLT',
    'on-hand-poc': 'On hand (PLT)',
    boc: 'Battery pool',
    battalion: 'Bn',
    brigade: 'Bde',
    rsv: 'RSV',
    launcher: 'Launcher',
    unassigned: 'Unassigned',
  }

  const isAllSelected = useMemo(
    () => filteredPods.length > 0 && filteredPods.every((pod) => selectedPodIds.has(pod.id)),
    [filteredPods, selectedPodIds]
  )
  const isSomeSelected = useMemo(
    () => filteredPods.some((pod) => selectedPodIds.has(pod.id)),
    [filteredPods, selectedPodIds]
  )

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeSelected && !isAllSelected
    }
  }, [isSomeSelected, isAllSelected])

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedPodIds((prev) => {
        const newSet = new Set(prev)
        filteredPods.forEach((pod) => newSet.delete(pod.id))
        return newSet
      })
    } else {
      setSelectedPodIds((prev) => {
        const newSet = new Set(prev)
        filteredPods.forEach((pod) => newSet.add(pod.id))
        return newSet
      })
    }
  }, [isAllSelected, filteredPods])

  const handleSelectPod = useCallback((podId: string) => {
    setSelectedPodIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(podId)) newSet.delete(podId)
      else newSet.add(podId)
      return newSet
    })
  }, [])

  const handleBulkReassign = useCallback(
    (assignmentType: string, assignmentId: string) => {
      selectedPodIds.forEach((podId) => {
        handleAssignmentChange(podId, assignmentType, assignmentId)
      })
      setSelectedPodIds(new Set())
    },
    [selectedPodIds, handleAssignmentChange]
  )

  const handleBulkDelete = useCallback(() => {
    const selectedPods = pods.filter((p) => selectedPodIds.has(p.id))
    const podNames = selectedPods.map((p) => p.name).join(', ')
    if (
      confirm(
        `Are you sure you want to delete ${selectedPodIds.size} pod(s)?\n\n${podNames}\n\nThis will also delete all rounds in these pods.`
      )
    ) {
      selectedPodIds.forEach((podId) => {
        deletePod(podId)
      })
      setSelectedPodIds(new Set())
    }
  }, [selectedPodIds, pods, deletePod])

  const pocsSorted = useMemo(() => [...pocs].sort((a, b) => a.name.localeCompare(b.name)), [pocs])
  const bocsSorted = useMemo(() => [...bocs].sort((a, b) => a.name.localeCompare(b.name)), [bocs])
  const battalionsSorted = useMemo(
    () => [...battalions].sort((a, b) => a.name.localeCompare(b.name)),
    [battalions]
  )
  const brigadesSorted = useMemo(() => [...brigades].sort((a, b) => a.name.localeCompare(b.name)), [brigades])
  const rsvsSorted = useMemo(() => [...rsvs].sort((a, b) => a.name.localeCompare(b.name)), [rsvs])
  const launchersSorted = useMemo(
    () => [...launchers].sort((a, b) => a.name.localeCompare(b.name)),
    [launchers]
  )

  const reassignmentSelectOptions = (
    <>
      <option value="unassigned|">Unassigned</option>
      <option value={`ammo-plt|${AMMO_PLT_ID}`}>Ammo PLT</option>
      <optgroup label="On hand (PLT FDC)">
        {pocsSorted.map((poc) => (
          <option key={poc.id} value={`poc|${poc.id}`}>
            {poc.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Battery pool (BOC)">
        {bocsSorted.map((boc) => (
          <option key={boc.id} value={`boc|${boc.id}`}>
            {boc.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Battalion holding">
        {battalionsSorted.map((bn) => (
          <option key={bn.id} value={`battalion|${bn.id}`}>
            {bn.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Brigade holding">
        {brigadesSorted.map((bde) => (
          <option key={bde.id} value={`brigade|${bde.id}`}>
            {bde.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="On RSV">
        {rsvsSorted.map((rsv) => (
          <option key={rsv.id} value={`rsv|${rsv.id}`}>
            {rsv.name}
          </option>
        ))}
      </optgroup>
      <optgroup label="On launcher">
        {launchersSorted.map((launcher) => (
          <option key={launcher.id} value={`launcher|${launcher.id}`}>
            {launcher.name}
          </option>
        ))}
      </optgroup>
    </>
  )

  const tabOrder: PodGroup[] = [
    'all',
    'on-hand-poc',
    'launcher',
    'rsv',
    'ammo-plt',
    'boc',
    'battalion',
    'brigade',
    'unassigned',
  ]

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Pods ({pods.length})
        </h2>
        {onAddPod && (
          <button
            onClick={onAddPod}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}
          >
            <Plus size={16} />
            Add Pod
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '-0.75rem', marginBottom: '1rem' }}>
        <strong>On hand (PLT)</strong> is platoon FDC stock (not on a tube or RSV). Launcher and RSV rows show what is fielded;
        BOC / Bn / Bde are higher holding pools.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            placeholder="Search pods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.5rem 0.5rem 2.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <select
          value={selectedRoundType}
          onChange={(e) => setSelectedRoundType(e.target.value as RoundType | 'all')}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            minWidth: '150px',
          }}
        >
          <option value="all">All Round Types</option>
          {roundTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '0.5rem',
        }}
      >
        {tabOrder.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            style={{
              padding: '0.5rem 0.65rem',
              backgroundColor: selectedGroup === group ? 'var(--accent)' : 'transparent',
              color: selectedGroup === group ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: selectedGroup === group ? '600' : '400',
            }}
          >
            {groupLabels[group]} ({groupCounts[group]})
          </button>
        ))}
      </div>

      {selectedPodIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>
            {selectedPodIds.size} pod{selectedPodIds.size !== 1 ? 's' : ''} selected
          </span>
          <select
            onChange={(e) => {
              const raw = e.target.value
              if (raw) {
                const [type, id] = splitAssignValue(raw)
                handleBulkReassign(type, id)
              }
              e.target.value = ''
            }}
            style={{
              padding: '0.4rem 0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              minWidth: '180px',
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Bulk reassign…
            </option>
            {reassignmentSelectOptions}
          </select>
          <button
            onClick={handleBulkDelete}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--danger)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedPodIds(new Set())}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {filteredPods.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          No pods found
        </p>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderBottom: '2px solid var(--border)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '40px' }}>
                  <input
                    type="checkbox"
                    ref={selectAllCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                </th>
                <th
                  data-guide="pods-table-column-name"
                  style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}
                >
                  Name
                </th>
                <th
                  data-guide="pods-table-column-round-type"
                  style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}
                >
                  Round type
                </th>
                <th
                  data-guide="pods-table-column-rounds"
                  style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}
                >
                  Rounds
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Location
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Assigned to
                </th>
                <th
                  data-guide="pods-table-column-reassign"
                  style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}
                >
                  Reassign
                </th>
                <th
                  data-guide="pods-table-column-actions"
                  style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-primary)', fontWeight: '600' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPods.map((pod) => {
                const assignment = getPodAssignment(pod)
                const roundType = getPodRoundType(pod)
                const availableRounds = getAvailableRounds(pod)
                const totalRounds = pod.rounds.length
                const isSelected = selectedPodIds.has(pod.id)

                return (
                  <tr
                    key={pod.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectPod(pod.id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <div style={{ fontWeight: '500' }}>{pod.name}</div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          marginTop: '0.25rem',
                        }}
                      >
                        {pod.uuid.slice(0, 8)}…
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{roundType}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--success)', fontWeight: '500' }}>{availableRounds}</span>
                      {' / '}
                      <span>{totalRounds}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: '4px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                        }}
                      >
                        {assignment.location}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {assignment.detail}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={assignment.selectValue}
                        onChange={(e) => {
                          const raw = e.target.value
                          const [type, id] = splitAssignValue(raw)
                          handleAssignmentChange(pod.id, type, id)
                        }}
                        style={{
                          padding: '0.4rem 0.5rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          minWidth: '160px',
                        }}
                      >
                        {reassignmentSelectOptions}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete pod "${pod.name}"? This will also delete all rounds in this pod.`
                            )
                          ) {
                            deletePod(pod.id)
                          }
                        }}
                        style={{
                          padding: '0.35rem 0.5rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.85rem',
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})
