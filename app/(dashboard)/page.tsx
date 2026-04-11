export const dynamic = "force-dynamic"

import { Card } from "@/app/components/ui/card"
import { WidgetHeader } from "@/app/components/ui/widget-header"
import { WeatherWidget } from "@/app/components/dashboard/weather-widget"
import { EmailWidget } from "@/app/components/dashboard/email-widget"
import { DailyBriefing } from "@/app/components/dashboard/daily-briefing"
import { BrainWidget } from "@/app/components/dashboard/brain-widget"
import { CanvasWidget } from "@/app/components/dashboard/canvas-widget"
import { HabitsWidget } from "@/app/components/dashboard/habits-widget"
import { isCanvasConnected } from "@/lib/integrations/canvas"
import { getHabits, getHabitLogs } from "@/lib/actions/habits"
import { getTasks } from "@/lib/actions/tasks"
import { getNotes } from "@/lib/actions/notes"
import { getTodaysEvents } from "@/lib/actions/calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { formatEventTime } from "@/lib/calendar-utils"
import { Calendar, CheckSquare, FileText, Clock, Sparkles } from "lucide-react"
import Link from "next/link"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`
}

function composeLumaLine({
  eventCount,
  firstEventTime,
  dueTodayCount,
  overdueCount,
  activeTaskCount,
}: {
  eventCount: number
  firstEventTime: string | null
  dueTodayCount: number
  overdueCount: number
  activeTaskCount: number
}): string {
  if (eventCount === 0 && activeTaskCount === 0 && overdueCount === 0) {
    return "The day is wide open. Nothing urgent to report."
  }

  const parts: string[] = []
  if (eventCount > 0) {
    parts.push(`${eventCount} event${eventCount === 1 ? "" : "s"}`)
  }
  if (dueTodayCount > 0) {
    parts.push(
      `${dueTodayCount} task${dueTodayCount === 1 ? "" : "s"} due today`
    )
  }

  let line =
    parts.length > 0
      ? `You have ${joinWithAnd(parts)}.`
      : `${activeTaskCount} task${activeTaskCount === 1 ? "" : "s"} in the queue.`

  if (firstEventTime && eventCount > 0) {
    line += ` First up at ${firstEventTime}.`
  }

  if (overdueCount > 0) {
    line += ` ${overdueCount} overdue to catch up on.`
  }

  return line
}

export default async function DashboardPage() {
  const greeting = getGreeting()
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const [
    tasks,
    notes,
    localEvents,
    googleConnected,
    canvasConnected,
    allHabits,
    todayHabitLogs,
  ] = await Promise.all([
    getTasks(),
    getNotes(),
    getTodaysEvents(),
    isGoogleConnected(),
    isCanvasConnected(),
    getHabits(),
    getHabitLogs(todayStr, todayStr),
  ])

  type DashboardEvent = {
    id: string
    title: string
    startTime: string
    endTime: string
    allDay: boolean
    color: string | null
  }

  let todaysEvents: DashboardEvent[] = localEvents.map((e) => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
    color: e.color,
  }))

  if (googleConnected) {
    try {
      const today = new Date().toISOString().split("T")[0]
      const googleEvents = await getGoogleCalendarEvents(
        `${today}T00:00:00Z`,
        `${today}T23:59:59Z`
      )
      todaysEvents = [
        ...todaysEvents,
        ...googleEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
          color: e.color,
        })),
      ].sort((a, b) => a.startTime.localeCompare(b.startTime))
    } catch {
      // Silently fall back to local events only
    }
  }

  const activeTasks = tasks.filter((t) => t.status !== "done")
  const completedToday = tasks.filter(
    (t) =>
      t.status === "done" &&
      new Date(t.updatedAt).toDateString() === new Date().toDateString()
  )
  const overdueCount = activeTasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr
  ).length
  const dueTodayCount = activeTasks.filter(
    (t) => t.dueDate === todayStr
  ).length
  const firstTimedEvent = todaysEvents
    .filter((e) => !e.allDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

  const lumaLine = composeLumaLine({
    eventCount: todaysEvents.length,
    firstEventTime: firstTimedEvent
      ? formatEventTime(firstTimedEvent.startTime)
      : null,
    dueTodayCount,
    overdueCount,
    activeTaskCount: activeTasks.length,
  })

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <section>
        <h1
          className="text-4xl font-normal leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {greeting}, Rafael
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          {lumaLine}
        </p>
      </section>

      {/* Today hero */}
      <DailyBriefing events={todaysEvents} tasks={tasks} />

      {/* From your vault */}
      <BrainWidget />

      {/* Surfaces grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <WeatherWidget />

        {/* Schedule */}
        <Link href="/calendar">
          <Card variant="interactive" className="h-full">
            <WidgetHeader icon={Calendar} label="Schedule" showArrow />
            {todaysEvents.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">No events today</p>
            ) : (
              <div className="space-y-3">
                {todaysEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{
                        backgroundColor: event.color || "var(--accent)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {event.title}
                      </p>
                      {!event.allDay && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-foreground-quaternary" />
                          <p className="text-xs text-foreground-tertiary">
                            {formatEventTime(event.startTime)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {todaysEvents.length > 3 && (
                  <p className="text-xs text-foreground-quaternary">
                    +{todaysEvents.length - 3} more
                  </p>
                )}
              </div>
            )}
          </Card>
        </Link>

        {/* Tasks summary */}
        <Link href="/tasks">
          <Card variant="interactive" className="h-full">
            <WidgetHeader icon={CheckSquare} label="Tasks" showArrow />
            <div className="space-y-1">
              <p
                className="text-3xl font-medium tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {activeTasks.length}
              </p>
              <p className="text-sm text-foreground-secondary">
                {activeTasks.length === 0
                  ? "All caught up"
                  : `active task${activeTasks.length !== 1 ? "s" : ""}`}
              </p>
              {completedToday.length > 0 && (
                <p className="text-xs font-medium text-success">
                  {completedToday.length} completed today
                </p>
              )}
            </div>
          </Card>
        </Link>

        {/* Notes summary */}
        <Link href="/notes">
          <Card variant="interactive" className="h-full">
            <WidgetHeader icon={FileText} label="Notes" showArrow />
            <div className="space-y-1">
              <p
                className="text-3xl font-medium tracking-tight"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {notes.length}
              </p>
              <p className="text-sm text-foreground-secondary">
                {notes.length === 0
                  ? "No notes yet"
                  : `note${notes.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </Card>
        </Link>

        <HabitsWidget
          habits={allHabits}
          todayLogs={todayHabitLogs}
          todayStr={todayStr}
        />

        <CanvasWidget isConnected={canvasConnected} />

        <EmailWidget isConnected={googleConnected} />

        {/* Ask Luma */}
        <Link href="/chat" className="md:col-span-2 lg:col-span-1">
          <Card variant="interactive" className="h-full">
            <WidgetHeader icon={Sparkles} label="Ask Luma" showArrow />
            <div className="flex h-11 items-center rounded-[--radius-lg] border border-border-light bg-background px-4">
              <span className="text-sm text-foreground-quaternary">
                What can I help you with?
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
