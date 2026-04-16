"use client"

import { Card } from "@/app/components/ui/card"
import { Skeleton } from "@/app/components/ui/skeleton"
import { Button } from "@/app/components/ui/button"
import { Mail, Circle, X, Reply, Pencil, Check } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  snippet: string
  date: string
  isUnread: boolean
  messageIdHeader: string | null
}

type SendState = "idle" | "sending" | "sent" | "error"

interface ComposeValues {
  to: string
  subject: string
  body: string
  threadId?: string
  inReplyTo?: string | null
}

async function postSend(values: ComposeValues): Promise<string | null> {
  try {
    const res = await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return typeof data?.error === "string"
        ? data.error
        : "Couldn't send message"
    }
    return null
  } catch {
    return "Couldn't send message"
  }
}

function ReplyForm({
  email,
  onClose,
}: {
  email: Email
  onClose: () => void
}) {
  const [body, setBody] = useState("")
  const [state, setState] = useState<SendState>("idle")
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const subject = email.subject.toLowerCase().startsWith("re:")
    ? email.subject
    : `Re: ${email.subject}`

  async function handleSend() {
    if (!body.trim() || state === "sending") return
    setState("sending")
    setError(null)
    const err = await postSend({
      to: email.fromEmail,
      subject,
      body,
      threadId: email.threadId,
      inReplyTo: email.messageIdHeader,
    })
    if (err) {
      setState("error")
      setError(err)
      return
    }
    setState("sent")
    setTimeout(onClose, 900)
  }

  return (
    <div className="mt-2 rounded-[--radius-md] border border-border-light bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-foreground-tertiary">
          To {email.fromEmail}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reply"
          className="rounded-[--radius-sm] p-1 text-foreground-quaternary outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply"
        rows={3}
        className="w-full resize-none rounded-[--radius-sm] border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-quaternary focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
      {error && (
        <p className="mt-1.5 text-[11px] text-danger">{error}</p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          type="button"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSend}
          loading={state === "sending"}
          disabled={!body.trim() || state === "sent"}
          type="button"
        >
          {state === "sent" ? (
            <>
              <Check className="h-3 w-3" />
              Sent
            </>
          ) : (
            "Send"
          )}
        </Button>
      </div>
    </div>
  )
}

function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [state, setState] = useState<SendState>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSend() {
    if (!to.trim() || !body.trim() || state === "sending") return
    setState("sending")
    setError(null)
    const err = await postSend({ to, subject, body })
    if (err) {
      setState("error")
      setError(err)
      return
    }
    setState("sent")
    setTimeout(onClose, 900)
  }

  return (
    <div
      // z-index 50: above dashboard chrome but below root toasts; documented per rules.
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color:rgba(20,16,10,0.45)] p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New email"
        className="w-full max-w-md origin-bottom rounded-[--radius-xl] border border-border-light bg-surface-floating p-5 shadow-[var(--shadow-hearth)] sm:origin-center"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">New email</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[--radius-sm] p-1 text-foreground-tertiary outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            autoFocus
            className="h-9 w-full rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-quaternary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="h-9 w-full rounded-[--radius-md] border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-quaternary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            rows={6}
            className="w-full resize-none rounded-[--radius-md] border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-quaternary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {error && (
          <p className="mt-2 text-xs text-danger">{error}</p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            loading={state === "sending"}
            disabled={!to.trim() || !body.trim() || state === "sent"}
            type="button"
          >
            {state === "sent" ? (
              <>
                <Check className="h-3 w-3" />
                Sent
              </>
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function EmailWidget({ isConnected }: { isConnected: boolean }) {
  const [emails, setEmails] = useState<Email[] | null>(null)
  const [error, setError] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    if (!isConnected) return

    fetch("/api/gmail")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setEmails(data.emails))
      .catch(() => setError(true))
  }, [isConnected])

  if (!isConnected) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
            <Mail className="h-[18px] w-[18px] text-accent" />
          </div>
          <h2 className="text-sm font-medium text-foreground-secondary">
            Email
          </h2>
        </div>
        <p className="text-sm text-foreground-tertiary mb-3">
          Connect Gmail to read and send from your inbox
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 rounded-[--radius-md] bg-accent px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Connect Gmail
        </a>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
            <Mail className="h-[18px] w-[18px] text-accent" />
          </div>
          <h2 className="text-sm font-medium text-foreground-secondary">Email</h2>
        </div>
        <p className="text-xs text-foreground-tertiary">Unable to fetch emails</p>
      </Card>
    )
  }

  if (!emails) {
    return (
      <Card className="col-span-1">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </Card>
    )
  }

  const unreadCount = emails.filter((e) => e.isUnread).length

  return (
    <>
      <Card className="col-span-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[--radius-md] bg-accent-light">
              <Mail className="h-[18px] w-[18px] text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground-secondary">
                Email
              </h2>
              {unreadCount > 0 && (
                <p className="text-xs text-accent">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1 rounded-[--radius-sm] px-2 py-1 text-xs font-medium text-foreground-secondary outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            aria-label="New email"
          >
            <Pencil className="h-3 w-3" />
            New
          </button>
        </div>

        {emails.length === 0 ? (
          <p className="text-sm text-foreground-tertiary">Inbox is empty</p>
        ) : (
          <div className="space-y-2">
            {emails.slice(0, 4).map((email) => {
              const isReplying = replyingTo === email.id
              return (
                <div
                  key={email.id}
                  className="rounded-[--radius-sm] p-1.5 -mx-1.5 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-start gap-2">
                    {email.isUnread && (
                      <Circle className="mt-1.5 h-1.5 w-1.5 shrink-0 fill-accent text-accent" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">
                          {email.from}
                        </p>
                        <p className="text-xs text-foreground-quaternary shrink-0">
                          {email.date}
                        </p>
                      </div>
                      <p className="text-xs text-foreground-secondary truncate">
                        {email.subject}
                      </p>
                    </div>
                    {!isReplying && (
                      <button
                        type="button"
                        onClick={() => setReplyingTo(email.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-[--radius-sm] px-1.5 py-0.5 text-[11px] font-medium text-foreground-tertiary outline-none transition-colors hover:bg-surface-active hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                        aria-label={`Reply to ${email.from}`}
                      >
                        <Reply className="h-3 w-3" />
                        Reply
                      </button>
                    )}
                  </div>

                  {isReplying && (
                    <ReplyForm
                      email={email}
                      onClose={() => setReplyingTo(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </>
  )
}
