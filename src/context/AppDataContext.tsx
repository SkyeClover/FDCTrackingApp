import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { BOC, POC, Launcher, Pod, Round, Task, TaskTemplate, LogEntry, AppState } from '../types'
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
  rounds: Round[]
  tasks: Task[]
  taskTemplates: TaskTemplate[]
  logs: LogEntry[]
  addBOC: (boc: BOC) => void
  addPOC: (poc: POC) => void
  addLauncher: (launcher: Launcher) => void
  addPod: (pod: Pod) => void
  addRound: (round: Round) => void
  addTask: (task: Task) => void
  addTaskTemplate: (template: TaskTemplate) => void
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void
  deleteTaskTemplate: (id: string) => void
  startTaskFromTemplate: (templateId: string, launcherId: string) => void
  updateLauncher: (id: string, updates: Partial<Launcher>) => void
  updatePod: (id: string, updates: Partial<Pod>) => void
  assignPodToLauncher: (podId: string, launcherId: string) => void
  assignLauncherToPOC: (launcherId: string, pocId: string) => void
  assignPOCToBOC: (pocId: string, bocId: string) => void
  assignTaskToLauncher: (taskId: string, launcherId: string) => void
  startFireMission: (launcherIds: string[], missionName: string, roundsPerLauncher: number) => void
  updateTaskProgress: (taskId: string, progress: number) => void
  consumeRound: (roundId: string) => void
  completeFireMission: (taskId: string) => void
  reloadLauncher: (launcherId: string) => void
  saveToFile: () => void
  loadFromFile: (file: File) => Promise<void>
  clearAllData: () => void
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadFromLocalStorage()
    return loaded || getDefaultState()
  })

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

        // Start progress timer
        const interval = setInterval(() => {
          setState((currentState) => {
            const task = currentState.tasks.find((t) => t.id === newTask.id)
            if (!task || task.status === 'completed') {
              clearInterval(interval)
              return currentState
            }

            const elapsed = task.startTime
              ? (Date.now() - task.startTime.getTime()) / 1000
              : 0
            const progress = Math.min(100, (elapsed / (task.duration || 168)) * 100)

            if (progress >= 100) {
              clearInterval(interval)
              // Complete the mission
              const updatedLaunchers = currentState.launchers.map((l) => {
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
                ...currentState,
                tasks: currentState.tasks.map((t) =>
                  t.id === newTask.id ? { ...t, status: 'completed' as const, progress: 100 } : t
                ),
                launchers: updatedLaunchers,
              }
            }

            const updatedTask = { ...task, progress }

            return {
              ...currentState,
              tasks: currentState.tasks.map((t) => (t.id === newTask.id ? updatedTask : t)),
              launchers: currentState.launchers.map((l) => {
                if (l.currentTask?.id === newTask.id) {
                  return { ...l, currentTask: updatedTask }
                }
                return l
              }),
            }
          })
        }, 100)

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

      return {
        ...prev,
        pods: prev.pods.map((p) => (p.id === podId ? { ...p, launcherId } : p)),
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

      return {
        ...prev,
        launchers: prev.launchers.map((l) => (l.id === launcherId ? { ...l, pocId } : l)),
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
      const duration = 168 // 2:48 in seconds
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

      // Start progress timer
      const interval = setInterval(() => {
        setState((prev) => {
          const task = prev.tasks.find((t) => t.id === newTask.id)
          if (!task || task.status === 'completed') {
            clearInterval(interval)
            return prev
          }

          const elapsed = task.startTime
            ? (Date.now() - task.startTime.getTime()) / 1000
            : 0
          const progress = Math.min(100, (elapsed / duration) * 100)

          if (progress >= 100) {
            completeFireMission(newTask.id)
            clearInterval(interval)
          }

          const updatedTask = { ...task, progress }

          return {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === newTask.id ? updatedTask : t)),
            launchers: prev.launchers.map((l) => {
              if (l.currentTask?.id === newTask.id) {
                return { ...l, currentTask: updatedTask }
              }
              return l
            }),
          }
        })
      }, 100)
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

  const reloadLauncher = useCallback((launcherId: string) => {
    setState((prev) => {
      const launcher = prev.launchers.find((l) => l.id === launcherId)
      if (!launcher) return prev

      const pod = prev.pods.find((p) => p.launcherId === launcherId)
      if (pod) {
        addLog({
          type: 'success',
          message: `Launcher "${launcher.name}" reloaded - all rounds reset to available`,
        })
        return {
          ...prev,
          pods: prev.pods.map((p) => {
            if (p.id === pod.id) {
              return {
                ...p,
                rounds: p.rounds.map((r) => ({ ...r, status: 'available' as const })),
              }
            }
            return p
          }),
        }
      } else {
        addLog({
          type: 'warning',
          message: `Launcher "${launcher.name}" has no pod assigned`,
        })
      }
      return prev
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
        rounds: state.rounds,
        tasks: state.tasks,
        taskTemplates: state.taskTemplates,
        logs: state.logs,
        addBOC,
        addPOC,
        addLauncher,
        addPod,
        addRound,
        addTask,
        addTaskTemplate,
        updateTaskTemplate,
        deleteTaskTemplate,
        startTaskFromTemplate,
        updateLauncher,
        updatePod,
        assignPodToLauncher,
        assignLauncherToPOC,
        assignPOCToBOC,
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
