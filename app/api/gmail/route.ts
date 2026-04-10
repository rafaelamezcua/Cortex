import { getRecentEmails } from "@/lib/integrations/gmail"

export async function GET() {
  const emails = await getRecentEmails(8)
  return Response.json({ emails })
}
