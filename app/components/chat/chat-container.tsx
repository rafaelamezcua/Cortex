"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react"
import type { UIMessage } from "ai"

interface ChatContainerProps {
  conversationId: string
  initialMessages?: { role: "user" | "assistant"; content: string }[]
}

export function ChatContainer({
  conversationId,
  initialMessages = [],
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")

  // Convert initial messages to UIMessage format
  const uiInitialMessages: UIMessage[] = useMemo(
    () =>
      initialMessages.map((m, i) => ({
        id: `init-${i}`,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
      })),
    [initialMessages]
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId]
  )

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    transport,
    messages: uiInitialMessages,
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  // Extract text content from message parts
  function getMessageText(message: UIMessage): string {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("")
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-light">
              <Image src="/luma-logo.svg" alt="Luma" width={36} height={36} />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold tracking-tight">
                Chat with Luma
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                Ask me anything, or let me help manage your tasks.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                "What are my tasks?",
                "Help me plan my day",
                "Create a new task",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages
              .filter((m) => m.role !== "system")
              .map((message) => {
                const text = getMessageText(message)
                if (!text) return null
                return (
                  <MessageBubble
                    key={message.id}
                    role={message.role as "user" | "assistant"}
                    content={text}
                  />
                )
              })}
            {isLoading &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 items-end">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-light">
                    <Image
                      src="/luma-logo.svg"
                      alt="Luma thinking"
                      width={20}
                      height={20}
                      className="animate-luma-dance"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-[--radius-xl] border border-border-light/60 bg-surface px-4 py-3 shadow-sm">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border-light pt-4">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
        <p className="mt-2 text-center text-xs text-foreground-quaternary">
          Luma can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
