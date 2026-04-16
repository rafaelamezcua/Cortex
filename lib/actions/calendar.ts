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
import { storeEmbedding, deleteEmbedding } from "@/lib/semantic"

function indexEvent(
  id: string,
  title: string,
  description: string | null | undefined,
  notes: string | null | undefined,
) {
  const text = [title, description ?? "", notes ?? ""]
    .filter(Boolean)
    .join("\n\n")
  void Promise.resolve().then(() =>
    storeEmbedding("event", id, text).catch(() => {}),
  )
}

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
  const localCalendarId = (formData.get("localCalendarId") as string) || null

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

  const recurrence = (formData.get("recurrence") as string) || "none"

  // Generate event instances
  const instances = generateRecurrenceInstances(
    startTime,
    endTime || startTime,
    recurrence
  )

  const createdIds: string[] = []
  for (const instance of instances) {
    const instanceId = nanoid()
    createdIds.push(instanceId)
    await db.insert(calendarEvents).values({
      id: instanceId,
      title: title.trim(),
      description,
      notes,
      startTime: instance.start,
      endTime: instance.end,
      allDay,
      color,
      googleEventId,
      googleCalendarId,
      localCalendarId,
      recurrence: recurrence !== "none" ? recurrence : null,
      createdAt: now,
      updatedAt: now,
    })
  }

  revalidatePath("/calendar")
  revalidatePath("/")
  for (const cid of createdIds) indexEvent(cid, title.trim(), description, notes)
}

function generateRecurrenceInstances(
  startTime: string,
  endTime: string,
  recurrence: string
): { start: string; end: string }[] {
  if (recurrence === "none") {
    return [{ start: startTime, end: endTime }]
  }

  const instances: { start: string; end: string }[] = []
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = end.getTime() - start.getTime()

  // Generate for 3 months
  const limit = new Date(start)
  limit.setMonth(limit.getMonth() + 3)

  const cursor = new Date(start)

  while (cursor <= limit) {
    const instanceEnd = new Date(cursor.getTime() + durationMs)
    instances.push({
      start: formatLocalDateTime(cursor),
      end: formatLocalDateTime(instanceEnd),
    })

    switch (recurrence) {
      case "daily":
        cursor.setDate(cursor.getDate() + 1)
        break
      case "weekdays":
        do {
          cursor.setDate(cursor.getDate() + 1)
        } while (cursor.getDay() === 0 || cursor.getDay() === 6)
        break
      case "weekly":
        cursor.setDate(cursor.getDate() + 7)
        break
      case "biweekly":
        cursor.setDate(cursor.getDate() + 14)
        break
      case "monthly":
        cursor.setMonth(cursor.getMonth() + 1)
        break
      default:
        return instances
    }
  }

  return instances
}

function formatLocalDateTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
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
  indexEvent(
    id,
    title.trim(),
    (formData.get("description") as string) || null,
    notes,
  )
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
  void Promise.resolve().then(() =>
    deleteEmbedding("event", id).catch(() => {}),
  )
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
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  return getEventsForDate(today)
}

export async function getEvent(id: string) {
  return db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get()
}
