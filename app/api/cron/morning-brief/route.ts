import { db } from "@/lib/db"
import { tasks, habits, habitLogs, calendarEvents, journalEntries } from "@/lib/schema"
import { and, eq, gte, lte, ne, isNull, desc } from "drizzle-orm"
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
import { getSettings } from "@/lib/actions/settings"
import { getDailyBrief } from "@/lib/integrations/luma-brain"

export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  try {
    const now = new Date()
    const todayStr = formatLocalDate(now)
    const dayStart = `${todayStr}T00:00:00`
    const dayEnd = `${todayStr}T23:59:59`

    // ---- Events (local + Google) ----
    const localEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          lte(calendarEvents.startTime, dayEnd),
          gte(calendarEvents.endTime, dayStart),
        ),
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
          new Date(dayEnd).toISOString(),
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

    const timedEvents = events.filter((e) => !e.allDay)
    const eventHours = timedEvents.reduce((sum, e) => {
      const start = new Date(e.startTime).getTime()
      const end = new Date(e.endTime).getTime()
      return sum + Math.max(0, (end - start) / 3_600_000)
    }, 0)
    const firstEvent = events.find((e) => !e.allDay) ?? events[0] ?? null

    // ---- Active tasks (exclude archived) ----
    const activeTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          ne(tasks.status, "done"),
          eq(tasks.isTemplate, false),
          isNull(tasks.archivedAt),
        ),
      )
      .all()

    const sortedTasks = activeTasks.slice().sort((a, b) => {
      const pr = priorityRank(a.priority) - priorityRank(b.priority)
      if (pr !== 0) return pr
      const aDue = a.dueDate || "9999-12-31"
      const bDue = b.dueDate || "9999-12-31"
      return aDue.localeCompare(bDue)
    })

    const topTasks = sortedTasks.slice(0, 3)

    // Pick one stale "in_progress" task to confront (oldest updated)
    const staleTasks = activeTasks
      .filter((t) => t.status === "in_progress")
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const staleCandidate =
      staleTasks.length > 0 && staleTasks[0].updatedAt < sevenDaysAgo.toISOString()
        ? staleTasks[0]
        : null

    // ---- Habits today + missed-streak nudge ----
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

    // For each habit, find a "you skipped X for N days" nudge candidate
    let skippedHabitNudge: string | null = null
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1)
    const dStr = formatLocalDate(twoDaysAgo)
    const yesterdayStr = formatLocalDate(new Date(Date.now() - 86_400_000))
    for (const h of allHabits) {
      const recentLogs = await db
        .select()
        .from(habitLogs)
        .where(
          and(
            eq(habitLogs.habitId, h.id),
            gte(habitLogs.date, dStr),
            lte(habitLogs.date, yesterdayStr),
          ),
        )
        .all()
      if (recentLogs.length === 0) {
        skippedHabitNudge = `You haven't logged ${h.name} the last couple days.`
        break
      }
    }

    const habitLines = allHabits.map((h) => {
      const done = logByHabit.get(h.id) ?? 0
      return `${h.name}: ${done}/${h.targetPerDay}`
    })

    // ---- Win from yesterday (vault first, journal fallback) ----
    let yesterdayWin: string | null = null
    try {
      const yBrief = await getDailyBrief(yesterdayStr)
      if (yBrief.exists && yBrief.wins.length > 0) {
        yesterdayWin = yBrief.wins[0]
      }
    } catch {
      // Vault not available — fall back to journal
    }
    if (!yesterdayWin) {
      try {
        const yJournal = await db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.date, yesterdayStr))
          .get()
        if (yJournal?.content) {
          // Look for a "Wins:" or first sentence
          const winsLine = yJournal.content
            .split("\n")
            .find((l) => /win|grateful|proud/i.test(l))
          yesterdayWin = winsLine?.trim() || null
        }
      } catch {
        // Skip
      }
    }

    // ---- Compose body ----
    const weekdayLabel = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })

    const lines: string[] = []
    lines.push(`Good morning, Rafael.`)
    lines.push(``)
    lines.push(`Today is ${weekdayLabel}.`)
    lines.push(``)

    // Schedule headline
    if (events.length === 0) {
      lines.push(`Calendar: clear runway today.`)
    } else {
      const meetingPart =
        timedEvents.length === 0
          ? "no meetings"
          : `${timedEvents.length} ${timedEvents.length === 1 ? "meeting" : "meetings"} (${eventHours.toFixed(1)}h booked)`
      const firstPart =
        firstEvent && !firstEvent.allDay
          ? `, first at ${formatTime(firstEvent.startTime)}: ${firstEvent.title}`
          : ""
      lines.push(`Calendar: ${meetingPart}${firstPart}.`)
    }

    // Top priorities
    if (topTasks.length === 0) {
      lines.push(`Top priorities: nothing pending. Pick your own direction.`)
    } else {
      lines.push(`Top priorities:`)
      for (const t of topTasks) {
        const due = t.dueDate ? ` (due ${t.dueDate})` : ""
        const pri = t.priority === "high" ? " [HIGH]" : ""
        lines.push(`  - ${t.title}${pri}${due}`)
      }
    }

    // Stale confrontation
    if (staleCandidate) {
      lines.push(``)
      lines.push(`Worth confronting: "${staleCandidate.title}" has been in progress over a week. Push it forward or kill it.`)
    }

    // Yesterday's win
    if (yesterdayWin) {
      lines.push(``)
      lines.push(`Yesterday's win: ${yesterdayWin}`)
    }

    // Habit nudge
    if (skippedHabitNudge) {
      lines.push(``)
      lines.push(skippedHabitNudge)
    }

    if (habitLines.length > 0) {
      lines.push(``)
      lines.push(`Habits: ${habitLines.join(", ")}`)
    }

    lines.push(``)
    lines.push(`Make it a good one.`)
    lines.push(`Luma`)

    const body = lines.join("\n")
    const summary = `Calendar ${events.length} (${eventHours.toFixed(1)}h) | Tasks ${topTasks.length}/${activeTasks.length} | Habits ${allHabits.length}${staleCandidate ? " | Stale!" : ""}${yesterdayWin ? " | Win" : ""}`

    // ---- Settings + recipient ----
    const settings = await getSettings(["daily_brief_enabled", "daily_brief_email"])
    if (settings["daily_brief_enabled"] === "0") {
      return Response.json({ sent: false, skipped: "disabled_in_settings" })
    }

    const recipient =
      settings["daily_brief_email"]?.trim() ||
      process.env.LUMA_DAILY_BRIEF_EMAIL?.trim() ||
      (await getAuthenticatedEmailAddress())

    if (!recipient) {
      return Response.json({
        sent: false,
        skipped: "no_recipient",
        body,
        summary,
      })
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
        body,
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
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return POST(request)
}
// Avoid unused import linting
void desc
