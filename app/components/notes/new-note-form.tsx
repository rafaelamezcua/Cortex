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
        New note
      </Button>
    )
  }

  return (
    <form
      action={async (formData) => {
        await createNote(formData)
        setIsOpen(false)
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="title"
        placeholder="Title"
        autoFocus
        required
        className="h-10 min-w-0 flex-1 rounded-[--radius-md] border border-border bg-surface px-3 text-sm font-medium text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-quaternary focus:border-accent/60 sm:w-56 sm:flex-none"
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
