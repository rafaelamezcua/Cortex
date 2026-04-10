import { PomodoroTimer } from "@/app/components/pomodoro/pomodoro-timer"

export default function FocusPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Stay in the zone with the Pomodoro technique.
        </p>
      </div>

      <PomodoroTimer />
    </div>
  )
}
