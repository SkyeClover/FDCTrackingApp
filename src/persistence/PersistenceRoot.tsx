import { ReactNode, useEffect, useState } from 'react'
import {
  flushPersistenceNow,
  initPersistence,
  loadAppStateFromDb,
  readInitialSetupCompleteFromDb,
} from './sqlite'
import { getDefaultState } from '../utils/saveLoad'
import { readInitialSetupCompleteFromStorage } from '../utils/saveLoad'
import { normalizeLoadedAppState } from '../utils/normalizeAppState'
import type { AppState } from '../types'
import { AppDataProvider } from '../context/AppDataContext'

/** Flush SQLite → IndexedDB when the tab hides or the user closes the browser (best-effort). */
function PersistenceUnloadFlush() {
  useEffect(() => {
    const flush = () => {
      void flushPersistenceNow()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])
  return null
}

interface PersistenceRootProps {
  children: ReactNode
  updateProgress?: (taskId: string, progress: number) => void
  removeProgress?: (taskId: string) => void
}

export function PersistenceRoot({ children, updateProgress, removeProgress }: PersistenceRootProps) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [boot, setBoot] = useState<{ state: AppState; setup: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    initPersistence()
      .then(() => {
        if (cancelled) return
        const loaded = loadAppStateFromDb()
        const setup = readInitialSetupCompleteFromDb() || readInitialSetupCompleteFromStorage()
        const state = loaded
          ? normalizeLoadedAppState({
              ...loaded,
              rsvs: loaded.rsvs ?? [],
              brigades: loaded.brigades ?? [],
              battalions: loaded.battalions ?? [],
            })
          : normalizeLoadedAppState(getDefaultState())
        setBoot({ state, setup })
        setPhase('ready')
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setPhase('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (phase === 'error') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '40rem' }}>
        <h1>Storage failed</h1>
        <p>{error}</p>
        <p style={{ opacity: 0.8 }}>Try another browser, or allow this site to save data in your browser settings.</p>
      </div>
    )
  }

  if (phase !== 'ready' || !boot) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui',
          color: 'var(--text-muted, #888)',
        }}
      >
        Loading database…
      </div>
    )
  }

  return (
    <AppDataProvider
      initialAppState={boot.state}
      initialSetupComplete={boot.setup}
      updateProgress={updateProgress}
      removeProgress={removeProgress}
    >
      <PersistenceUnloadFlush />
      {children}
    </AppDataProvider>
  )
}
