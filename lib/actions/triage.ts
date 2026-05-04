"use server"

import { db } from "@/lib/db"
import { triageSuggestions, tasks } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"

export type TriageSuggestion = {
  id: string
  source: string
  sourceRefId: string | null
  kind: string
  title: string
  description: string | null
  suggestedDueDate: string | null
  suggestedPriority: string | null
  payload: string | null
  status: string
  createdAt: string
}

export async function getPendingSuggestions(limit = 10): Promise<TriageSuggestion[]> {
  return db
    .select()
    .from(triageSuggestions)
    .where(eq(triageSuggestions.status, "pending"))
    .orderBy(desc(triageSuggestions.createdAt))
    .limit(limit)
    .all()
}

export async function getPendingSuggestionCount(): Promise<number> {
  const all = await db
    .select()
    .from(triageSuggestions)
    .where(eq(triageSuggestions.status, "pending"))
    .all()
  return all.length
}

export async function acceptSuggestion(id: string) {
  const suggestion = await db
    .select()
    .from(triageSuggestions)
    .where(eq(triageSuggestions.id, id))
    .get()
  if (!suggestion || suggestion.status !== "pending") return { ok: false }

  const now = new Date().toISOString()

  // Currently we only support "task" kind. Extend here when wider triage lands.
  if (suggestion.kind === "task") {
    await db.insert(tasks).values({
      id: nanoid(),
      title: suggestion.title,
      description: suggestion.description ?? null,
      status: "todo",
      priority:
        (suggestion.suggestedPriority as "low" | "medium" | "high") ?? "medium",
      dueDate: suggestion.suggestedDueDate ?? null,
      createdAt: now,
      updatedAt: now,
    })
  }

  await db
    .update(triageSuggestions)
    .set({ status: "accepted", updatedAt: now })
    .where(eq(triageSuggestions.id, id))

  revalidatePath("/")
  revalidatePath("/tasks")
  return { ok: true }
}

export async function dismissSuggestion(id: string) {
  await db
    .update(triageSuggestions)
    .set({ status: "dismissed", updatedAt: new Date().toISOString() })
    .where(eq(triageSuggestions.id, id))
  revalidatePath("/")
  return { ok: true }
}

export async function dismissAllPending() {
  const now = new Date().toISOString()
  const pending = await db
    .select()
    .from(triageSuggestions)
    .where(eq(triageSuggestions.status, "pending"))
    .all()
  if (pending.length === 0) return { ok: true, count: 0 }
  for (const s of pending) {
    await db
      .update(triageSuggestions)
      .set({ status: "dismissed", updatedAt: now })
      .where(eq(triageSuggestions.id, s.id))
  }
  revalidatePath("/")
  return { ok: true, count: pending.length }
}

// Insert helper: skip if (source, sourceRefId) already exists in any state
// (avoid re-suggesting accepted/dismissed items).
export async function upsertSuggestion(input: {
  source: string
  sourceRefId: string | null
  kind: "task" | "event" | "note"
  title: string
  description: string | null
  suggestedDueDate: string | null
  suggestedPriority: "low" | "medium" | "high"
  payload?: Record<string, unknown> | null
}): Promise<{ ok: boolean; created: boolean; id?: string }> {
  if (input.sourceRefId) {
    const existing = await db
      .select()
      .from(triageSuggestions)
      .where(
        and(
          eq(triageSuggestions.source, input.source),
          eq(triageSuggestions.sourceRefId, input.sourceRefId),
        ),
      )
      .get()
    if (existing) return { ok: true, created: false, id: existing.id }
  }

  const id = nanoid()
  const now = new Date().toISOString()
  await db.insert(triageSuggestions).values({
    id,
    source: input.source,
    sourceRefId: input.sourceRefId,
    kind: input.kind,
    title: input.title,
    description: input.description,
    suggestedDueDate: input.suggestedDueDate,
    suggestedPriority: input.suggestedPriority,
    payload: input.payload ? JSON.stringify(input.payload) : null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  })
  revalidatePath("/")
  return { ok: true, created: true, id }
}
