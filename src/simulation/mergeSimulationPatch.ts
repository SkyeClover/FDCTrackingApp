import type { AppState, Launcher, Pod, Round, SimulationOverlay, Task } from '../types'

/**
 * Implements merge unit states for this module.
 */
function mergeUnitStates(
  prev: SimulationOverlay['unitStates'],
  incoming: SimulationOverlay['unitStates'] | undefined
): SimulationOverlay['unitStates'] {
  if (!incoming?.length) return prev
  const map = new Map(prev.map((u) => [u.entityRef, u]))
  for (const u of incoming) {
    map.set(u.entityRef, u)
  }
  return [...map.values()]
}

/**
 * Implements merge survivor groups for this module.
 */
function mergeSurvivorGroups(
  prev: SimulationOverlay['survivorGroups'],
  incoming: SimulationOverlay['survivorGroups'] | undefined
): SimulationOverlay['survivorGroups'] {
  if (!incoming?.length) return prev
  const map = new Map(prev.map((g) => [g.id, g]))
  for (const g of incoming) {
    map.set(g.id, g)
  }
  return [...map.values()]
}

/**
 * Implements merge reassignments for this module.
 */
function mergeReassignments(
  prev: SimulationOverlay['reassignments'],
  incoming: SimulationOverlay['reassignments'] | undefined
): SimulationOverlay['reassignments'] {
  if (!incoming?.length) return prev
  const map = new Map(prev.map((r) => [r.id, r]))
  for (const r of incoming) {
    map.set(r.id, r)
  }
  return [...map.values()]
}

/**
 * Implements merge tasks by id for this module.
 */
function mergeTasksById(tasks: Task[], patches: Partial<Task>[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, { ...t }]))
  for (const p of patches) {
    if (!p.id) continue
    const cur = byId.get(p.id)
    if (cur) {
      byId.set(p.id, mergeTaskPartial(cur, p))
    } else {
      byId.set(p.id, normalizeNewTask(p))
    }
  }
  return [...byId.values()]
}

/**
 * Implements merge task partial for this module.
 */
function mergeTaskPartial(base: Task, patch: Partial<Task>): Task {
  const next = { ...base, ...patch }
  if (patch.startTime !== undefined) next.startTime = coerceDate(patch.startTime)
  if (patch.completedTime !== undefined) next.completedTime = coerceDate(patch.completedTime)
  if (patch.timeOfReceipt !== undefined) next.timeOfReceipt = coerceDate(patch.timeOfReceipt)
  if (patch.timeMsnSent !== undefined) next.timeMsnSent = coerceDate(patch.timeMsnSent)
  if (patch.timeMfrReceived !== undefined) next.timeMfrReceived = coerceDate(patch.timeMfrReceived)
  return next
}

/**
 * Implements normalize new task for this module.
 */
function normalizeNewTask(p: Partial<Task>): Task {
  const id = p.id ?? crypto.randomUUID()
  return mergeTaskPartial(
    {
      id,
      name: p.name ?? 'Sim task',
      description: p.description ?? '',
      status: p.status ?? 'pending',
      progress: p.progress ?? 0,
    },
    p
  )
}

/**
 * Implements coerce date for this module.
 */
function coerceDate(v: Date | string | undefined): Date | undefined {
  if (v == null) return undefined
  if (v instanceof Date) return v
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d
}

/**
 * Implements merge launchers by id for this module.
 */
function mergeLaunchersById(launchers: Launcher[], patches: Partial<Launcher>[]): Launcher[] {
  const byId = new Map(launchers.map((l) => [l.id, { ...l }]))
  for (const p of patches) {
    if (!p.id) continue
    const cur = byId.get(p.id)
    if (cur) {
      byId.set(p.id, {
        ...cur,
        ...p,
        lastIdleTime: p.lastIdleTime != null ? coerceDate(p.lastIdleTime as Date | string) : cur.lastIdleTime,
        currentTask: p.currentTask !== undefined ? p.currentTask : cur.currentTask,
      })
    }
  }
  return [...byId.values()]
}

/**
 * Implements normalize round for this module.
 */
function normalizeRound(baseId: string, idx: number, src: Partial<Round>): Round {
  return {
    id: src.id ?? `${baseId}-sim-${idx + 1}`,
    type: src.type ?? 'M31',
    status: src.status ?? 'available',
  }
}

/**
 * Implements merge pods by id for this module.
 */
function mergePodsById(pods: Pod[], patches: Partial<Pod>[]): Pod[] {
  const byId = new Map(pods.map((p) => [p.id, { ...p }]))
  for (const p of patches) {
    if (!p.id) continue
    const cur = byId.get(p.id)
    if (!cur) continue
    const nextRounds = Array.isArray(p.rounds)
      ? p.rounds.map((r, i) => normalizeRound(p.id!, i, r as Partial<Round>))
      : cur.rounds
    byId.set(p.id, {
      ...cur,
      ...p,
      rounds: nextRounds,
      uuid: p.uuid ?? cur.uuid,
      name: p.name ?? cur.name,
    })
  }
  return [...byId.values()]
}

/**
 * Determines whether is reload task is true in the current context.
 */
function isReloadTask(task: Task): boolean {
  const name = String(task.name ?? '').toLowerCase()
  const desc = String(task.description ?? '').toLowerCase()
  return name.includes('reload') || desc.includes('reload')
}

/**
 * Implements sync launcher task state for this module.
 */
function syncLauncherTaskState(
  prevLaunchers: Launcher[],
  nextLaunchers: Launcher[],
  tasks: Task[],
  touchedLauncherIds: Set<string>
): Launcher[] {
  if (touchedLauncherIds.size === 0) return nextLaunchers
  const prevById = new Map(prevLaunchers.map((l) => [l.id, l]))
  return nextLaunchers.map((launcher) => {
    if (!touchedLauncherIds.has(launcher.id)) return launcher
    const active = tasks
      .filter((t) => t.status === 'in-progress' && t.launcherIds?.includes(launcher.id))
      .sort((a, b) => (b.startTime?.getTime() ?? 0) - (a.startTime?.getTime() ?? 0))[0]

    if (active) {
      const resolvedStatus =
        launcher.status === 'idle'
          ? isReloadTask(active)
            ? 'maintenance'
            : 'active'
          : launcher.status
      return {
        ...launcher,
        status: resolvedStatus,
        currentTask: active,
        lastIdleTime: undefined,
      }
    }

    const prev = prevById.get(launcher.id)
    const justWentIdle = prev?.status !== 'idle' && launcher.status === 'idle'
    return {
      ...launcher,
      currentTask: undefined,
      lastIdleTime: justWentIdle ? new Date() : launcher.lastIdleTime,
    }
  })
}

export interface SimDeltaPayloadInput {
  simulationOverlay?: Partial<SimulationOverlay>
  tasks?: Partial<Task>[]
  launchers?: Partial<Launcher>[]
  pods?: Partial<Pod>[]
  removeTaskIds?: string[]
}

/**
 * Merge a simulation delta into app state (pure).
 */
export function mergeSimulationPatch(state: AppState, delta: SimDeltaPayloadInput): AppState {
  let tasks = state.tasks
  if (delta.removeTaskIds?.length) {
    const drop = new Set(delta.removeTaskIds)
    tasks = tasks.filter((t) => !drop.has(t.id))
  }
  if (delta.tasks?.length) {
    tasks = mergeTasksById(tasks, delta.tasks)
  }

  let launchers = state.launchers
  if (delta.launchers?.length) {
    launchers = mergeLaunchersById(launchers, delta.launchers)
  }

  const touchedLauncherIds = new Set<string>()
  for (const p of delta.launchers ?? []) {
    if (p.id) touchedLauncherIds.add(p.id)
  }
  for (const t of delta.tasks ?? []) {
    for (const id of t.launcherIds ?? []) touchedLauncherIds.add(id)
  }
  launchers = syncLauncherTaskState(state.launchers, launchers, tasks, touchedLauncherIds)

  let pods = state.pods
  if (delta.pods?.length) {
    pods = mergePodsById(pods, delta.pods)
  }

  let simulationOverlay = state.simulationOverlay
  if (delta.simulationOverlay) {
    const base: SimulationOverlay = simulationOverlay ?? {
      protocolVersion: 1,
      unitStates: [],
      survivorGroups: [],
      reassignments: [],
    }
    const inc = delta.simulationOverlay
    simulationOverlay = {
      protocolVersion: inc.protocolVersion ?? base.protocolVersion,
      scenarioId: inc.scenarioId ?? base.scenarioId,
      updatedAt: inc.updatedAt ?? base.updatedAt,
      unitStates: mergeUnitStates(base.unitStates, inc.unitStates),
      survivorGroups: mergeSurvivorGroups(base.survivorGroups, inc.survivorGroups),
      reassignments: mergeReassignments(base.reassignments, inc.reassignments),
      controlByScope: inc.controlByScope
        ? { ...base.controlByScope, ...inc.controlByScope }
        : base.controlByScope,
    }
  }

  return {
    ...state,
    tasks,
    launchers,
    pods,
    simulationOverlay,
  }
}
