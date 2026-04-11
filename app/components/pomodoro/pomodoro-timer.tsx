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

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode)
    setSecondsLeft(DURATIONS[newMode])
    setIsRunning(false)
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

          if (typeof window !== "undefined" && "Notification" in window) {
            new Notification(
              mode === "focus" ? "Focus session complete!" : "Break over!"
            )
          }

          if (mode === "focus") {
            const newSessions = sessions + 1
            setSessions(newSessions)
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

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission()
    }
  }, [])

  const ringSize = 260
  const ringRadius = 108
  const ringStroke = 8
  const circumference = 2 * Math.PI * ringRadius

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Mode selector */}
      <div className="flex rounded-full border border-border-light bg-surface p-1 shadow-sm">
        {(["focus", "break", "longBreak"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ease-out",
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

      {/* Timer ring */}
      <div className="relative flex items-center justify-center">
        <svg width={ringSize} height={ringSize} className="-rotate-90">
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
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className="text-[68px] font-normal leading-none tabular-nums tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary">
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => switchMode(mode)}
          aria-label="Reset timer"
          className="flex h-11 w-11 items-center justify-center rounded-full text-foreground-tertiary transition-all duration-150 ease-out hover:bg-surface-hover hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          aria-label={isRunning ? "Pause timer" : "Start timer"}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md",
            "transition-all duration-200 ease-out hover:shadow-lg active:scale-95",
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
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 ease-out",
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
