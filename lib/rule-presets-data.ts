// Pure data module — safe to import from server actions and client components.
// Server actions live in lib/actions/rule-presets.ts.

import type { TriggerType, ActionType } from "@/lib/actions/rules"

export interface RulePreset {
  id: string
  name: string
  description: string
  category: "tasks" | "habits" | "wellness" | "communication"
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  actionType: ActionType
  actionConfig: Record<string, unknown>
}

export const PRESET_PREFIX = "[preset]"

export const RULE_PRESETS: RulePreset[] = [
  {
    id: "high-priority-due-soon",
    name: "Auto-flag tasks due within 24h as high priority",
    description:
      "When a task's due date arrives, log a chat note so you see it surfaced in Luma",
    category: "tasks",
    triggerType: "task.due_today",
    triggerConfig: {},
    actionType: "log_chat",
    actionConfig: {
      conversationTitle: "Due Today",
      message: "Heads up — task due today. Check your priorities list.",
    },
  },
  {
    id: "habit-streak-7-win",
    name: "Celebrate 7-day habit streak",
    description: "When a habit hits a 7-day streak, save it as a memory win",
    category: "habits",
    triggerType: "habit.streak_hit",
    triggerConfig: { streak: 7 },
    actionType: "save_memory",
    actionConfig: {
      category: "fact",
      template: "Hit a 7-day streak on {habitName}.",
    },
  },
  {
    id: "habit-streak-30-win",
    name: "Celebrate 30-day habit streak",
    description: "When a habit hits 30 days, save it as a major win memory",
    category: "habits",
    triggerType: "habit.streak_hit",
    triggerConfig: { streak: 30 },
    actionType: "save_memory",
    actionConfig: {
      category: "fact",
      template: "30-day milestone on {habitName}. That's a real pattern now.",
    },
  },
  {
    id: "task-done-followup",
    name: "Suggest a follow-up task after completing one",
    description:
      "When you mark any task done, log a Luma chat asking what's next on that thread",
    category: "tasks",
    triggerType: "task.status_changed",
    triggerConfig: { toStatus: "done" },
    actionType: "log_chat",
    actionConfig: {
      conversationTitle: "Follow-ups",
      message:
        "Just finished a task — anything that should come next on this thread?",
    },
  },
  {
    id: "task-in-progress-tracker",
    name: "Track when work starts on a task",
    description:
      "When a task moves to in_progress, save a context memory so Luma knows what you're focused on",
    category: "tasks",
    triggerType: "task.status_changed",
    triggerConfig: { toStatus: "in_progress" },
    actionType: "save_memory",
    actionConfig: {
      category: "context",
      template: "Started working on: {taskTitle}",
    },
  },
]
