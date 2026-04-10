"use server"

import { db } from "@/lib/db"
import { notes } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { redirect } from "next/navigation"

export async function createNote(formData: FormData) {
  const now = new Date().toISOString()
  const title = formData.get("title") as string
  if (!title?.trim()) return

  const id = nanoid()

  await db.insert(notes).values({
    id,
    title: title.trim(),
    content: "",
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/notes")
  revalidatePath("/")
  redirect(`/notes/${id}`)
}

export async function updateNote(id: string, content: string) {
  await db
    .update(notes)
    .set({ content, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, id))

  revalidatePath(`/notes/${id}`)
  revalidatePath("/notes")
  revalidatePath("/")
}

export async function updateNoteTitle(id: string, title: string) {
  if (!title?.trim()) return

  await db
    .update(notes)
    .set({ title: title.trim(), updatedAt: new Date().toISOString() })
    .where(eq(notes.id, id))

  revalidatePath(`/notes/${id}`)
  revalidatePath("/notes")
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
  redirect("/notes")
}

export async function getNotes() {
  return db.select().from(notes).orderBy(notes.createdAt).all()
}

export async function getNote(id: string) {
  return db.select().from(notes).where(eq(notes.id, id)).get()
}
