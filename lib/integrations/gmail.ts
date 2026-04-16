import { google } from "googleapis"
import { getGoogleClient } from "./google-auth"

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  snippet: string
  date: string
  isUnread: boolean
  messageIdHeader: string | null
}

export interface SendMessageArgs {
  to: string
  subject: string
  body: string
  threadId?: string
  inReplyTo?: string | null
}

export interface SendMessageResult {
  ok: true
  id: string
  threadId: string
}

/**
 * Encode a string as RFC 2047 Q-encoded ("encoded-word") header value so that
 * non-ASCII characters survive transport. Falls back to the raw string when
 * everything is already ASCII — keeps headers readable for the common case.
 */
function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value
  const base64 = Buffer.from(value, "utf8").toString("base64")
  return `=?UTF-8?B?${base64}?=`
}

/** Base64url-encode a UTF-8 string for the Gmail API `raw` parameter. */
function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/** Extract the bare email address from a header value like `"Name" <x@y.z>`. */
export function extractEmailAddress(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  return headerValue.trim()
}

/**
 * Return the Gmail address of the authenticated user, or `null` if Gmail
 * isn't connected. Useful for defaulting the "to" address on automated
 * emails (daily brief, weekly digest) when no override env var is set.
 */
export async function getAuthenticatedEmailAddress(): Promise<string | null> {
  const auth = await getGoogleClient()
  if (!auth) return null
  try {
    const gmail = google.gmail({ version: "v1", auth })
    const res = await gmail.users.getProfile({ userId: "me" })
    return res.data.emailAddress || null
  } catch {
    return null
  }
}

/**
 * List message metadata for messages delivered in the last `sinceMinutes`
 * window. Gmail's `after:` query uses epoch seconds. Returns an empty array
 * when Gmail isn't connected or the list call fails.
 */
export async function listRecentMessages(
  sinceMinutes: number
): Promise<GmailMessage[]> {
  const auth = await getGoogleClient()
  if (!auth) return []

  try {
    const gmail = google.gmail({ version: "v1", auth })
    const afterEpoch = Math.floor(
      (Date.now() - sinceMinutes * 60_000) / 1000
    )

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 30,
      q: `in:inbox after:${afterEpoch}`,
    })

    const messageIds = listResponse.data.messages || []
    if (messageIds.length === 0) return []

    const messages = await Promise.all(
      messageIds.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date", "Message-ID"],
        })

        const headers = detail.data.payload?.headers || []
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No subject"
        const from =
          headers.find((h) => h.name === "From")?.value || "Unknown"
        const date =
          headers.find((h) => h.name === "Date")?.value || ""
        const messageIdHeader =
          headers.find((h) => h.name?.toLowerCase() === "message-id")?.value ||
          null

        const isUnread =
          detail.data.labelIds?.includes("UNREAD") || false

        const fromClean = from.includes("<")
          ? from.split("<")[0].trim().replace(/"/g, "")
          : from
        const fromEmail = extractEmailAddress(from)

        return {
          id: msg.id!,
          threadId: msg.threadId!,
          subject,
          from: fromClean,
          fromEmail,
          snippet: detail.data.snippet || "",
          date,
          isUnread,
          messageIdHeader,
        }
      })
    )

    return messages
  } catch {
    return []
  }
}

/**
 * Fetch a full Gmail message (including payload parts) so callers can
 * extract the body. Returns `null` on any failure.
 */
export async function getMessageFull(
  messageId: string
): Promise<{
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  body: string
  labelIds: string[]
} | null> {
  const auth = await getGoogleClient()
  if (!auth) return null

  try {
    const gmail = google.gmail({ version: "v1", auth })
    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    })

    const headers = res.data.payload?.headers || []
    const subject =
      headers.find((h) => h.name === "Subject")?.value || "No subject"
    const from = headers.find((h) => h.name === "From")?.value || "Unknown"
    const fromClean = from.includes("<")
      ? from.split("<")[0].trim().replace(/"/g, "")
      : from
    const fromEmail = extractEmailAddress(from)
    const body = extractPlainBody(res.data.payload)

    return {
      id: res.data.id!,
      threadId: res.data.threadId!,
      subject,
      from: fromClean,
      fromEmail,
      body,
      labelIds: res.data.labelIds || [],
    }
  } catch {
    return null
  }
}

/** Remove the UNREAD label from a Gmail message. Returns `true` on success. */
export async function markAsRead(messageId: string): Promise<boolean> {
  const auth = await getGoogleClient()
  if (!auth) return false
  try {
    const gmail = google.gmail({ version: "v1", auth })
    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    })
    return true
  } catch {
    return false
  }
}

type GmailPart = {
  mimeType?: string | null
  body?: { data?: string | null; size?: number | null } | null
  parts?: GmailPart[] | null
}

/**
 * Walk a Gmail MIME tree and return the first `text/plain` body found,
 * falling back to a stripped `text/html` body if no plain part exists.
 */
function extractPlainBody(payload: GmailPart | null | undefined): string {
  if (!payload) return ""

  const decode = (data: string) =>
    Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    )

  const walk = (
    part: GmailPart,
    want: "text/plain" | "text/html"
  ): string | null => {
    if (part.mimeType === want && part.body?.data) {
      return decode(part.body.data)
    }
    if (part.parts) {
      for (const sub of part.parts) {
        const found = walk(sub, want)
        if (found) return found
      }
    }
    return null
  }

  const plain = walk(payload, "text/plain")
  if (plain) return plain.trim()

  const html = walk(payload, "text/html")
  if (html) {
    // Strip tags, collapse whitespace
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
  }

  return ""
}

export async function getRecentEmails(maxResults = 10): Promise<GmailMessage[]> {
  const auth = await getGoogleClient()
  if (!auth) return []

  try {
    const gmail = google.gmail({ version: "v1", auth })

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: "in:inbox",
    })

    const messageIds = listResponse.data.messages || []
    if (messageIds.length === 0) return []

    // Fetch message details in parallel
    const messages = await Promise.all(
      messageIds.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date", "Message-ID"],
        })

        const headers = detail.data.payload?.headers || []
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No subject"
        const from =
          headers.find((h) => h.name === "From")?.value || "Unknown"
        const date =
          headers.find((h) => h.name === "Date")?.value || ""
        const messageIdHeader =
          headers.find((h) => h.name?.toLowerCase() === "message-id")?.value ||
          null

        const isUnread =
          detail.data.labelIds?.includes("UNREAD") || false

        // Clean up "from" — extract name or email
        const fromClean = from.includes("<")
          ? from.split("<")[0].trim().replace(/"/g, "")
          : from
        const fromEmail = extractEmailAddress(from)

        return {
          id: msg.id!,
          threadId: msg.threadId!,
          subject,
          from: fromClean,
          fromEmail,
          snippet: detail.data.snippet || "",
          date: date
            ? new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "",
          isUnread,
          messageIdHeader,
        }
      })
    )

    return messages
  } catch {
    return []
  }
}

/**
 * Send an email via Gmail. When `threadId` is provided the message is attached
 * to that thread; when `inReplyTo` (the target message's `Message-ID` header)
 * is provided we set `In-Reply-To` and `References` so threading is preserved
 * even for recipients viewing the mail outside Gmail.
 *
 * Returns `null` on any failure (auth expired, API error, etc.) so callers can
 * surface a generic "couldn't send" state without leaking details.
 */
export async function sendMessage(
  args: SendMessageArgs
): Promise<SendMessageResult | null> {
  const { to, subject, body, threadId, inReplyTo } = args

  if (!to?.trim() || !body?.trim()) return null

  const auth = await getGoogleClient()
  if (!auth) return null

  try {
    const gmail = google.gmail({ version: "v1", auth })

    // Normalize body line endings to CRLF per RFC 5322.
    const normalizedBody = body.replace(/\r?\n/g, "\r\n")

    const headerLines: string[] = [
      `To: ${encodeHeader(to.trim())}`,
      `Subject: ${encodeHeader(subject?.trim() || "(no subject)")}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
    ]

    if (inReplyTo) {
      headerLines.push(`In-Reply-To: ${inReplyTo}`)
      headerLines.push(`References: ${inReplyTo}`)
    }

    // Body is base64-encoded in 76-char lines (per RFC 2045) so we never have
    // to worry about 8-bit content or stray CRLFs mangling the payload.
    const encodedBody = (Buffer.from(normalizedBody, "utf8").toString("base64")
      .match(/.{1,76}/g) || []).join("\r\n")

    // RFC 5322 wants CRLF between header and body.
    const raw = toBase64Url(
      `${headerLines.join("\r\n")}\r\n\r\n${encodedBody}`
    )

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        ...(threadId ? { threadId } : {}),
      },
    })

    if (!res.data.id || !res.data.threadId) return null

    return {
      ok: true,
      id: res.data.id,
      threadId: res.data.threadId,
    }
  } catch {
    return null
  }
}
