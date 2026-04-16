import { google } from "googleapis"
import { db } from "@/lib/db"
import { oauthTokens } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
]

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  })
}

export async function handleCallback(code: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing tokens from Google")
  }

  // Upsert tokens
  const existing = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.provider, "google"))
    .get()

  const now = new Date().toISOString()
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600000).toISOString()

  if (existing) {
    await db
      .update(oauthTokens)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: SCOPES.join(" "),
        updatedAt: now,
      })
      .where(eq(oauthTokens.id, existing.id))
  } else {
    await db.insert(oauthTokens).values({
      id: nanoid(),
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: SCOPES.join(" "),
      updatedAt: now,
    })
  }
}

export async function getGoogleClient() {
  const tokenRecord = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.provider, "google"))
    .get()

  if (!tokenRecord) return null

  const client = createOAuth2Client()
  client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: new Date(tokenRecord.expiresAt).getTime(),
  })

  // Auto-refresh if expired
  const now = Date.now()
  const expiresAt = new Date(tokenRecord.expiresAt).getTime()
  if (now >= expiresAt - 60000) {
    try {
      const { credentials } = await client.refreshAccessToken()
      const newExpiry = credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : new Date(Date.now() + 3600000).toISOString()

      await db
        .update(oauthTokens)
        .set({
          accessToken: credentials.access_token!,
          expiresAt: newExpiry,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oauthTokens.id, tokenRecord.id))
    } catch {
      // Token refresh failed — user needs to re-authenticate
      return null
    }
  }

  return client
}

export async function isGoogleConnected(): Promise<boolean> {
  const client = await getGoogleClient()
  return client !== null
}

export async function disconnectGoogle() {
  await db.delete(oauthTokens).where(eq(oauthTokens.provider, "google"))
}
