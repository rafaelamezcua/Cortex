"use server"

import { db } from "@/lib/db"
import { journalEntries } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { storeEmbedding } from "@/lib/semantic"

function indexJournal(id: string, content: string | null | undefined) {
  void Promise.resolve().then(() =>
    storeEmbedding("journal", id, content ?? "").catch(() => {}),
  )
}

export async function saveJournalEntry(date: string, content: string, mood?: number) {
  const existing = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.date, date))
    .get()

  const now = new Date().toISOString()

  let id: string
  if (existing) {
    id = existing.id
    await db
      .update(journalEntries)
      .set({
        content,
        mood: mood ?? existing.mood,
        updatedAt: now,
      })
      .where(eq(journalEntries.id, existing.id))
  } else {
    id = nanoid()
    await db.insert(journalEntries).values({
      id,
      date,
      content,
      mood: mood ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  revalidatePath("/journal")
  revalidatePath("/")
  indexJournal(id, content)
}

export async function getJournalEntry(date: string) {
  return db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.date, date))
    .get()
}

export async function getRecentJournalEntries(limit = 7) {
  return db
    .select()
    .from(journalEntries)
    .orderBy(journalEntries.date)
    .limit(limit)
    .all()
}
