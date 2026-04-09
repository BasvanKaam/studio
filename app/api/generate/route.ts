import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildUserPrompt, WorkflowId } from '@/lib/workflows'
import SYSTEM_PROMPT from '@/lib/system-prompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { workflowId, fields, documentText, documentName, documentMode, extraInstructions } = await req.json()

    if (!workflowId || !fields) {
      return new Response(
        JSON.stringify({ error: 'Missing workflowId or fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let userPrompt = buildUserPrompt(workflowId as WorkflowId, fields)

    // Append extra instructions if provided
    if (extraInstructions?.trim()) {
      userPrompt += `\n\nAdditional instructions from the author:\n${extraInstructions.trim()}`
    }

    // Append document context if provided
    if (documentText?.trim()) {
      const modeInstructions: Record<string, string> = {
        inspiration: `Use the content below as inspiration. Draw from its structure, terminology, examples, and approach where relevant. Do not copy it directly — use it to inform and enrich the new content you produce.`,
        adapt: `The content below is existing material that needs to be adapted. Rewrite and improve it to fully comply with the Nerdio L&D Style Guide, correct any style violations, improve structure and clarity, and make it publication-ready. Preserve the core content and the author's voice.`,
        basis: `The content below is the source document to use as the foundation for this output. Extract the relevant information, structure, objectives, and content from it. Build the new output directly from this material.`,
      }

      const modeLabel: Record<string, string> = {
        inspiration: 'DOCUMENT FOR INSPIRATION',
        adapt: 'DOCUMENT TO ADAPT',
        basis: 'SOURCE DOCUMENT — USE AS FOUNDATION',
      }

      const mode = documentMode || 'inspiration'
      userPrompt += `

---

${modeLabel[mode] || 'REFERENCE DOCUMENT'} (${documentName || 'uploaded file'}):
${modeInstructions[mode] || modeInstructions.inspiration}

${documentText.trim()}

---`
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          })

          for await (const chunk of anthropicStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
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
