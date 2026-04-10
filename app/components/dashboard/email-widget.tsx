"use client"

import { Card } from "@/app/components/ui/card"
import { Skeleton } from "@/app/components/ui/skeleton"
import { Mail, ArrowRight, Circle } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Email {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  isUnread: boolean
}

export function EmailWidget({ isConnected }: { isConnected: boolean }) {
  const [emails, setEmails] = useState<Email[] | null>(null)
  const [error, setError] = useState(false)

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
          Connect your Gmail to see your inbox
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex items-center gap-2 rounded-[--radius-md] bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Connect Google
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
      </div>

      {emails.length === 0 ? (
        <p className="text-sm text-foreground-tertiary">Inbox is empty</p>
      ) : (
        <div className="space-y-2">
          {emails.slice(0, 4).map((email) => (
            <div
              key={email.id}
              className="flex items-start gap-2 rounded-[--radius-sm] p-1.5 -mx-1.5"
            >
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
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
