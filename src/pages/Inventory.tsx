import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { Plus, Trash2 } from 'lucide-react'
import { ROUND_TYPE_OPTIONS, RoundType } from '../constants/roundTypes'

export default function Inventory() {
  const {
    bocs,
    pocs,
    launchers,
    pods,
    rounds,
    addBOC,
    addPOC,
    addLauncher,
    addPod,
    addRound,
  } = useAppData()

  const [showBOCForm, setShowBOCForm] = useState(false)
  const [showPOCForm, setShowPOCForm] = useState(false)
  const [showLauncherForm, setShowLauncherForm] = useState(false)
  const [showPodForm, setShowPodForm] = useState(false)

  const handleAddBOC = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    if (name) {
      addBOC({
        id: Date.now().toString(),
        name,
        pocs: [],
      })
      setShowBOCForm(false)
      e.currentTarget.reset()
    }
  }

  const handleAddPOC = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    if (name) {
      addPOC({
        id: Date.now().toString(),
        name,
        launchers: [],
      })
      setShowPOCForm(false)
      e.currentTarget.reset()
    }
  }

  const handleAddLauncher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    if (name) {
      addLauncher({
        id: Date.now().toString(),
        name,
        status: 'idle',
      })
      setShowLauncherForm(false)
      e.currentTarget.reset()
    }
  }

  const handleAddPod = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const roundCount = parseInt(formData.get('roundCount') as string) || 0
    const roundType = (formData.get('roundType') as RoundType) || 'M28A1'
    if (name) {
      const newRounds = Array.from({ length: roundCount }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        type: roundType,
        status: 'available' as const,
      }))
      newRounds.forEach((round) => addRound(round))
      addPod({
        id: Date.now().toString(),
        name,
        rounds: newRounds,
      })
      setShowPodForm(false)
      e.currentTarget.reset()
    }
  }

  const FormButton = ({
    label,
    onClick,
    showForm,
  }: {
    label: string
    onClick: () => void
    showForm: boolean
  }) => (
    <button
      onClick={onClick}
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
      {showForm ? 'Cancel' : `Add ${label}`}
    </button>
  )

  const ItemCard = ({
    title,
    items,
    onAdd,
    showForm,
    setShowForm,
  }: {
    title: string
    items: any[]
    onAdd: (e: React.FormEvent<HTMLFormElement>) => void
    showForm: boolean
    setShowForm: (show: boolean) => void
  }) => (
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
        <FormButton
          label={title.slice(0, -1)}
          onClick={() => setShowForm(!showForm)}
          showForm={showForm}
        />
      </div>

      {showForm && (
        <form
          onSubmit={onAdd}
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
            name="name"
            placeholder="Name"
            required
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
                name="roundType"
                defaultValue="M28A1"
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
                name="roundCount"
                placeholder="Number of Rounds"
                min="0"
                max="6"
                defaultValue="6"
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </>
          )}
          <button
            type="submit"
            style={{
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
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No {title.toLowerCase()} yet
          </p>
        ) : (
          items.map((item) => (
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
          ))
        )}
      </div>
    </div>
  )

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
          items={bocs}
          onAdd={handleAddBOC}
          showForm={showBOCForm}
          setShowForm={setShowBOCForm}
        />
        <ItemCard
          title="POCs"
          items={pocs}
          onAdd={handleAddPOC}
          showForm={showPOCForm}
          setShowForm={setShowPOCForm}
        />
        <ItemCard
          title="Launchers"
          items={launchers}
          onAdd={handleAddLauncher}
          showForm={showLauncherForm}
          setShowForm={setShowLauncherForm}
        />
        <ItemCard
          title="Pods"
          items={pods}
          onAdd={handleAddPod}
          showForm={showPodForm}
          setShowForm={setShowPodForm}
        />
      </div>
    </div>
  )
}

