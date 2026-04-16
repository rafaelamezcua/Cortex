import { findFocusBlocks } from "@/lib/actions/focus"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || undefined
  const minMinutesRaw = searchParams.get("minMinutes")
  const dayStartRaw = searchParams.get("dayStartHour")
  const dayEndRaw = searchParams.get("dayEndHour")

  const minMinutes = minMinutesRaw ? Number(minMinutesRaw) : undefined
  const dayStartHour = dayStartRaw ? Number(dayStartRaw) : undefined
  const dayEndHour = dayEndRaw ? Number(dayEndRaw) : undefined

  try {
    const blocks = await findFocusBlocks({
      date,
      minMinutes: Number.isFinite(minMinutes) ? minMinutes : undefined,
      dayStartHour: Number.isFinite(dayStartHour) ? dayStartHour : undefined,
      dayEndHour: Number.isFinite(dayEndHour) ? dayEndHour : undefined,
    })
    return Response.json({ blocks })
  } catch {
    return Response.json({ error: "Failed to compute focus blocks" }, { status: 500 })
  }
}
