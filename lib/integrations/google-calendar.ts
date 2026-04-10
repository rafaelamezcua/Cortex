import { google } from "googleapis"
import { getGoogleClient } from "./google-auth"

export interface GoogleEvent {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  color: string | null
  calendarId: string
  source: "google"
}

export interface GoogleCalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

const colorMap: Record<string, string> = {
  "1": "#7986cb",
  "2": "#33b679",
  "3": "#8e24aa",
  "4": "#e67c73",
  "5": "#f6bf26",
  "6": "#f4511e",
  "7": "#039be5",
  "8": "#616161",
  "9": "#3f51b5",
  "10": "#0b8043",
  "11": "#d50000",
}

export async function getGoogleCalendars(): Promise<GoogleCalendarInfo[]> {
  const auth = await getGoogleClient()
  if (!auth) return []

  try {
    const calendar = google.calendar({ version: "v3", auth })
    const response = await calendar.calendarList.list()
    const items = response.data.items || []

    return items
      .filter((c) => c.accessRole === "owner" || c.accessRole === "writer")
      .map((c) => ({
        id: c.id!,
        summary: c.summary || "Unnamed",
        backgroundColor: c.backgroundColor || "#7986cb",
        primary: c.primary || false,
      }))
  } catch {
    return []
  }
}

export async function getGoogleCalendarEvents(
  timeMin: string,
  timeMax: string,
  calendarId = "primary"
): Promise<GoogleEvent[]> {
  const auth = await getGoogleClient()
  if (!auth) return []

  try {
    const calendar = google.calendar({ version: "v3", auth })

    // Fetch from all writable calendars if using primary
    const calendars = calendarId === "primary"
      ? await getGoogleCalendars()
      : [{ id: calendarId, summary: "", backgroundColor: "#7986cb", primary: false }]

    const allEvents: GoogleEvent[] = []

    for (const cal of calendars) {
      try {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100,
        })

        const events = response.data.items || []
        for (const event of events) {
          const allDay = !!event.start?.date
          allEvents.push({
            id: `gcal-${event.id}`,
            title: event.summary || "Untitled",
            description: event.description || null,
            startTime: allDay
              ? `${event.start!.date}T00:00:00`
              : event.start!.dateTime!,
            endTime: allDay
              ? `${event.end!.date}T23:59:59`
              : event.end!.dateTime!,
            allDay,
            color: event.colorId
              ? colorMap[event.colorId] || cal.backgroundColor
              : cal.backgroundColor,
            calendarId: cal.id,
            source: "google",
          })
        }
      } catch {
        // Skip calendars that fail
      }
    }

    return allEvents.sort((a, b) => a.startTime.localeCompare(b.startTime))
  } catch {
    return []
  }
}

export async function createGoogleCalendarEvent(event: {
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay?: boolean
  calendarId?: string
}) {
  const auth = await getGoogleClient()
  if (!auth) throw new Error("Google not connected")

  const calendar = google.calendar({ version: "v3", auth })
  const calId = event.calendarId || "primary"

  const body = event.allDay
    ? {
        summary: event.title,
        description: event.description,
        start: { date: event.startTime.split("T")[0] },
        end: { date: event.endTime.split("T")[0] },
      }
    : {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
      }

  const response = await calendar.events.insert({
    calendarId: calId,
    requestBody: body,
  })

  return response.data
}

export async function updateGoogleCalendarEvent(event: {
  googleEventId: string
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay?: boolean
  calendarId?: string
}) {
  const auth = await getGoogleClient()
  if (!auth) throw new Error("Google not connected")

  const calendar = google.calendar({ version: "v3", auth })
  const calId = event.calendarId || "primary"
  const eventId = event.googleEventId.replace("gcal-", "")

  const body = event.allDay
    ? {
        summary: event.title,
        description: event.description,
        start: { date: event.startTime.split("T")[0] },
        end: { date: event.endTime.split("T")[0] },
      }
    : {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
      }

  const response = await calendar.events.update({
    calendarId: calId,
    eventId,
    requestBody: body,
  })

  return response.data
}

export async function deleteGoogleCalendarEvent(
  googleEventId: string,
  calendarId = "primary"
) {
  const auth = await getGoogleClient()
  if (!auth) throw new Error("Google not connected")

  const calendar = google.calendar({ version: "v3", auth })
  const eventId = googleEventId.replace("gcal-", "")

  await calendar.events.delete({
    calendarId,
    eventId,
  })
}
