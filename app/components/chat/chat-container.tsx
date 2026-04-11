"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { LumaLogo } from "@/app/components/ui/luma-logo"
import { VaultAttachButton } from "@/app/components/ui/vault-attach-button"
import { attachChatToVault } from "@/lib/actions/vault"
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react"
import type { UIMessage } from "ai"

interface FileAttachment {
  file: File
  preview: string | null
  type: "image" | "pdf"
}

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
  const [files, setFiles] = useState<FileAttachment[]>([])

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if ((!input.trim() && files.length === 0) || isLoading) return

    if (files.length > 0) {
      // Build file parts as data URLs
      const fileUIParts: { type: "file"; url: string; mediaType: string }[] = []

      for (const attachment of files) {
        const dataUrl = await fileToDataUrl(attachment.file)
        fileUIParts.push({
          type: "file",
          url: dataUrl,
          mediaType: attachment.file.type,
        })
      }

      sendMessage({
        text: input || "What do you see in this?",
        files: fileUIParts,
      })

      setFiles([])
      setInput("")
    } else {
      sendMessage({ text: input })
      setInput("")
    }
  }

  function getMessageText(message: UIMessage): string {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("")
  }

  // Check if message has file parts
  function getMessageFiles(message: UIMessage): { type: string; data?: string; mediaType?: string }[] {
    return message.parts.filter((p) => p.type === "file") as { type: string; data?: string; mediaType?: string }[]
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header — save action, only shown when there are messages */}
      {messages.length > 0 && (
        <div className="mb-2 flex items-center justify-end">
          <VaultAttachButton
            onAttach={() => attachChatToVault(conversationId)}
            label="Save to Obsidian"
          />
        </div>
      )}
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 pb-12">
            {/* Luma avatar with aura */}
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 animate-luma-breathe"
                style={{ backgroundImage: "var(--luma-aura)" }}
              />
              <LumaLogo
                size={88}
                className="relative text-foreground drop-shadow-sm"
                aria-label="Luma"
              />
            </div>

            <div className="text-center">
              <h2
                className="text-3xl font-normal leading-tight tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                What&apos;s on your mind?
              </h2>
              <p className="mt-2 text-sm text-foreground-secondary">
                Ask me anything. I can read images and PDFs too.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {[
                "What's on my plate today?",
                "Help me plan my morning",
                "Summarize my open tasks",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground-secondary shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages
              .filter((m) => m.role !== "system")
              .map((message) => {
                const text = getMessageText(message)
                const msgFiles = getMessageFiles(message)

                if (!text && msgFiles.length === 0) return null
                return (
                  <div key={message.id}>
                    {/* Show attached files above message */}
                    {msgFiles.length > 0 && message.role === "user" && (
                      <div className="mb-1 flex justify-end">
                        <div className="flex gap-1.5">
                          {msgFiles.map((f, i) => (
                            <div
                              key={i}
                              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[--radius-md] border border-border-light bg-background-secondary"
                            >
                              {f.mediaType?.startsWith("image/") ? (
                                <span className="text-xs text-foreground-tertiary">
                                  IMG
                                </span>
                              ) : (
                                <span className="text-xs text-foreground-tertiary">
                                  PDF
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {text && (
                      <MessageBubble
                        role={message.role as "user" | "assistant"}
                        content={text}
                      />
                    )}
                  </div>
                )
              })}
            {isLoading &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-center gap-3 pl-0.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <LumaLogo
                      size={40}
                      className="animate-luma-dance text-foreground"
                      aria-label="Luma thinking"
                    />
                  </div>
                  <span className="text-sm italic text-foreground-tertiary">
                    thinking
                  </span>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="pt-4">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          files={files}
          onFilesChange={setFiles}
        />
      </div>
    </div>
  )
}
