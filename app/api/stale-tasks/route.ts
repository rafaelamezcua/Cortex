import { findStaleTasks } from "@/lib/actions/stale-tasks"

export const dynamic = "force-dynamic"

export async function GET() {
  const report = await findStaleTasks()
  return Response.json(report)
}
