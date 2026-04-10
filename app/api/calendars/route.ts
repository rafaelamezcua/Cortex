import { getGoogleCalendars } from "@/lib/integrations/google-calendar"
import { isGoogleConnected } from "@/lib/integrations/google-auth"

export async function GET() {
  const connected = await isGoogleConnected()
  if (!connected) {
    return Response.json({ calendars: [], connected: false })
  }

  const calendars = await getGoogleCalendars()
  return Response.json({ calendars, connected: true })
}
