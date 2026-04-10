"use server"

import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

export async function createTask(formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  await db.insert(tasks).values({
    id: nanoid(),
    title: title.trim(),
    description: (formData.get("description") as string) || null,
    priority: (formData.get("priority") as "low" | "medium" | "high") ?? "medium",
    dueDate: (formData.get("dueDate") as string) || null,
    createdAt: now,
    updatedAt: now,
  })

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
