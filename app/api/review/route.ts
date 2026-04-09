import { NextRequest } from 'next/server'
import SYSTEM_PROMPT from '@/lib/system-prompt'

// Full review_learnings content embedded
const REVIEW_LEARNINGS = `# Review learnings — patterns from human-reviewed lessons
# Source: 5 lessons reviewed by Orysia Kopyn, March–April 2026

## 1. TITLE FORMAT
- Titles must use imperative or noun-phrase form — NOT "How to…" or gerunds (-ing)
- "How to read Swagger…" → "Read Swagger…"; "Using Postman…" → "Use Postman…"

## 2. H2 HEADING FORMAT
- Same rules as titles: sentence-style cap, no gerunds, no "How to…"
- Strip filler phrases ("How to…", "The types of…", "What you will see"); use direct nouns/verbs

## 3. WITHIN-PARAGRAPH WORDINESS
- "inside the product" → "in the product"; "care about" → "need to handle"; "deliberately" → "intentionally"; "training" → "lesson"; "show" → "display"

## 4. VERB USAGE — UI INTERACTIONS
- "show" → always replace with "display" (§11 rule)
- "choose" → replace with "select" UNLESS describing a user preference/outcome

## 5. BULLET LIST FORMATTING
- Every bullet item must start with a capital letter
- Never start with "First,", "Second," etc. — strip ordinal prefix

## 6. PUNCTUATION — COLON VS. COMMA IN HEADINGS
- H3 subheadings with inline description: use colon after label, capitalize next word

## 7. QUOTATION MARKS AROUND UI LABELS
- Remove quotation marks from UI labels — use bold instead

## 8. NERDIO PRODUCT NAME — "MANAGER" REQUIRED
- Never write "Nerdio" alone when referring to the product — always "Nerdio Manager"

## 9. SENTENCE BEGINNING CLEANUP
- Never start a numbered step with "you [verb]" — remove "you", capitalize verb

## 10. SWAGGER / OPENAPI NOTATION
- "Swagger / OpenAPI" → "Swagger (OpenAPI)" — parentheses, not slash

## 11. PARAGRAPH SPLITTING
- Long paragraphs introducing a list should end with a colon and be followed by bullets

## 13. FUTURE TENSE → PRESENT
- In procedures and explanatory text: always convert to simple present

## 14. "SIMPLY" → REMOVE OR REPLACE
- "simply" → "only" or remove

## 15. COLON BEFORE LISTS — ALWAYS
- Every list must be introduced by a sentence ending in a colon

## 16. SEMICOLONS → REPLACE
- Semicolons replaced with periods or colons throughout

## 17. PERIOD AT END OF EACH NUMBERED STEP
- Each numbered step ends with a period

## 18. TITLE PERIOD REMOVAL
- Titles and headings must not end with a period

## 19. CONTRACTION USAGE
- Common contractions actively preferred: "you're", "it's", "you've"

## 20. "TRAINING" → "LESSON"
- In individual lesson context: "lesson" not "training"

## 26. "YOU [VERB]" IN PROCEDURE STEPS
- "you open…" → "Open…"; "you navigate…" → "Navigate…"

## 27. MISSING KNOWLEDGE CHECKS
- If a lesson covers multiple concepts, 2 knowledge checks are required

## 28. BULLET ITEM CAPITALIZATION
- Every bullet item must start with a capital letter, without exception

## 29. H1 TITLE STRUCTURE — PRODUCT NAME FIRST
- When title includes product name and topic: lead with product name, follow with topic after colon

## 30. NUMBERED HEADINGS — EN DASH → COLON
- "Use case 1 – Title" → "Use case 1: Title"

## 31. "PORTAL" → "APPLICATION"
- Never "Nerdio Manager portal" — use "application" or the specific area name

## 32. GERUND IN H1 TITLES
- H1 titles must use imperative or noun-phrase form — never gerunds

## 33. HYPERLINKS — ARTICLE TITLE AS LINK TEXT
- Never use raw URLs or "click here" — use article title as link text with destination context`

const REVIEW_SYSTEM_PROMPT = `You are the Nerdio Review Assistant, performing a quality review of generated L&D content.

You have deep knowledge of the Nerdio L&D Style Guide (sections 1–20) and the review learnings from human-reviewed lessons.

${SYSTEM_PROMPT}

---

REVIEW LEARNINGS FROM HUMAN-REVIEWED LESSONS:
${REVIEW_LEARNINGS}

---

Your task is to perform a focused quality review of the content provided. Apply the same standards as a human reviewer would.

OUTPUT FORMAT — use exactly this structure:

## Quality review

### Style findings

List style issues found, grouped by severity. For each finding:
- **[MUST FIX / SHOULD FIX / NICE TO HAVE]** | [location — first words of the relevant text]
- OLD: "[exact original text]"
- NEW: "[corrected text]"
- RULE: [rule reference]

If no issues found in a category: write "None found."

### KB verification

For each Nerdio-specific factual claim in the content:
- ✅ VERIFIED — [claim] | Source: [article title]
- ⚠ OUTDATED — [claim] | [explanation]
- ❌ INCORRECT — [claim] | Correction: [correct information]
- ❓ NOT FOUND — [claim] | Action: SME review required

### SME review required

List any claims, procedures, or technical details that require subject matter expert confirmation before publication. Be specific about what needs to be confirmed.

### Overall verdict

One of:
- ✅ **Ready for SME review** — minor issues only, content is structurally sound
- ⚠ **Revise before SME review** — [number] must-fix issues require attention
- ❌ **Significant revision required** — fundamental structural or content issues found

Keep the review focused and actionable. Do not rewrite the content — only flag issues and provide corrections.`

export async function POST(req: NextRequest) {
  try {
    const { content, workflowId } = await req.json()

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content to review' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const reviewPrompt = `Review the following ${workflowId === 'addie' ? 'ADDIE document' : workflowId === 'videoscript' ? 'video script' : 'lesson'} for style compliance, factual accuracy, and quality. Search the Nerdio Help Center to verify any Nerdio-specific claims.

---

CONTENT TO REVIEW:

${content}

---

Provide a structured quality review following the format specified in your instructions.`

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
              max_tokens: 4000,
              system: REVIEW_SYSTEM_PROMPT,
              tools: [
                {
                  type: 'web_search_20250305',
                  name: 'web_search',
                  max_uses: 5,
                },
              ],
              messages: [{ role: 'user', content: reviewPrompt }],
              stream: true,
            }),
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
                    controller.enqueue(encoder.encode('\n[Searching Nerdio documentation…]\n'))
                  }
                }
              } catch { /* skip malformed */ }
            }
          }

          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Review failed'
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
