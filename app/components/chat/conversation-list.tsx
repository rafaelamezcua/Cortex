"use client"

import { cn } from "@/lib/utils"
import { formatRelativeDate } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"
import { createConversation, deleteConversation } from "@/lib/actions/chat"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | null
}

export function ConversationList({
  conversations,
  activeId,
}: ConversationListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleNew() {
    const id = await createConversation()
    router.push(`/chat?c=${id}`)
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => startTransition(handleNew)}
        disabled={isPending}
        className="flex items-center gap-2 rounded-[--radius-md] border border-dashed border-border px-3 py-2 text-xs text-foreground-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        New conversation
      </button>

      <div className="mt-2 space-y-0.5">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              "group flex items-center justify-between rounded-[--radius-md] px-3 py-2 text-sm transition-colors duration-150 cursor-pointer",
              activeId === conv.id
                ? "bg-surface-active text-foreground"
                : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
            )}
            onClick={() => router.push(`/chat?c=${conv.id}`)}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {conv.title || "New conversation"}
              </p>
              <p className="text-xs text-foreground-quaternary">
                {formatRelativeDate(conv.updatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                startTransition(async () => {
                  await deleteConversation(conv.id)
                  if (activeId === conv.id) {
                    router.push("/chat")
                  }
                })
              }}
              className="shrink-0 rounded-[--radius-sm] p-1 text-foreground-quaternary opacity-0 transition-all duration-150 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
