"use client"

import { cn } from "@/lib/utils"
import { Play, Pause, RotateCcw, Coffee } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"

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

export function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>("focus")
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  const total = DURATIONS[mode]
  const progress = ((total - secondsLeft) / total) * 100

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  const switchMode = useCallback(
    (newMode: Mode) => {
      setMode(newMode)
      setSecondsLeft(DURATIONS[newMode])
      setIsRunning(false)
    },
    []
  )

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)

          // Play notification sound
          if (typeof window !== "undefined" && "Notification" in window) {
            new Notification(
              mode === "focus" ? "Focus session complete!" : "Break over!"
            )
          }

          if (mode === "focus") {
            const newSessions = sessions + 1
            setSessions(newSessions)
            // Every 4 sessions, long break
            switchMode(newSessions % 4 === 0 ? "longBreak" : "break")
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
  }, [isRunning, mode, sessions, switchMode])

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission()
    }
  }, [])

  const circumference = 2 * Math.PI * 90

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Mode selector */}
      <div className="flex rounded-[--radius-md] border border-border-light bg-background-secondary p-0.5">
        {(["focus", "break", "longBreak"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-[--radius-sm] px-4 py-2 text-xs font-medium transition-all",
              mode === m
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground-tertiary hover:text-foreground"
            )}
          >
            {m === "longBreak" ? (
              <span className="flex items-center gap-1.5">
                <Coffee className="h-3 w-3" />
                Long Break
              </span>
            ) : (
              MODE_LABELS[m]
            )}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="relative flex items-center justify-center">
        <svg width="220" height="220" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="110"
            cy="110"
            r="90"
            fill="none"
            stroke="var(--background-tertiary)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="110"
            cy="110"
            r="90"
            fill="none"
            stroke={mode === "focus" ? "var(--accent)" : "var(--success)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-5xl font-bold tracking-tight tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-sm text-foreground-tertiary mt-1">
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => switchMode(mode)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg active:scale-95",
            mode === "focus" ? "bg-accent" : "bg-success"
          )}
        >
          {isRunning ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </button>

        <div className="flex h-10 w-10 items-center justify-center">
          <span className="text-xs font-medium text-foreground-quaternary">
            #{sessions + 1}
          </span>
        </div>
      </div>

      {/* Session count */}
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              i < sessions % 4
                ? mode === "focus"
                  ? "bg-accent"
                  : "bg-success"
                : "bg-background-tertiary"
            )}
          />
        ))}
      </div>
    </div>
  )
}
