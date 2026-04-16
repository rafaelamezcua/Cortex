"use server"

import { db } from "@/lib/db"
import { userSettings } from "@/lib/schema"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.key, key))
    .get()
  return row?.value ?? null
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {}
  const rows = await db
    .select()
    .from(userSettings)
    .where(inArray(userSettings.key, keys))
    .all()
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.key, key))
    .get()
  if (existing) {
    await db
      .update(userSettings)
      .set({ value, updatedAt: now })
      .where(eq(userSettings.key, key))
  } else {
    await db.insert(userSettings).values({ key, value, updatedAt: now })
  }
}

export async function saveNotificationSettings(input: {
  dailyBriefEnabled: boolean
  dailyBriefEmail: string
  weeklyDigestEnabled: boolean
  weeklyDigestEmail: string
}): Promise<void> {
  await setSetting("daily_brief_enabled", input.dailyBriefEnabled ? "1" : "0")
  await setSetting("daily_brief_email", input.dailyBriefEmail.trim())
  await setSetting("weekly_digest_enabled", input.weeklyDigestEnabled ? "1" : "0")
  await setSetting("weekly_digest_email", input.weeklyDigestEmail.trim())
  revalidatePath("/settings/notifications")
}
