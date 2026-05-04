import { getArchivedTasks } from "@/lib/actions/tasks"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const tasks = await getArchivedTasks()
    return Response.json({ tasks })
  } catch (e) {
    return Response.json(
      { tasks: [], error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    )
  }
}
