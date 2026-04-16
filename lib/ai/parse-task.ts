"use server"

import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

export type ParsedTask = {
  title: string
  dueDate: string | null
  dueTime: string | null
  priority: "low" | "medium" | "high"
  addToCalendar: boolean
}

const parsedTaskSchema = z.object({
  title: z.string().min(1).describe("Short actionable task title."),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("ISO date (YYYY-MM-DD). Null if no date implied."),
  dueTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .describe("24-hour HH:mm. Null if no specific time given."),
  priority: z
    .enum(["low", "medium", "high"])
    .describe("Priority, default medium unless urgency cues appear."),
  addToCalendar: z
    .boolean()
    .describe("True only when a specific clock time was given."),
})

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export async function parseTaskInput(raw: string): Promise<
  { ok: true; task: ParsedTask } | { ok: false; error: string }
> {
  const input = raw.trim()
  if (!input) {
    return { ok: false, error: "Say what needs doing." }
  }

  const now = new Date()
  const todayStr = formatLocalDate(now)
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" })

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: parsedTaskSchema,
      prompt: `You turn a short natural-language note into a structured task for Rafael.

Today is ${weekday}, ${todayStr}. Resolve relative dates ("today", "tomorrow", "Friday", "next Monday") from that reference. If only a weekday is given with no qualifier, pick the next occurrence that is today or later.

Rules:
- title: rewrite as a short action phrase in imperative voice. Drop filler words and any time/date clauses. No trailing period.
- dueDate: YYYY-MM-DD. Null if no date is implied at all.
- dueTime: HH:mm in 24-hour time. Null if only a date (or nothing) was given. "2pm" -> "14:00".
- priority: "high" only if explicitly urgent ("asap", "urgent", "important"). "low" if casual ("sometime", "eventually", "when you can"). Default "medium".
- addToCalendar: true only when a specific clock time is given. If the user only supplies a day (no time), set false.

Never use em dashes. Never invent a date or time that was not implied.

Input: ${JSON.stringify(input)}`,
      maxOutputTokens: 300,
    })

    return { ok: true, task: object as ParsedTask }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't parse that.",
    }
  }
}
