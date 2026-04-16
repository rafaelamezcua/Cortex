"use server"

import { db } from "@/lib/db"
import {
  notes,
  tasks,
  calendarEvents,
  journalEntries,
  memories,
  chatMessages,
} from "@/lib/schema"
import { eq } from "drizzle-orm"
import {
  buildSnippet,
  hasSemanticProvider,
  searchSemantic,
  storeEmbedding,
  type EmbedKind,
  type SemanticHit,
} from "@/lib/semantic"

export interface HydratedHit {
  kind: EmbedKind
  refId: string
  score: number
  title: string
  snippet: string
  url: string
}

export interface SearchResponse {
  notice?: string
  hits: HydratedHit[]
}

export interface SearchOptsInput {
  kinds?: EmbedKind[]
  limit?: number
}

// Turn a raw hit into something the UI can render. Kept server-side so we
// don't leak the full row contents unless we need them.
async function hydrate(hit: SemanticHit): Promise<HydratedHit | null> {
  switch (hit.kind) {
    case "note": {
      const row = await db.select().from(notes).where(eq(notes.id, hit.refId)).get()
      if (!row) return null
      return {
        ...hit,
        title: row.title || "Untitled note",
        snippet: buildSnippet(row.content),
        url: `/notes/${row.id}`,
      }
    }
    case "task": {
      const row = await db.select().from(tasks).where(eq(tasks.id, hit.refId)).get()
      if (!row) return null
      return {
        ...hit,
        title: row.title,
        snippet: buildSnippet(row.description),
        url: `/tasks`,
      }
    }
    case "event": {
      const row = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, hit.refId))
        .get()
      if (!row) return null
      return {
        ...hit,
        title: row.title,
        snippet: buildSnippet(
          [row.description, row.notes].filter(Boolean).join(" \u00b7 "),
        ),
        url: `/calendar`,
      }
    }
    case "journal": {
      const row = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, hit.refId))
        .get()
      if (!row) return null
      return {
        ...hit,
        title: row.date,
        snippet: buildSnippet(row.content),
        url: `/journal`,
      }
    }
    case "memory": {
      const row = await db
        .select()
        .from(memories)
        .where(eq(memories.id, hit.refId))
        .get()
      if (!row) return null
      return {
        ...hit,
        title: row.category,
        snippet: buildSnippet(row.content),
        url: `/memories`,
      }
    }
    case "chat": {
      const row = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, hit.refId))
        .get()
      if (!row) return null
      return {
        ...hit,
        title: "Chat message",
        snippet: buildSnippet(row.content),
        url: `/chat`,
      }
    }
    default:
      return null
  }
}

export async function runSemanticSearch(
  query: string,
  opts?: SearchOptsInput,
): Promise<SearchResponse> {
  if (!hasSemanticProvider()) {
    return {
      notice: "Set VOYAGE_API_KEY or OPENAI_API_KEY to enable semantic search.",
      hits: [],
    }
  }
  const trimmed = query.trim()
  if (!trimmed) return { hits: [] }

  const raw = await searchSemantic(trimmed, opts)
  const hydrated: HydratedHit[] = []
  for (const hit of raw) {
    const h = await hydrate(hit)
    if (h) hydrated.push(h)
  }
  return { hits: hydrated }
}

// --- Bulk reindex ---

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function noteText(n: { title: string; content: string | null }): string {
  return [n.title, n.content ?? ""].filter(Boolean).join("\n\n")
}
function taskText(t: {
  title: string
  description: string | null
}): string {
  return [t.title, t.description ?? ""].filter(Boolean).join("\n\n")
}
function eventText(e: {
  title: string
  description: string | null
  notes: string | null
}): string {
  return [e.title, e.description ?? "", e.notes ?? ""]
    .filter(Boolean)
    .join("\n\n")
}

export async function reindexAll(): Promise<{
  notice?: string
  counts: Record<EmbedKind, number>
}> {
  const counts: Record<EmbedKind, number> = {
    note: 0,
    task: 0,
    event: 0,
    journal: 0,
    memory: 0,
    chat: 0,
  }

  if (!hasSemanticProvider()) {
    return {
      notice: "Set VOYAGE_API_KEY or OPENAI_API_KEY to enable semantic search.",
      counts,
    }
  }

  const allNotes = await db.select().from(notes).all()
  for (const n of allNotes) {
    await storeEmbedding("note", n.id, noteText(n))
    counts.note++
    await sleep(50)
  }

  const allTasks = await db.select().from(tasks).all()
  for (const t of allTasks) {
    await storeEmbedding("task", t.id, taskText(t))
    counts.task++
    await sleep(50)
  }

  const allEvents = await db.select().from(calendarEvents).all()
  for (const e of allEvents) {
    await storeEmbedding("event", e.id, eventText(e))
    counts.event++
    await sleep(50)
  }

  const allJournal = await db.select().from(journalEntries).all()
  for (const j of allJournal) {
    await storeEmbedding("journal", j.id, j.content ?? "")
    counts.journal++
    await sleep(50)
  }

  const allMemories = await db.select().from(memories).all()
  for (const m of allMemories) {
    await storeEmbedding("memory", m.id, m.content)
    counts.memory++
    await sleep(50)
  }

  const allChat = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.role, "user"))
    .all()
  for (const c of allChat) {
    await storeEmbedding("chat", c.id, c.content)
    counts.chat++
    await sleep(50)
  }

  return { counts }
}
