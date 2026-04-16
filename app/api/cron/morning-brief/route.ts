import { db } from "@/lib/db"
import { tasks, habits, habitLogs, calendarEvents } from "@/lib/schema"
import { and, eq, gte, lte, ne } from "drizzle-orm"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import {
  sendMessage,
  getAuthenticatedEmailAddress,
} from "@/lib/integrations/gmail"
import {
  guardCronRequest,
  formatLocalDate,
  formatTime,
  priorityRank,
} from "@/lib/actions/automations"

export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  try {
    const now = new Date()
    const todayStr = formatLocalDate(now)
    const dayStart = `${todayStr}T00:00:00`
    const dayEnd = `${todayStr}T23:59:59`

    // ---- Events (local + Google if connected) ----
    const localEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          lte(calendarEvents.startTime, dayEnd),
          gte(calendarEvents.endTime, dayStart)
        )
      )
      .orderBy(calendarEvents.startTime)
      .all()

    type BriefEvent = {
      title: string
      startTime: string
      endTime: string
      allDay: boolean
    }

    let events: BriefEvent[] = localEvents.map((e) => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      allDay: e.allDay,
    }))

    if (await isGoogleConnected()) {
      try {
        const googleEvents = await getGoogleCalendarEvents(
          new Date(dayStart).toISOString(),
          new Date(dayEnd).toISOString()
        )
        events = [
          ...events,
          ...googleEvents.map((e) => ({
            title: e.title,
            startTime: e.startTime,
            endTime: e.endTime,
            allDay: e.allDay,
          })),
        ]
      } catch {
        // Fall back to local-only
      }
    }

    events.sort((a, b) => a.startTime.localeCompare(b.startTime))

    // ---- Top 3 active tasks ----
    const activeTasks = await db
      .select()
      .from(tasks)
      .where(and(ne(tasks.status, "done"), eq(tasks.isTemplate, false)))
      .all()

    const topTasks = activeTasks
      .slice()
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority)
        if (pr !== 0) return pr
        const aDue = a.dueDate || "9999-12-31"
        const bDue = b.dueDate || "9999-12-31"
        return aDue.localeCompare(bDue)
      })
      .slice(0, 3)

    // ---- Habits today ----
    const allHabits = await db.select().from(habits).all()
    const todayLogs = await db
      .select()
      .from(habitLogs)
      .where(eq(habitLogs.date, todayStr))
      .all()
    const logByHabit = new Map<string, number>()
    for (const l of todayLogs) {
      logByHabit.set(l.habitId, (logByHabit.get(l.habitId) ?? 0) + l.count)
    }
    const habitLines = allHabits.map((h) => {
      const done = logByHabit.get(h.id) ?? 0
      return `${h.name}: ${done}/${h.targetPerDay}`
    })

    // ---- Compose body ----
    const weekdayLabel = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })

    const eventsLine =
      events.length === 0
        ? "Nothing on the calendar today."
        : events
            .map((e) => {
              if (e.allDay) return `${e.title} (all day)`
              return `${formatTime(e.startTime)} ${e.title}`
            })
            .join(", ")

    const tasksLine =
      topTasks.length === 0
        ? "Inbox is clear, pick your own direction."
        : topTasks
            .map((t) => {
              const due = t.dueDate ? ` (due ${t.dueDate})` : ""
              return `${t.title}${due}`
            })
            .join("; ")

    const habitsLine =
      habitLines.length === 0
        ? "No habits tracked yet."
        : habitLines.join(", ")

    const body = [
      `Good morning, Rafael.`,
      ``,
      `Today is ${weekdayLabel}.`,
      ``,
      `Calendar: ${eventsLine}`,
      `Top tasks: ${tasksLine}`,
      `Habits: ${habitsLine}`,
      ``,
      `Make it a good one.`,
      `Luma`,
    ].join("\n")

    const summary = `Calendar ${events.length} | Tasks ${topTasks.length} | Habits ${allHabits.length}`

    // ---- Recipient resolution ----
    const recipient =
      process.env.LUMA_DAILY_BRIEF_EMAIL?.trim() ||
      (await getAuthenticatedEmailAddress())

    if (!recipient) {
      return Response.json({ sent: false, skipped: "gmail_not_connected" })
    }

    const sent = await sendMessage({
      to: recipient,
      subject: `Morning brief, ${weekdayLabel}`,
      body,
    })

    if (!sent) {
      return Response.json({
        sent: false,
        skipped: "gmail_send_failed",
        summary,
      })
    }

    return Response.json({ sent: true, summary })
  } catch (e) {
    return Response.json(
      {
        error: "morning_brief_failed",
        details: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    )
  }
}
