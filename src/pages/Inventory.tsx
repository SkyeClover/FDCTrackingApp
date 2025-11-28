import { useState, memo, useMemo, useCallback } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus } from 'lucide-react'
import { ROUND_TYPE_OPTIONS, RoundType } from '../constants/roundTypes'

// Memoized form component to prevent re-renders
const ItemForm = memo(({
  title,
  onSubmit,
  onCancel,
  pocs,
}: {
  title: string
  onSubmit: (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => void
  onCancel: () => void
  pocs?: Array<{ id: string; name: string }>
}) => {
  const [name, setName] = useState('')
  const [roundType, setRoundType] = useState<RoundType>('M28A1')
  const [roundCount, setRoundCount] = useState(6)
  const [quantity, setQuantity] = useState(1)
  const [pocId, setPocId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit({ 
        name: name.trim(), 
        roundType, 
        roundCount,
        quantity: title === 'Pods' ? quantity : undefined,
        pocId: title === 'Pods' && pocId ? pocId : undefined,
      })
      setName('')
      setRoundType('M28A1')
      setRoundCount(6)
      setQuantity(1)
      setPocId('')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        autoFocus
        style={{
          padding: '0.5rem',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
        }}
      />
      {title === 'Pods' && (
        <>
          <select
            value={roundType}
            onChange={(e) => setRoundType(e.target.value as RoundType)}
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          >
            {ROUND_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={roundCount}
            onChange={(e) => setRoundCount(Math.max(0, Math.min(6, parseInt(e.target.value) || 0)))}
            placeholder="Rounds per Pod"
            min="0"
            max="6"
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            placeholder="Number of Pods"
            min="1"
            style={{
              padding: '0.5rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          />
          {pocs && pocs.length > 0 && (
            <select
              value={pocId}
              onChange={(e) => setPocId(e.target.value)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            >
              <option value="">Assign to POC (Optional)</option>
              {pocs.map((poc) => (
                <option key={poc.id} value={poc.id}>
                  {poc.name}
                </option>
              ))}
            </select>
          )}
        </>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--success)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
})

ItemForm.displayName = 'ItemForm'

// Memoized item list to prevent re-renders
const ItemList = memo(({
  items,
  title,
}: {
  items: Array<{ id: string; name: string; rounds?: any[] }>
  title: string
}) => {
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        No {title.toLowerCase()} yet
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
          {title === 'Pods' && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {item.rounds?.length || 0} rounds
            </span>
          )}
        </div>
      ))}
    </div>
  )
})

ItemList.displayName = 'ItemList'

// Memoized item card
const ItemCard = memo(({
  title,
  items,
  onAdd,
  showForm,
  onToggleForm,
  pocs,
}: {
  title: string
  items: Array<{ id: string; name: string; rounds?: any[] }>
  onAdd: (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => void
  showForm: boolean
  onToggleForm: () => void
  pocs?: Array<{ id: string; name: string }>
}) => {
  const handleSubmit = useCallback(
    (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => {
      onAdd(data)
      onToggleForm()
    },
    [onAdd, onToggleForm]
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {title} ({items.length})
        </h2>
        <button
          onClick={onToggleForm}
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
          {showForm ? 'Cancel' : `Add ${title.slice(0, -1)}`}
        </button>
      </div>

      {showForm && <ItemForm title={title} onSubmit={handleSubmit} onCancel={onToggleForm} pocs={pocs} />}

      <ItemList items={items} title={title} />
    </div>
  )
})

ItemCard.displayName = 'ItemCard'

export default function Inventory() {
  const { bocs, pocs, launchers, pods, rsvs, addBOC, addPOC, addLauncher, addPod, addRSV, addRound, assignPodToPOC } = useAppData()

  const [showBOCForm, setShowBOCForm] = useState(false)
  const [showPOCForm, setShowPOCForm] = useState(false)
  const [showLauncherForm, setShowLauncherForm] = useState(false)
  const [showPodForm, setShowPodForm] = useState(false)
  const [showRSVForm, setShowRSVForm] = useState(false)

  // Memoize callbacks to prevent re-renders
  const handleAddBOC = useCallback(
    (data: { name: string }) => {
      addBOC({
        id: Date.now().toString(),
        name: data.name,
        pocs: [],
      })
    },
    [addBOC]
  )

  const handleAddPOC = useCallback(
    (data: { name: string }) => {
      addPOC({
        id: Date.now().toString(),
        name: data.name,
        launchers: [],
      })
    },
    [addPOC]
  )

  const handleAddLauncher = useCallback(
    (data: { name: string }) => {
      addLauncher({
        id: Date.now().toString(),
        name: data.name,
        status: 'idle',
      })
    },
    [addLauncher]
  )

  const handleAddPod = useCallback(
    (data: { name: string; roundType?: RoundType; roundCount?: number; quantity?: number; pocId?: string }) => {
      const quantity = data.quantity || 1
      const roundCount = data.roundCount || 0
      const roundType = data.roundType || 'M28A1'
      
      for (let i = 0; i < quantity; i++) {
        const podName = quantity > 1 ? `${data.name} ${i + 1}` : data.name
        const timestamp = Date.now() + i
        const newRounds = Array.from({ length: roundCount }, (_, j) => ({
          id: `${timestamp}-${j}`,
          type: roundType,
          status: 'available' as const,
        }))
        newRounds.forEach((round) => addRound(round))
        const newPod: any = {
          id: timestamp.toString(),
          uuid: crypto.randomUUID(),
          name: podName,
          rounds: newRounds,
        }
        addPod(newPod)
        // Assign to POC if specified
        if (data.pocId) {
          assignPodToPOC(timestamp.toString(), data.pocId)
        }
      }
    },
    [addPod, addRound, assignPodToPOC]
  )

  const handleAddRSV = useCallback(
    (data: { name: string }) => {
      addRSV({
        id: Date.now().toString(),
        name: data.name,
      })
    },
    [addRSV]
  )

  // Memoize arrays to prevent unnecessary re-renders
  const bocsMemo = useMemo(() => bocs, [bocs])
  const pocsMemo = useMemo(() => pocs, [pocs])
  const launchersMemo = useMemo(() => launchers, [launchers])
  const podsMemo = useMemo(() => pods, [pods])
  const rsvsMemo = useMemo(() => rsvs, [rsvs])

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
        Inventory
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <ItemCard
          title="BOCs"
          items={bocsMemo}
          onAdd={handleAddBOC}
          showForm={showBOCForm}
          onToggleForm={() => setShowBOCForm(!showBOCForm)}
        />
        <ItemCard
          title="POCs"
          items={pocsMemo}
          onAdd={handleAddPOC}
          showForm={showPOCForm}
          onToggleForm={() => setShowPOCForm(!showPOCForm)}
        />
        <ItemCard
          title="Launchers"
          items={launchersMemo}
          onAdd={handleAddLauncher}
          showForm={showLauncherForm}
          onToggleForm={() => setShowLauncherForm(!showLauncherForm)}
        />
        <ItemCard
          title="Pods"
          items={podsMemo}
          onAdd={handleAddPod}
          showForm={showPodForm}
          onToggleForm={() => setShowPodForm(!showPodForm)}
          pocs={pocsMemo}
        />
        <ItemCard
          title="RSVs"
          items={rsvsMemo}
          onAdd={handleAddRSV}
          showForm={showRSVForm}
          onToggleForm={() => setShowRSVForm(!showRSVForm)}
        />
      </div>
    </div>
  )
}
