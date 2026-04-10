import { getGoogleCalendars } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { getLocalCalendars } from "@/lib/actions/local-calendars"

export async function GET() {
  const localCals = await getLocalCalendars()

  const localFormatted = localCals.map((c) => ({
    id: `local-${c.id}`,
    summary: c.name,
    backgroundColor: c.color,
    primary: false,
    source: "local" as const,
  }))

  const connected = await isGoogleConnected()
  let googleCals: { id: string; summary: string; backgroundColor: string; primary: boolean; source: "google" }[] = []

  if (connected) {
    const cals = await getGoogleCalendars()
    googleCals = cals.map((c) => ({ ...c, source: "google" as const }))
  }

  return Response.json({
    calendars: [...localFormatted, ...googleCals],
    connected,
  })
}
