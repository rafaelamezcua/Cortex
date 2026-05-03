import { rolloverOverdueTasks } from "@/lib/actions/tasks"
import { guardCronRequest } from "@/lib/actions/automations"
import { db } from "@/lib/db"
import { ruleRuns } from "@/lib/schema"
import { nanoid } from "nanoid"

// Smart rollover: bump active overdue tasks' dueDate to today.
// Set ROLLOVER_ENABLED=false to disable.
export async function POST(request: Request) {
  const unauthorized = guardCronRequest(request)
  if (unauthorized) return unauthorized

  const enabled = (process.env.ROLLOVER_ENABLED ?? "true").toLowerCase()
  if (enabled === "false" || enabled === "0") {
    return Response.json({
      ok: true,
      moved: 0,
      message: "Rollover disabled (ROLLOVER_ENABLED=false)",
    })
  }

  const moved = await rolloverOverdueTasks()

  // Log the run for visibility
  try {
    await db.insert(ruleRuns).values({
      id: nanoid(),
      ruleId: "system:rollover",
      status: moved.length > 0 ? "success" : "skipped",
      details: JSON.stringify({
        movedCount: moved.length,
        moved: moved.map((m) => `${m.title} (was ${m.oldDue})`),
      }),
      ranAt: new Date().toISOString(),
    })
  } catch {
    // Logging failures shouldn't break the cron
  }

  return Response.json({
    ok: true,
    movedCount: moved.length,
    moved,
    ranAt: new Date().toISOString(),
  })
}

export async function GET(request: Request) {
  return POST(request)
}
