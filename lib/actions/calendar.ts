"use server"

import { db } from "@/lib/db"
import { calendarEvents } from "@/lib/schema"
import { eq, and, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function createEvent(formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const allDay = formData.get("allDay") === "on"
  const color = (formData.get("color") as string) || null
  const description = (formData.get("description") as string) || null
  const notes = (formData.get("notes") as string) || null
  const googleCalendarId = (formData.get("googleCalendarId") as string) || null

  let googleEventId: string | null = null

  // If a Google Calendar is selected, create the event there
  if (googleCalendarId) {
    const connected = await isGoogleConnected()
    if (connected) {
      try {
        const gEvent = await createGoogleCalendarEvent({
          title: title.trim(),
          description: description || undefined,
          startTime,
          endTime: endTime || startTime,
          allDay,
          calendarId: googleCalendarId,
        })
        googleEventId = gEvent.id || null
      } catch {
        // Fall back to local-only
      }
    }
  }

  // Always save locally too
  await db.insert(calendarEvents).values({
    id: nanoid(),
    title: title.trim(),
    description,
    notes,
    startTime,
    endTime: endTime || startTime,
    allDay,
    color,
    googleEventId,
    googleCalendarId,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/calendar")
  revalidatePath("/")
}

export async function updateEvent(id: string, formData: FormData) {
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const notes = (formData.get("notes") as string) || null

  await db
    .update(calendarEvents)
    .set({
      title: title.trim(),
      description: (formData.get("description") as string) || null,
      notes,
      startTime: formData.get("startTime") as string,
      endTime: (formData.get("endTime") as string) || (formData.get("startTime") as string),
      allDay: formData.get("allDay") === "on",
      color: (formData.get("color") as string) || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(calendarEvents.id, id))

  // Sync to Google if linked
  const event = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get()
  if (event?.googleEventId && event.googleCalendarId) {
    const connected = await isGoogleConnected()
    if (connected) {
      try {
        await updateGoogleCalendarEvent({
          googleEventId: event.googleEventId,
          title: title.trim(),
          description: (formData.get("description") as string) || undefined,
          startTime: formData.get("startTime") as string,
          endTime: (formData.get("endTime") as string) || (formData.get("startTime") as string),
          allDay: formData.get("allDay") === "on",
          calendarId: event.googleCalendarId,
        })
      } catch {
        // Local update already done
      }
    }
  }

  revalidatePath("/calendar")
  revalidatePath("/")
}

export async function deleteEvent(id: string) {
  // Delete from Google if linked
  const event = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get()
  if (event?.googleEventId && event.googleCalendarId) {
    const connected = await isGoogleConnected()
    if (connected) {
      try {
        await deleteGoogleCalendarEvent(event.googleEventId, event.googleCalendarId)
      } catch {
        // Continue with local delete
      }
    }
  }

  await db.delete(calendarEvents).where(eq(calendarEvents.id, id))
  revalidatePath("/calendar")
  revalidatePath("/")
}

export async function getEventsForRange(start: string, end: string) {
  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        lte(calendarEvents.startTime, end),
        gte(calendarEvents.endTime, start)
      )
    )
    .orderBy(calendarEvents.startTime)
    .all()
}

export async function getEventsForDate(date: string) {
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`
  return getEventsForRange(dayStart, dayEnd)
}

export async function getTodaysEvents() {
  const today = new Date().toISOString().split("T")[0]
  return getEventsForDate(today)
}

export async function getEvent(id: string) {
  return db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get()
}
