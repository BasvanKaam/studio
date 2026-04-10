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
      const MAX_DOC_CHARS = 60000
      const docText = documentText.trim().length > MAX_DOC_CHARS
        ? documentText.trim().slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated to fit context limit]'
        : documentText.trim()

      if (workflowId === 'questionpool') {
        userPrompt += `\n\n---\n\nSOURCE LESSONS (${documentName || 'uploaded lessons'}):\nUse the lesson content below as the primary and only source for generating questions. Base every question strictly on what is taught in these lessons.\n\n${docText}\n\n---`
      } else {
        const modeInstructions: Record<string, string> = {
          inspiration: `Use the content below as inspiration. Draw from its structure, terminology, examples, and approach where relevant. Do not copy it directly.`,
          adapt: `Rewrite and improve the content below to fully comply with the Nerdio L&D Style Guide. Preserve the core content and the author's voice.`,
          basis: `Build the new output directly from the source document below.`,
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

    const isQuestionPool = workflowId === 'questionpool'
    const isAddie = workflowId === 'addie'
    const maxTokens = isQuestionPool ? 12000 : isAddie ? 10000 : 8000
    const useSystemPrompt = !isQuestionPool && !isAddie
    const useTools = !isQuestionPool && !isAddie

    const requestBody: Record<string, unknown> = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: useSystemPrompt ? SYSTEM_PROMPT : '',
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    }

    if (useTools) {
      requestBody.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }]
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'x-api-key': process.env.ANTHROPIC_API_KEY || '',
            },
            body: JSON.stringify(requestBody),
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

                if (event.type === 'content_block_delta') {
                  if (event.delta?.type === 'text_delta' && event.delta.text) {
                    controller.enqueue(encoder.encode(event.delta.text))
                  }
                }

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
