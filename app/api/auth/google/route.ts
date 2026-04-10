import { getAuthUrl } from "@/lib/integrations/google-auth"
import { redirect } from "next/navigation"

export async function GET() {
  const url = getAuthUrl()
  redirect(url)
}
