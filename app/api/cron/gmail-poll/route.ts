import {
  listRecentMessages,
  getMessageFull,
  markAsRead,
} from "@/lib/integrations/gmail"
import { createTask } from "@/lib/actions/tasks"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import {
  guardCronRequest,
  stripLumaPrefix,
  formatLocalDate,
} from "@/lib/actions/automations"

const LUMA_LABEL = "luma-inbox"

export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  try {
    const candidates = await listRecentMessages(30)
    if (candidates.length === 0) {
      return Response.json({ created: 0, skipped: 0 })
    }

    let created = 0
    let skipped = 0

    for (const meta of candidates) {
      const subjectPrefixMatch = /^\s*\[luma\]/i.test(meta.subject)

      // Only hydrate the full message if the subject gate passes, OR if we
      // still need to check labels. We always need label info, so pull the
      // full message for any unread recent mail that looks plausible.
      const full = await getMessageFull(meta.id)
      if (!full) {
        skipped++
        continue
      }

      const hasLumaLabel = full.labelIds.some(
        (id) => id.toLowerCase() === LUMA_LABEL
      )

      if (!subjectPrefixMatch && !hasLumaLabel) {
        skipped++
        continue
      }

      const title = stripLumaPrefix(full.subject) || "(no subject)"
      const description = (full.body || "").slice(0, 2000)

      // ---- Ask Claude for a due date (no date if unclear) ----
      const todayStr = formatLocalDate(new Date())
      const dueDate = await guessDueDate({
        title,
        description,
        todayStr,
      })

      const form = new FormData()
      form.set("title", title)
      if (description) form.set("description", description)
      form.set("priority", "medium")
      if (dueDate) form.set("dueDate", dueDate)

      try {
        await createTask(form)
        created++
        await markAsRead(full.id)
      } catch {
        skipped++
      }
    }

    return Response.json({ created, skipped })
  } catch (e) {
    return Response.json(
      {
        error: "gmail_poll_failed",
        details: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    )
  }
}

/**
 * Ask Claude to infer a YYYY-MM-DD due date from an email subject + body.
 * Returns `null` when the model declines, the date is unparseable, or the
 * call fails. Kept deliberately conservative: the default is "no due date".
 */
async function guessDueDate(args: {
  title: string
  description: string
  todayStr: string
}): Promise<string | null> {
  const prompt = `Today is ${args.todayStr}.

Look at this task and decide if it has a clear due date. If yes, reply with ONLY the date in YYYY-MM-DD format. If there is no clear due date, reply with ONLY the word NONE.

Task title: ${args.title}

Task body:
${args.description || "(empty)"}`

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      maxOutputTokens: 20,
    })
    const trimmed = text.trim().toUpperCase()
    if (trimmed.startsWith("NONE")) return null
    const match = text.trim().match(/^(\d{4}-\d{2}-\d{2})/)
    if (!match) return null
    return match[1]
  } catch {
    return null
  }
}
