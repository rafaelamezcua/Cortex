import { archiveOldDone } from "@/lib/actions/tasks"
import { guardCronRequest } from "@/lib/actions/automations"

// Auto-archive done tasks older than AUTO_ARCHIVE_DAYS (default 3).
// Set AUTO_ARCHIVE_DAYS=0 to disable.
export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  const days = parseInt(process.env.AUTO_ARCHIVE_DAYS || "3", 10)
  if (!Number.isFinite(days) || days <= 0) {
    return Response.json({
      ok: true,
      archived: 0,
      message: "AUTO_ARCHIVE_DAYS is 0 or unset — auto-archive disabled",
    })
  }

  const archived = await archiveOldDone(days)
  return Response.json({
    ok: true,
    archived,
    olderThanDays: days,
    ranAt: new Date().toISOString(),
  })
}

// Allow manual GET for quick testing in browser
export async function GET(request: Request) {
  return POST(request)
}
