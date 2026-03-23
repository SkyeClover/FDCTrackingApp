import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface TaskProgress {
  [taskId: string]: number
}

interface ProgressContextType {
  taskProgress: TaskProgress
  updateProgress: (taskId: string, progress: number) => void
  removeProgress: (taskId: string) => void
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

/**
 * Renders the Progress Provider UI section.
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [taskProgress, setTaskProgress] = useState<TaskProgress>({})

  const updateProgress = useCallback((taskId: string, progress: number) => {
    setTaskProgress((prev) => ({ ...prev, [taskId]: progress }))
  }, [])

  const removeProgress = useCallback((taskId: string) => {
    setTaskProgress((prev) => {
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }, [])

  return (
    <ProgressContext.Provider value={{ taskProgress, updateProgress, removeProgress }}>
      {children}
    </ProgressContext.Provider>
  )
}

/**
 * Manages progress state and behavior for this hook.
 */
export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider')
  }
  return context
}

