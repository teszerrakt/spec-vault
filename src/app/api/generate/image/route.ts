import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import { auth } from '@/auth'
import { getImageExtractionPrompt, getUserPrompt, SYSTEM_PROMPT } from '@/lib/ai/prompts'

/**
 * Streaming API route for image-to-OpenAPI conversion.
 *
 * Process:
 * 1. Extract text from image using vision (non-streaming, faster)
 * 2. Convert extracted text to OpenAPI (streaming)
 *
 * The extraction step is kept non-streaming because it's typically fast
 * and the main bottleneck is the OpenAPI generation.
 */
export async function POST(request: Request) {
  // Auth check
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { imageData, mimeType } = await request.json()

    if (!imageData || typeof imageData !== 'string') {
      return new Response('Missing or invalid imageData', { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response('OpenAI API key not configured', { status: 500 })
    }

    const openai = createOpenAI({ apiKey })

    // Step 1: Extract text from image (non-streaming for speed)
    const extractionResult = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: imageData,
              mediaType: mimeType || 'image/png',
            },
            {
              type: 'text',
              text: getImageExtractionPrompt(),
            },
          ],
        },
      ],
      maxOutputTokens: 2048,
      temperature: 0.1,
    })

    // Step 2: Convert extracted text to OpenAPI (streaming)
    const result = streamText({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      prompt: getUserPrompt('text', extractionResult.text),
      temperature: 0.2,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Generate image API error:', error)
    return new Response(error instanceof Error ? error.message : 'Internal server error', {
      status: 500,
    })
  }
}
