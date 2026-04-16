import { getEventsForRange } from "@/lib/actions/calendar"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

type MergedEvent = {
  id: string
  title: string
  description: string | null
  notes: string | null
  startTime: string
  endTime: string
  allDay: boolean
  color: string | null
  source: "local" | "google"
  calendarId: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  if (!start || !end) {
    return Response.json({ error: "Missing start or end" }, { status: 400 })
  }

  const localEvents = await getEventsForRange(start, end)

  const events: MergedEvent[] = localEvents.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    notes: e.notes,
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
    color: e.color,
    source: e.googleCalendarId ? "google" : "local",
    calendarId: e.localCalendarId || e.googleCalendarId || "local",
  }))

  const connected = await isGoogleConnected()
  if (connected) {
    try {
      const googleEvents = await getGoogleCalendarEvents(
        new Date(start).toISOString(),
        new Date(end).toISOString()
      )
      // Only add Google events that don't already exist locally (by googleEventId)
      const localGoogleIds = new Set(
        localEvents
          .filter((e) => e.googleEventId)
          .map((e) => `gcal-${e.googleEventId}`)
      )

      for (const e of googleEvents) {
        if (!localGoogleIds.has(e.id)) {
          events.push({
            id: e.id,
            title: e.title,
            description: e.description,
            notes: null,
            startTime: e.startTime,
            endTime: e.endTime,
            allDay: e.allDay,
            color: e.color,
            source: "google",
            calendarId: e.calendarId,
          })
        }
      }
    } catch {
      // Fall back to local events only
    }
  }

  events.sort((a, b) => a.startTime.localeCompare(b.startTime))

  return Response.json({ events })
}
