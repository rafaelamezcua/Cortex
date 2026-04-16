import { sendMessage } from "@/lib/integrations/gmail"

// Basic permissive email pattern — Gmail itself will do the real validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 })
  }

  const { to, subject, body, threadId, inReplyTo } = payload as {
    to?: unknown
    subject?: unknown
    body?: unknown
    threadId?: unknown
    inReplyTo?: unknown
  }

  if (typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    return Response.json(
      { error: "A valid recipient is required" },
      { status: 400 }
    )
  }

  if (typeof body !== "string" || !body.trim()) {
    return Response.json(
      { error: "Message body is required" },
      { status: 400 }
    )
  }

  if (subject !== undefined && typeof subject !== "string") {
    return Response.json({ error: "Invalid subject" }, { status: 400 })
  }

  if (threadId !== undefined && typeof threadId !== "string") {
    return Response.json({ error: "Invalid threadId" }, { status: 400 })
  }

  if (inReplyTo !== undefined && inReplyTo !== null && typeof inReplyTo !== "string") {
    return Response.json({ error: "Invalid inReplyTo" }, { status: 400 })
  }

  const result = await sendMessage({
    to: to.trim(),
    subject: typeof subject === "string" ? subject : "",
    body,
    threadId: typeof threadId === "string" && threadId ? threadId : undefined,
    inReplyTo:
      typeof inReplyTo === "string" && inReplyTo ? inReplyTo : null,
  })

  if (!result) {
    return Response.json(
      { error: "Unable to send email. Reconnect Gmail and try again." },
      { status: 502 }
    )
  }

  return Response.json(result)
}
