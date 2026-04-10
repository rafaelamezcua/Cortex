"use server"

import { db } from "@/lib/db"
import { habits, habitLogs } from "@/lib/schema"
import { eq, and, desc, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

export async function createHabit(formData: FormData) {
  const name = formData.get("name") as string
  if (!name?.trim()) return

  await db.insert(habits).values({
    id: nanoid(),
    name: name.trim(),
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || "#7986cb",
    frequency: (formData.get("frequency") as "daily" | "weekdays" | "weekly") || "daily",
    targetPerDay: parseInt((formData.get("target") as string) || "1") || 1,
    createdAt: new Date().toISOString(),
  })

  revalidatePath("/habits")
  revalidatePath("/")
}

export async function deleteHabit(id: string) {
  await db.delete(habitLogs).where(eq(habitLogs.habitId, id))
  await db.delete(habits).where(eq(habits.id, id))
  revalidatePath("/habits")
  revalidatePath("/")
}

export async function logHabit(habitId: string, date: string) {
  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
    .get()

  if (existing) {
    // Increment count
    await db
      .update(habitLogs)
      .set({ count: existing.count + 1 })
      .where(eq(habitLogs.id, existing.id))
  } else {
    await db.insert(habitLogs).values({
      id: nanoid(),
      habitId,
      date,
      count: 1,
      createdAt: new Date().toISOString(),
    })
  }

  revalidatePath("/habits")
  revalidatePath("/")
}

export async function unlogHabit(habitId: string, date: string) {
  await db
    .delete(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))

  revalidatePath("/habits")
  revalidatePath("/")
}

export async function getHabits() {
  return db.select().from(habits).orderBy(habits.createdAt).all()
}

export async function getHabitLogs(startDate: string, endDate: string) {
  return db
    .select()
    .from(habitLogs)
    .where(and(gte(habitLogs.date, startDate), lte(habitLogs.date, endDate)))
    .all()
}

export async function getStreak(habitId: string): Promise<number> {
  const now = new Date()
  let streak = 0
  const cursor = new Date(now)

  for (let i = 0; i < 365; i++) {
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
    const log = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, dateStr)))
      .get()

    if (log) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else if (i === 0) {
      // Today not logged yet is ok, check yesterday
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
