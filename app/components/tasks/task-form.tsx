"use client"

import { createTask } from "@/lib/actions/tasks"
import { Button } from "@/app/components/ui/button"
import { Plus } from "lucide-react"
import { useRef, useState } from "react"

export function TaskForm() {
  const [isOpen, setIsOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    await createTask(formData)
    formRef.current?.reset()
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-[--radius-md] border border-dashed border-border px-4 py-3 text-sm text-foreground-tertiary transition-colors duration-150 hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-3 rounded-[--radius-lg] border border-border-light bg-surface p-4"
    >
      <input
        name="title"
        placeholder="Task name"
        autoFocus
        required
        className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-foreground-quaternary"
      />
      <textarea
        name="description"
        placeholder="Description (optional)"
        rows={2}
        className="w-full resize-none bg-transparent text-sm text-foreground-secondary outline-none placeholder:text-foreground-quaternary"
      />
      <div className="flex items-center gap-3">
        <select
          name="priority"
          defaultValue="medium"
          className="h-8 rounded-[--radius-sm] border border-border bg-background px-2 text-xs text-foreground-secondary outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          name="dueDate"
          type="date"
          className="h-8 rounded-[--radius-sm] border border-border bg-background px-2 text-xs text-foreground-secondary outline-none"
        />
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add
        </Button>
      </div>
    </form>
  )
}
