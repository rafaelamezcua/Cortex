import { Card } from "@/app/components/ui/card"
import { TaskCheckbox } from "@/app/components/tasks/task-checkbox"
import { formatEventTime } from "@/lib/calendar-utils"
import { Sunrise, Clock, AlertTriangle } from "lucide-react"

type BriefingEvent = {
  title: string
  startTime: string
  endTime: string
  allDay: boolean
}

type BriefingTask = {
  id: string
  title: string
  priority: string
  dueDate: string | null
  status: string
}

interface DailyBriefingProps {
  events: BriefingEvent[]
  tasks: BriefingTask[]
}

export function DailyBriefing({ events, tasks }: DailyBriefingProps) {
  const todayStr = new Date().toISOString().split("T")[0]
  const activeTasks = tasks.filter((t) => t.status !== "done")
  const overdueTasks = activeTasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr
  )
  const dueTodayTasks = activeTasks.filter((t) => t.dueDate === todayStr)
  const timedEvents = events.filter((e) => !e.allDay)

  // Focus time: gaps between events in the 9am-5pm workday
  const sortedEvents = [...timedEvents].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
  let focusMinutes = 0
  const workStart = 9 * 60
  const workEnd = 17 * 60
  let cursor = workStart

  for (const event of sortedEvents) {
    const start = new Date(event.startTime)
    const eventStart = start.getHours() * 60 + start.getMinutes()
    const end = new Date(event.endTime)
    const eventEnd = end.getHours() * 60 + end.getMinutes()

    if (eventStart > cursor && eventStart <= workEnd) {
      focusMinutes +=
        Math.min(eventStart, workEnd) - Math.max(cursor, workStart)
    }
    cursor = Math.max(cursor, eventEnd)
  }
  if (cursor < workEnd) {
    focusMinutes += workEnd - Math.max(cursor, workStart)
  }

  const focusHours = Math.floor(focusMinutes / 60)
  const focusMins = focusMinutes % 60
  const focusLabel =
    focusMinutes > 0
      ? `${focusHours > 0 ? `${focusHours}h` : ""}${
          focusHours > 0 && focusMins > 0 ? " " : ""
        }${focusMins > 0 ? `${focusMins}m` : ""} of focus`
      : null

  const firstEvent = sortedEvents[0]
  const nothingOnDocket =
    events.length === 0 && activeTasks.length === 0 && overdueTasks.length === 0

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <Card variant="hearth" className="relative overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[--radius-md] bg-accent-light">
            <Sunrise className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2
              className="text-2xl font-medium tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Today
            </h2>
            <p className="text-xs text-foreground-tertiary">{todayDate}</p>
          </div>
        </div>
        {focusLabel && (
          <div className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
            <Clock className="h-3 w-3" />
            {focusLabel}
          </div>
        )}
      </div>

      {/* Empty state */}
      {nothingOnDocket && (
        <p className="mt-6 text-sm text-foreground-secondary">
          Nothing on the docket. Enjoy the quiet.
        </p>
      )}

      {/* Content */}
      {!nothingOnDocket && (
        <div className="mt-6 space-y-5">
          {/* Events line */}
          {events.length > 0 && (
            <p className="text-sm text-foreground-secondary">
              {events.length} {events.length === 1 ? "event" : "events"} today
              {firstEvent && (
                <span className="text-foreground-tertiary">
                  , first at {formatEventTime(firstEvent.startTime)}
                </span>
              )}
            </p>
          )}

          {/* Overdue warning */}
          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-2 rounded-[--radius-md] border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {overdueTasks.length} overdue task
                {overdueTasks.length === 1 ? "" : "s"} waiting
              </span>
            </div>
          )}

          {/* Due today tasks with inline toggle */}
          {dueTodayTasks.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
                Due today
              </p>
              <div className="space-y-0.5">
                {dueTodayTasks.map((task) => (
                  <TaskCheckbox
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    done={task.status === "done"}
                    priority={task.priority}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No due-today but has other active tasks */}
          {dueTodayTasks.length === 0 && activeTasks.length > 0 && (
            <p className="text-sm text-foreground-tertiary">
              {activeTasks.length} active task
              {activeTasks.length === 1 ? "" : "s"}, none due today
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
