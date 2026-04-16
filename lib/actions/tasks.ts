"use server"

import { db } from "@/lib/db"
import { tasks, calendarEvents } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { createGoogleCalendarEvent } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { evaluateTrigger } from "@/lib/actions/rules"
import { storeEmbedding, deleteEmbedding } from "@/lib/semantic"

function indexTask(
  id: string,
  title: string,
  description: string | null | undefined,
) {
  const text = [title, description ?? ""].filter(Boolean).join("\n\n")
  void Promise.resolve().then(() => storeEmbedding("task", id, text).catch(() => {}))
}

type Recurrence =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "biweekly"
  | "monthly"
  | null

function parseRecurrence(raw: FormDataEntryValue | null): Recurrence {
  const v = (raw as string) || ""
  if (!v || v === "none") return null
  if (["daily", "weekdays", "weekly", "biweekly", "monthly"].includes(v)) {
    return v as Recurrence
  }
  return null
}

// Advance a YYYY-MM-DD date string by the recurrence rule.
function advanceDate(dueDate: string, recurrence: Recurrence): string | null {
  if (!recurrence || recurrence === "none") return null
  const d = new Date(dueDate + "T12:00:00")
  switch (recurrence) {
    case "daily":
      d.setDate(d.getDate() + 1)
      break
    case "weekdays": {
      // Skip Sat / Sun
      do {
        d.setDate(d.getDate() + 1)
      } while (d.getDay() === 0 || d.getDay() === 6)
      break
    }
    case "weekly":
      d.setDate(d.getDate() + 7)
      break
    case "biweekly":
      d.setDate(d.getDate() + 14)
      break
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    default:
      return null
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function createTask(formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const dueDate = (formData.get("dueDate") as string) || null
  const addToCalendar = formData.get("addToCalendar") === "true"
  const calendarId = (formData.get("calendarId") as string) || null
  const recurrence = parseRecurrence(formData.get("recurrence"))
  const parentId = (formData.get("parentId") as string) || null

  const newTaskId = nanoid()
  const newTaskDescription = (formData.get("description") as string) || null
  await db.insert(tasks).values({
    id: newTaskId,
    title: title.trim(),
    description: newTaskDescription,
    priority: (formData.get("priority") as "low" | "medium" | "high") ?? "medium",
    dueDate,
    recurrence,
    parentId,
    createdAt: now,
    updatedAt: now,
  })

  // Add to calendar if requested and has a due date
  if (addToCalendar && dueDate) {
    const startTime = `${dueDate}T09:00`
    const endTime = `${dueDate}T10:00`
    let googleEventId: string | null = null
    let googleCalendarId: string | null = null
    let localCalendarId: string | null = null

    if (calendarId?.startsWith("local-")) {
      localCalendarId = calendarId
    } else if (calendarId && calendarId !== "local") {
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
      localCalendarId,
      createdAt: now,
      updatedAt: now,
    })

    revalidatePath("/calendar")
  }

  revalidatePath("/tasks")
  revalidatePath("/")
  indexTask(newTaskId, title.trim(), newTaskDescription)
}

export async function updateTask(id: string, formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const prev = await db.select().from(tasks).where(eq(tasks.id, id)).get()

  const updates: Record<string, unknown> = {
    title: title.trim(),
    description: (formData.get("description") as string) || null,
    priority: (formData.get("priority") as "low" | "medium" | "high") ?? "medium",
    dueDate: (formData.get("dueDate") as string) || null,
    updatedAt: now,
  }

  // Optional recurrence update
  if (formData.has("recurrence")) {
    updates.recurrence = parseRecurrence(formData.get("recurrence"))
  }

  // Allow status update from modal
  const status = formData.get("status") as string | null
  if (status && ["todo", "in_progress", "done"].includes(status)) {
    updates.status = status
  }

  await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))

  // Fire rules engine when status actually changed.
  if (
    prev &&
    typeof updates.status === "string" &&
    updates.status !== prev.status
  ) {
    const next = await db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (next) {
      await evaluateTrigger("task.status_changed", {
        taskId: id,
        fromStatus: prev.status,
        toStatus: next.status,
        task: {
          id: next.id,
          title: next.title,
          description: next.description,
          priority: next.priority,
          status: next.status,
          dueDate: next.dueDate,
        },
      })
    }
  }

  revalidatePath("/tasks")
  revalidatePath("/")
  indexTask(
    id,
    title.trim(),
    (updates.description as string | null | undefined) ?? null,
  )
}

export async function toggleTask(id: string) {
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!task) return

  const newStatus = task.status === "done" ? "todo" : "done"
  const now = new Date().toISOString()

  await db
    .update(tasks)
    .set({ status: newStatus, updatedAt: now })
    .where(eq(tasks.id, id))

  // Parent auto-complete / uncomplete propagation when a subtask changes.
  if (task.parentId) {
    const siblings = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentId, task.parentId))
      .all()
    const allDone =
      siblings.length > 0 && siblings.every((s) => s.status === "done")
    const parent = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, task.parentId))
      .get()
    if (parent) {
      if (allDone && parent.status !== "done") {
        await db
          .update(tasks)
          .set({ status: "done", updatedAt: now })
          .where(eq(tasks.id, parent.id))
      } else if (!allDone && parent.status === "done") {
        await db
          .update(tasks)
          .set({ status: "todo", updatedAt: now })
          .where(eq(tasks.id, parent.id))
      }
    }
  }

  // Recurring spawn: only on completion with a recurrence + a due date.
  if (
    newStatus === "done" &&
    task.recurrence &&
    task.recurrence !== "none" &&
    task.dueDate
  ) {
    const nextDue = advanceDate(task.dueDate, task.recurrence as Recurrence)
    if (nextDue) {
      await db.insert(tasks).values({
        id: nanoid(),
        title: task.title,
        description: task.description,
        status: "todo",
        priority: task.priority,
        dueDate: nextDue,
        order: task.order,
        recurrence: task.recurrence,
        parentId: null,
        isTemplate: false,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  await evaluateTrigger("task.status_changed", {
    taskId: id,
    fromStatus: task.status,
    toStatus: newStatus,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: newStatus,
      dueDate: task.dueDate,
    },
  })

  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function deleteTask(id: string) {
  // Capture subtask ids so we can evict their embeddings too.
  const subtaskIds = (
    await db.select().from(tasks).where(eq(tasks.parentId, id)).all()
  ).map((t) => t.id)

  // Delete subtasks first
  await db.delete(tasks).where(eq(tasks.parentId, id))
  await db.delete(tasks).where(eq(tasks.id, id))
  revalidatePath("/tasks")
  revalidatePath("/")

  void Promise.resolve().then(async () => {
    try {
      await deleteEmbedding("task", id)
      for (const sid of subtaskIds) await deleteEmbedding("task", sid)
    } catch {
      // Swallow; embedding cleanup isn't critical.
    }
  })
}

export async function getTasks() {
  // Non-template tasks only. Includes both parents and subtasks — the UI
  // composes the tree client-side via parentId.
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.isTemplate, false))
    .orderBy(tasks.createdAt)
    .all()
}

export async function getTaskTemplates() {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.isTemplate, true))
    .orderBy(tasks.createdAt)
    .all()
}

// ---------- Subtasks ----------

export async function addSubtask(parentId: string, title: string) {
  if (!title?.trim()) return
  const parent = await db.select().from(tasks).where(eq(tasks.id, parentId)).get()
  if (!parent) return

  const now = new Date().toISOString()
  await db.insert(tasks).values({
    id: nanoid(),
    title: title.trim(),
    priority: parent.priority,
    parentId,
    isTemplate: parent.isTemplate,
    createdAt: now,
    updatedAt: now,
  })

  // Re-opening parent if it was complete — a new child means work to do.
  if (parent.status === "done") {
    await db
      .update(tasks)
      .set({ status: "todo", updatedAt: now })
      .where(eq(tasks.id, parentId))
  }

  revalidatePath("/tasks")
  revalidatePath("/")
}

// ---------- Templates ----------

export async function saveTaskAsTemplate(id: string) {
  const root = await db.select().from(tasks).where(eq(tasks.id, id)).get()
  if (!root) return

  const now = new Date().toISOString()
  const newRootId = nanoid()

  await db.insert(tasks).values({
    id: newRootId,
    title: root.title,
    description: root.description,
    status: "todo",
    priority: root.priority,
    dueDate: null,
    order: root.order,
    recurrence: root.recurrence,
    parentId: null,
    isTemplate: true,
    createdAt: now,
    updatedAt: now,
  })

  // Clone subtasks as template children
  const children = await db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, id))
    .all()
  for (const child of children) {
    await db.insert(tasks).values({
      id: nanoid(),
      title: child.title,
      description: child.description,
      status: "todo",
      priority: child.priority,
      dueDate: null,
      order: child.order,
      recurrence: null,
      parentId: newRootId,
      isTemplate: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  revalidatePath("/tasks")
}

export async function useTaskTemplate(templateId: string, dueDate?: string) {
  const template = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, templateId), eq(tasks.isTemplate, true)))
    .get()
  if (!template) return

  const now = new Date().toISOString()
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })()
  const targetDue = dueDate || todayStr

  const newRootId = nanoid()
  await db.insert(tasks).values({
    id: newRootId,
    title: template.title,
    description: template.description,
    status: "todo",
    priority: template.priority,
    dueDate: targetDue,
    order: template.order,
    recurrence: template.recurrence,
    parentId: null,
    isTemplate: false,
    createdAt: now,
    updatedAt: now,
  })

  const children = await db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, templateId))
    .all()

  for (const child of children) {
    await db.insert(tasks).values({
      id: nanoid(),
      title: child.title,
      description: child.description,
      status: "todo",
      priority: child.priority,
      dueDate: null,
      order: child.order,
      recurrence: null,
      parentId: newRootId,
      isTemplate: false,
      createdAt: now,
      updatedAt: now,
    })
  }

  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function deleteTaskTemplate(id: string) {
  await db.delete(tasks).where(eq(tasks.parentId, id))
  await db.delete(tasks).where(eq(tasks.id, id))
  revalidatePath("/tasks")
}
