import { listRecentMessages, getMessageFull } from "@/lib/integrations/gmail"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { upsertSuggestion } from "@/lib/actions/triage"
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { guardCronRequest } from "@/lib/actions/automations"

const triageSchema = z.object({
  isActionable: z.boolean().describe("True only when there's a clear action Rafael needs to take."),
  title: z
    .string()
    .nullable()
    .describe("Short imperative task title (under 80 chars). Null if not actionable."),
  description: z
    .string()
    .nullable()
    .describe("One-sentence context including who and why. Null if not actionable."),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("ISO date if explicit deadline mentioned. Null otherwise."),
  priority: z
    .enum(["low", "medium", "high"])
    .describe("high if explicitly urgent, low if FYI/optional, medium otherwise."),
  reason: z
    .string()
    .describe("One short line explaining the call (under 80 chars)."),
})

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  if (!(await isGoogleConnected())) {
    return Response.json({ ok: false, skipped: "gmail_not_connected" })
  }

  // Pull last 20 unread inbox messages
  const candidates = await listRecentMessages(20)
  if (candidates.length === 0) {
    return Response.json({ ok: true, scanned: 0, suggested: 0 })
  }

  const today = todayLocal()
  let suggested = 0
  let scanned = 0
  const skipped: string[] = []

  for (const meta of candidates) {
    scanned++
    const full = await getMessageFull(meta.id)
    if (!full) continue
    if (!full.labelIds.includes("INBOX")) continue
    // Skip the auto-create gate that gmail-poll already handles
    if (/^\s*\[luma\]/i.test(full.subject)) continue
    // Skip noise
    const sender = (full.fromEmail || "").toLowerCase()
    if (
      sender.includes("noreply") ||
      sender.includes("no-reply") ||
      sender.includes("donotreply") ||
      sender.includes("notification")
    ) {
      skipped.push(meta.id)
      continue
    }
    if (!full.body || full.body.trim().length < 30) continue

    try {
      const trimmedBody = full.body.slice(0, 2500)
      const { object } = await generateObject({
        model: anthropic("claude-haiku-4-5-20251001"),
        schema: triageSchema,
        prompt: `Triage this email for Rafael. Today is ${today}.

ONLY suggest a task if it requires Rafael to actually do something — reply, attend, decide, prepare, submit. Newsletters, marketing, FYI updates, automated notifications, and confirmations are NOT actionable.

Be strict. When in doubt, mark not actionable.

From: ${full.from} <${full.fromEmail}>
Subject: ${full.subject}

${trimmedBody}

Output the structured triage. Never use em dashes.`,
        maxOutputTokens: 400,
      })

      if (object.isActionable && object.title) {
        const result = await upsertSuggestion({
          source: "email",
          sourceRefId: full.id,
          kind: "task",
          title: object.title,
          description:
            object.description ||
            `From ${full.from}: ${full.subject}`,
          suggestedDueDate: object.dueDate,
          suggestedPriority: object.priority,
          payload: {
            messageId: full.id,
            threadId: full.threadId,
            from: full.from,
            fromEmail: full.fromEmail,
            subject: full.subject,
            reason: object.reason,
          },
        })
        if (result.created) suggested++
      }
    } catch {
      // Skip messages that fail classification
    }
  }

  return Response.json({
    ok: true,
    scanned,
    suggested,
    skippedNoise: skipped.length,
    ranAt: new Date().toISOString(),
  })
}

export async function GET(request: Request) {
  return POST(request)
}
