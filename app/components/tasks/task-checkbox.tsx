"use client"

import { Check } from "lucide-react"
import { useState, useTransition } from "react"
import { toggleTask } from "@/lib/actions/tasks"
import { cn } from "@/lib/utils"

interface TaskCheckboxProps {
  id: string
  title: string
  done: boolean
  priority?: "low" | "medium" | "high" | string
}

export function TaskCheckbox({ id, title, done: initialDone, priority }: TaskCheckboxProps) {
  const [done, setDone] = useState(initialDone)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setDone(!done)
    startTransition(async () => {
      await toggleTask(id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="group -mx-2 flex w-full items-center gap-3 rounded-[--radius-md] p-2 text-left transition-colors duration-150 hover:bg-surface-hover disabled:opacity-60"
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
          done
            ? "border-accent bg-accent"
            : "border-foreground-quaternary group-hover:border-accent"
        )}
      >
        {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span
        className={cn(
          "flex-1 text-sm transition-colors duration-200",
          done ? "text-foreground-tertiary line-through" : "text-foreground"
        )}
      >
        {title}
      </span>
      {priority === "high" && !done && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-danger">
          High
        </span>
      )}
    </button>
  )
}
