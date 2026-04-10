import { getUpcomingAssignments, getCourses, getGrades } from "@/lib/integrations/canvas"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "assignments"

  if (type === "courses") {
    const courses = await getCourses()
    return Response.json({ courses })
  }

  if (type === "grades") {
    const grades = await getGrades()
    return Response.json({ grades })
  }

  const assignments = await getUpcomingAssignments()
  return Response.json({ assignments })
}
