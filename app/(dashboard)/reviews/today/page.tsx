export const dynamic = "force-dynamic"

import { getTodayReviewData } from "@/lib/actions/reviews"
import { EveningReview } from "@/app/components/dashboard/evening-review"

export default async function TodayReviewPage() {
  const data = await getTodayReviewData()

  const dateLabel = new Date(data.date + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" }
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Today's review
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground-secondary">
          A quiet look back at {dateLabel}. Let me draft something, then make
          it yours.
        </p>
      </section>

      <EveningReview data={data} />
    </div>
  )
}
