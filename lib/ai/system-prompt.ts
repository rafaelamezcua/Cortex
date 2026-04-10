import { db } from "@/lib/db"
import { tasks, notes, calendarEvents } from "@/lib/schema"
import { ne, and, gte, lte } from "drizzle-orm"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function getSystemPrompt(): Promise<string> {
  const activeTasks = await db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "done"))
    .all()

  const recentNotes = await db.select().from(notes).all()

  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Get today's events
  const todayStr = today.toISOString().split("T")[0]
  const dayStart = `${todayStr}T00:00:00`
  const dayEnd = `${todayStr}T23:59:59`

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

  let allEvents = localEvents.map((e) => ({
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
    source: "local",
  }))

  const connected = await isGoogleConnected()
  if (connected) {
    try {
      const googleEvents = await getGoogleCalendarEvents(
        new Date(dayStart).toISOString(),
        new Date(dayEnd).toISOString()
      )
      allEvents = [
        ...allEvents,
        ...googleEvents.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
          source: "google",
        })),
      ].sort((a, b) => a.startTime.localeCompare(b.startTime))
    } catch {
      // Skip Google events
    }
  }

  return `You are Luma, a personal AI assistant for Ramez. You are sleek, concise, and helpful — like a thoughtful chief of staff.

Today is ${dateStr}.

## Ramez's Schedule Today (${allEvents.length} events)
${
  allEvents.length > 0
    ? allEvents
        .map(
          (e) =>
            `- ${e.allDay ? "[All day]" : `[${new Date(e.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}]`} ${e.title} (${e.source})`
        )
        .join("\n")
    : "No events scheduled today."
}

## Ramez's Active Tasks (${activeTasks.length})
${
  activeTasks.length > 0
    ? activeTasks
        .map(
          (t) =>
            `- [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}${t.description ? `: ${t.description}` : ""}`
        )
        .join("\n")
    : "No active tasks."
}

## Ramez's Notes (${recentNotes.length})
${
  recentNotes.length > 0
    ? recentNotes
        .map(
          (n) =>
            `- ${n.pinned ? "📌 " : ""}${n.title}${n.content ? `: ${n.content.slice(0, 80)}...` : ""}`
        )
        .join("\n")
    : "No notes yet."
}

## Your capabilities
You can help Ramez by:
- Creating, completing, and listing tasks using the provided tools
- Checking and creating calendar events
- Answering questions about his schedule, tasks, and notes
- Helping him plan his day and prioritize
- General knowledge questions and brainstorming

## Guidelines
- Be concise — no fluff, get to the point
- Use tools proactively when Ramez asks to create or manage tasks/events
- When listing tasks or events, format them cleanly
- Be warm but efficient — think Apple Siri at its best
- Use markdown formatting when helpful`
}
