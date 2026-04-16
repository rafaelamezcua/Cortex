"use client"

import { saveJournalEntry } from "@/lib/actions/journal"
import { attachJournalToVault } from "@/lib/actions/vault"
import { VaultAttachButton } from "@/app/components/ui/vault-attach-button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useCallback, useRef } from "react"

interface JournalEditorProps {
  initialEntry?: {
    content: string | null
    mood: number | null
  }
  initialDate: string
  vaultConfigured?: boolean
}

const moods = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
]

export function JournalEditor({
  initialEntry,
  initialDate,
  vaultConfigured = true,
}: JournalEditorProps) {
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
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" })
  const monthDay = d.toLocaleDateString("en-US", {
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
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => changeDate(-1)}
          aria-label="Previous day"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-tertiary transition-all duration-150 hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <p
            className="text-[22px] font-normal tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {weekday}
          </p>
          <p className="mt-0.5 text-xs text-foreground-tertiary">
            {monthDay}
            {isToday && <span className="ml-1.5 text-accent">· Today</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => changeDate(1)}
          disabled={isToday}
          aria-label="Next day"
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground-tertiary transition-all duration-150 hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Mood picker */}
      <div className="flex items-center justify-center gap-1">
        {moods.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => {
              setMood(m.value)
              debouncedSave(content, m.value)
            }}
            aria-label={`Mood: ${m.label}`}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[--radius-lg] px-3 py-2 transition-all duration-200 ease-out",
              mood === m.value
                ? "bg-accent-subtle scale-110"
                : "opacity-70 hover:bg-surface-hover hover:opacity-100"
            )}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-foreground-tertiary">
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Editor — paper surface */}
      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <VaultAttachButton
            onAttach={() => attachJournalToVault(date)}
            label="Save to Obsidian"
            disabled={!vaultConfigured}
            disabledReason="Vault folder not found. Set LUMA_BRAIN_PATH or create the default vault folder."
          />
          <span
            className={cn(
              "text-xs italic transition-opacity duration-200",
              saveStatus ? "opacity-100" : "opacity-0",
              saveStatus === "Saving..."
                ? "text-foreground-quaternary"
                : "text-success"
            )}
          >
            {saveStatus}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            debouncedSave(e.target.value, mood || undefined)
          }}
          placeholder={
            isToday
              ? "How was your day? What happened? What are you grateful for?"
              : "Add a note about this day..."
          }
          className={cn(
            "min-h-[360px] w-full resize-none rounded-[--radius-xl] border border-border-light bg-surface-raised p-8",
            "text-[16px] leading-[1.7] text-foreground shadow-md",
            "outline-none transition-all duration-200 ease-out",
            "placeholder:italic placeholder:text-foreground-quaternary",
            "focus:border-accent/40 focus:shadow-lg"
          )}
        />
      </div>
    </div>
  )
}
