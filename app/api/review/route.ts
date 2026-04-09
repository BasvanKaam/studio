import { NextRequest } from 'next/server'

const REVIEW_SYSTEM_PROMPT = `You are the Nerdio Review Assistant. Review L&D content for style compliance and factual accuracy.

SEVERITY LEVELS: MUST FIX (hard rule violation), SHOULD FIX (style issue), NICE TO HAVE (minor improvement).

KEY STYLE RULES:
- Titles and H2s: imperative or noun phrase — never gerunds (-ing), never "How to…"
- Headings: sentence-style capitalisation, no period at end
- Numbered steps: bare imperative, no "you [verb]", period at end
- Bullets: every item starts with capital letter, list intro ends with colon
- "choose" → "select" for UI interactions; "show" → "display"
- "simply", "easy", "just" → remove or replace
- "Nerdio" alone → "Nerdio Manager" when referring to the product
- No quotation marks around UI labels — use bold
- Semicolons → period or colon
- Future tense → present tense in explanatory text
- Contractions preferred: "you're", "it's", "you've"
- "training" → "lesson"; "student" → "learner"; "portal" → "application"
- "deliberately" → "intentionally"; "care about" → "need to handle"
- Every list introduced by a sentence ending in colon
- No "e.g." → "for example"; no "i.e." → "that is"
- NME / NMM → always write out full product name
- Private preview status must be explicitly disclosed if applicable
- No tables in lesson content (except meta/objectives/glossary)
- Numbered headings: en dash → colon ("Use case 1 – Title" → "Use case 1: Title")

OUTPUT FORMAT — use exactly this structure:

## Quality review

### Style findings

For each issue:
**[MUST FIX / SHOULD FIX / NICE TO HAVE]** | [location]
OLD: "[exact text]"
NEW: "[corrected text]"
RULE: [rule]

If none: "No style issues found."

### KB verification

Use web search to verify Nerdio-specific claims against nmehelp.getnerdio.com or nmmhelp.getnerdio.com.
For each claim:
✅ VERIFIED — [claim] | Source: [article title]
⚠ OUTDATED — [claim] | [explanation]  
❌ INCORRECT — [claim] | Correction: [correct info]
❓ NOT FOUND — [claim] | Action: SME review required

### SME review required

List claims needing subject matter expert confirmation before publication.

### Overall verdict

One of:
✅ **Ready for SME review** — minor issues only
⚠ **Revise before SME review** — [n] must-fix issues
❌ **Significant revision required** — structural or content issues`

export async function POST(req: NextRequest) {
  try {
    const { content, workflowId } = await req.json()

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content to review' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const reviewPrompt = `Review this ${workflowId === 'addie' ? 'ADDIE document' : workflowId === 'videoscript' ? 'video script' : 'lesson'} for style compliance and factual accuracy. Search the Nerdio Help Center to verify Nerdio-specific claims.

CONTENT TO REVIEW:

${content}`

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
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Request failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
