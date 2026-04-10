const CANVAS_API_URL = process.env.CANVAS_API_URL
const CANVAS_API_TOKEN = process.env.CANVAS_API_TOKEN

export interface CanvasCourse {
  id: number
  name: string
  course_code: string
  enrollment_term_id: number
}

export interface CanvasAssignment {
  id: number
  name: string
  description: string | null
  due_at: string | null
  points_possible: number | null
  course_id: number
  course_name: string
  html_url: string
  submission_types: string[]
  has_submitted_submissions: boolean
  locked_for_user: boolean
}

export interface CanvasSubmission {
  assignment_id: number
  score: number | null
  grade: string | null
  workflow_state: string
  submitted_at: string | null
}

// Paginated fetch — follows Canvas Link headers to get ALL results
async function canvasFetchAll<T>(endpoint: string): Promise<T[]> {
  if (!CANVAS_API_URL || !CANVAS_API_TOKEN) {
    throw new Error("Canvas not configured")
  }

  const allItems: T[] = []
  let url: string | null = `${CANVAS_API_URL}/api/v1${endpoint}`

  // Add per_page=100 if not already in the URL
  if (!url.includes("per_page")) {
    url += (url.includes("?") ? "&" : "?") + "per_page=100"
  }

  let currentUrl: string | null = url
  while (currentUrl) {
    const res: Response = await fetch(currentUrl, {
      headers: { Authorization: `Bearer ${CANVAS_API_TOKEN}` },
    })

    if (!res.ok) throw new Error(`Canvas API error: ${res.status}`)

    const items = (await res.json()) as T[]
    allItems.push(...items)

    // Check for next page in Link header
    const linkHeader = res.headers.get("Link")
    currentUrl = null
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      if (nextMatch) currentUrl = nextMatch[1]
    }
  }

  return allItems
}

async function canvasFetch<T>(endpoint: string): Promise<T> {
  if (!CANVAS_API_URL || !CANVAS_API_TOKEN) {
    throw new Error("Canvas not configured")
  }

  const url = `${CANVAS_API_URL}/api/v1${endpoint}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${CANVAS_API_TOKEN}` },
  })

  if (!response.ok) throw new Error(`Canvas API error: ${response.status}`)
  return response.json()
}

export async function isCanvasConnected(): Promise<boolean> {
  if (!CANVAS_API_URL || !CANVAS_API_TOKEN) return false
  try {
    await canvasFetch("/users/self")
    return true
  } catch {
    return false
  }
}

export async function getCourses(): Promise<CanvasCourse[]> {
  try {
    const courses = await canvasFetchAll<CanvasCourse>(
      "/courses?enrollment_state=active"
    )
    return courses.filter((c) => c.name)
  } catch {
    return []
  }
}

export async function getUpcomingAssignments(): Promise<CanvasAssignment[]> {
  try {
    const courses = await getCourses()
    const allAssignments: CanvasAssignment[] = []

    for (const course of courses) {
      try {
        const assignments = await canvasFetchAll<CanvasAssignment>(
          `/courses/${course.id}/assignments?order_by=due_at&bucket=upcoming`
        )

        for (const a of assignments) {
          if (a.due_at) {
            allAssignments.push({ ...a, course_name: course.name })
          }
        }
      } catch {
        // Skip courses that fail
      }
    }

    return allAssignments.sort((a, b) =>
      (a.due_at || "").localeCompare(b.due_at || "")
    )
  } catch {
    return []
  }
}

export async function getAllAssignments(): Promise<CanvasAssignment[]> {
  try {
    const courses = await getCourses()
    const allAssignments: CanvasAssignment[] = []

    for (const course of courses) {
      try {
        const assignments = await canvasFetchAll<CanvasAssignment>(
          `/courses/${course.id}/assignments?order_by=due_at`
        )

        for (const a of assignments) {
          allAssignments.push({ ...a, course_name: course.name })
        }
      } catch {
        // Skip courses that fail
      }
    }

    return allAssignments.sort((a, b) =>
      (a.due_at || "z").localeCompare(b.due_at || "z")
    )
  } catch {
    return []
  }
}

export async function getGrades(): Promise<
  { course: string; grade: string | null; score: number | null }[]
> {
  try {
    const enrollments = await canvasFetchAll<{
      course_id: number
      grades: { current_score: number | null; current_grade: string | null }
    }>("/users/self/enrollments?type[]=StudentEnrollment&state[]=active")

    const courses = await getCourses()
    const courseMap = new Map(courses.map((c) => [c.id, c.name]))

    return enrollments.map((e) => ({
      course: courseMap.get(e.course_id) || `Course ${e.course_id}`,
      grade: e.grades?.current_grade || null,
      score: e.grades?.current_score || null,
    }))
  } catch {
    return []
  }
}
