"use client"

import { cn } from "@/lib/utils"
import { Play, Pause, RotateCcw, Coffee } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createPomodoroSession } from "@/lib/actions/focus"

type Mode = "focus" | "break" | "longBreak"

const DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
}

const MODE_LABELS: Record<Mode, string> = {
  focus: "Focus",
  break: "Break",
  longBreak: "Long Break",
}

type TaskOption = {
  id: string
  title: string
  status: "todo" | "in_progress" | "done"
}

export function FocusTimer({ tasks }: { tasks: TaskOption[] }) {
  const [mode, setMode] = useState<Mode>("focus")
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  // Keep latest values available to the tick callback without restarting it.
  const modeRef = useRef(mode)
  const selectedTaskIdRef = useRef(selectedTaskId)
  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId
  }, [selectedTaskId])

  const total = DURATIONS[mode]
  const progress = ((total - secondsLeft) / total) * 100
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  // Paused when the timer is stopped partway through (not at full duration).
  const isPaused = !isRunning && secondsLeft > 0 && secondsLeft < total

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode)
    setSecondsLeft(DURATIONS[newMode])
    setIsRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    setSecondsLeft(DURATIONS[mode])
    setIsRunning(false)
  }, [mode])

  const handleToggle = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)

          const currentMode = modeRef.current
          const currentTaskId = selectedTaskIdRef.current

          if (typeof window !== "undefined" && "Notification" in window) {
            try {
              new Notification(
                currentMode === "focus"
                  ? "Focus session complete"
                  : "Break over"
              )
            } catch {
              // Notifications may be blocked; ignore.
            }
          }

          if (currentMode === "focus") {
            // Persist ONLY completed focus sessions.
            void createPomodoroSession({
              durationSeconds: DURATIONS.focus,
              taskId: currentTaskId || null,
            })
            setSessions((s) => {
              const next = s + 1
              switchMode(next % 4 === 0 ? "longBreak" : "break")
              return next
            })
          } else {
            switchMode("focus")
          }

          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, switchMode])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        void Notification.requestPermission()
      }
    }
  }, [])

  const ringSize = 260
  const ringRadius = 108
  const ringStroke = 8
  const circumference = 2 * Math.PI * ringRadius

  const activeTasks = tasks.filter((t) => t.status !== "done")

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Mode selector */}
      <div
        role="tablist"
        aria-label="Timer mode"
        className="flex rounded-full border border-border-light bg-surface p-1 shadow-sm"
      >
        {(["focus", "break", "longBreak"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200 ease-out",
              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              mode === m
                ? "bg-accent text-white shadow-sm"
                : "text-foreground-tertiary hover:text-foreground"
            )}
          >
            {m === "longBreak" ? (
              <span className="flex items-center gap-1.5">
                <Coffee className="h-3 w-3" />
                Long break
              </span>
            ) : (
              MODE_LABELS[m]
            )}
          </button>
        ))}
      </div>

      {/* Task selector — focus mode only */}
      {mode === "focus" && (
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <label
            htmlFor="focus-task"
            className="text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary"
          >
            Working on
          </label>
          <select
            id="focus-task"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className={cn(
              "h-10 w-full rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground",
              "outline-none transition-colors duration-150 ease-out",
              "hover:border-accent/40",
              "focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <option value="">No task (optional)</option>
            {activeTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg
          width={ringSize}
          height={ringSize}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke="var(--background-tertiary)"
            strokeWidth={ringStroke}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            fill="none"
            stroke={mode === "focus" ? "var(--accent)" : "var(--success)"}
            strokeWidth={ringStroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
            className="transition-opacity duration-500 ease-out"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className="text-[68px] font-normal leading-none tabular-nums tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
            aria-live="polite"
          >
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </span>
          <span className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary">
            {isPaused ? "Paused" : MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={handleReset}
          aria-label="Reset timer"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-foreground-tertiary",
            "transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleToggle}
          aria-label={
            isRunning
              ? "Pause timer"
              : isPaused
                ? "Resume timer"
                : "Start timer"
          }
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md",
            "transition-transform duration-200 ease-out hover:shadow-lg active:scale-95",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            mode === "focus" ? "bg-accent hover:bg-accent-hover" : "bg-success"
          )}
        >
          {isRunning ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
          )}
        </button>

        <div className="flex h-11 w-11 items-center justify-center">
          <span className="text-xs font-medium tabular-nums text-foreground-quaternary">
            #{sessions + 1}
          </span>
        </div>
      </div>

      {/* Session progress — 4 dots toward long break */}
      <div
        className="flex items-center gap-2"
        aria-label={`${sessions % 4} of 4 focus sessions toward long break`}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-opacity duration-300 ease-out",
              i < sessions % 4
                ? "w-8 bg-accent"
                : "w-1.5 bg-background-tertiary"
            )}
          />
        ))}
      </div>
    </div>
  )
}
