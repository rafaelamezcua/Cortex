"use server"

import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type BulkAction =
  | { kind: "archive" }
  | { kind: "delete" }
  | { kind: "setDueDate"; dueDate: string | null }
  | { kind: "setPriority"; priority: "low" | "medium" | "high" }
  | { kind: "setStatus"; status: "todo" | "in_progress" | "done" }

export async function batchUpdateTasks(
  ids: string[],
  action: BulkAction,
): Promise<{ ok: true; affected: number }> {
  const cleanIds = ids.filter((id) => typeof id === "string" && id.length > 0)
  if (cleanIds.length === 0) return { ok: true, affected: 0 }

  const now = new Date().toISOString()

  switch (action.kind) {
    case "archive":
      await db
        .update(tasks)
        .set({ archivedAt: now, updatedAt: now })
        .where(inArray(tasks.id, cleanIds))
      break
    case "delete":
      // Cascade delete subtasks of any selected task
      await db.delete(tasks).where(inArray(tasks.parentId, cleanIds))
      await db.delete(tasks).where(inArray(tasks.id, cleanIds))
      break
    case "setDueDate":
      await db
        .update(tasks)
        .set({ dueDate: action.dueDate, updatedAt: now })
        .where(inArray(tasks.id, cleanIds))
      break
    case "setPriority":
      await db
        .update(tasks)
        .set({ priority: action.priority, updatedAt: now })
        .where(inArray(tasks.id, cleanIds))
      break
    case "setStatus":
      await db
        .update(tasks)
        .set({ status: action.status, updatedAt: now })
        .where(inArray(tasks.id, cleanIds))
      break
  }

  revalidatePath("/tasks")
  revalidatePath("/")
  return { ok: true, affected: cleanIds.length }
}
