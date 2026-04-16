"use server"

import {
  saveNoteToVault,
  saveJournalToVault,
  saveChatToVault,
  saveTaskToVault,
  isVaultAvailable,
  isVaultConfigured,
  type VaultWriteResult,
} from "@/lib/integrations/luma-brain"
import { db } from "@/lib/db"
import {
  notes,
  journalEntries,
  conversations,
  chatMessages,
  tasks,
} from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function checkVaultAvailable(): Promise<boolean> {
  return isVaultAvailable()
}

export async function checkVaultConfigured(): Promise<boolean> {
  return isVaultConfigured()
}

export async function attachNoteToVault(
  noteId: string
): Promise<VaultWriteResult> {
  const note = await db.select().from(notes).where(eq(notes.id, noteId)).get()
  if (!note) return { ok: false, error: "Note not found" }

  return saveNoteToVault({
    title: note.title || "Untitled",
    content: note.content || "",
    pinned: note.pinned ?? false,
    updatedAt: note.updatedAt,
  })
}

export async function attachJournalToVault(
  date: string
): Promise<VaultWriteResult> {
  const entry = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.date, date))
    .get()

  if (!entry || !entry.content || !entry.content.trim()) {
    return { ok: false, error: "Nothing to save yet" }
  }

  return saveJournalToVault({
    date,
    content: entry.content,
    mood: entry.mood,
  })
}

export async function attachTaskToVault(
  taskId: string
): Promise<VaultWriteResult> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
  if (!task) return { ok: false, error: "Task not found" }

  return saveTaskToVault({
    id: task.id,
    title: task.title,
    done: task.status === "done",
    dueDate: task.dueDate,
    priority: task.priority,
  })
}

export async function attachChatToVault(
  conversationId: string
): Promise<VaultWriteResult> {
  const conv = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .get()

  if (!conv) return { ok: false, error: "Conversation not found" }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt)
    .all()

  if (messages.length === 0) {
    return { ok: false, error: "No messages to save" }
  }

  return saveChatToVault({
    title: conv.title || "Conversation",
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    startedAt: conv.createdAt,
  })
}
