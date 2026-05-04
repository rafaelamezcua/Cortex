"use server"

import { db } from "@/lib/db"
import { tasks, calendarEvents, notes, journalEntries, memories } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { classifyCapture, type ClassifiedCapture } from "@/lib/ai/quick-capture"

export type CaptureResult =
  | { ok: true; kind: ClassifiedCapture["kind"]; reason: string; id: string }
  | { ok: false; error: string }

export async function processQuickCapture(raw: string): Promise<CaptureResult> {
  const classified = await classifyCapture(raw)
  if (!classified.ok) return { ok: false, error: classified.error }

  const { result } = classified
  const now = new Date().toISOString()
  const id = nanoid()

  try {
    switch (result.kind) {
      case "task": {
        if (!result.task) throw new Error("Missing task data")
        await db.insert(tasks).values({
          id,
          title: result.task.title,
          description: result.task.description ?? null,
          status: "todo",
          priority: result.task.priority,
          dueDate: result.task.dueDate,
          createdAt: now,
          updatedAt: now,
        })
        revalidatePath("/tasks")
        revalidatePath("/")
        break
      }
      case "event": {
        if (!result.event) throw new Error("Missing event data")
        const startTime = result.event.allDay
          ? `${result.event.startDate}T00:00`
          : `${result.event.startDate}T${result.event.startTime ?? "09:00"}`
        const endTime = result.event.allDay
          ? `${result.event.startDate}T23:59`
          : `${result.event.startDate}T${result.event.endTime ?? addOneHour(result.event.startTime ?? "09:00")}`
        await db.insert(calendarEvents).values({
          id,
          title: result.event.title,
          description: result.event.description ?? null,
          notes: null,
          startTime,
          endTime,
          allDay: result.event.allDay,
          color: null,
          googleEventId: null,
          googleCalendarId: null,
          localCalendarId: null,
          recurrence: null,
          createdAt: now,
          updatedAt: now,
        })
        revalidatePath("/calendar")
        revalidatePath("/")
        break
      }
      case "note": {
        if (!result.note) throw new Error("Missing note data")
        await db.insert(notes).values({
          id,
          title: result.note.title,
          content: result.note.content,
          pinned: false,
          eventId: null,
          eventDate: null,
          createdAt: now,
          updatedAt: now,
        })
        revalidatePath("/notes")
        break
      }
      case "journal": {
        if (!result.journal) throw new Error("Missing journal data")
        const today = todayLocal()
        const existing = await db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.date, today))
          .get()
        if (existing) {
          const merged =
            (existing.content ? `${existing.content.trim()}\n\n` : "") +
            result.journal.content
          await db
            .update(journalEntries)
            .set({
              content: merged,
              mood: result.journal.mood ?? existing.mood,
              updatedAt: now,
            })
            .where(eq(journalEntries.id, existing.id))
          revalidatePath("/journal")
          return { ok: true, kind: "journal", reason: result.reason, id: existing.id }
        }
        await db.insert(journalEntries).values({
          id,
          date: today,
          content: result.journal.content,
          mood: result.journal.mood,
          createdAt: now,
          updatedAt: now,
        })
        revalidatePath("/journal")
        break
      }
      case "memory": {
        if (!result.memory) throw new Error("Missing memory data")
        await db.insert(memories).values({
          id,
          category: result.memory.category,
          content: result.memory.content,
          createdAt: now,
          updatedAt: now,
        })
        revalidatePath("/memories")
        break
      }
    }

    return { ok: true, kind: result.kind, reason: result.reason, id }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save capture.",
    }
  }
}

function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10))
  const total = (h + 1) * 60 + m
  const nh = Math.floor(total / 60) % 24
  return `${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
