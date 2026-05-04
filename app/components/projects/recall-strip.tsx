import {
  CheckSquare,
  FileText,
  Calendar,
  Timer,
  BookOpen,
  Activity,
} from "lucide-react"
import { recallProjectActivity } from "@/lib/actions/project-recall"

const KIND_ICON = {
  task: CheckSquare,
  note: FileText,
  event: Calendar,
  focus: Timer,
  journal: BookOpen,
} as const

const KIND_LABEL = {
  task: "Task",
  note: "Note",
  event: "Event",
  focus: "Focus",
  journal: "Journal",
} as const

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = now - then
  if (diff < 0) {
    const days = Math.ceil(-diff / 86_400_000)
    if (days <= 1) return "tomorrow"
    if (days < 7) return `in ${days}d`
    return `in ${Math.ceil(days / 7)}w`
  }
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export async function RecallStrip({ projectId }: { projectId: string }) {
  const items = await recallProjectActivity(projectId, 5)
  if (items.length === 0) return null

  return (
    <section className="rounded-[--radius-lg] border border-border-light bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-3.5 w-3.5 text-accent" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-quaternary">
          What you were doing here
        </h2>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind] ?? Activity
          return (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[--radius-sm] bg-background-secondary">
                <Icon className="h-3.5 w-3.5 text-foreground-tertiary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground line-clamp-1">
                  {item.title}
                </p>
                <p className="text-[11px] text-foreground-quaternary">
                  {KIND_LABEL[item.kind] ?? item.kind} · {item.meta}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-foreground-quaternary tabular-nums">
                {relativeTime(item.timestamp)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
