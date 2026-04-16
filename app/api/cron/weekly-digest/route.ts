import { generateWeeklyDigest } from "@/lib/actions/reviews"
import { saveJournalEntry, getJournalEntry } from "@/lib/actions/journal"
import { sendMessage } from "@/lib/integrations/gmail"
import {
  guardCronRequest,
  formatLocalDate,
} from "@/lib/actions/automations"
import { getSettings } from "@/lib/actions/settings"

export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  try {
    const digest = await generateWeeklyDigest()
    if (!digest.ok) {
      return Response.json(
        { error: "digest_generation_failed", details: digest.error },
        { status: 502 }
      )
    }

    const today = formatLocalDate(new Date())
    const header = `Weekly review: ${digest.data.startDate} to ${digest.data.endDate}`
    const patternLines =
      digest.patterns.length > 0
        ? ["", "Notable patterns:", ...digest.patterns.map((p, i) => `${i + 1}. ${p}`)]
        : []
    const digestBlock = [header, "", digest.summary, ...patternLines].join("\n")

    // Append rather than overwrite an existing journal entry.
    const existing = await getJournalEntry(today)
    const combined =
      existing?.content && existing.content.trim().length > 0
        ? `${existing.content.trimEnd()}\n\n${digestBlock}`
        : digestBlock

    await saveJournalEntry(today, combined)

    // ---- Optional email (skipped if disabled in settings or no recipient) ----
    let emailed = false
    const settings = await getSettings(["weekly_digest_enabled", "weekly_digest_email"])
    const enabled = settings["weekly_digest_enabled"] !== "0"
    const recipient =
      settings["weekly_digest_email"]?.trim() ||
      process.env.LUMA_WEEKLY_DIGEST_EMAIL?.trim()
    if (enabled && recipient) {
      const res = await sendMessage({
        to: recipient,
        subject: `Weekly digest, ${digest.data.startDate} to ${digest.data.endDate}`,
        body: digestBlock,
      })
      emailed = !!res
    }

    return Response.json({ digestSaved: true, emailed })
  } catch (e) {
    return Response.json(
      {
        error: "weekly_digest_failed",
        details: e instanceof Error ? e.message : "unknown",
      },
      { status: 500 }
    )
  }
}
