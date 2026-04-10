"use server"

import { db } from "@/lib/db"
import { localCalendars } from "@/lib/schema"
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
  await db.delete(localCalendars).where(eq(localCalendars.id, id))
  revalidatePath("/calendar")
}

export async function getLocalCalendars() {
  return db.select().from(localCalendars).all()
}
