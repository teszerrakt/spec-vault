import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { auth } from '@/auth'
import { getUserPrompt, SYSTEM_PROMPT } from '@/lib/ai/prompts'

/**
 * Streaming API route for text-to-OpenAPI conversion.
 * Uses Vercel AI SDK's streamText to avoid Vercel serverless timeout.
 */
export async function POST(request: Request) {
  // Auth check
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { sourceType, content } = await request.json()

    if (!content || typeof content !== 'string') {
      return new Response('Missing or invalid content', { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response('OpenAI API key not configured', { status: 500 })
    }

    const openai = createOpenAI({ apiKey })

    const result = streamText({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      prompt: getUserPrompt(sourceType || 'text', content),
      temperature: 0.2,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Generate API error:', error)
    return new Response(error instanceof Error ? error.message : 'Internal server error', {
      status: 500,
    })
  }
}
