import { ChatContainer } from "@/app/components/chat/chat-container"
import { ConversationList } from "@/app/components/chat/conversation-list"
import { getConversations, getMessages } from "@/lib/actions/chat"
import { db } from "@/lib/db"
import { conversations } from "@/lib/schema"
import { nanoid } from "nanoid"
import { redirect } from "next/navigation"

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const { c: conversationId } = await searchParams
  const allConversations = await getConversations()

  // If no conversation selected and none exist, create one directly (no revalidatePath)
  let activeId = conversationId ?? null
  if (!activeId && allConversations.length === 0) {
    const now = new Date().toISOString()
    activeId = nanoid()
    await db.insert(conversations).values({
      id: activeId,
      title: "New conversation",
      createdAt: now,
      updatedAt: now,
    })
    redirect(`/chat?c=${activeId}`)
  }

  // If no conversation selected but some exist, use the most recent
  if (!activeId && allConversations.length > 0) {
    activeId = allConversations[0].id
    redirect(`/chat?c=${activeId}`)
  }

  // Re-fetch in case we just inserted
  const convos = await getConversations()

  // Load messages for active conversation
  const messages = activeId ? await getMessages(activeId) : []
  const initialMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  return (
    <div className="flex gap-6 -mx-8 -my-8 h-[calc(100vh)]">
      {/* Conversation sidebar */}
      <div className="w-56 shrink-0 border-r border-border-light bg-background-secondary p-4 overflow-y-auto">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground-quaternary">
          Conversations
        </h2>
        <ConversationList
          conversations={convos}
          activeId={activeId}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 px-8 py-8 max-w-3xl">
        {activeId && (
          <ChatContainer
            conversationId={activeId}
            initialMessages={initialMessages}
          />
        )}
      </div>
    </div>
  )
}
