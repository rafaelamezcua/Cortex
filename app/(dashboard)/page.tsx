export const dynamic = "force-dynamic"

import { Card } from "@/app/components/ui/card"
import { WeatherWidget } from "@/app/components/dashboard/weather-widget"
import { EmailWidget } from "@/app/components/dashboard/email-widget"
import { DailyBriefing } from "@/app/components/dashboard/daily-briefing"
import { CanvasWidget } from "@/app/components/dashboard/canvas-widget"
import { isCanvasConnected } from "@/lib/integrations/canvas"
import { getTasks } from "@/lib/actions/tasks"
import { getNotes } from "@/lib/actions/notes"
import { getTodaysEvents } from "@/lib/actions/calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { formatEventTime } from "@/lib/calendar-utils"
import {
  Calendar,
  CheckSquare,
  MessageCircle,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default async function DashboardPage() {
  const greeting = getGreeting()
  const [tasks, notes, localEvents, googleConnected, canvasConnected] = await Promise.all([
    getTasks(),
    getNotes(),
    getTodaysEvents(),
    isGoogleConnected(),
    isCanvasConnected(),
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

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          {greeting}, Ramez
        </h1>
        <p className="mt-2 text-[15px] text-foreground-secondary">
          Here&apos;s your day at a glance.
        </p>
      </div>

      {/* Daily Briefing */}
      <DailyBriefing events={todaysEvents} tasks={tasks} />

      {/* Widget Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Weather Widget */}
        <WeatherWidget />

        {/* Calendar Widget */}
        <Link href="/calendar">
          <Card variant="interactive" className="col-span-1 h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                  Schedule
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            {todaysEvents.length === 0 ? (
              <p className="text-sm text-foreground-tertiary">
                No events today
              </p>
            ) : (
              <div className="space-y-3">
                {todaysEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color || "var(--accent)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {event.title}
                      </p>
                      {!event.allDay && (
                        <div className="flex items-center gap-1 mt-0.5">
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

        {/* Tasks Widget */}
        <Link href="/tasks">
          <Card variant="interactive" className="col-span-1 h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <CheckSquare className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                  Tasks
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight">
                {activeTasks.length}
              </p>
              <p className="text-sm text-foreground-secondary">
                {activeTasks.length === 0
                  ? "All caught up!"
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

        {/* Notes Widget */}
        <Link href="/notes">
          <Card variant="interactive" className="col-span-1 h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                  Notes
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight">
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

        {/* Canvas Widget */}
        <CanvasWidget isConnected={canvasConnected} />

        {/* Email Widget */}
        <EmailWidget isConnected={googleConnected} />

        {/* Quick Chat Widget */}
        <Link href="/chat" className="md:col-span-2 lg:col-span-1">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                  Ask Luma
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
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
