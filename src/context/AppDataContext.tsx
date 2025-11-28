import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react'
import { BOC, POC, Launcher, Pod, RSV, Round, Task, TaskTemplate, LogEntry, AppState } from '../types'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToFile,
  importFromFile,
  getDefaultState,
} from '../utils/saveLoad'

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
  addBOC: (boc: BOC) => void
  addPOC: (poc: POC) => void
  addLauncher: (launcher: Launcher) => void
  addPod: (pod: Pod) => void
  addRSV: (rsv: RSV) => void
  addRound: (round: Round) => void
  addTask: (task: Task) => void
  addTaskTemplate: (template: TaskTemplate) => void
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void
  deleteTaskTemplate: (id: string) => void
  startTaskFromTemplate: (templateId: string, launcherId: string) => void
  updateLauncher: (id: string, updates: Partial<Launcher>) => void
  updatePod: (id: string, updates: Partial<Pod>) => void
  updateRSV: (id: string, updates: Partial<RSV>) => void
  assignPodToPOC: (podId: string, pocId: string) => void
  assignPodToRSV: (podId: string, rsvId: string) => void
  assignPodToLauncher: (podId: string, launcherId: string) => void
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
    return loaded || defaultState
  })
  
  // Store intervals to cleanup
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const stateRef = useRef(state)
  
  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

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

  const addBOC = useCallback((boc: BOC) => {
    setState((prev) => ({ ...prev, bocs: [...prev.bocs, boc] }))
    addLog({ type: 'info', message: `BOC "${boc.name}" created` })
  }, [addLog])

  const addPOC = useCallback((poc: POC) => {
    setState((prev) => ({ ...prev, pocs: [...prev.pocs, poc] }))
    addLog({ type: 'info', message: `POC "${poc.name}" created` })
  }, [addLog])

  const addLauncher = useCallback((launcher: Launcher) => {
    setState((prev) => ({ ...prev, launchers: [...prev.launchers, launcher] }))
    addLog({ type: 'info', message: `Launcher "${launcher.name}" created` })
  }, [addLog])

  const addPod = useCallback((pod: Pod) => {
    setState((prev) => ({ ...prev, pods: [...prev.pods, pod] }))
    addLog({ type: 'info', message: `Pod "${pod.name}" created` })
  }, [addLog])

  const addRSV = useCallback((rsv: RSV) => {
    setState((prev) => ({ ...prev, rsvs: [...prev.rsvs, rsv] }))
    addLog({ type: 'info', message: `RSV "${rsv.name}" created` })
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
                    message: `Task "${task.name}" completed on launcher "${l.name}"`,
                  })
                  return {
                    ...l,
                    status: 'idle' as const,
                    currentTask: undefined,
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
              }
            }
            return l
          }),
        }
      })
    },
    [addLog]
  )

  const updateLauncher = useCallback((id: string, updates: Partial<Launcher>) => {
    setState((prev) => ({
      ...prev,
      launchers: prev.launchers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }))
  }, [])

  const updatePod = useCallback((id: string, updates: Partial<Pod>) => {
    setState((prev) => ({
      ...prev,
      pods: prev.pods.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
  }, [])

  const updateRSV = useCallback((id: string, updates: Partial<RSV>) => {
    setState((prev) => ({
      ...prev,
      rsvs: prev.rsvs.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }))
  }, [])

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
        pods: prev.pods.map((p) => (p.id === podId ? { ...p, pocId } : p)),
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
        pods: prev.pods.map((p) => (p.id === podId ? { ...p, rsvId } : p)),
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
            message: `Fire Mission completed on launcher "${l.name}"`,
          })
          return {
            ...l,
            status: 'idle' as const,
            currentTask: undefined,
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
      
      // If launcher has no POC assigned, can't reload from POC inventory
      if (!launcher.pocId) {
        addLog({
          type: 'warning',
          message: `Launcher "${launcher.name}" is not assigned to a POC`,
        })
        return prev
      }

      // Find available pods from RSV's assigned to the POC, BOC, or Ammo PLT
      // Also include pods directly assigned to POC (for backwards compatibility)
      const availablePods = prev.pods.filter((p) => {
        if (p.launcherId) return false // Pod is on a launcher
        
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
        ? prev.pods.find((p) => p.id === newPodId && p.pocId === launcher.pocId && !p.launcherId)
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
          return {
            ...p,
            launcherId: undefined,
            rounds: p.rounds.map((r) => ({ ...r, status: 'available' as const })),
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
        addBOC,
        addPOC,
        addLauncher,
        addPod,
        addRSV,
        addRound,
        addTask,
        addTaskTemplate,
        updateTaskTemplate,
        deleteTaskTemplate,
        startTaskFromTemplate,
        updateLauncher,
        updatePod,
        updateRSV,
        assignPodToPOC,
        assignPodToRSV,
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
