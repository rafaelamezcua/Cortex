import { google } from "googleapis"
import { getGoogleClient } from "./google-auth"

interface GoogleEvent {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  color: string | null
  source: "google"
}

const colorMap: Record<string, string> = {
  "1": "#7986cb", // Lavender
  "2": "#33b679", // Sage
  "3": "#8e24aa", // Grape
  "4": "#e67c73", // Flamingo
  "5": "#f6bf26", // Banana
  "6": "#f4511e", // Tangerine
  "7": "#039be5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3f51b5", // Blueberry
  "10": "#0b8043", // Basil
  "11": "#d50000", // Tomato
}

export async function getGoogleCalendarEvents(
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const auth = await getGoogleClient()
  if (!auth) return []

  try {
    const calendar = google.calendar({ version: "v3", auth })
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    })

    const events = response.data.items || []

    return events.map((event) => {
      const allDay = !!event.start?.date
      return {
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
        color: event.colorId ? (colorMap[event.colorId] || "#0071e3") : "#0071e3",
        source: "google" as const,
      }
    })
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
}) {
  const auth = await getGoogleClient()
  if (!auth) throw new Error("Google not connected")

  const calendar = google.calendar({ version: "v3", auth })

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
    calendarId: "primary",
    requestBody: body,
  })

  return response.data
}
