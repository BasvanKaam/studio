export type WorkflowId = 'lesson' | 'addie' | 'videoscript'

export interface WorkflowField {
  id: string
  label: string
  hint?: string
  type: 'select' | 'text'
  options?: string[]
  placeholder?: string
  fullWidth?: boolean
}

export interface Workflow {
  id: WorkflowId
  title: string
  description: string
  icon: string
  fields: WorkflowField[]
}

export const workflows: Workflow[] = [
  {
    id: 'lesson',
    title: 'Lesson builder',
    description: 'Write a complete lesson in Nerdio house style — intro, body sections, knowledge check, and branded .docx download.',
    icon: '📄',
    fields: [
      {
        id: 'product',
        label: 'Product',
        type: 'select',
        options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP', 'Both'],
      },
      {
        id: 'topic',
        label: 'Lesson topic',
        hint: 'Be specific — e.g. "Configuring FSLogix profile containers" not just "FSLogix"',
        type: 'text',
        placeholder: 'e.g. Configuring FSLogix profile containers',
        fullWidth: true,
      },
      {
        id: 'level',
        label: 'Audience knowledge level',
        type: 'select',
        options: ['Introductory', 'Intermediate', 'Advanced'],
      },
      {
        id: 'lessonNumber',
        label: 'Lesson number in course',
        type: 'select',
        options: ['1 — Introduction to this course', '2 — Concepts and architecture', '3 or later — Procedural content'],
      },
      {
        id: 'scope',
        label: 'Scope',
        hint: 'What is in scope? What is explicitly out of scope?',
        type: 'text',
        placeholder: 'e.g. Dynamic host pools only. Personal host pools are out of scope.',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'addie',
    title: 'ADDIE document',
    description: 'Generate a complete ADDIE instructional design document — all five phases, branded cover, and full table structure.',
    icon: '📐',
    fields: [
      {
        id: 'coursetitle',
        label: 'Course title',
        type: 'text',
        placeholder: 'e.g. Auto-scaling in Nerdio Manager for Enterprise',
        fullWidth: true,
      },
      {
        id: 'product',
        label: 'Product',
        type: 'select',
        options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP', 'Other'],
      },
      {
        id: 'audience',
        label: 'Target audience',
        type: 'select',
        options: ['IT admins / engineers', 'MSP partners / resellers', 'End users', 'Management / sales'],
      },
      {
        id: 'phases',
        label: 'ADDIE phases needed',
        type: 'select',
        options: [
          'Complete document',
          'A — Analyze only',
          'D — Design only',
          'D — Develop only',
          'I — Implement only',
          'E — Examine only',
        ],
      },
      {
        id: 'author',
        label: 'Author name',
        type: 'text',
        placeholder: 'e.g. Bas van Kaam',
      },
    ],
  },
  {
    id: 'videoscript',
    title: 'Video script',
    description: 'Write a structured video script — voice-over intro, per-topic screen recording blocks, and production notes.',
    icon: '🎬',
    fields: [
      {
        id: 'product',
        label: 'Product',
        type: 'select',
        options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP'],
      },
      {
        id: 'topic',
        label: 'Video topic',
        hint: 'What feature or task does this video cover?',
        type: 'text',
        placeholder: 'e.g. Configuring an auto-scaling profile',
        fullWidth: true,
      },
      {
        id: 'format',
        label: 'Video format',
        type: 'select',
        options: [
          'Voice-over intro + screen recording',
          'On-camera talking head',
          'Voice-over only',
          'Intro or outro',
        ],
      },
      {
        id: 'level',
        label: 'Audience knowledge level',
        type: 'select',
        options: ['Introductory', 'Intermediate', 'Advanced'],
      },
      {
        id: 'duration',
        label: 'Target duration',
        type: 'select',
        options: ['Under 5 minutes', '5–8 minutes', '8–12 minutes'],
      },
    ],
  },
]

export function buildUserPrompt(workflowId: WorkflowId, fields: Record<string, string>): string {
  switch (workflowId) {
    case 'lesson':
      return `Write a complete Nerdio University lesson.

Product: ${fields.product}
Topic: ${fields.topic}
Audience knowledge level: ${fields.level}
Lesson position: ${fields.lessonNumber}
Scope: ${fields.scope || 'Use your judgement based on the topic.'}

Deliver the full lesson text structured exactly as follows:
1. Title (noun phrase, sentence-style capitalisation, never a gerund or "How to…")
2. Learning objectives (2–4 items, Bloom's verbs, introduced with "After completing this lesson, you'll be able to:")
3. Introduction (problem statement → feature introduction → benefit to the learner)
4. Body sections (H2 headings answering What / Why / How as appropriate)
5. Knowledge check specification (type, prompt, answer options — follow the exact KC rules)
6. Conclusion (optional, 2–4 sentences)

If lesson position is "1 — Introduction to this course": no knowledge check, no procedures. Focus on course scope, audience, prerequisites, course map, and learning path context.
If lesson position is "2 — Concepts and architecture": no knowledge check, no procedures. Conceptual only.
If lesson position is "3 or later": include at least one knowledge check.

Apply every Nerdio L&D style rule without exception.

WORD COUNT: If a word limit is specified in the additional instructions or scope, treat it as a hard maximum. Stop adding content before reaching that limit. A lesson that is 10% under the limit is better than one that exceeds it.${AUDIT_INSTRUCTION}`

    case 'addie':
      return `Create a complete ADDIE instructional design document.

Course title: ${fields.coursetitle}
Product: ${fields.product}
Audience: ${fields.audience}
ADDIE phases: ${fields.phases}
Author: ${fields.author || 'Not specified'}

Mandatory rules:
- Lesson 1 is always "Introduction to this course" (KC = No)
- Lesson 2 is always "[Topic] concepts and architecture" (KC = No)
- Procedural content begins at lesson 3
- Propose a realistic 5–8 lesson course outline based on the topic
- Every lesson in the outline has a corresponding learning objective
- Every lesson in the outline appears in the asset table
- Write all sections in full — no placeholder text
- Flag assumptions with ⚠

Deliver the complete document with all sections fully written.${AUDIT_INSTRUCTION}`

    case 'videoscript':
      return `Write a complete Nerdio University video script.

Product: ${fields.product}
Topic: ${fields.topic}
Format: ${fields.format}
Audience knowledge level: ${fields.level}
Target duration: ${fields.duration}

Structure:
- Part 1: Voice-over intro (under 60 seconds) — greet, name the topic, set expectations
- Part 2: Screen recording walkthrough — one block per topic, each with: topic title, key points as bullets, optional presenter notes
- Production notes table: format, estimated duration, tone, pacing, KB links to reference

Topic count by duration: under 5 min = 1–2 topics, 5–8 min = 2–3 topics, 8–12 min = 4–5 topics.
Natural spoken language throughout. No "Now I'm going to show you." No filler phrases.${AUDIT_INSTRUCTION}`
  }
}

// Audit block appended to every prompt
export const AUDIT_INSTRUCTION = `

---

VERIFICATION AND AUDIT REQUIREMENTS:

After completing the main output, add a clearly separated section titled "## Quality audit" containing:

**KB verification:**
For every Nerdio-specific claim, feature name, UI navigation path, or product behaviour you included:
- Search nmehelp.getnerdio.com or nmmhelp.getnerdio.com to verify
- List each claim with one of these verdicts:
  - ✅ VERIFIED — matches current KB documentation (include the KB article title)
  - ⚠ OUTDATED — article exists but claim no longer matches
  - ❌ INCORRECT — claim contradicts KB documentation (provide correction)
  - ❓ NOT FOUND — no KB article found (flag for SME review)

**Style compliance:**
List any style issues found in the output:
- ❌ FAIL — rule violated (state the rule and the offending text)
- ⚠ REVIEW — ambiguous or context-dependent
- If no issues: "All style checks passed."

**SME review required:**
List any claims, procedures, or technical details that could not be verified and require subject matter expert confirmation before publication.`
