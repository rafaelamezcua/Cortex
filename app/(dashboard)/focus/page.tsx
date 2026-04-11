import { PomodoroTimer } from "@/app/components/pomodoro/pomodoro-timer"

export default function FocusPage() {
  return (
    <div className="mx-auto max-w-md space-y-10">
      <section className="text-center">
        <h1
          className="text-3xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Focus
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground-secondary">
          Pick a mode and start the clock. The next 25 minutes can belong to
          one thing.
        </p>
      </section>

      <PomodoroTimer />
    </div>
  )
}
