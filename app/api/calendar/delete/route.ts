import { db } from "@/lib/db"
import { calendarEvents } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { deleteGoogleCalendarEvent } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function POST(request: Request) {
  const { eventId, calendarId } = await request.json()

  if (!eventId) {
    return Response.json({ error: "Missing eventId" }, { status: 400 })
  }

  // Google-only event (not in local DB)
  if (eventId.startsWith("gcal-")) {
    const connected = await isGoogleConnected()
    if (connected) {
      try {
        await deleteGoogleCalendarEvent(eventId, calendarId || "primary")
        return Response.json({ success: true })
      } catch {
        return Response.json({ error: "Failed to delete from Google" }, { status: 500 })
      }
    }
    return Response.json({ error: "Google not connected" }, { status: 401 })
  }

  // Local event — check if it also exists on Google
  const event = await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)).get()

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 })
  }

  // Delete from Google if linked
  if (event.googleEventId && event.googleCalendarId) {
    const connected = await isGoogleConnected()
    if (connected) {
      try {
        await deleteGoogleCalendarEvent(event.googleEventId, event.googleCalendarId)
      } catch {
        // Continue with local delete
      }
    }
  }

  // Delete locally
  await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId))

  return Response.json({ success: true })
}
