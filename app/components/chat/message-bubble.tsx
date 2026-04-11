import { cn } from "@/lib/utils"
import { LumaLogo } from "@/app/components/ui/luma-logo"
import ReactMarkdown from "react-markdown"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[80%] rounded-[--radius-xl] rounded-tr-md px-4 py-2.5",
            "bg-accent text-[15px] leading-relaxed text-white shadow-sm"
          )}
        >
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    )
  }

  // Luma messages are inline editorial — avatar in the margin, text flows
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center pt-0.5">
        <LumaLogo size={40} className="text-foreground" aria-label="Luma" />
      </div>
      <div className="min-w-0 flex-1 max-w-[85%] pt-0.5">
        <div className="text-[15px] leading-relaxed text-foreground">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic text-foreground-secondary">{children}</em>
              ),
              code: ({ children }) => (
                <code className="rounded-[--radius-xs] bg-surface-active px-1.5 py-0.5 font-mono text-[13px]">
                  {children}
                </code>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              h1: ({ children }) => (
                <p className="mb-2 font-semibold">{children}</p>
              ),
              h2: ({ children }) => (
                <p className="mb-2 font-semibold">{children}</p>
              ),
              h3: ({ children }) => (
                <p className="mb-2 font-semibold">{children}</p>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
