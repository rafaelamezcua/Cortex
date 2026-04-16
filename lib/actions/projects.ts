"use server"

import { db } from "@/lib/db"
import { projects, projectTasks, calendarEvents } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { createGoogleCalendarEvent } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string
  if (!name?.trim()) return

  const now = new Date().toISOString()
  await db.insert(projects).values({
    id: nanoid(),
    name: name.trim(),
    description: (formData.get("description") as string) || null,
    color: (formData.get("color") as string) || "#7986cb",
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/projects")
  revalidatePath("/")
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; status?: "active" | "paused" | "completed" }
) {
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (data.name) updates.name = data.name
  if (data.description !== undefined) updates.description = data.description
  if (data.status) updates.status = data.status

  await db.update(projects).set(updates).where(eq(projects.id, id))
  revalidatePath("/projects")
}

export async function deleteProject(id: string) {
  await db.delete(projectTasks).where(eq(projectTasks.projectId, id))
  await db.delete(projects).where(eq(projects.id, id))
  revalidatePath("/projects")
  revalidatePath("/")
}

export async function getProjects() {
  return db.select().from(projects).orderBy(desc(projects.updatedAt)).all()
}

export async function getProject(id: string) {
  return db.select().from(projects).where(eq(projects.id, id)).get()
}

export async function addProjectTask(
  projectId: string,
  title: string,
  opts?: { dueDate?: string; calendarId?: string }
) {
  if (!title?.trim()) return
  const now = new Date().toISOString()
  const taskId = nanoid()
  const dueDate = opts?.dueDate || null
  const calendarId = opts?.calendarId || null

  await db.insert(projectTasks).values({
    id: taskId,
    projectId,
    title: title.trim(),
    dueDate,
    calendarId,
    createdAt: now,
    updatedAt: now,
  })
  await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId))

  // Create calendar event if date + calendar both set
  if (dueDate && calendarId) {
    const isLocalCal = calendarId.startsWith("local-")
    const isGenericLocal = calendarId === "local"
    const startTime = `${dueDate}T09:00`
    const endTime = `${dueDate}T10:00`
    let googleEventId: string | null = null

    if (!isLocalCal && !isGenericLocal) {
      const connected = await isGoogleConnected()
      if (connected) {
        try {
          const gEvent = await createGoogleCalendarEvent({
            title: title.trim(),
            startTime,
            endTime,
            calendarId,
          })
          googleEventId = gEvent.id || null
        } catch {
          /* fall back to local */
        }
      }
    }

    await db.insert(calendarEvents).values({
      id: nanoid(),
      title: title.trim(),
      description: null,
      notes: null,
      startTime,
      endTime,
      allDay: false,
      color: "#7986cb",
      googleEventId,
      googleCalendarId: !isLocalCal && !isGenericLocal ? calendarId : null,
      localCalendarId: isLocalCal ? calendarId : null,
      recurrence: null,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath("/calendar")
  }

  revalidatePath("/projects")
  return taskId
}

export async function updateProjectTask(
  id: string,
  data: {
    title?: string
    status?: "todo" | "in_progress" | "done"
    description?: string
    dueDate?: string
    calendarId?: string
  }
) {
  const task = await db.select().from(projectTasks).where(eq(projectTasks.id, id)).get()
  if (!task) return

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (data.title) updates.title = data.title
  if (data.status) updates.status = data.status
  if (data.description !== undefined) updates.description = data.description
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate || null
  if (data.calendarId !== undefined) updates.calendarId = data.calendarId || null

  await db.update(projectTasks).set(updates).where(eq(projectTasks.id, id))

  // Create calendar event if calendar assigned and due date set
  if (data.calendarId && data.dueDate && data.calendarId !== task.calendarId) {
    const now = new Date().toISOString()
    const taskTitle = data.title || task.title
    const startTime = `${data.dueDate}T09:00`
    const endTime = `${data.dueDate}T10:00`

    // "local" or "local-*" are app-local calendars. Anything else is Google.
    const isLocalCal = data.calendarId.startsWith("local-")
    const isGenericLocal = data.calendarId === "local"
    let googleEventId: string | null = null

    if (!isLocalCal && !isGenericLocal) {
      const connected = await isGoogleConnected()
      if (connected) {
        try {
          const gEvent = await createGoogleCalendarEvent({
            title: taskTitle,
            description: data.description || task.description || undefined,
            startTime,
            endTime,
            calendarId: data.calendarId,
          })
          googleEventId = gEvent.id || null
        } catch {
          /* fall back to local */
        }
      }
    }

    await db.insert(calendarEvents).values({
      id: nanoid(),
      title: taskTitle,
      description: data.description || task.description || null,
      notes: null,
      startTime,
      endTime,
      allDay: false,
      color: "#7986cb",
      googleEventId,
      googleCalendarId: !isLocalCal && !isGenericLocal ? data.calendarId : null,
      localCalendarId: isLocalCal ? data.calendarId : null,
      recurrence: null,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath("/calendar")
  }

  revalidatePath("/projects")
}

export async function deleteProjectTask(id: string) {
  await db.delete(projectTasks).where(eq(projectTasks.id, id))
  revalidatePath("/projects")
}

export async function getProjectTasks(projectId: string) {
  return db
    .select()
    .from(projectTasks)
    .where(eq(projectTasks.projectId, projectId))
    .orderBy(projectTasks.order)
    .all()
}
