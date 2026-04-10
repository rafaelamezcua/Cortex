"use client"

import { updateNote, updateNoteTitle } from "@/lib/actions/notes"
import { useRef, useCallback, useState } from "react"

interface NoteEditorProps {
  note: {
    id: string
    title: string
    content: string | null
  }
}

export function NoteEditor({ note }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content ?? "")
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const debouncedSaveContent = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaving(true)
      saveTimer.current = setTimeout(async () => {
        await updateNote(note.id, value)
        setSaving(false)
      }, 500)
    },
    [note.id]
  )

  const debouncedSaveTitle = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaving(true)
      saveTimer.current = setTimeout(async () => {
        await updateNoteTitle(note.id, value)
        setSaving(false)
      }, 500)
    },
    [note.id]
  )

  return (
    <div className="space-y-4">
      {/* Save indicator */}
      <div className="flex justify-end">
        <span className="text-xs text-foreground-quaternary">
          {saving ? "Saving..." : "Saved"}
        </span>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          debouncedSaveTitle(e.target.value)
        }}
        className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-foreground-quaternary"
        placeholder="Untitled"
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          debouncedSaveContent(e.target.value)
        }}
        className="min-h-[calc(100vh-20rem)] w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-foreground-quaternary"
        placeholder="Start writing..."
      />
    </div>
  )
}
