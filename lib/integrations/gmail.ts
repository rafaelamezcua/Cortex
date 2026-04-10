import { google } from "googleapis"
import { getGoogleClient } from "./google-auth"

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  isUnread: boolean
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
          metadataHeaders: ["Subject", "From", "Date"],
        })

        const headers = detail.data.payload?.headers || []
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No subject"
        const from =
          headers.find((h) => h.name === "From")?.value || "Unknown"
        const date =
          headers.find((h) => h.name === "Date")?.value || ""

        const isUnread =
          detail.data.labelIds?.includes("UNREAD") || false

        // Clean up "from" — extract name or email
        const fromClean = from.includes("<")
          ? from.split("<")[0].trim().replace(/"/g, "")
          : from

        return {
          id: msg.id!,
          threadId: msg.threadId!,
          subject,
          from: fromClean,
          snippet: detail.data.snippet || "",
          date: date
            ? new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "",
          isUnread,
        }
      })
    )

    return messages
  } catch {
    return []
  }
}
