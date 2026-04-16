"use server"

import { db } from "@/lib/db"
import { memories } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import type { MemoryCategory } from "@/lib/memories-types"

export async function getMemories() {
  return db.select().from(memories).orderBy(memories.updatedAt).all()
}

export async function createMemory(
  category: MemoryCategory,
  content: string
) {
  const trimmed = content.trim()
  if (!trimmed) return

  const now = new Date().toISOString()
  await db.insert(memories).values({
    id: nanoid(),
    category,
    content: trimmed,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/memories")
}

export async function updateMemory(id: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return

  await db
    .update(memories)
    .set({ content: trimmed, updatedAt: new Date().toISOString() })
    .where(eq(memories.id, id))

  revalidatePath("/memories")
}

export async function deleteMemory(id: string) {
  await db.delete(memories).where(eq(memories.id, id))
  revalidatePath("/memories")
}
