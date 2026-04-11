"use client"

import { cn } from "@/lib/utils"
import { ArrowUp, Paperclip, X, FileText } from "lucide-react"
import { type FormEvent, useRef } from "react"

interface FileAttachment {
  file: File
  preview: string | null
  type: "image" | "pdf"
}

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  files: FileAttachment[]
  onFilesChange: (files: FileAttachment[]) => void
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  files,
  onFilesChange,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    const newAttachments: FileAttachment[] = []

    for (const file of Array.from(selectedFiles)) {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file)
        newAttachments.push({ file, preview, type: "image" })
      } else if (file.type === "application/pdf") {
        newAttachments.push({ file, preview: null, type: "pdf" })
      }
    }

    onFilesChange([...files, ...newAttachments])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items
    const newAttachments: FileAttachment[] = []

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          const preview = URL.createObjectURL(file)
          newAttachments.push({ file, preview, type: "image" })
        }
      }
    }

    if (newAttachments.length > 0) {
      onFilesChange([...files, ...newAttachments])
    }
  }

  const hasContent = input.trim() || files.length > 0

  return (
    <form onSubmit={onSubmit} className="relative">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {files.map((attachment, i) => (
            <div
              key={i}
              className="relative group rounded-[--radius-md] border border-border-light overflow-hidden"
            >
              {attachment.type === "image" && attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt="Upload"
                  className="h-16 w-16 object-cover"
                />
              ) : (
                <div className="h-16 w-16 flex flex-col items-center justify-center bg-background-secondary">
                  <FileText className="h-5 w-5 text-accent" />
                  <span className="text-[9px] text-foreground-tertiary mt-0.5">PDF</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative rounded-[--radius-2xl] border border-border bg-surface shadow-sm",
          "transition-all duration-200 ease-out",
          "focus-within:border-accent/60 focus-within:shadow-md"
        )}
      >
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              if (hasContent && !isLoading) {
                const form = e.currentTarget.closest("form")
                if (form) form.requestSubmit()
              }
            }
          }}
          placeholder="Tell Luma what's on your mind"
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent py-4 pl-14 pr-14 text-[15px] leading-relaxed text-foreground",
            "outline-none placeholder:text-foreground-quaternary"
          )}
        />

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-[--radius-md] text-foreground-tertiary transition-colors duration-150 hover:bg-accent-subtle hover:text-accent"
        >
          <Paperclip className="h-[18px] w-[18px]" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!hasContent || isLoading}
          aria-label="Send message"
          className={cn(
            "absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ease-out",
            hasContent && !isLoading
              ? "bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:scale-[0.96]"
              : "bg-background-tertiary text-foreground-quaternary"
          )}
        >
          <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
      </div>
    </form>
  )
}
