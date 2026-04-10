import { getEventsForRange } from "@/lib/actions/calendar"

function toICSDate(dateStr: string, allDay: boolean): string {
  const d = new Date(dateStr)
  if (allDay) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}${m}${day}`
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const calendarId = searchParams.get("calendarId") || "local"
  const calendarName = searchParams.get("name") || "Luma Calendar"

  // Get all events for a wide range
  const now = new Date()
  const start = new Date(now.getFullYear() - 1, 0, 1).toISOString()
  const end = new Date(now.getFullYear() + 1, 11, 31).toISOString()

  const allEvents = await getEventsForRange(start, end)

  // Filter by calendar if needed
  const events = calendarId === "local"
    ? allEvents.filter((e) => !e.googleCalendarId)
    : allEvents.filter((e) => e.googleCalendarId === calendarId || (!e.googleCalendarId && calendarId === "local"))

  // Build ICS
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Luma//Calendar//EN`,
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const event of events) {
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${event.id}@luma`)
    lines.push(`SUMMARY:${escapeICS(event.title)}`)

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toICSDate(event.startTime, true)}`)
      lines.push(`DTEND;VALUE=DATE:${toICSDate(event.endTime, true)}`)
    } else {
      lines.push(`DTSTART:${toICSDate(event.startTime, false)}`)
      lines.push(`DTEND:${toICSDate(event.endTime, false)}`)
    }

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
    }

    lines.push(`CREATED:${toICSDate(event.createdAt, false)}`)
    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")

  const ics = lines.join("\r\n")

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${calendarName.replace(/\s/g, "_")}.ics"`,
    },
  })
}
