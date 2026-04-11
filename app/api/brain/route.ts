import { getDailyBrief, isVaultAvailable } from "@/lib/integrations/luma-brain"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || undefined

  const available = await isVaultAvailable()
  if (!available) {
    return Response.json({
      available: false,
      error: "Luma Brain vault not accessible. Set LUMA_BRAIN_PATH env var.",
    })
  }

  const brief = await getDailyBrief(date)
  return Response.json({ available: true, ...brief })
}
