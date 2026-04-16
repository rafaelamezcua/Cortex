/**
 * Scheduled automation helpers (shared by the three cron endpoints).
 *
 * ============================================================
 * WIRING GUIDE for Rafael (schedule skill)
 * ============================================================
 *
 * Each endpoint below accepts `POST` and is guarded by the shared secret
 * `LUMA_CRON_SECRET`. The secret must be passed as an `Authorization:
 * Bearer <secret>` header. All three are designed to be driven by Claude
 * Code scheduled agents (the `schedule` skill).
 *
 * Example cron strings:
 *   0 7 * * 1-5       weekday 7am  -> /api/cron/morning-brief
 *   0 20 * * 0        sunday 8pm   -> /api/cron/weekly-digest
 *   `*`/10 * * * *    every 10 min -> /api/cron/gmail-poll
 *
 * Example curl shape (the trigger runs this in its action):
 *
 *   curl -X POST \
 *     -H "Authorization: Bearer $LUMA_CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     https://<luma-host>/api/cron/morning-brief
 *
 * Required env vars:
 *   LUMA_CRON_SECRET            shared secret for all cron endpoints
 *   LUMA_DAILY_BRIEF_EMAIL      (optional) where morning-brief sends; falls
 *                               back to the authenticated Gmail address
 *   LUMA_WEEKLY_DIGEST_EMAIL    (optional) where the weekly digest sends;
 *                               empty means "don't email, just save to journal"
 *   ANTHROPIC_API_KEY           already required by the rest of Luma
 *
 * Safety rules these helpers enforce:
 *   - Missing / wrong `Authorization` header -> 401, never runs the job
 *   - Gmail not connected -> endpoints degrade gracefully (no throw)
 *   - All failures return structured JSON with `error` / `details`
 * ============================================================
 */

/**
 * Reject the request with a 401 if the shared secret is missing or wrong.
 * Returns `null` when authorized so callers can do: `const g = guard(req);
 * if (g) return g;`.
 */
export function guardCronRequest(request: Request): Response | null {
  const expected = process.env.LUMA_CRON_SECRET
  if (!expected) {
    return Response.json(
      { error: "LUMA_CRON_SECRET is not configured on the server" },
      { status: 500 }
    )
  }

  const header = request.headers.get("authorization") || ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match || match[1].trim() !== expected) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  return null
}

/** Format a Date as YYYY-MM-DD in local time. */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Human-friendly short time like "9:30 AM" from an ISO / local datetime string. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Strip the `[luma]` prefix (case-insensitive, with or without the closing
 * bracket) from a subject line and trim surrounding whitespace.
 */
export function stripLumaPrefix(subject: string): string {
  return subject.replace(/^\s*\[luma\]\s*/i, "").trim()
}

/** Priority ordering helper used for sorting top-3 active tasks. */
export function priorityRank(priority: string | null | undefined): number {
  if (priority === "high") return 0
  if (priority === "medium") return 1
  if (priority === "low") return 2
  return 3
}
