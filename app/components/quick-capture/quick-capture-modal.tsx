"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Sparkles, X, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"
import { processQuickCapture } from "@/lib/actions/quick-capture"
import { cn } from "@/lib/utils"

type Status =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; kind: string; reason: string }
  | { phase: "error"; message: string }

const KIND_LABELS: Record<string, string> = {
  task: "Task",
  event: "Event",
  note: "Note",
  journal: "Journal entry",
  memory: "Memory",
}

const KIND_HREF: Record<string, string> = {
  task: "/tasks",
  event: "/calendar",
  note: "/notes",
  journal: "/journal",
  memory: "/memories",
}

export function QuickCaptureModal() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [status, setStatus] = useState<Status>({ phase: "idle" })
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Global hotkey: Cmd/Ctrl + Shift + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setText("")
      setStatus({ phase: "idle" })
    } else {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus({ phase: "saving" })
    startTransition(async () => {
      const result = await processQuickCapture(trimmed)
      if (result.ok) {
        setStatus({ phase: "saved", kind: result.kind, reason: result.reason })
        setTimeout(() => setOpen(false), 1500)
      } else {
        setStatus({ phase: "error", message: result.error })
      }
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-24 sm:pt-32"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-[--radius-xl] border border-border-light/40 bg-surface/95 backdrop-blur-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light/40 px-5 py-3">
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Quick Capture
            </span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-background px-1.5 text-[10px] font-medium text-foreground-tertiary">
              Esc
            </kbd>
            <button
              onClick={() => setOpen(false)}
              className="rounded-[--radius-sm] p-1 text-foreground-tertiary hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="p-5">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (status.phase !== "saving") submit()
              }
            }}
            disabled={status.phase === "saving" || status.phase === "saved"}
            placeholder="What's on your mind? Luma will route it..."
            rows={3}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground outline-none placeholder:text-foreground-quaternary disabled:opacity-60"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-light/40 px-5 py-3">
          <div className="text-[11px] text-foreground-quaternary">
            {status.phase === "idle" && (
              <span>
                Try: &ldquo;follow up with Sarah Friday&rdquo;, &ldquo;lunch with Dustin tomorrow 1pm&rdquo;,
                &ldquo;Markit pitch angle: AI for solo founders&rdquo;
              </span>
            )}
            {status.phase === "saving" && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse text-accent" />
                Routing...
              </span>
            )}
            {status.phase === "saved" && (
              <a
                href={KIND_HREF[status.kind]}
                className="flex items-center gap-1.5 text-success transition-colors hover:underline"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved as {KIND_LABELS[status.kind] ?? status.kind} — {status.reason}
              </a>
            )}
            {status.phase === "error" && (
              <span className="flex items-center gap-1.5 text-danger">
                <AlertCircle className="h-3.5 w-3.5" />
                {status.message}
              </span>
            )}
          </div>
          <button
            onClick={submit}
            disabled={!text.trim() || isPending || status.phase === "saved"}
            className={cn(
              "flex items-center gap-1.5 rounded-[--radius-md] px-3 py-1.5 text-xs font-medium transition-all",
              text.trim() && status.phase !== "saving" && status.phase !== "saved"
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-background-tertiary text-foreground-quaternary",
            )}
          >
            Capture
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
