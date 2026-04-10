"use client"

import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"
import { type FormEvent } from "react"

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="relative">
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (input.trim() && !isLoading) {
              const form = e.currentTarget.closest("form")
              if (form) form.requestSubmit()
            }
          }
        }}
        placeholder="Message Luma..."
        rows={1}
        className={cn(
          "w-full resize-none rounded-[--radius-lg] border border-border bg-surface py-3 pl-4 pr-12 text-sm text-foreground",
          "outline-none transition-colors duration-150",
          "placeholder:text-foreground-quaternary",
          "focus:border-accent focus:ring-2 focus:ring-accent/20"
        )}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className={cn(
          "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-[--radius-md] transition-colors duration-150",
          input.trim() && !isLoading
            ? "bg-accent text-white hover:bg-accent-hover"
            : "bg-background-tertiary text-foreground-quaternary"
        )}
        aria-label="Send message"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  )
}
