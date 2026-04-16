import { getSettings } from "@/lib/actions/settings"
import { NotificationsForm } from "@/app/components/settings/notifications-form"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const stored = await getSettings([
    "daily_brief_enabled",
    "daily_brief_email",
    "weekly_digest_enabled",
    "weekly_digest_email",
  ])

  const envDailyBriefEmail = process.env.LUMA_DAILY_BRIEF_EMAIL?.trim() || null
  const envWeeklyDigestEmail = process.env.LUMA_WEEKLY_DIGEST_EMAIL?.trim() || null

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Notifications
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground-secondary">
          Where Luma sends scheduled emails. Requires Google to be connected so Luma can send via Gmail.
        </p>
      </section>

      <NotificationsForm
        initialDailyBriefEnabled={stored["daily_brief_enabled"] !== "0"}
        initialDailyBriefEmail={stored["daily_brief_email"] ?? ""}
        initialWeeklyDigestEnabled={stored["weekly_digest_enabled"] !== "0"}
        initialWeeklyDigestEmail={stored["weekly_digest_email"] ?? ""}
        envDailyBriefEmail={envDailyBriefEmail}
        envWeeklyDigestEmail={envWeeklyDigestEmail}
      />
    </div>
  )
}
