"use client"

import { saveJournalEntry } from "@/lib/actions/journal"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useCallback, useRef } from "react"

interface JournalEditorProps {
  initialEntry?: {
    content: string | null
    mood: number | null
  }
  initialDate: string
}

const moods = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
]

export function JournalEditor({ initialEntry, initialDate }: JournalEditorProps) {
  const [date, setDate] = useState(initialDate)
  const [content, setContent] = useState(initialEntry?.content || "")
  const [mood, setMood] = useState<number | null>(initialEntry?.mood || null)
  const [saveStatus, setSaveStatus] = useState("")
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const debouncedSave = useCallback(
    (newContent: string, newMood?: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setSaveStatus("Saving...")
      saveTimer.current = setTimeout(async () => {
        await saveJournalEntry(date, newContent, newMood)
        setSaveStatus("Saved")
        setTimeout(() => setSaveStatus(""), 2000)
      }, 500)
    },
    [date]
  )

  function changeDate(offset: number) {
    const d = new Date(date + "T12:00:00")
    d.setDate(d.getDate() + offset)
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    setDate(newDate)
    setContent("")
    setMood(null)
    setSaveStatus("")

    // Load entry for the new date
    fetch(`/api/journal?date=${newDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.entry) {
          setContent(data.entry.content || "")
          setMood(data.entry.mood)
        }
      })
      .catch(() => {})
  }

  const d = new Date(date + "T12:00:00")
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const isToday = date === todayStr

  return (
    <div className="space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeDate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary hover:bg-surface-hover transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{dateLabel}</p>
          {isToday && <p className="text-xs text-accent">Today</p>}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={isToday}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary hover:bg-surface-hover transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mood picker */}
      <div className="flex items-center justify-center gap-3">
        {moods.map((m) => (
          <button
            key={m.value}
            onClick={() => {
              setMood(m.value)
              debouncedSave(content, m.value)
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[--radius-lg] px-3 py-2 transition-all duration-200",
              mood === m.value
                ? "bg-accent-light scale-110"
                : "hover:bg-surface-hover"
            )}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] font-medium text-foreground-tertiary">
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="relative">
        <div className="flex justify-end mb-2">
          <span className="text-xs text-foreground-quaternary">{saveStatus}</span>
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            debouncedSave(e.target.value, mood || undefined)
          }}
          placeholder={isToday ? "How was your day? What happened? What are you grateful for?" : "Add a note about this day..."}
          className="min-h-[300px] w-full resize-none rounded-[--radius-xl] border border-border-light/60 bg-surface p-6 text-sm leading-relaxed text-foreground outline-none placeholder:text-foreground-quaternary focus:border-accent shadow-sm"
        />
      </div>
    </div>
  )
}
