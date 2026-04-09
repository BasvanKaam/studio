import { NextRequest } from 'next/server'

const APPLY_SYSTEM_PROMPT = `You are a Nerdio L&D content editor. You receive a piece of content and a list of style findings. Apply every MUST FIX and SHOULD FIX finding to the content and return the fully corrected version.

Rules:
- Apply every MUST FIX and SHOULD FIX finding precisely using the NEW text from each finding
- Do not change anything not in the findings list
- Preserve the author's voice and all content without findings
- Return only the corrected content — no commentary, no preamble, no explanation
- Maintain the exact same structure and formatting as the original`

export async function POST(req: NextRequest) {
  try {
    const { content, reviewOutput, workflowId } = await req.json()

    if (!content || !reviewOutput) {
      return new Response(JSON.stringify({ error: 'Missing content or review' }), { status: 400 })
    }

    const applyPrompt = `Apply all MUST FIX and SHOULD FIX findings from the review below to the ${workflowId === 'addie' ? 'ADDIE document' : workflowId === 'videoscript' ? 'video script' : 'lesson'} content. Return only the corrected content.

---

ORIGINAL CONTENT:
${content}

---

FINDINGS TO APPLY:
${reviewOutput}`

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
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 8000,
              system: APPLY_SYSTEM_PROMPT,
              messages: [{ role: 'user', content: applyPrompt }],
              stream: true,
            }),
          })

          if (!response.ok) {
            const err = await response.text()
            controller.enqueue(encoder.encode(`[ERROR: ${err}]`))
            controller.close()
            return
          }

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          if (!reader) throw new Error('No stream')

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
                if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode(event.delta.text))
                }
              } catch { /* skip */ }
            }
          }
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`[ERROR: ${err instanceof Error ? err.message : 'Apply failed'}]`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }),
      { status: 500 }
    )
  }
}
