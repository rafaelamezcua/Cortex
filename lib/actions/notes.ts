"use server"

import { db } from "@/lib/db"
import { notes } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { redirect } from "next/navigation"
import { storeEmbedding, deleteEmbedding } from "@/lib/semantic"

// Fire-and-forget embedding helper so a provider hiccup never blocks a write.
function indexNote(
  id: string,
  title: string,
  content: string | null | undefined,
) {
  const text = [title, content ?? ""].filter(Boolean).join("\n\n")
  void Promise.resolve().then(() => storeEmbedding("note", id, text).catch(() => {}))
}

export async function createNote(formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const id = nanoid()
  const eventId = (formData.get("eventId") as string) || null
  const eventDate = (formData.get("eventDate") as string) || null

  await db.insert(notes).values({
    id,
    title: title.trim(),
    content: "",
    eventId,
    eventDate,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/notes")
  revalidatePath("/")
  revalidatePath("/calendar")
  indexNote(id, title.trim(), "")
  redirect(`/notes/${id}`)
}

export async function createNoteForEvent(params: {
  title: string
  eventId: string
  eventDate: string
}): Promise<{ id: string } | null> {
  if (!params.title?.trim()) return null

  const now = new Date().toISOString()
  const id = nanoid()

  await db.insert(notes).values({
    id,
    title: params.title.trim(),
    content: "",
    eventId: params.eventId,
    eventDate: params.eventDate,
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/notes")
  revalidatePath("/calendar")
  indexNote(id, params.title.trim(), "")
  return { id }
}

export async function getNotesForEvent(eventId: string) {
  if (!eventId) return []
  return db
    .select()
    .from(notes)
    .where(eq(notes.eventId, eventId))
    .all()
}

export async function updateNote(id: string, content: string) {
  await db
    .update(notes)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, id))

  revalidatePath(`/notes/${id}`)
  revalidatePath("/notes")
  revalidatePath("/")

  // Re-embed using the fresh title + content combo.
  const current = await db.select().from(notes).where(eq(notes.id, id)).get()
  if (current) indexNote(id, current.title, content)
}

export async function updateNoteTitle(id: string, title: string) {
  if (!title?.trim()) return

  await db
    .update(notes)
    .set({ title: title.trim(), updatedAt: new Date().toISOString() })
    .where(eq(notes.id, id))

  revalidatePath(`/notes/${id}`)
  revalidatePath("/notes")

  const current = await db.select().from(notes).where(eq(notes.id, id)).get()
  if (current) indexNote(id, title.trim(), current.content)
}

export async function toggleNotePin(id: string) {
  const note = await db.select().from(notes).where(eq(notes.id, id)).get()
  if (!note) return

  await db
    .update(notes)
    .set({ pinned: !note.pinned, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, id))

  revalidatePath("/notes")
}

export async function deleteNote(id: string) {
  await db.delete(notes).where(eq(notes.id, id))
  revalidatePath("/notes")
  revalidatePath("/")
  void Promise.resolve().then(() => deleteEmbedding("note", id).catch(() => {}))
  redirect("/notes")
}

export async function getNotes() {
  return db.select().from(notes).orderBy(notes.createdAt).all()
}

export async function getNote(id: string) {
  return db.select().from(notes).where(eq(notes.id, id)).get()
}
