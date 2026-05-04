import { findStaleTasks } from "@/lib/actions/stale-tasks"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const report = await findStaleTasks()
    return Response.json(report)
  } catch (e) {
    // Don't break the build / health checks if the DB isn't ready yet.
    return Response.json(
      {
        total: 0,
        inProgressTooLong: [],
        noDueDateOld: [],
        stuckWithDueDate: [],
        error: e instanceof Error ? e.message : "unknown",
      },
      { status: 200 },
    )
  }
}
