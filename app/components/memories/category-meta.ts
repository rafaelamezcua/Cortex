import type { MemoryCategory } from "@/lib/memories-types"

interface CategoryMeta {
  label: string
  description: string
}

export const CATEGORY_META: Record<MemoryCategory, CategoryMeta> = {
  preference: {
    label: "Preferences",
    description: "How you like things done.",
  },
  fact: {
    label: "Facts",
    description: "Things that are true about you.",
  },
  style: {
    label: "Style",
    description: "How you want Luma to sound.",
  },
  context: {
    label: "Context",
    description: "What you're working on right now.",
  },
  feedback: {
    label: "Feedback",
    description: "Corrections and preferences you've shared.",
  },
}

export const CATEGORY_ORDER: MemoryCategory[] = [
  "preference",
  "fact",
  "style",
  "context",
  "feedback",
]
