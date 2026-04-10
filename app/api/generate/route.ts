import { NextRequest } from 'next/server'
import { buildUserPrompt, WorkflowId } from '@/lib/workflows'
import SYSTEM_PROMPT from '@/lib/system-prompt'

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

    if (extraInstructions?.trim()) {
      userPrompt += `\n\nAdditional instructions from the author:\n${extraInstructions.trim()}`
    }

    if (documentText?.trim()) {
      // Cap document text to avoid exceeding context limits (~60k chars ≈ ~15k tokens)
      const MAX_DOC_CHARS = 60000
      const docText = documentText.trim().length > MAX_DOC_CHARS
        ? documentText.trim().slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated to fit context limit]'
        : documentText.trim()

      if (workflowId === 'questionpool') {
        // For question pools, always treat uploaded content as source lessons
        userPrompt += `\n\n---\n\nSOURCE LESSONS (${documentName || 'uploaded lessons'}):\nUse the lesson content below as the primary and only source for generating questions. Base every question strictly on what is taught in these lessons. Do not add content that is not present in the lessons.\n\n${docText}\n\n---`
      } else {
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
        userPrompt += `\n\n---\n\n${modeLabel[mode] || 'REFERENCE DOCUMENT'} (${documentName || 'uploaded file'}):\n${modeInstructions[mode] || modeInstructions.inspiration}\n\n${docText}\n\n---`
      }
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call Anthropic API directly with web_search tool enabled
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'x-api-key': process.env.ANTHROPIC_API_KEY || '',
            },
            body: JSON.stringify(
              workflowId === 'questionpool'
                ? {
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 12000,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: userPrompt }],
                    stream: true,
                  }
                : {
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 8000,
                    system: SYSTEM_PROMPT,
                    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
                    messages: [{ role: 'user', content: userPrompt }],
                    stream: true,
                  }
            ),
          })

          if (!response.ok) {
            const err = await response.text()
            controller.enqueue(encoder.encode(`\n\n[ERROR: ${err}]`))
            controller.close()
            return
          }

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          if (!reader) throw new Error('No response stream')

          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const event = JSON.parse(data)

                // Stream text deltas
                if (event.type === 'content_block_delta') {
                  if (event.delta?.type === 'text_delta' && event.delta.text) {
                    controller.enqueue(encoder.encode(event.delta.text))
                  }
                }

                // Signal when web search starts
                if (event.type === 'content_block_start') {
                  if (event.content_block?.type === 'tool_use' && event.content_block?.name === 'web_search') {
                    controller.enqueue(encoder.encode('__SEARCHING__'))
                  }
                }
              } catch {
                // Skip malformed lines
              }
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
