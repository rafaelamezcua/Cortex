import type { TriggerType, ActionType } from "@/lib/actions/rules"

export interface TriggerTypeMeta {
  label: string
  description: string
}

export interface ActionTypeMeta {
  label: string
  description: string
}

export const TRIGGER_TYPES: TriggerType[] = [
  "task.status_changed",
  "task.due_today",
  "habit.streak_hit",
]

export const TRIGGER_META: Record<TriggerType, TriggerTypeMeta> = {
  "task.status_changed": {
    label: "Task status changed",
    description: "When a task moves between todo, in progress, or done.",
  },
  "task.due_today": {
    label: "Task due today",
    description: "Checked each morning for tasks whose due date is today.",
  },
  "habit.streak_hit": {
    label: "Habit streak hit",
    description: "When a habit's streak reaches a chosen threshold.",
  },
}

export const ACTION_TYPES: ActionType[] = [
  "create_task",
  "log_chat",
  "send_email",
  "save_memory",
]

export const ACTION_META: Record<ActionType, ActionTypeMeta> = {
  create_task: {
    label: "Create task",
    description: "Adds a new task to your list.",
  },
  log_chat: {
    label: "Log to chat",
    description: "Posts a note to the Rules log conversation.",
  },
  send_email: {
    label: "Send email",
    description: "Sends an email via Gmail. Skipped if Gmail is not connected.",
  },
  save_memory: {
    label: "Save memory",
    description: "Stores a memory Luma will recall in future conversations.",
  },
}

export const STATUS_OPTIONS = ["todo", "in_progress", "done"] as const
export const PRIORITY_OPTIONS = ["low", "medium", "high"] as const
