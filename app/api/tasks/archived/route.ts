import { getArchivedTasks } from "@/lib/actions/tasks"

export const dynamic = "force-dynamic"

export async function GET() {
  const tasks = await getArchivedTasks()
  return Response.json({ tasks })
}
