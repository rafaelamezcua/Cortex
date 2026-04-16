"use server"

import { db } from "@/lib/db"
import { localCalendars, calendarEvents, projectTasks } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

export async function createLocalCalendar(name: string, color: string) {
  const id = nanoid()
  await db.insert(localCalendars).values({
    id,
    name,
    color,
    createdAt: new Date().toISOString(),
  })
  revalidatePath("/calendar")
  return id
}

export async function deleteLocalCalendar(id: string) {
  const prefixed = `local-${id}`
  await db.delete(calendarEvents).where(eq(calendarEvents.localCalendarId, prefixed))
  await db.update(projectTasks).set({ calendarId: null }).where(eq(projectTasks.calendarId, prefixed))
  await db.delete(localCalendars).where(eq(localCalendars.id, id))
  revalidatePath("/calendar")
  revalidatePath("/projects")
}

export async function getLocalCalendars() {
  return db.select().from(localCalendars).all()
}
