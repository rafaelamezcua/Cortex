"use server"

import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

export type CaptureKind = "task" | "event" | "note" | "journal" | "memory"

export type ClassifiedCapture = {
  kind: CaptureKind
  reason: string
  task?: {
    title: string
    dueDate: string | null
    dueTime: string | null
    priority: "low" | "medium" | "high"
    description: string | null
  }
  event?: {
    title: string
    startDate: string
    startTime: string | null
    endTime: string | null
    allDay: boolean
    description: string | null
  }
  note?: {
    title: string
    content: string
  }
  journal?: {
    content: string
    mood: number | null
  }
  memory?: {
    category: "preference" | "fact" | "style" | "context" | "feedback"
    content: string
  }
}

const captureSchema = z.object({
  kind: z.enum(["task", "event", "note", "journal", "memory"]),
  reason: z.string().describe("One-line justification for the classification."),
  task: z
    .object({
      title: z.string(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
      priority: z.enum(["low", "medium", "high"]),
      description: z.string().nullable(),
    })
    .nullable()
    .optional(),
  event: z
    .object({
      title: z.string(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
      allDay: z.boolean(),
      description: z.string().nullable(),
    })
    .nullable()
    .optional(),
  note: z
    .object({
      title: z.string(),
      content: z.string(),
    })
    .nullable()
    .optional(),
  journal: z
    .object({
      content: z.string(),
      mood: z.number().int().min(1).max(5).nullable(),
    })
    .nullable()
    .optional(),
  memory: z
    .object({
      category: z.enum(["preference", "fact", "style", "context", "feedback"]),
      content: z.string(),
    })
    .nullable()
    .optional(),
})

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export async function classifyCapture(
  raw: string,
): Promise<{ ok: true; result: ClassifiedCapture } | { ok: false; error: string }> {
  const input = raw.trim()
  if (!input) return { ok: false, error: "Type something to capture." }

  const now = new Date()
  const todayStr = formatLocalDate(now)
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" })

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: captureSchema,
      prompt: `You triage a short natural-language input from Rafael into ONE of these buckets:

- "task" — something he needs to do (verb-led, has action). e.g. "follow up with Sarah", "buy printer ink"
- "event" — something happening at a specific time/place. e.g. "lunch with Dustin Friday 1pm", "Dr appt next Wed 3pm"
- "note" — a fact, idea, link, or reference to remember. e.g. "Markit pitch angle: AI content for solo founders", a meeting summary
- "journal" — reflection, mood, what happened today, gratitude. e.g. "rough morning, Calc made no sense", "felt great after run"
- "memory" — a personal preference or fact about Rafael himself that he wants you to remember long-term. e.g. "I prefer morning workouts", "my mom's birthday is March 12"

Today is ${weekday}, ${todayStr}.

Rules:
- Pick exactly ONE kind. Set the matching field, leave others null.
- task.dueDate / event.startDate: YYYY-MM-DD. Resolve relative dates ("tomorrow", "Friday", "next Monday") from today.
- Times in 24h HH:mm. "2pm" -> "14:00".
- task.priority: "high" only for urgent words ("asap", "urgent"). "low" for casual ("sometime"). Default "medium".
- event.allDay: true if no time given.
- For event: title is just the event name, no time/date in it.
- note.title: short headline (5-7 words max). content: the full text or rewritten cleanly.
- journal.mood: 1=Rough, 2=Meh, 3=Okay, 4=Good, 5=Great. Null if not implied.
- memory: only when input is clearly a self-statement of preference / personal fact (uses "I", "my", or stated as ongoing trait).
- reason: one short sentence (under 80 chars) explaining why you picked that kind.

Never invent details. Never use em dashes.

Input: ${JSON.stringify(input)}`,
      maxOutputTokens: 600,
    })

    return { ok: true, result: object as ClassifiedCapture }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't classify.",
    }
  }
}
