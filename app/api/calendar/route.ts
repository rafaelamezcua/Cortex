import { getEventsForRange } from "@/lib/actions/calendar"
import { getGoogleCalendarEvents } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

type MergedEvent = {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  color: string | null
  source: "local" | "google"
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
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
    color: e.color,
    source: "local",
  }))

  const connected = await isGoogleConnected()
  if (connected) {
    try {
      const googleEvents = await getGoogleCalendarEvents(
        new Date(start).toISOString(),
        new Date(end).toISOString()
      )
      events.push(
        ...googleEvents.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          startTime: e.startTime,
          endTime: e.endTime,
          allDay: e.allDay,
          color: e.color,
          source: "google" as const,
        }))
      )
    } catch {
      // Fall back to local events only
    }
  }

  events.sort((a, b) => a.startTime.localeCompare(b.startTime))

  return Response.json({ events })
}
