import { cn } from "@/lib/utils"
import { Sparkles, User } from "lucide-react"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user"

  return (
    <div
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-foreground text-background"
            : "bg-accent-light"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-accent" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn(
          "max-w-[75%] rounded-[--radius-lg] px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-accent text-white"
            : "bg-surface border border-border-light text-foreground"
        )}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  )
}
