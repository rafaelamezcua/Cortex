export const dynamic = "force-dynamic"

import {
  getWeeklyDigestData,
  getVaultStatus,
} from "@/lib/actions/reviews"
import { WeeklyDigest } from "@/app/components/dashboard/weekly-digest"

export default async function WeeklyDigestPage() {
  const [data, vault] = await Promise.all([
    getWeeklyDigestData(),
    getVaultStatus(),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Weekly digest
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground-secondary">
          The last seven days, at a glance. Ask Luma for the story.
        </p>
      </section>

      <WeeklyDigest data={data} vault={vault} />
    </div>
  )
}
