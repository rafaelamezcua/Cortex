"use server"

import { db } from "@/lib/db"
import { conversations, chatMessages } from "@/lib/schema"
import { eq, desc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"

export async function createConversation(title?: string) {
  const now = new Date().toISOString()
  const id = nanoid()

  await db.insert(conversations).values({
    id,
    title: title ?? "New conversation",
    createdAt: now,
    updatedAt: now,
  })

  revalidatePath("/chat")
  return id
}

export async function getConversations() {
  return db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .all()
}

export async function getConversation(id: string) {
  return db.select().from(conversations).where(eq(conversations.id, id)).get()
}

export async function updateConversationTitle(id: string, title: string) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date().toISOString() })
    .where(eq(conversations.id, id))

  revalidatePath("/chat")
}

export async function deleteConversation(id: string) {
  await db.delete(chatMessages).where(eq(chatMessages.conversationId, id))
  await db.delete(conversations).where(eq(conversations.id, id))
  revalidatePath("/chat")
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
) {
  await db.insert(chatMessages).values({
    id: nanoid(),
    conversationId,
    role,
    content,
    createdAt: new Date().toISOString(),
  })

  await db
    .update(conversations)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(conversations.id, conversationId))
}

export async function getMessages(conversationId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt)
    .all()
}
