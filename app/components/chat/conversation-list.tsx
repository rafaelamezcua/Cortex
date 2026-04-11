"use client"

import { cn } from "@/lib/utils"
import { formatRelativeDate } from "@/lib/utils"
import { Plus, Trash2, Pencil, Check, X } from "lucide-react"
import {
  createConversation,
  deleteConversation,
  updateConversationTitle,
} from "@/lib/actions/chat"
import { useRouter } from "next/navigation"
import { useTransition, useState, useRef, useEffect } from "react"

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  async function handleNew() {
    const id = await createConversation()
    router.push(`/chat?c=${id}`)
  }

  function startEdit(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(conv.id)
    setDraftTitle(conv.title || "New conversation")
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftTitle("")
  }

  function commitEdit(id: string) {
    const trimmed = draftTitle.trim()
    if (!trimmed) {
      cancelEdit()
      return
    }
    startTransition(async () => {
      await updateConversationTitle(id, trimmed)
      setEditingId(null)
      setDraftTitle("")
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => startTransition(handleNew)}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 rounded-[--radius-md] border border-dashed border-border px-3 py-2.5",
          "text-xs font-medium text-foreground-secondary",
          "transition-all duration-150 ease-out",
          "hover:border-accent/60 hover:bg-accent-subtle hover:text-accent",
          "disabled:opacity-50"
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        New conversation
      </button>

      <div className="space-y-1">
        {conversations.map((conv) => {
          const isActive = activeId === conv.id
          const isEditing = editingId === conv.id

          if (isEditing) {
            return (
              <div
                key={conv.id}
                className="flex items-center gap-1 rounded-[--radius-md] border border-accent/40 bg-accent-subtle px-2 py-1.5"
              >
                <input
                  ref={inputRef}
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(conv.id)
                    if (e.key === "Escape") cancelEdit()
                  }}
                  onBlur={() => commitEdit(conv.id)}
                  className="min-w-0 flex-1 bg-transparent text-xs font-medium text-foreground outline-none"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitEdit(conv.id)}
                  aria-label="Save title"
                  className="shrink-0 rounded-[--radius-sm] p-1 text-foreground-tertiary transition-colors hover:bg-surface-hover hover:text-accent"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={cancelEdit}
                  aria-label="Cancel"
                  className="shrink-0 rounded-[--radius-sm] p-1 text-foreground-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={conv.id}
              onClick={() => router.push(`/chat?c=${conv.id}`)}
              onDoubleClick={(e) => startEdit(conv, e)}
              className={cn(
                "group flex cursor-pointer items-center justify-between rounded-[--radius-md] px-3 py-2.5",
                "border transition-all duration-150 ease-out",
                isActive
                  ? "border-accent/25 bg-accent-subtle"
                  : "border-transparent hover:border-border-light hover:bg-surface-hover"
              )}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-xs font-medium",
                    isActive ? "text-foreground" : "text-foreground-secondary"
                  )}
                >
                  {conv.title || "New conversation"}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-quaternary">
                  {formatRelativeDate(conv.updatedAt)}
                </p>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  onClick={(e) => startEdit(conv, e)}
                  aria-label="Rename conversation"
                  className="rounded-[--radius-sm] p-1 text-foreground-quaternary transition-colors hover:bg-surface-active hover:text-accent"
                >
                  <Pencil className="h-3 w-3" />
                </button>
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
                  aria-label="Delete conversation"
                  className="rounded-[--radius-sm] p-1 text-foreground-quaternary transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
