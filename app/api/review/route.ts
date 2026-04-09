import { NextRequest } from 'next/server'

const REVIEW_SYSTEM_PROMPT = `You are a Nerdio L&D content reviewer. Review content for style compliance and factual accuracy. Be concise — flag issues clearly but briefly.

SEVERITY: MUST FIX (hard violation), SHOULD FIX (style issue), NICE TO HAVE (minor).

KEY RULES:
- Titles/H2s: imperative or noun phrase, no gerunds, no "How to…", sentence-style caps, no period at end
- Steps: bare imperative, no "you [verb]", period at end
- Bullets: capital first letter, list intro ends with colon
- "choose" → "select" for UI; "show" → "display"; "simply/easy/just" → remove
- "Nerdio" alone → "Nerdio Manager" when referring to product
- No quotes around UI labels — use bold
- Semicolons → period or colon; no future tense; no em/en dash
- Contractions preferred; "training" → "lesson"; "portal" → "application"
- Private preview must be disclosed if applicable; no tables in lesson body
- NME/NMM → write out full product name

OUTPUT — use exactly this structure:

## Quality review

### Style findings
For each issue: **[SEVERITY]** | [location] / OLD: "..." / NEW: "..." / RULE: [rule]
If none: "No style issues found."

### KB verification
Search nmehelp.getnerdio.com or nmmhelp.getnerdio.com for Nerdio-specific claims.
✅ VERIFIED — [claim] | [article title]
⚠ OUTDATED — [claim] | [note]
❌ INCORRECT — [claim] | Correction: [info]
❓ NOT FOUND — [claim] | SME review required

### SME review required
List claims needing expert confirmation.

### Overall verdict
✅ Ready for SME review / ⚠ Revise before SME review — [n] must-fix / ❌ Significant revision required`

export async function POST(req: NextRequest) {
  try {
    const { content, workflowId } = await req.json()
    if (!content) return new Response(JSON.stringify({ error: 'No content' }), { status: 400 })

    // Trim content to max 6000 chars to stay within token limits
    const trimmed = content.length > 6000
      ? content.slice(0, 6000) + '\n\n[Content trimmed for review — full version in output panel]'
      : content

    const reviewPrompt = `Review this ${workflowId === 'addie' ? 'ADDIE document' : workflowId === 'videoscript' ? 'video script' : 'lesson'}. Search the Nerdio Help Center to verify claims.\n\n${trimmed}`

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
              max_tokens: 3000,
              system: REVIEW_SYSTEM_PROMPT,
              tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
              messages: [{ role: 'user', content: reviewPrompt }],
              stream: true,
            }),
          })

          if (!response.ok) {
            controller.enqueue(encoder.encode(`[ERROR: ${await response.text()}]`))
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
                if (event.type === 'content_block_start' && event.content_block?.name === 'web_search') {
                  controller.enqueue(encoder.encode('\n[Searching Nerdio documentation…]\n'))
                }
              } catch { /* skip */ }
            }
          }
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`[ERROR: ${err instanceof Error ? err.message : 'Review failed'}]`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }), { status: 500 })
  }
}
