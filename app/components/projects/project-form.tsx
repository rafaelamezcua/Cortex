"use client"

import { createProject } from "@/lib/actions/projects"
import { Button } from "@/app/components/ui/button"
import { Plus } from "lucide-react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"

const colors = [
  "#7986cb", "#33b679", "#8e24aa", "#e67c73",
  "#f6bf26", "#039be5", "#f4511e", "#616161",
]

export function ProjectForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [color, setColor] = useState(colors[0])
  const formRef = useRef<HTMLFormElement>(null)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-[--radius-xl] border border-dashed border-border px-4 py-4 text-sm text-foreground-tertiary transition-all duration-200 hover:border-accent hover:text-accent hover:bg-accent-subtle"
      >
        <Plus className="h-4 w-4" />
        New project
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        formData.set("color", color)
        await createProject(formData)
        formRef.current?.reset()
        setIsOpen(false)
      }}
      className="rounded-[--radius-xl] border border-border-light/60 bg-surface p-5 shadow-sm space-y-4"
    >
      <input
        name="name"
        placeholder="Project name"
        autoFocus
        required
        className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-foreground-quaternary"
      />
      <input
        name="description"
        placeholder="Short description (optional)"
        className="w-full bg-transparent text-sm text-foreground-secondary outline-none placeholder:text-foreground-quaternary"
      />
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "h-6 w-6 rounded-full transition-transform",
                color === c && "scale-125 ring-2 ring-offset-2 ring-offset-surface"
              )}
              style={{ backgroundColor: c, "--tw-ring-color": c } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Create
        </Button>
      </div>
    </form>
  )
}
