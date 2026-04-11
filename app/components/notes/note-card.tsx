"use client"

import { cn } from "@/lib/utils"
import { formatRelativeDate } from "@/lib/utils"
import { Pin, Trash2 } from "lucide-react"
import Link from "next/link"
import { toggleNotePin, deleteNote } from "@/lib/actions/notes"
import { useTransition } from "react"

interface NoteCardProps {
  note: {
    id: string
    title: string
    content: string | null
    pinned: boolean
    updatedAt: string
  }
}

export function NoteCard({ note }: NoteCardProps) {
  const [isPending, startTransition] = useTransition()

  const preview = note.content
    ? note.content.slice(0, 140).replace(/\n/g, " ")
    : "Empty note"

  return (
    <div
      className={cn(
        "group relative rounded-[--radius-lg] border border-border-light bg-surface p-5 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-raised hover:shadow-md",
        "active:translate-y-0",
        isPending && "pointer-events-none opacity-50"
      )}
    >
      {/* Pin indicator — always visible when pinned */}
      {note.pinned && (
        <Pin
          className="absolute left-5 top-5 h-3 w-3 text-accent"
          fill="currentColor"
        />
      )}

      {/* Hover actions */}
      <div className="absolute right-3 top-3 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => startTransition(() => toggleNotePin(note.id))}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          className={cn(
            "rounded-[--radius-sm] p-1.5 transition-colors duration-150",
            note.pinned
              ? "text-accent hover:bg-accent-subtle"
              : "text-foreground-quaternary hover:bg-surface-active hover:text-accent"
          )}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => deleteNote(note.id))}
          aria-label="Delete note"
          className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Link href={`/notes/${note.id}`} className="block">
        <h3
          className={cn(
            "line-clamp-1 text-[15px] font-medium text-foreground",
            note.pinned && "pl-5"
          )}
        >
          {note.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-foreground-tertiary">
          {preview}
        </p>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-foreground-quaternary">
          {formatRelativeDate(note.updatedAt)}
        </p>
      </Link>
    </div>
  )
}
