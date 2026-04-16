export const dynamic = "force-dynamic"

import { getRules, getRecentRuns } from "@/lib/actions/rules"
import { RulesList } from "@/app/components/rules/rules-list"
import { RunsPanel } from "@/app/components/rules/runs-panel"

export default async function RulesPage() {
  const [rules, runs] = await Promise.all([
    getRules(),
    getRecentRuns(10),
  ])

  const ruleNames: Record<string, string> = {}
  for (const r of rules) ruleNames[r.id] = r.name

  return (
    <div className="space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Rules
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground-secondary">
          When something happens, do something. Luma reacts to tasks, habits, and
          the morning brief so you don&rsquo;t have to remember.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <RulesList rules={rules} />
        <RunsPanel runs={runs} ruleNames={ruleNames} />
      </div>
    </div>
  )
}
