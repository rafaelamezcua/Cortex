"use client"

import { createNote } from "@/lib/actions/notes"
import { Button } from "@/app/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"

export function NewNoteForm() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        New Note
      </Button>
    )
  }

  return (
    <form
      action={async (formData) => {
        await createNote(formData)
        setIsOpen(false)
      }}
      className="flex items-center gap-2"
    >
      <input
        name="title"
        placeholder="Note title..."
        autoFocus
        required
        className="h-9 w-48 rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-foreground-quaternary focus:border-accent"
      />
      <Button type="submit" size="sm">
        Create
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(false)}
      >
        Cancel
      </Button>
    </form>
  )
}
