import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react'
import { BOC, POC, Launcher, Pod, RSV, Round, Task, TaskTemplate, LogEntry, AppState, CurrentUserRole, RoundTypeConfig } from '../types'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToFile,
  importFromFile,
  getDefaultState,
} from '../utils/saveLoad'

// Funny completion messages based on "Funny Stuff.md"
const FUNNY_COMPLETION_MESSAGES = [
  "FIRE MISSION! Task complete!",
  "Put that OE-254 Up time MEOW! Mission done!",
  "Walk-easy with this app! Task finished!",
  "2400N is Better than 4800N - and this task is done!",
  "We're getting up UltraLink! Task complete!",
  "Getting up Dcomms! Mission accomplished!",
  "Anywayysss... task finished!",
  "Hwello?! Task complete!",
  "Sponsored by Pain! Steel Pain!! Task done!",
  "SSG Ames is Sick - but this task is healthy and complete!",
  "SGT Muller would be proud - task complete!",
]

const getRandomCompletionMessage = (baseMessage: string): string => {
  const funnyMessage = FUNNY_COMPLETION_MESSAGES[Math.floor(Math.random() * FUNNY_COMPLETION_MESSAGES.length)]
  return `${baseMessage} ${funnyMessage}`
}

interface AppDataContextType {
  bocs: BOC[]
  pocs: POC[]
  launchers: Launcher[]
  pods: Pod[]
  rsvs: RSV[]
  rounds: Round[]
  tasks: Task[]
  taskTemplates: TaskTemplate[]
  logs: LogEntry[]
  roundTypes: Record<string, RoundTypeConfig>
  addBOC: (boc: BOC) => void
  addPOC: (poc: POC) => void
  addLauncher: (launcher: Launcher) => void
  addPod: (pod: Pod) => void
  addRSV: (rsv: RSV, assignToAmmoPlt?: boolean) => void
  deleteBOC: (bocId: string) => void
  deletePOC: (pocId: string) => void
  deleteLauncher: (launcherId: string) => void
  deletePod: (podId: string) => void
  deleteRSV: (rsvId: string) => void
  addRound: (round: Round) => void
  addTask: (task: Task) => void
  addTaskTemplate: (template: TaskTemplate) => void
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void
  deleteTaskTemplate: (id: string) => void
  startTaskFromTemplate: (templateId: string, launcherId: string) => void
  startTaskFromTemplateForPOC: (templateId: string, pocId: string) => void
  cancelTask: (taskId: string) => void
  clearTask: (launcherId: string) => void
  updateBOC: (id: string, updates: Partial<BOC>) => void
  updatePOC: (id: string, updates: Partial<POC>) => void
  updateLauncher: (id: string, updates: Partial<Launcher>) => void
  updatePod: (id: string, updates: Partial<Pod>) => void
  updateRSV: (id: string, updates: Partial<RSV>) => void
  assignPodToPOC: (podId: string, pocId: string) => void
  assignPodToRSV: (podId: string, rsvId: string) => void
  assignPodToLauncher: (podId: string, launcherId: string) => void
  assignPodToAmmoPlt: (podId: string, ammoPltId: string) => void
  assignLauncherToPOC: (launcherId: string, pocId: string) => void
  assignPOCToBOC: (pocId: string, bocId: string) => void
  assignRSVToPOC: (rsvId: string, pocId: string) => void
  assignRSVToBOC: (rsvId: string, bocId: string) => void
  assignRSVToAmmoPlt: (rsvId: string, ammoPltId: string) => void
  assignTaskToLauncher: (taskId: string, launcherId: string) => void
  startFireMission: (launcherIds: string[], missionName: string, roundsPerLauncher: number) => void
  updateTaskProgress: (taskId: string, progress: number) => void
  consumeRound: (roundId: string) => void
  completeFireMission: (taskId: string) => void
  reloadLauncher: (launcherId: string, newPodId?: string) => void
  saveToFile: () => void
  loadFromFile: (file: File) => Promise<void>
  clearAllData: () => void
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void
  currentUserRole?: CurrentUserRole
  setCurrentUserRole: (role: CurrentUserRole) => void
  addRoundType: (name: string) => void
  updateRoundType: (name: string, enabled: boolean) => void
  deleteRoundType: (name: string) => void
  markFirstTimeGuideAsSeen: () => void
  hasSeenFirstTimeGuide: boolean
  ammoPltBocId?: string
  assignAmmoPltToBOC: (bocId: string) => void
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined)

interface AppDataProviderProps {
  children: ReactNode
  updateProgress?: (taskId: string, progress: number) => void
  removeProgress?: (taskId: string) => void
}

export function AppDataProvider({ children, updateProgress, removeProgress }: AppDataProviderProps) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadFromLocalStorage()
    const defaultState = getDefaultState()
    // Ensure rsvs array exists for backwards compatibility
    if (loaded && !loaded.rsvs) {
      loaded.rsvs = []
    }
    const initialState = loaded || defaultState
    
    // Clean up invalid launcher states on load
    const cleanedLaunchers = initialState.launchers.map((l) => {
      if (l.currentTask) {
        const task = initialState.tasks.find((t) => t.id === l.currentTask?.id)
        // If launcher has currentTask but task doesn't exist or is completed, clean it up
        if (!task || task.status === 'completed') {
          return {
            ...l,
            status: 'idle' as const,
            currentTask: undefined,
            lastIdleTime: l.lastIdleTime || new Date(),
          }
        }
      }
      return l
    })
    
    return {
      ...initialState,
      launchers: cleanedLaunchers,
    }
  })
  
  // Store intervals to cleanup
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const stateRef = useRef(state)
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Resume or complete active tasks on mount (after refresh)
  useEffect(() => {
    // Resume active tasks
    const activeTasks = state.tasks.filter((t) => t.status === 'in-progress' && t.startTime)
    
    activeTasks.forEach((task) => {
      if (!task.startTime || !task.duration) return
      
      const elapsed = (Date.now() - task.startTime.getTime()) / 1000
      const progress = Math.min(100, (elapsed / task.duration) * 100)
      
      // If task is already complete, mark it as completed
      if (progress >= 100) {
        setState((prev) => {
          const updatedLaunchers = prev.launchers.map((l) => {
            if (l.currentTask?.id === task.id) {
              addLog({
                type: 'info',
                message: `Task "${task.name}" was completed while app was closed on launcher "${l.name}"`,
              })
              // Keep the task visible but mark launcher as idle
              return {
                ...l,
                status: 'idle' as const,
                // Keep currentTask so user can see it's completed and clear it manually
                lastIdleTime: new Date(),
              }
            }
            return l
          })
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === task.id ? { ...t, status: 'completed' as const, progress: 100 } : t
            ),
            launchers: updatedLaunchers,
          }
        })
        if (removeProgress) {
          removeProgress(task.id)
        }
        return
      }
      
      // Resume the task interval
      if (updateProgress) {
        updateProgress(task.id, progress)
      }
      
      const interval = setInterval(() => {
        const currentState = stateRef.current
        const currentTask = currentState.tasks.find((t) => t.id === task.id)
        if (!currentTask || currentTask.status === 'completed') {
          const intervalToClear = intervalsRef.current.get(task.id)
          if (intervalToClear) {
            clearInterval(intervalToClear)
            intervalsRef.current.delete(task.id)
          }
          if (removeProgress) {
            removeProgress(task.id)
          }
          return
        }

        if (!currentTask.startTime || !currentTask.duration) return

        const currentElapsed = (Date.now() - currentTask.startTime.getTime()) / 1000
        const currentProgress = Math.min(100, (currentElapsed / currentTask.duration) * 100)

        if (updateProgress) {
          updateProgress(task.id, currentProgress)
        }

        if (currentProgress >= 100) {
          const intervalToClear = intervalsRef.current.get(task.id)
          if (intervalToClear) {
            clearInterval(intervalToClear)
            intervalsRef.current.delete(task.id)
          }
          if (removeProgress) {
            removeProgress(task.id)
          }
          
          setState((state) => {
            const updatedLaunchers = state.launchers.map((l) => {
              if (l.currentTask?.id === task.id) {
                addLog({
                  type: 'success',
                  message: getRandomCompletionMessage(`Task "${currentTask.name}" completed on launcher "${l.name}".`),
                })
                // Keep the task visible but mark launcher as idle
                return {
                  ...l,
                  status: 'idle' as const,
                  // Keep currentTask so user can see it's completed and clear it manually
                  lastIdleTime: new Date(),
                }
              }
              return l
            })
            return {
              ...state,
              tasks: state.tasks.map((t) =>
                t.id === task.id ? { ...t, status: 'completed' as const, progress: 100 } : t
              ),
              launchers: updatedLaunchers,
            }
          })
        }
      }, 500)
      
      intervalsRef.current.set(task.id, interval)
    })
    
    // Cleanup function
    return () => {
      activeTasks.forEach((task) => {
        const interval = intervalsRef.current.get(task.id)
        if (interval) {
          clearInterval(interval)
          intervalsRef.current.delete(task.id)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - we intentionally don't include dependencies to run once

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        saveToLocalStorage(state)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 500) // Debounce saves by 500ms

    return () => clearTimeout(timeoutId)
  }, [state])
  
  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval))
      intervalsRef.current.clear()
    }
  }, [])

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    setState((prev) => ({
      ...prev,
      logs: [newLog, ...prev.logs].slice(0, 100),
    }))
  }, [])

  // Validate currentUserRole - clear it if the referenced BOC/POC no longer exists
  useEffect(() => {
    if (!state.currentUserRole) return
    
    const { type, id } = state.currentUserRole
    const exists = type === 'boc' 
      ? state.bocs.some((b) => b.id === id)
      : state.pocs.some((p) => p.id === id)
    
    if (!exists) {
      setState((prev) => ({
        ...prev,
        currentUserRole: undefined,
      }))
      addLog({ 
        type: 'warning', 
        message: 'Your assigned role was cleared because the referenced unit no longer exists' 
      })
    }
  }, [state.bocs.length, state.pocs.length, state.currentUserRole?.id, addLog])

  const addBOC = useCallback((boc: BOC) => {
    setState((prev) => {
      const isFirstBOC = prev.bocs.length === 0
      const newState = { ...prev, bocs: [...prev.bocs, boc] }
      // Assign Ammo PLT to first BOC created
      if (isFirstBOC && !prev.ammoPltBocId) {
        newState.ammoPltBocId = boc.id
        addLog({ type: 'info', message: `BOC "${boc.name}" created and Ammo PLT assigned to it` })
      } else {
        addLog({ type: 'info', message: `BOC "${boc.name}" created` })
      }
      return newState
    })
  }, [addLog])

  const addPOC = useCallback((poc: POC) => {
    setState((prev) => ({ ...prev, pocs: [...prev.pocs, poc] }))
    addLog({ type: 'info', message: `POC "${poc.name}" created` })
  }, [addLog])

  const addLauncher = useCallback((launcher: Launcher) => {
    // Set lastIdleTime if launcher is created in idle state
    let launcherWithIdleTime = launcher.status === 'idle' && !launcher.lastIdleTime
      ? { ...launcher, lastIdleTime: new Date() }
      : launcher
    
    // Assign to current user's POC by default if not already assigned and user is a POC
    setState((prev) => {
      let finalLauncher = launcherWithIdleTime
      if (!finalLauncher.pocId && prev.currentUserRole?.type === 'poc') {
        finalLauncher = { ...finalLauncher, pocId: prev.currentUserRole.id }
        addLog({ type: 'info', message: `Launcher "${launcher.name}" created and assigned to ${prev.currentUserRole.name}` })
      } else {
        addLog({ type: 'info', message: `Launcher "${launcher.name}" created` })
      }
      return { ...prev, launchers: [...prev.launchers, finalLauncher] }
    })
  }, [addLog])

  const addPod = useCallback((pod: Pod) => {
    setState((prev) => ({ ...prev, pods: [...prev.pods, pod] }))
    addLog({ type: 'info', message: `Pod "${pod.name}" created` })
  }, [addLog])

  const addRSV = useCallback((rsv: RSV, assignToAmmoPlt?: boolean) => {
    const AMMO_PLT_ID = 'ammo-plt-1'
    setState((prev) => {
      // If explicitly assigned to ammo plt, use that
      if (assignToAmmoPlt) {
        const rsvWithAmmoPlt = { ...rsv, ammoPltId: AMMO_PLT_ID, pocId: undefined, bocId: undefined }
        addLog({ type: 'info', message: `RSV "${rsv.name}" created and assigned to Ammo PLT` })
        return { ...prev, rsvs: [...prev.rsvs, rsvWithAmmoPlt] }
      }
      
      // If already has assignment, use it
      if (rsv.ammoPltId || rsv.pocId || rsv.bocId) {
        addLog({ type: 'info', message: `RSV "${rsv.name}" created` })
        return { ...prev, rsvs: [...prev.rsvs, rsv] }
      }
      
      // Default to current user's role
      let rsvWithDefault = rsv
      if (prev.currentUserRole) {
        if (prev.currentUserRole.type === 'poc') {
          rsvWithDefault = { ...rsv, pocId: prev.currentUserRole.id }
          addLog({ type: 'info', message: `RSV "${rsv.name}" created and assigned to ${prev.currentUserRole.name}` })
        } else if (prev.currentUserRole.type === 'boc') {
          rsvWithDefault = { ...rsv, bocId: prev.currentUserRole.id }
          addLog({ type: 'info', message: `RSV "${rsv.name}" created and assigned to ${prev.currentUserRole.name}` })
        }
      } else {
        addLog({ type: 'info', message: `RSV "${rsv.name}" created` })
      }
      
      return { ...prev, rsvs: [...prev.rsvs, rsvWithDefault] }
    })
  }, [addLog])

  const deleteBOC = useCallback((bocId: string) => {
    setState((prev) => {
      const boc = prev.bocs.find((b) => b.id === bocId)
      if (!boc) return prev

      // Unassign all POCs from this BOC
      const updatedPOCs = prev.pocs.map((poc) => 
        poc.bocId === bocId ? { ...poc, bocId: undefined } : poc
      )

      // Clear currentUserRole if user is assigned to this BOC
      const updatedUserRole = prev.currentUserRole?.type === 'boc' && prev.currentUserRole?.id === bocId
        ? undefined
        : prev.currentUserRole

      addLog({ type: 'info', message: `BOC "${boc.name}" deleted` })
      if (updatedUserRole !== prev.currentUserRole) {
        addLog({ type: 'warning', message: 'Your assigned role was cleared because the BOC was deleted' })
      }

      return {
        ...prev,
        bocs: prev.bocs.filter((b) => b.id !== bocId),
        pocs: updatedPOCs,
        currentUserRole: updatedUserRole,
      }
    })
  }, [addLog])

  const deletePOC = useCallback((pocId: string) => {
    setState((prev) => {
      const poc = prev.pocs.find((p) => p.id === pocId)
      if (!poc) return prev

      // Unassign all launchers from this POC
      const updatedLaunchers = prev.launchers.map((launcher) =>
        launcher.pocId === pocId ? { ...launcher, pocId: undefined } : launcher
      )

      // Unassign all pods from this POC
      const updatedPods = prev.pods.map((pod) =>
        pod.pocId === pocId ? { ...pod, pocId: undefined } : pod
      )

      // Unassign all RSVs from this POC
      const updatedRSVs = prev.rsvs.map((rsv) =>
        rsv.pocId === pocId ? { ...rsv, pocId: undefined } : rsv
      )

      // Clear currentUserRole if user is assigned to this POC
      const updatedUserRole = prev.currentUserRole?.type === 'poc' && prev.currentUserRole?.id === pocId
        ? undefined
        : prev.currentUserRole

      addLog({ type: 'info', message: `POC "${poc.name}" deleted` })
      if (updatedUserRole !== prev.currentUserRole) {
        addLog({ type: 'warning', message: 'Your assigned role was cleared because the POC was deleted' })
      }

      return {
        ...prev,
        pocs: prev.pocs.filter((p) => p.id !== pocId),
        launchers: updatedLaunchers,
        pods: updatedPods,
        rsvs: updatedRSVs,
        currentUserRole: updatedUserRole,
      }
    })
  }, [addLog])

  const deleteLauncher = useCallback((launcherId: string) => {
    setState((prev) => {
      const launcher = prev.launchers.find((l) => l.id === launcherId)
      if (!launcher) return prev

      // Unassign pod from launcher (return to POC inventory)
      const updatedPods = prev.pods.map((pod) => {
        if (pod.launcherId === launcherId) {
          return {
            ...pod,
            launcherId: undefined,
            pocId: launcher.pocId, // Return to POC if it had one
          }
        }
        return pod
      })

      // Cancel any active tasks on this launcher
      const updatedTasks = prev.tasks.map((task) => {
        if (task.launcherIds?.includes(launcherId) && task.status === 'in-progress') {
          // Stop the task
          const interval = intervalsRef.current.get(task.id)
          if (interval) {
            clearInterval(interval)
            intervalsRef.current.delete(task.id)
          }
          if (removeProgress) {
            removeProgress(task.id)
          }
          return { ...task, status: 'completed' as const, progress: 100 }
        }
        return task
      })

      addLog({ type: 'info', message: `Launcher "${launcher.name}" deleted` })

      return {
        ...prev,
        launchers: prev.launchers.filter((l) => l.id !== launcherId),
        pods: updatedPods,
        tasks: updatedTasks,
      }
    })
  }, [addLog, removeProgress])

  const deletePod = useCallback((podId: string) => {
    setState((prev) => {
      const pod = prev.pods.find((p) => p.id === podId)
      if (!pod) return prev

      // Remove all rounds associated with this pod
      const roundIds = pod.rounds.map((r) => r.id)
      const updatedRounds = prev.rounds.filter((r) => !roundIds.includes(r.id))

      // Unassign pod from launcher if it's on one
      const updatedLaunchers = prev.launchers.map((launcher) =>
        launcher.podId === podId ? { ...launcher, podId: undefined } : launcher
      )

      addLog({ type: 'info', message: `Pod "${pod.name}" deleted` })

      return {
        ...prev,
        pods: prev.pods.filter((p) => p.id !== podId),
        rounds: updatedRounds,
        launchers: updatedLaunchers,
      }
    })
  }, [addLog])

  const deleteRSV = useCallback((rsvId: string) => {
    setState((prev) => {
      const rsv = prev.rsvs.find((r) => r.id === rsvId)
      if (!rsv) return prev

      // Unassign all pods from this RSV
      const updatedPods = prev.pods.map((pod) =>
        pod.rsvId === rsvId ? { ...pod, rsvId: undefined } : pod
      )

      addLog({ type: 'info', message: `RSV "${rsv.name}" deleted` })

      return {
        ...prev,
        rsvs: prev.rsvs.filter((r) => r.id !== rsvId),
        pods: updatedPods,
      }
    })
  }, [addLog])

  const addRound = useCallback((round: Round) => {
    setState((prev) => ({ ...prev, rounds: [...prev.rounds, round] }))
  }, [])

  const addTask = useCallback((task: Task) => {
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
    addLog({ type: 'info', message: `Task "${task.name}" created` })
  }, [addLog])

  const addTaskTemplate = useCallback((template: TaskTemplate) => {
    setState((prev) => ({
      ...prev,
      taskTemplates: [...prev.taskTemplates, template],
    }))
    addLog({ type: 'info', message: `Task template "${template.name}" created` })
  }, [addLog])

  const updateTaskTemplate = useCallback((id: string, updates: Partial<TaskTemplate>) => {
    setState((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
    addLog({ type: 'info', message: `Task template updated` })
  }, [addLog])

  const deleteTaskTemplate = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.filter((t) => t.id !== id),
    }))
    addLog({ type: 'info', message: `Task template deleted` })
  }, [addLog])

  const startTaskFromTemplate = useCallback(
    (templateId: string, launcherId: string) => {
      setState((prev) => {
        const template = prev.taskTemplates.find((t) => t.id === templateId)
        if (!template) return prev

        const newTask: Task = {
          id: Date.now().toString(),
          name: template.name,
          description: template.description,
          status: 'in-progress',
          progress: 0,
          startTime: new Date(),
          duration: template.duration,
          templateId: template.id,
          launcherIds: [launcherId],
        }

        const launcher = prev.launchers.find((l) => l.id === launcherId)
        if (launcher) {
          addLog({
            type: 'success',
            message: `Task "${template.name}" started on launcher "${launcher.name}"`,
          })
        }

        // Start progress timer - use separate progress state to avoid re-renders
        const interval = setInterval(() => {
          const currentState = stateRef.current
          const task = currentState.tasks.find((t) => t.id === newTask.id)
          if (!task || task.status === 'completed') {
            const intervalToClear = intervalsRef.current.get(newTask.id)
            if (intervalToClear) {
              clearInterval(intervalToClear)
              intervalsRef.current.delete(newTask.id)
            }
            if (removeProgress) {
              removeProgress(newTask.id)
            }
            return
          }

          const elapsed = task.startTime
            ? (Date.now() - task.startTime.getTime()) / 1000
            : 0
          const progress = Math.min(100, (elapsed / (task.duration || 168)) * 100)

          // Update progress via callback (doesn't trigger full context re-render)
          if (updateProgress) {
            updateProgress(newTask.id, progress)
          }

          if (progress >= 100) {
            const intervalToClear = intervalsRef.current.get(newTask.id)
            if (intervalToClear) {
              clearInterval(intervalToClear)
              intervalsRef.current.delete(newTask.id)
            }
            if (removeProgress) {
              removeProgress(newTask.id)
            }
            
            // Complete the mission - update main state
            setState((state) => {
              const updatedLaunchers = state.launchers.map((l) => {
                if (l.currentTask?.id === newTask.id) {
                  addLog({
                    type: 'success',
                    message: getRandomCompletionMessage(`Task "${task.name}" completed on launcher "${l.name}".`),
                  })
                  // Keep the task visible but mark launcher as idle
                  return {
                    ...l,
                    status: 'idle' as const,
                    // Keep currentTask so user can see it's completed and clear it manually
                    lastIdleTime: new Date(),
                  }
                }
                return l
              })
              return {
                ...state,
                tasks: state.tasks.map((t) =>
                  t.id === newTask.id ? { ...t, status: 'completed' as const, progress: 100 } : t
                ),
                launchers: updatedLaunchers,
              }
            })
          }
        }, 500) // Update every 500ms to reduce frequency
        
        intervalsRef.current.set(newTask.id, interval)

        return {
          ...prev,
          tasks: [...prev.tasks, newTask],
          launchers: prev.launchers.map((l) => {
            if (l.id === launcherId) {
              return {
                ...l,
                currentTask: newTask,
                status: 'active' as const,
                // Clear lastIdleTime when task starts
                lastIdleTime: undefined,
              }
            }
            return l
          }),
        }
      })
    },
    [addLog]
  )

  const startTaskFromTemplateForPOC = useCallback(
    (templateId: string, pocId: string) => {
      setState((prev) => {
        const template = prev.taskTemplates.find((t) => t.id === templateId)
        if (!template) return prev

        const poc = prev.pocs.find((p) => p.id === pocId)
        if (!poc) return prev

        // Get all launchers in this POC
        const pocLaunchers = prev.launchers.filter((l) => l.pocId === pocId)
        if (pocLaunchers.length === 0) {
          addLog({
            type: 'warning',
            message: `No launchers found in POC "${poc.name}"`,
          })
          return prev
        }

        // Create a single task for the POC
        const newTask: Task = {
          id: Date.now().toString(),
          name: template.name,
          description: template.description,
          status: 'in-progress',
          progress: 0,
          startTime: new Date(),
          duration: template.duration,
          templateId: template.id,
          pocIds: [pocId],
          launcherIds: pocLaunchers.map((l) => l.id),
        }

        addLog({
          type: 'success',
          message: `Task "${template.name}" started on POC "${poc.name}" (${pocLaunchers.length} launchers)`,
        })

        // Start progress timer - use separate progress state to avoid re-renders
        const interval = setInterval(() => {
          const currentState = stateRef.current
          const task = currentState.tasks.find((t) => t.id === newTask.id)
          if (!task || task.status === 'completed') {
            const intervalToClear = intervalsRef.current.get(newTask.id)
            if (intervalToClear) {
              clearInterval(intervalToClear)
              intervalsRef.current.delete(newTask.id)
            }
            if (removeProgress) {
              removeProgress(newTask.id)
            }
            return
          }

          const elapsed = task.startTime
            ? (Date.now() - task.startTime.getTime()) / 1000
            : 0
          const progress = Math.min(100, (elapsed / (task.duration || 168)) * 100)

          // Update progress via callback (doesn't trigger full context re-render)
          if (updateProgress) {
            updateProgress(newTask.id, progress)
          }

          if (progress >= 100) {
            const intervalToClear = intervalsRef.current.get(newTask.id)
            if (intervalToClear) {
              clearInterval(intervalToClear)
              intervalsRef.current.delete(newTask.id)
            }
            if (removeProgress) {
              removeProgress(newTask.id)
            }
            
            // Complete the task - update main state
            setState((state) => {
              const updatedLaunchers = state.launchers.map((l) => {
                if (l.currentTask?.id === newTask.id) {
                  addLog({
                    type: 'success',
                    message: getRandomCompletionMessage(`Task "${task.name}" completed on launcher "${l.name}".`),
                  })
                  // Keep the task visible but mark launcher as idle
                  return {
                    ...l,
                    status: 'idle' as const,
                    // Keep currentTask so user can see it's completed and clear it manually
                    lastIdleTime: new Date(),
                  }
                }
                return l
              })
              return {
                ...state,
                tasks: state.tasks.map((t) =>
                  t.id === newTask.id ? { ...t, status: 'completed' as const, progress: 100 } : t
                ),
                launchers: updatedLaunchers,
              }
            })
          }
        }, 500) // Update every 500ms to reduce frequency
        
        intervalsRef.current.set(newTask.id, interval)

        return {
          ...prev,
          tasks: [...prev.tasks, newTask],
          launchers: prev.launchers.map((l) => {
            if (l.pocId === pocId && l.status !== 'maintenance') {
              return {
                ...l,
                currentTask: newTask,
                status: 'active' as const,
                // Clear lastIdleTime when task starts
                lastIdleTime: undefined,
              }
            }
            return l
          }),
        }
      })
    },
    [addLog]
  )

  const cancelTask = useCallback((taskId: string) => {
    // Clear the interval for this task
    const intervalToClear = intervalsRef.current.get(taskId)
    if (intervalToClear) {
      clearInterval(intervalToClear)
      intervalsRef.current.delete(taskId)
    }
    
    // Remove progress tracking
    if (removeProgress) {
      removeProgress(taskId)
    }
    
    // Update state to cancel the task
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId)
      const updatedLaunchers = prev.launchers.map((l) => {
        if (l.currentTask?.id === taskId) {
          addLog({
            type: 'info',
            message: `Task "${task?.name || 'Unknown'}" cancelled on launcher "${l.name}"`,
          })
          return {
            ...l,
            status: 'idle' as const,
            currentTask: undefined,
            lastIdleTime: new Date(),
          }
        }
        return l
      })
      
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'completed' as const } : t
        ),
        launchers: updatedLaunchers,
      }
    })
  }, [addLog, removeProgress])

  const clearTask = useCallback((launcherId: string) => {
    setState((prev) => {
      const launcher = prev.launchers.find((l) => l.id === launcherId)
      if (!launcher || !launcher.currentTask) return prev
      
      const task = launcher.currentTask
      addLog({
        type: 'info',
        message: `Task "${task.name}" cleared from launcher "${launcher.name}"`,
      })
      
      return {
        ...prev,
        launchers: prev.launchers.map((l) => {
          if (l.id === launcherId) {
            return {
              ...l,
              currentTask: undefined,
              lastIdleTime: new Date(),
            }
          }
          return l
        }),
      }
    })
  }, [addLog])

  const updateBOC = useCallback((id: string, updates: Partial<BOC>) => {
    setState((prev) => {
      const boc = prev.bocs.find((b) => b.id === id)
      if (boc && updates.name) {
        addLog({ type: 'info', message: `BOC "${boc.name}" renamed to "${updates.name}"` })
      }
      return {
        ...prev,
        bocs: prev.bocs.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      }
    })
  }, [addLog])

  const updatePOC = useCallback((id: string, updates: Partial<POC>) => {
    setState((prev) => {
      const poc = prev.pocs.find((p) => p.id === id)
      if (poc && updates.name) {
        addLog({ type: 'info', message: `POC "${poc.name}" renamed to "${updates.name}"` })
      }
      return {
        ...prev,
        pocs: prev.pocs.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }
    })
  }, [addLog])

  const updateLauncher = useCallback((id: string, updates: Partial<Launcher>) => {
    setState((prev) => {
      const launcher = prev.launchers.find((l) => l.id === id)
      if (launcher && updates.name) {
        addLog({ type: 'info', message: `Launcher "${launcher.name}" renamed to "${updates.name}"` })
      }
      return {
        ...prev,
        launchers: prev.launchers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      }
    })
  }, [addLog])

  const updatePod = useCallback((id: string, updates: Partial<Pod>) => {
    setState((prev) => {
      const pod = prev.pods.find((p) => p.id === id)
      if (pod && updates.name) {
        addLog({ type: 'info', message: `Pod "${pod.name}" renamed to "${updates.name}"` })
      }
      return {
        ...prev,
        pods: prev.pods.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      }
    })
  }, [addLog])

  const updateRSV = useCallback((id: string, updates: Partial<RSV>) => {
    setState((prev) => {
      const rsv = prev.rsvs.find((r) => r.id === id)
      if (rsv && updates.name) {
        addLog({ type: 'info', message: `RSV "${rsv.name}" renamed to "${updates.name}"` })
      }
      return {
        ...prev,
        rsvs: prev.rsvs.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }
    })
  }, [addLog])

  const assignPodToPOC = useCallback((podId: string, pocId: string) => {
    setState((prev) => {
      const pod = prev.pods.find((p) => p.id === podId)
      
      if (!pocId) {
        // Unassign pod from POC
        return {
          ...prev,
          pods: prev.pods.map((p) => (p.id === podId ? { ...p, pocId: undefined } : p)),
        }
      }

      const poc = prev.pocs.find((p) => p.id === pocId)

      if (pod && poc) {
        addLog({
          type: 'success',
          message: `Pod "${pod.name}" assigned to POC "${poc.name}"`,
        })
      }

      return {
        ...prev,
        pods: prev.pods.map((p) => (p.id === podId ? { ...p, pocId, ammoPltId: undefined } : p)),
      }
    })
  }, [addLog])

  const assignPodToRSV = useCallback((podId: string, rsvId: string) => {
    setState((prev) => {
      const pod = prev.pods.find((p) => p.id === podId)
      
      if (!rsvId) {
        // Unassign pod from RSV
        return {
          ...prev,
          pods: prev.pods.map((p) => (p.id === podId ? { ...p, rsvId: undefined } : p)),
        }
      }

      const rsv = prev.rsvs.find((r) => r.id === rsvId)

      if (pod && rsv) {
        addLog({
          type: 'success',
          message: `Pod "${pod.name}" assigned to RSV "${rsv.name}"`,
        })
      }

      return {
        ...prev,
        pods: prev.pods.map((p) => (p.id === podId ? { ...p, rsvId, pocId: undefined, ammoPltId: undefined } : p)),
      }
    })
  }, [addLog])

  const assignPodToAmmoPlt = useCallback((podId: string, ammoPltId: string) => {
    setState((prev) => {
      const pod = prev.pods.find((p) => p.id === podId)
      
      if (!ammoPltId) {
        // Unassign pod from Ammo PLT
        return {
          ...prev,
          pods: prev.pods.map((p) => (p.id === podId ? { ...p, ammoPltId: undefined } : p)),
        }
      }

      if (pod) {
        addLog({
          type: 'success',
          message: `Pod "${pod.name}" assigned to Ammo PLT "${ammoPltId}"`,
        })
      }

      return {
        ...prev,
        pods: prev.pods.map((p) => (p.id === podId ? { ...p, ammoPltId, pocId: undefined, rsvId: undefined } : p)),
      }
    })
  }, [addLog])

  const assignPodToLauncher = useCallback((podId: string, launcherId: string) => {
    setState((prev) => {
      const pod = prev.pods.find((p) => p.id === podId)
      
      if (!launcherId) {
        // Unassign pod
        const oldLauncherId = pod?.launcherId
        return {
          ...prev,
          pods: prev.pods.map((p) => (p.id === podId ? { ...p, launcherId: undefined } : p)),
          launchers: prev.launchers.map((l) =>
            l.id === oldLauncherId ? { ...l, podId: undefined } : l
          ),
        }
      }

      const launcher = prev.launchers.find((l) => l.id === launcherId)
      const oldLauncherId = pod?.launcherId

      if (pod && launcher) {
        addLog({
          type: 'success',
          message: `Pod "${pod.name}" assigned to Launcher "${launcher.name}"`,
        })
      }

      // Common sense: Auto-assign pod to launcher's POC if launcher has a POC
      const updatedPods = prev.pods.map((p) => {
        if (p.id === podId) {
          const updatedPod = { ...p, launcherId }
          // If launcher has a POC and pod doesn't, assign pod to that POC
          if (launcher?.pocId && !p.pocId) {
            updatedPod.pocId = launcher.pocId
          }
          return updatedPod
        }
        return p
      })

      return {
        ...prev,
        pods: updatedPods,
        launchers: prev.launchers.map((l) => {
          if (l.id === launcherId) {
            return { ...l, podId }
          }
          if (l.id === oldLauncherId) {
            return { ...l, podId: undefined }
          }
          return l
        }),
      }
    })
  }, [addLog])

  const assignLauncherToPOC = useCallback((launcherId: string, pocId: string) => {
    setState((prev) => {
      const launcher = prev.launchers.find((l) => l.id === launcherId)
      
      if (!pocId) {
        return {
          ...prev,
          launchers: prev.launchers.map((l) => (l.id === launcherId ? { ...l, pocId: undefined } : l)),
        }
      }

      const poc = prev.pocs.find((p) => p.id === pocId)

      if (launcher && poc) {
        addLog({
          type: 'success',
          message: `Launcher "${launcher.name}" assigned to POC "${poc.name}"`,
        })
      }

      // Common sense: Auto-assign pod on launcher to the POC
      const updatedPods = prev.pods.map((p) => {
        if (p.launcherId === launcherId && !p.pocId) {
          return { ...p, pocId }
        }
        return p
      })

      return {
        ...prev,
        launchers: prev.launchers.map((l) => (l.id === launcherId ? { ...l, pocId } : l)),
        pods: updatedPods,
      }
    })
  }, [addLog])

  const assignPOCToBOC = useCallback((pocId: string, bocId: string) => {
    setState((prev) => {
      const poc = prev.pocs.find((p) => p.id === pocId)
      
      if (!bocId) {
        return {
          ...prev,
          pocs: prev.pocs.map((p) => (p.id === pocId ? { ...p, bocId: undefined } : p)),
        }
      }

      const boc = prev.bocs.find((b) => b.id === bocId)

      if (poc && boc) {
        addLog({
          type: 'success',
          message: `POC "${poc.name}" assigned to BOC "${boc.name}"`,
        })
      }

      return {
        ...prev,
        pocs: prev.pocs.map((p) => (p.id === pocId ? { ...p, bocId } : p)),
      }
    })
  }, [addLog])

  const assignRSVToPOC = useCallback((rsvId: string, pocId: string) => {
    setState((prev) => {
      const rsv = prev.rsvs.find((r) => r.id === rsvId)
      
      if (!pocId) {
        return {
          ...prev,
          rsvs: prev.rsvs.map((r) => (r.id === rsvId ? { ...r, pocId: undefined, bocId: undefined, ammoPltId: undefined } : r)),
        }
      }

      const poc = prev.pocs.find((p) => p.id === pocId)

      if (rsv && poc) {
        addLog({
          type: 'success',
          message: `RSV "${rsv.name}" assigned to POC "${poc.name}"`,
        })
      }

      return {
        ...prev,
        rsvs: prev.rsvs.map((r) => (r.id === rsvId ? { ...r, pocId, bocId: undefined, ammoPltId: undefined } : r)),
      }
    })
  }, [addLog])

  const assignRSVToBOC = useCallback((rsvId: string, bocId: string) => {
    setState((prev) => {
      const rsv = prev.rsvs.find((r) => r.id === rsvId)
      
      if (!bocId) {
        return {
          ...prev,
          rsvs: prev.rsvs.map((r) => (r.id === rsvId ? { ...r, pocId: undefined, bocId: undefined, ammoPltId: undefined } : r)),
        }
      }

      const boc = prev.bocs.find((b) => b.id === bocId)

      if (rsv && boc) {
        addLog({
          type: 'success',
          message: `RSV "${rsv.name}" assigned to BOC "${boc.name}" (Battery level slant)`,
        })
      }

      return {
        ...prev,
        rsvs: prev.rsvs.map((r) => (r.id === rsvId ? { ...r, bocId, pocId: undefined, ammoPltId: undefined } : r)),
      }
    })
  }, [addLog])

  const assignRSVToAmmoPlt = useCallback((rsvId: string, ammoPltId: string) => {
    setState((prev) => {
      const rsv = prev.rsvs.find((r) => r.id === rsvId)
      
      if (!ammoPltId) {
        return {
          ...prev,
          rsvs: prev.rsvs.map((r) => (r.id === rsvId ? { ...r, pocId: undefined, bocId: undefined, ammoPltId: undefined } : r)),
        }
      }

      if (rsv) {
        addLog({
          type: 'success',
          message: `RSV "${rsv.name}" assigned to Ammo PLT "${ammoPltId}"`,
        })
      }

      return {
        ...prev,
        rsvs: prev.rsvs.map((r) => (r.id === rsvId ? { ...r, ammoPltId, pocId: undefined, bocId: undefined } : r)),
      }
    })
  }, [addLog])

  const assignTaskToLauncher = useCallback((taskId: string, launcherId: string) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId)
      const launcher = prev.launchers.find((l) => l.id === launcherId)

      if (task && launcher) {
        addLog({
          type: 'success',
          message: `Task "${task.name}" assigned to launcher "${launcher.name}"`,
        })

        return {
          ...prev,
          launchers: prev.launchers.map((l) =>
            l.id === launcherId ? { ...l, currentTask: task } : l
          ),
        }
      }
      return prev
    })
  }, [addLog])

  const startFireMission = useCallback(
    (launcherIds: string[], missionName: string, roundsPerLauncher: number) => {
      // Find Fire Mission template duration, default to 168 seconds (2:48)
      const fireTemplate = stateRef.current.taskTemplates.find((t) => t.type === 'fire')
      const duration = fireTemplate?.duration || 168
      
      const newTask: Task = {
        id: Date.now().toString(),
        name: missionName,
        description: `Fire Mission: ${roundsPerLauncher} rounds per launcher`,
        status: 'in-progress',
        progress: 0,
        startTime: new Date(),
        duration,
        launcherIds,
      }

      setState((prev) => {
        const updatedPods = prev.pods.map((pod) => {
          const launcher = prev.launchers.find((l) => l.id === pod.launcherId)
          if (launcher && launcherIds.includes(launcher.id)) {
            const availableRounds = pod.rounds.filter((r) => r.status === 'available')
            const roundsToConsume = Math.min(roundsPerLauncher, availableRounds.length)
            let consumed = 0
            return {
              ...pod,
              rounds: pod.rounds.map((r) => {
                if (r.status === 'available' && consumed < roundsToConsume) {
                  consumed++
                  return { ...r, status: 'used' as const }
                }
                return r
              }),
            }
          }
          return pod
        })

        const updatedLaunchers = prev.launchers.map((l) => {
          if (launcherIds.includes(l.id)) {
            addLog({
              type: 'success',
              message: `Fire Mission "${missionName}" started on launcher "${l.name}"`,
            })
            return {
              ...l,
              currentTask: newTask,
              status: 'active' as const,
              // Clear lastIdleTime when task starts
              lastIdleTime: undefined,
            }
          }
          return l
        })

        return {
          ...prev,
          tasks: [...prev.tasks, newTask],
          pods: updatedPods,
          launchers: updatedLaunchers,
        }
      })

      // Start progress timer - use separate progress state to avoid re-renders
      const interval = setInterval(() => {
        const currentState = stateRef.current
        const task = currentState.tasks.find((t) => t.id === newTask.id)
        if (!task || task.status === 'completed') {
          const intervalToClear = intervalsRef.current.get(newTask.id)
          if (intervalToClear) {
            clearInterval(intervalToClear)
            intervalsRef.current.delete(newTask.id)
          }
          if (removeProgress) {
            removeProgress(newTask.id)
          }
          return
        }

        const elapsed = task.startTime
          ? (Date.now() - task.startTime.getTime()) / 1000
          : 0
        const progress = Math.min(100, (elapsed / duration) * 100)

        // Update progress via callback (doesn't trigger full context re-render)
        if (updateProgress) {
          updateProgress(newTask.id, progress)
        }

        if (progress >= 100) {
          const intervalToClear = intervalsRef.current.get(newTask.id)
          if (intervalToClear) {
            clearInterval(intervalToClear)
            intervalsRef.current.delete(newTask.id)
          }
          if (removeProgress) {
            removeProgress(newTask.id)
          }
          completeFireMission(newTask.id)
        }
      }, 500) // Update every 500ms to reduce frequency
      
      intervalsRef.current.set(newTask.id, interval)
    },
    [addLog]
  )

  const updateTaskProgress = useCallback((taskId: string, progress: number) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, progress: Math.min(100, Math.max(0, progress)) } : t
      ),
      launchers: prev.launchers.map((l) => {
        if (l.currentTask?.id === taskId) {
          return {
            ...l,
            currentTask: {
              ...l.currentTask,
              progress: Math.min(100, Math.max(0, progress)),
            },
          }
        }
        return l
      }),
    }))
  }, [])

  const consumeRound = useCallback((roundId: string) => {
    setState((prev) => ({
      ...prev,
      pods: prev.pods.map((pod) => ({
        ...pod,
        rounds: pod.rounds.map((r) =>
          r.id === roundId ? { ...r, status: 'used' as const } : r
        ),
      })),
    }))
  }, [])

  const completeFireMission = useCallback((taskId: string) => {
    setState((prev) => {
      const updatedLaunchers = prev.launchers.map((l) => {
        if (l.currentTask?.id === taskId) {
          addLog({
            type: 'success',
            message: getRandomCompletionMessage(`Fire Mission completed on launcher "${l.name}".`),
          })
          // Keep the task visible but mark launcher as idle
          return {
            ...l,
            status: 'idle' as const,
            // Keep currentTask so user can see it's completed and clear it manually
            lastIdleTime: new Date(),
          }
        }
        return l
      })

      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'completed' as const, progress: 100 } : t
        ),
        launchers: updatedLaunchers,
      }
    })
  }, [addLog])

  const reloadLauncher = useCallback((launcherId: string, newPodId?: string) => {
    setState((prev) => {
      const launcher = prev.launchers.find((l) => l.id === launcherId)
      if (!launcher) return prev

      const currentPod = prev.pods.find((p) => p.launcherId === launcherId)
      
      // Special case: unload only (no new pod selected)
      // Use null as sentinel value to distinguish unload from "reload with first available"
      if (newPodId === null && currentPod) {
        const poc = prev.pocs.find((p) => p.id === launcher.pocId)
        if (!poc) {
          addLog({
            type: 'warning',
            message: `Launcher "${launcher.name}" is not assigned to a POC`,
          })
          return prev
        }

        // Return current pod to POC inventory
        const updatedPods = prev.pods.map((p) => {
          if (p.id === currentPod.id) {
            // Current pod goes back to POC inventory (keep pocId, remove launcherId)
            // Preserve round statuses - don't reset to 'available' as rounds may have been used
            return {
              ...p,
              launcherId: undefined,
              pocId: launcher.pocId, // Ensure it's assigned to the POC
            }
          }
          return p
        })

        const updatedLaunchers = prev.launchers.map((l) => {
          if (l.id === launcherId) {
            return {
              ...l,
              podId: undefined,
            }
          }
          return l
        })

        addLog({
          type: 'success',
          message: `Launcher "${launcher.name}" unloaded. Pod "${currentPod.name}" returned to ${poc.name} stock.`,
        })

        return {
          ...prev,
          pods: updatedPods,
          launchers: updatedLaunchers,
        }
      }
      
      // If launcher has no POC assigned, can't reload from POC inventory
      if (!launcher.pocId) {
        addLog({
          type: 'warning',
          message: `Launcher "${launcher.name}" is not assigned to a POC`,
        })
        return prev
      }

      // Find available pods from RSV's assigned to the POC, BOC, or Ammo PLT
      // Also include pods directly assigned to POC or Ammo PLT (for backwards compatibility)
      const availablePods = prev.pods.filter((p) => {
        if (p.launcherId) return false // Pod is on a launcher
        
        // Pod directly assigned to Ammo PLT (available to all)
        if (p.ammoPltId) return true
        
        // Check if pod is on an RSV assigned to this POC's BOC, the POC itself, or Ammo PLT
        if (p.rsvId) {
          const rsv = prev.rsvs.find((r) => r.id === p.rsvId)
          if (rsv) {
            // RSV assigned to POC
            if (rsv.pocId === launcher.pocId) return true
            // RSV assigned to BOC (battery level slant)
            if (rsv.bocId && launcher.pocId) {
              const poc = prev.pocs.find((p) => p.id === launcher.pocId)
              if (poc?.bocId === rsv.bocId) return true
            }
            // RSV assigned to Ammo PLT (available to all)
            if (rsv.ammoPltId) return true
          }
        }
        
        // Direct POC assignment (backwards compatibility)
        if (p.pocId === launcher.pocId) return true
        
        return false
      })

      if (availablePods.length === 0 && !newPodId) {
        addLog({
          type: 'warning',
          message: `No available pods in POC inventory for launcher "${launcher.name}"`,
        })
        return prev
      }

      // If manual pod selection provided, validate it's available
      let selectedPod = newPodId 
        ? availablePods.find((p) => p.id === newPodId)
        : availablePods[0] // Otherwise use first available

      if (!selectedPod) {
        addLog({
          type: 'error',
          message: newPodId 
            ? `Selected pod is not available or does not belong to this POC`
            : `No available pods found`,
        })
        return prev
      }

      // Swap pods: remove current pod from launcher, assign new pod to launcher
      // If current pod exists, unassign it from launcher (it goes back to POC inventory)
      const updatedPods = prev.pods.map((p) => {
        if (p.id === currentPod?.id) {
          // Current pod goes back to POC inventory (keep pocId, remove launcherId)
          // Preserve round statuses - don't reset to 'available' as rounds may have been used
          return {
            ...p,
            launcherId: undefined,
            pocId: launcher.pocId, // Ensure it's assigned to the POC
          }
        }
        if (p.id === selectedPod.id) {
          // New pod goes on launcher
          return {
            ...p,
            launcherId: launcherId,
          }
        }
        return p
      })

      const updatedLaunchers = prev.launchers.map((l) => {
        if (l.id === launcherId) {
          return {
            ...l,
            podId: selectedPod.id,
          }
        }
        return l
      })

      addLog({
        type: 'success',
        message: `Launcher "${launcher.name}" reloaded with pod "${selectedPod.name}"`,
      })

      return {
        ...prev,
        pods: updatedPods,
        launchers: updatedLaunchers,
      }
    })
  }, [addLog])

  const saveToFile = useCallback(() => {
    try {
      exportToFile(state)
      addLog({ type: 'success', message: 'Data exported to file successfully' })
    } catch (error) {
      addLog({ type: 'error', message: 'Failed to export data to file' })
    }
  }, [state, addLog])

  const loadFromFileHandler = useCallback(
    async (file: File) => {
      try {
        const loadedState = await importFromFile(file)
        setState(loadedState)
        saveToLocalStorage(loadedState)
        addLog({ type: 'success', message: 'Data imported from file successfully' })
      } catch (error) {
        addLog({ type: 'error', message: 'Failed to import data from file' })
      }
    },
    [addLog]
  )

  const clearAllData = useCallback(() => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      const defaultState = getDefaultState()
      setState(defaultState)
      saveToLocalStorage(defaultState)
      addLog({ type: 'info', message: 'All data cleared' })
    }
  }, [addLog])

  const setCurrentUserRole = useCallback((role: CurrentUserRole) => {
    setState((prev) => ({
      ...prev,
      currentUserRole: role,
    }))
    addLog({ type: 'info', message: `User assigned to ${role.type.toUpperCase()} "${role.name}"` })
  }, [addLog])

  const markFirstTimeGuideAsSeen = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasSeenFirstTimeGuide: true,
    }))
  }, [])

  const addRoundType = useCallback((name: string) => {
    const trimmedName = name.trim().toUpperCase()
    if (!trimmedName) return
    
    setState((prev) => {
      if (prev.roundTypes[trimmedName]) {
        addLog({ type: 'warning', message: `Round type "${trimmedName}" already exists` })
        return prev
      }
      
      addLog({ type: 'info', message: `Round type "${trimmedName}" added` })
      return {
        ...prev,
        roundTypes: {
          ...prev.roundTypes,
          [trimmedName]: { name: trimmedName, enabled: true },
        },
      }
    })
  }, [addLog])

  const updateRoundType = useCallback((name: string, enabled: boolean) => {
    setState((prev) => {
      if (!prev.roundTypes[name]) {
        addLog({ type: 'warning', message: `Round type "${name}" not found` })
        return prev
      }
      
      // Check if there are any pods using this round type before disabling
      if (!enabled) {
        const podsUsingType = prev.pods.some((pod) => 
          pod.rounds.some((round) => round.type === name)
        )
        if (podsUsingType) {
          addLog({ 
            type: 'warning', 
            message: `Cannot disable "${name}" - there are pods using this round type. Remove or change those pods first.` 
          })
          return prev
        }
      }
      
      addLog({ 
        type: 'info', 
        message: `Round type "${name}" ${enabled ? 'enabled' : 'disabled'}` 
      })
      return {
        ...prev,
        roundTypes: {
          ...prev.roundTypes,
          [name]: { ...prev.roundTypes[name], enabled },
        },
      }
    })
  }, [addLog])

  const deleteRoundType = useCallback((name: string) => {
    setState((prev) => {
      if (!prev.roundTypes[name]) {
        addLog({ type: 'warning', message: `Round type "${name}" not found` })
        return prev
      }
      
      // Check if there are any pods using this round type
      const podsUsingType = prev.pods.some((pod) => 
        pod.rounds.some((round) => round.type === name)
      )
      if (podsUsingType) {
        addLog({ 
          type: 'error', 
          message: `Cannot delete "${name}" - there are pods using this round type. Remove or change those pods first.` 
        })
        return prev
      }
      
      const { [name]: deleted, ...remaining } = prev.roundTypes
      addLog({ type: 'info', message: `Round type "${name}" deleted` })
      return {
        ...prev,
        roundTypes: remaining,
      }
    })
  }, [addLog])

  const assignAmmoPltToBOC = useCallback((bocId: string) => {
    setState((prev) => {
      const boc = prev.bocs.find((b) => b.id === bocId)
      if (!boc) {
        addLog({ type: 'warning', message: `Cannot assign Ammo PLT: BOC not found` })
        return prev
      }
      addLog({ type: 'info', message: `Ammo PLT reassigned to BOC "${boc.name}"` })
      return { ...prev, ammoPltBocId: bocId }
    })
  }, [addLog])

  return (
    <AppDataContext.Provider
      value={{
        bocs: state.bocs,
        pocs: state.pocs,
        launchers: state.launchers,
        pods: state.pods,
        rsvs: state.rsvs,
        rounds: state.rounds,
        tasks: state.tasks,
        taskTemplates: state.taskTemplates,
        logs: state.logs,
        roundTypes: state.roundTypes,
        addBOC,
        addPOC,
        addLauncher,
        addPod,
        addRSV,
        deleteBOC,
        deletePOC,
        deleteLauncher,
        deletePod,
        deleteRSV,
        addRound,
        addTask,
        addTaskTemplate,
        updateTaskTemplate,
        deleteTaskTemplate,
        startTaskFromTemplate,
        startTaskFromTemplateForPOC,
        cancelTask,
        clearTask,
        updateBOC,
        updatePOC,
        updateLauncher,
        updatePod,
        updateRSV,
        assignPodToPOC,
        assignPodToRSV,
        assignPodToAmmoPlt,
        assignPodToLauncher,
        assignLauncherToPOC,
        assignPOCToBOC,
        assignRSVToPOC,
        assignRSVToBOC,
        assignRSVToAmmoPlt,
        assignTaskToLauncher,
        startFireMission,
        updateTaskProgress,
        consumeRound,
        completeFireMission,
        reloadLauncher,
        saveToFile,
        loadFromFile: loadFromFileHandler,
        clearAllData,
        addLog,
        currentUserRole: state.currentUserRole,
        setCurrentUserRole,
        addRoundType,
        updateRoundType,
        deleteRoundType,
        markFirstTimeGuideAsSeen,
        hasSeenFirstTimeGuide: state.hasSeenFirstTimeGuide ?? false,
        ammoPltBocId: state.ammoPltBocId,
        assignAmmoPltToBOC,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider')
  }
  return context
}
