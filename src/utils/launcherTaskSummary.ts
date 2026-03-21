import type { Launcher, Task } from '../types'

/** One-line summary for dashboards: active task, or most recent task touching this launcher. */
export function getLauncherTaskSummary(launcher: Launcher, allTasks: Task[]): string {
  if (launcher.currentTask) {
    return `Active: ${launcher.currentTask.name}`
  }

  const relevant = allTasks
    .filter(
      (t) =>
        t.launcherIds?.includes(launcher.id) ||
        (!!launcher.pocId && t.pocIds?.includes(launcher.pocId))
    )
    .sort((a, b) => {
      const ta = a.completedTime?.getTime() ?? a.startTime?.getTime() ?? 0
      const tb = b.completedTime?.getTime() ?? b.startTime?.getTime() ?? 0
      return tb - ta
    })

  const last = relevant[0]
  if (!last) return '—'

  const when = last.completedTime ?? last.startTime
  const timeStr = when
    ? when.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''
  const prefix = last.status === 'completed' ? 'Last' : last.status === 'in-progress' ? 'In progress' : 'Task'
  return timeStr ? `${prefix}: ${last.name} (${timeStr})` : `${prefix}: ${last.name}`
}
