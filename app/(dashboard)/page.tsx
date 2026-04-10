export const dynamic = "force-dynamic"

import { Card } from "@/app/components/ui/card"
import { WeatherWidget } from "@/app/components/dashboard/weather-widget"
import { EmailWidget } from "@/app/components/dashboard/email-widget"
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
  const [tasks, notes, localEvents, googleConnected] = await Promise.all([
    getTasks(),
    getNotes(),
    getTodaysEvents(),
    isGoogleConnected(),
  ])

  // Normalize to a common shape
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}, Ramez
        </h1>
        <p className="mt-1 text-foreground-secondary">
          Here&apos;s your day at a glance.
        </p>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Weather Widget */}
        <WeatherWidget />

        {/* Calendar Widget */}
        <Link href="/calendar">
          <Card variant="interactive" className="col-span-1 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <Calendar className="h-[18px] w-[18px] text-accent" />
                </div>
                <h2 className="text-sm font-medium text-foreground-secondary">
                  Today&apos;s Schedule
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            {todaysEvents.length === 0 ? (
              <p className="text-sm text-foreground-secondary">
                No events today
              </p>
            ) : (
              <div className="space-y-2">
                {todaysEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center gap-2">
                    <div
                      className="h-6 w-0.5 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color || "#0071e3" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {event.title}
                      </p>
                      {!event.allDay && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-foreground-quaternary" />
                          <p className="text-xs text-foreground-tertiary">
                            {formatEventTime(event.startTime)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {todaysEvents.length > 3 && (
                  <p className="text-xs text-foreground-tertiary">
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <CheckSquare className="h-[18px] w-[18px] text-accent" />
                </div>
                <h2 className="text-sm font-medium text-foreground-secondary">
                  Tasks
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
                {activeTasks.length}
              </p>
              <p className="text-sm text-foreground-secondary">
                {activeTasks.length === 0
                  ? "All caught up!"
                  : `active task${activeTasks.length !== 1 ? "s" : ""}`}
              </p>
              {completedToday.length > 0 && (
                <p className="text-xs text-success">
                  {completedToday.length} completed today
                </p>
              )}
            </div>
          </Card>
        </Link>

        {/* Notes Widget */}
        <Link href="/notes">
          <Card variant="interactive" className="col-span-1 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <FileText className="h-[18px] w-[18px] text-accent" />
                </div>
                <h2 className="text-sm font-medium text-foreground-secondary">
                  Notes
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">
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

        {/* Email Widget */}
        <EmailWidget isConnected={googleConnected} />

        {/* Quick Chat Widget */}
        <Link href="/chat" className="md:col-span-2 lg:col-span-1">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
                  <MessageCircle className="h-[18px] w-[18px] text-accent" />
                </div>
                <h2 className="text-sm font-medium text-foreground-secondary">
                  Ask Luma
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-foreground-quaternary" />
            </div>
            <div className="flex h-10 items-center rounded-[--radius-md] border border-border bg-background px-4">
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
