import { handleCallback } from "@/lib/integrations/google-auth"
import { redirect } from "next/navigation"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    redirect("/?error=no_code")
  }

  try {
    await handleCallback(code)
  } catch (e) {
    console.error("Google OAuth callback error:", e)
    redirect("/?error=auth_failed")
  }

  redirect("/?google=connected")
}
