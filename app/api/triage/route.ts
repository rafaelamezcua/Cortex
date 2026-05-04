import {
  getPendingSuggestions,
  acceptSuggestion,
  dismissSuggestion,
  dismissAllPending,
} from "@/lib/actions/triage"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const suggestions = await getPendingSuggestions(10)
    return Response.json({ suggestions })
  } catch (e) {
    return Response.json(
      { suggestions: [], error: e instanceof Error ? e.message : "unknown" },
      { status: 200 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { action, id } = await request.json()
    if (action === "accept" && id) {
      const result = await acceptSuggestion(id)
      return Response.json(result)
    }
    if (action === "dismiss" && id) {
      const result = await dismissSuggestion(id)
      return Response.json(result)
    }
    if (action === "dismissAll") {
      const result = await dismissAllPending()
      return Response.json(result)
    }
    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 })
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    )
  }
}
