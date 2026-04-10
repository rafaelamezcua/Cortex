"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import Image from "next/image"
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
                Ask me anything, manage tasks, or send me images and PDFs.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                "What are my tasks?",
                "Help me plan my day",
                "What assignments do I have?",
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
                const msgFiles = getMessageFiles(message)

                if (!text && msgFiles.length === 0) return null
                return (
                  <div key={message.id}>
                    {/* Show attached files above message */}
                    {msgFiles.length > 0 && message.role === "user" && (
                      <div className="flex justify-end mb-1">
                        <div className="flex gap-1.5">
                          {msgFiles.map((f, i) => (
                            <div
                              key={i}
                              className="h-16 w-16 rounded-[--radius-md] border border-border-light overflow-hidden bg-background-secondary flex items-center justify-center"
                            >
                              {f.mediaType?.startsWith("image/") ? (
                                <span className="text-xs text-foreground-tertiary">📷</span>
                              ) : (
                                <span className="text-xs text-foreground-tertiary">📄</span>
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
          files={files}
          onFilesChange={setFiles}
        />
        <p className="mt-2 text-center text-xs text-foreground-quaternary">
          Luma can read images and PDFs. Paste or attach files.
        </p>
      </div>
    </div>
  )
}
