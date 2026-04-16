export type MemoryCategory =
  | "preference"
  | "fact"
  | "style"
  | "context"
  | "feedback"

export const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  "preference",
  "fact",
  "style",
  "context",
  "feedback",
] as const
