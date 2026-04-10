"use server"

import { db } from "@/lib/db"
import { journalEntries } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

export async function saveJournalEntry(date: string, content: string, mood?: number) {
  const existing = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.date, date))
    .get()

  const now = new Date().toISOString()

  if (existing) {
    await db
      .update(journalEntries)
      .set({
        content,
        mood: mood ?? existing.mood,
        updatedAt: now,
      })
      .where(eq(journalEntries.id, existing.id))
  } else {
    await db.insert(journalEntries).values({
      id: nanoid(),
      date,
      content,
      mood: mood ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  revalidatePath("/journal")
  revalidatePath("/")
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
