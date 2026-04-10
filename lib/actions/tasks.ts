"use server"

import { db } from "@/lib/db"
import { tasks, calendarEvents } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { createGoogleCalendarEvent } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function createTask(formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const dueDate = (formData.get("dueDate") as string) || null
  const addToCalendar = formData.get("addToCalendar") === "true"
  const calendarId = (formData.get("calendarId") as string) || null

  await db.insert(tasks).values({
    id: nanoid(),
    title: title.trim(),
    description: (formData.get("description") as string) || null,
    priority: (formData.get("priority") as "low" | "medium" | "high") ?? "medium",
    dueDate,
    createdAt: now,
    updatedAt: now,
  })

  // Add to calendar if requested and has a due date
  if (addToCalendar && dueDate) {
    const startTime = `${dueDate}T09:00`
    const endTime = `${dueDate}T10:00`
    let googleEventId: string | null = null
    let googleCalendarId: string | null = null

    if (calendarId && calendarId !== "local") {
      const connected = await isGoogleConnected()
      if (connected) {
        try {
          const gEvent = await createGoogleCalendarEvent({
            title: title.trim(),
            description: (formData.get("description") as string) || undefined,
            startTime,
            endTime,
            calendarId,
          })
          googleEventId = gEvent.id || null
          googleCalendarId = calendarId
        } catch {
          // Fall back to local only
        }
      }
    }

    await db.insert(calendarEvents).values({
      id: nanoid(),
      title: title.trim(),
      description: (formData.get("description") as string) || null,
      notes: null,
      startTime,
      endTime,
      allDay: false,
      color: "#7986cb",
      googleEventId,
      googleCalendarId,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath("/calendar")
  }

  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function updateTask(id: string, formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  await db
    .update(tasks)
    .set({
      title: title.trim(),
      description: (formData.get("description") as string) || null,
      priority: (formData.get("priority") as "low" | "medium" | "high") ?? "medium",
      dueDate: (formData.get("dueDate") as string) || null,
      updatedAt: now,
    })
    .where(eq(tasks.id, id))

  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function toggleTask(id: string) {
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) return

  const newStatus = task.status === "done" ? "todo" : "done"

  await db
    .update(tasks)
    .set({ status: newStatus, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id))

  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id))
  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function getTasks() {
  return db.select().from(tasks).orderBy(tasks.createdAt).all()
}
