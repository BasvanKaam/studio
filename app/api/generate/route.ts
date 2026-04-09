import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildUserPrompt, WorkflowId } from '@/lib/workflows'
import fs from 'fs'
import path from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function loadSystemPrompt(): string {
  try {
    const filePath = path.join(process.cwd(), 'system-prompt.md')
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return 'You are an expert instructional designer for Nerdio Learning & Development. Apply all Nerdio L&D style rules.'
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workflowId, fields } = await req.json()

    if (!workflowId || !fields) {
      return new Response(
        JSON.stringify({ error: 'Missing workflowId or fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = loadSystemPrompt()
    const userPrompt = buildUserPrompt(workflowId as WorkflowId, fields)

    // Stream the response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          })

          for await (const chunk of anthropicStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }

          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Generation failed'
          controller.enqueue(encoder.encode(`\n\n[ERROR: ${message}]`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
