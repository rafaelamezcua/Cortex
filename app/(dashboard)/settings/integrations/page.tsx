import { isGoogleConnected } from "@/lib/integrations/google-auth"
import { isCanvasConnected } from "@/lib/integrations/canvas"
import { GoogleIntegrationCard } from "@/app/components/settings/google-integration-card"
import { CheckCircle2, Circle } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  const [googleConnected, canvasConnected] = await Promise.all([
    isGoogleConnected(),
    isCanvasConnected(),
  ])

  const canvasUrl = process.env.CANVAS_API_URL
  const canvasConfigured = Boolean(process.env.CANVAS_API_URL && process.env.CANVAS_API_TOKEN)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section>
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Integrations
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground-secondary">
          Services Luma connects to. Credentials live in <code className="rounded bg-surface px-1 py-0.5 text-[13px]">.env.local</code> — restart the dev server after changes.
        </p>
      </section>

      <div className="space-y-4">
        <GoogleIntegrationCard connected={googleConnected} />

        <div className="rounded-[--radius-lg] border border-border-light bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-foreground">Canvas</h2>
                {canvasConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : canvasConfigured ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                    <Circle className="h-3 w-3" />
                    Configured, token invalid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground-tertiary/10 px-2 py-0.5 text-[11px] font-medium text-foreground-tertiary">
                    <Circle className="h-3 w-3" />
                    Not configured
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-foreground-tertiary">
                Pulls your upcoming assignments and grades.
                {canvasUrl && (
                  <>
                    {" "}
                    Base URL: <span className="font-mono text-foreground-secondary">{canvasUrl}</span>
                  </>
                )}
              </p>
              {!canvasConfigured && (
                <p className="mt-2 text-xs text-foreground-tertiary">
                  Set <code className="rounded bg-background-secondary px-1 py-0.5">CANVAS_API_URL</code> and <code className="rounded bg-background-secondary px-1 py-0.5">CANVAS_API_TOKEN</code> in <code className="rounded bg-background-secondary px-1 py-0.5">.env.local</code>.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
