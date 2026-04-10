import { formatEventTime } from "@/lib/calendar-utils"
import { Sunrise, Clock, CheckSquare, AlertTriangle } from "lucide-react"

type BriefingEvent = {
  title: string
  startTime: string
  endTime: string
  allDay: boolean
}

type BriefingTask = {
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

  // Calculate focus time (gaps between events)
  const sortedEvents = [...timedEvents].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
  let focusMinutes = 0
  const workStart = 9 * 60 // 9am
  const workEnd = 17 * 60 // 5pm
  let cursor = workStart

  for (const event of sortedEvents) {
    const start = new Date(event.startTime)
    const eventStart = start.getHours() * 60 + start.getMinutes()
    const end = new Date(event.endTime)
    const eventEnd = end.getHours() * 60 + end.getMinutes()

    if (eventStart > cursor && eventStart <= workEnd) {
      focusMinutes += Math.min(eventStart, workEnd) - Math.max(cursor, workStart)
    }
    cursor = Math.max(cursor, eventEnd)
  }
  if (cursor < workEnd) {
    focusMinutes += workEnd - Math.max(cursor, workStart)
  }

  const focusHours = Math.floor(focusMinutes / 60)
  const focusMins = focusMinutes % 60

  // First event
  const firstEvent = sortedEvents[0]

  if (events.length === 0 && activeTasks.length === 0) {
    return null // No briefing needed on empty days
  }

  return (
    <div className="rounded-[--radius-xl] border border-accent/15 bg-accent-subtle p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Sunrise className="h-5 w-5 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">
          Today at a glance
        </h2>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground-secondary">
        {/* Events count */}
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-foreground-tertiary" />
          {events.length} event{events.length !== 1 ? "s" : ""}
          {firstEvent && (
            <span className="text-foreground-tertiary">
              — first at {formatEventTime(firstEvent.startTime)}
            </span>
          )}
        </span>

        {/* Tasks */}
        {activeTasks.length > 0 && (
          <span className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-foreground-tertiary" />
            {dueTodayTasks.length > 0
              ? `${dueTodayTasks.length} task${dueTodayTasks.length !== 1 ? "s" : ""} due today`
              : `${activeTasks.length} active task${activeTasks.length !== 1 ? "s" : ""}`}
          </span>
        )}

        {/* Overdue warning */}
        {overdueTasks.length > 0 && (
          <span className="flex items-center gap-1.5 text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {overdueTasks.length} overdue
          </span>
        )}

        {/* Focus time */}
        {focusMinutes > 0 && timedEvents.length > 0 && (
          <span className="text-foreground-tertiary">
            {focusHours > 0 ? `${focusHours}h ` : ""}
            {focusMins > 0 ? `${focusMins}m ` : ""}
            focus time available
          </span>
        )}
      </div>
    </div>
  )
}
