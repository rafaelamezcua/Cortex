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
    ? note.content.slice(0, 120).replace(/\n/g, " ")
    : "Empty note"

  return (
    <div
      className={cn(
        "group relative rounded-[--radius-lg] border border-border-light bg-surface p-5 transition-all duration-200 hover:shadow-md",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      {/* Actions */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          onClick={() => startTransition(() => toggleNotePin(note.id))}
          className={cn(
            "rounded-[--radius-sm] p-1.5 transition-colors duration-150",
            note.pinned
              ? "text-accent hover:bg-accent-light"
              : "text-foreground-quaternary hover:bg-surface-hover hover:text-foreground-secondary"
          )}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => startTransition(() => deleteNote(note.id))}
          className="rounded-[--radius-sm] p-1.5 text-foreground-quaternary transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
          aria-label="Delete note"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Link href={`/notes/${note.id}`} className="block">
        <div className="flex items-center gap-2">
          {note.pinned && <Pin className="h-3 w-3 text-accent" />}
          <h3 className="text-sm font-medium text-foreground line-clamp-1">
            {note.title}
          </h3>
        </div>
        <p className="mt-2 text-xs text-foreground-tertiary line-clamp-3">
          {preview}
        </p>
        <p className="mt-3 text-xs text-foreground-quaternary">
          {formatRelativeDate(note.updatedAt)}
        </p>
      </Link>
    </div>
  )
}
