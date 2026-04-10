"use server"

import { db } from "@/lib/db"
import { projects, projectTasks } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

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

export async function addProjectTask(projectId: string, title: string) {
  if (!title?.trim()) return
  const now = new Date().toISOString()
  await db.insert(projectTasks).values({
    id: nanoid(),
    projectId,
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
  })
  await db.update(projects).set({ updatedAt: now }).where(eq(projects.id, projectId))
  revalidatePath("/projects")
}

export async function updateProjectTask(
  id: string,
  data: { title?: string; status?: "todo" | "in_progress" | "done"; description?: string }
) {
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (data.title) updates.title = data.title
  if (data.status) updates.status = data.status
  if (data.description !== undefined) updates.description = data.description

  await db.update(projectTasks).set(updates).where(eq(projectTasks.id, id))
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
