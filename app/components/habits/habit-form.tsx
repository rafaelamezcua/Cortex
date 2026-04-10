"use client"

import { createHabit } from "@/lib/actions/habits"
import { Button } from "@/app/components/ui/button"
import { Plus } from "lucide-react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"

const habitColors = [
  "#7986cb", "#33b679", "#e67c73", "#f6bf26",
  "#039be5", "#8e24aa", "#f4511e", "#616161",
]

const habitIcons = ["💪", "📖", "💧", "🏃", "🧘", "🍎", "💤", "✍️", "🎯", "🧠"]

export function HabitForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(habitColors[0])
  const [selectedIcon, setSelectedIcon] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-[--radius-xl] border border-dashed border-border px-4 py-4 text-sm text-foreground-tertiary transition-all duration-200 hover:border-accent hover:text-accent hover:bg-accent-subtle"
      >
        <Plus className="h-4 w-4" />
        Add habit to track
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        formData.set("color", selectedColor)
        formData.set("icon", selectedIcon)
        await createHabit(formData)
        formRef.current?.reset()
        setIsOpen(false)
      }}
      className="rounded-[--radius-xl] border border-border-light/60 bg-surface p-5 shadow-sm space-y-4"
    >
      <input
        name="name"
        placeholder="Habit name (e.g. Exercise, Read, Meditate)"
        autoFocus
        required
        className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-foreground-quaternary"
      />

      {/* Icon picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
          Icon
        </label>
        <div className="flex gap-2 flex-wrap">
          {habitIcons.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setSelectedIcon(icon)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[--radius-md] text-lg border transition-all",
                selectedIcon === icon
                  ? "border-accent bg-accent-light scale-110"
                  : "border-border hover:border-accent/30"
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-foreground-quaternary">
          Color
        </label>
        <div className="flex gap-2">
          {habitColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              className={cn(
                "h-7 w-7 rounded-full transition-transform",
                selectedColor === c && "scale-125 ring-2 ring-offset-2 ring-offset-surface"
              )}
              style={{ backgroundColor: c, "--tw-ring-color": c } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="flex items-center gap-3">
        <select
          name="frequency"
          defaultValue="daily"
          className="h-9 rounded-[--radius-md] border border-border bg-background px-3 text-xs text-foreground-secondary outline-none"
        >
          <option value="daily">Daily</option>
          <option value="weekdays">Weekdays</option>
          <option value="weekly">Weekly</option>
        </select>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add Habit
        </Button>
      </div>
    </form>
  )
}
