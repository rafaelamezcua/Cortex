import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { getSystemPrompt } from "@/lib/ai/system-prompt"
import { aiTools } from "@/lib/ai/tools"
import { saveMessage } from "@/lib/actions/chat"
import { stepCountIs } from "ai"

export async function POST(request: Request) {
  const { messages, conversationId } = (await request.json()) as {
    messages: UIMessage[]
    conversationId?: string
  }

  // Pull last user text first — drives memory relevance filtering and gets saved
  const lastMessage = messages[messages.length - 1]
  let lastUserText: string | undefined
  if (lastMessage?.role === "user") {
    const textPart = lastMessage.parts.find((p) => p.type === "text")
    if (textPart && textPart.type === "text") lastUserText = textPart.text
  }

  const systemPrompt = await getSystemPrompt(lastUserText)

  if (lastUserText && conversationId) {
    await saveMessage(conversationId, "user", lastUserText)
  }

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages: modelMessages,
    tools: aiTools,
    maxOutputTokens: 2048,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      if (conversationId && text) {
        await saveMessage(conversationId, "assistant", text)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
