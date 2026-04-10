import { db } from "@/lib/db"
import { calendarEvents } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { createGoogleCalendarEvent } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function POST(request: Request) {
  const { eventId, googleCalendarId } = await request.json()

  if (!eventId || !googleCalendarId) {
    return Response.json({ error: "Missing eventId or googleCalendarId" }, { status: 400 })
  }

  const connected = await isGoogleConnected()
  if (!connected) {
    return Response.json({ error: "Google not connected" }, { status: 401 })
  }

  const event = await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)).get()
  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 })
  }

  try {
    const gEvent = await createGoogleCalendarEvent({
      title: event.title,
      description: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      calendarId: googleCalendarId,
    })

    // Update local event with Google link
    await db
      .update(calendarEvents)
      .set({
        googleEventId: gEvent.id,
        googleCalendarId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(calendarEvents.id, eventId))

    return Response.json({ success: true, googleEventId: gEvent.id })
  } catch (e) {
    return Response.json({ error: "Failed to sync to Google" }, { status: 500 })
  }
}
