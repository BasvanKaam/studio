export type WorkflowId = 'lesson' | 'addie' | 'videoscript' | 'questionpool'

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

// Audit block appended to lesson and video script prompts
export const AUDIT_INSTRUCTION = `

---

VERIFICATION AND AUDIT REQUIREMENTS:

After completing the main output, add this exact section — no extra headings, no duplication:

## Quality audit

**KB verification:**
For every Nerdio-specific claim, UI path, or product behaviour:
- Search nmehelp.getnerdio.com or nmmhelp.getnerdio.com
- ✅ VERIFIED — [claim] | [KB article title]
- ❌ INCORRECT — [claim] | Correction: [correct info]
- ❓ NOT FOUND — [claim] | SME review required

**Style compliance:**
- ❌ FAIL — [rule] | OLD: "[text]" → NEW: "[corrected]"
- If no issues: "All style checks passed."

**SME review required:**
List claims needing expert confirmation before publication.`

export const workflows: Workflow[] = [
  {
    id: 'lesson',
    title: 'Lesson builder',
    description: 'Write a complete lesson in Nerdio house style — intro, body sections, knowledge check, and branded .docx download.',
    icon: '📄',
    fields: [
      { id: 'product', label: 'Product', type: 'select', options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP', 'Both'] },
      { id: 'topic', label: 'Lesson topic', hint: 'Be specific — e.g. "Configuring FSLogix profile containers" not just "FSLogix"', type: 'text', placeholder: 'e.g. Configuring FSLogix profile containers', fullWidth: true },
      { id: 'level', label: 'Audience knowledge level', type: 'select', options: ['Introductory', 'Intermediate', 'Advanced'] },
      { id: 'lessonNumber', label: 'Lesson number in course', type: 'select', options: ['1 — Introduction to this course', '2 — Concepts and architecture', '3 or later — Procedural content'] },
      { id: 'scope', label: 'Scope', hint: 'What is in scope? What is explicitly out of scope?', type: 'text', placeholder: 'e.g. Dynamic host pools only. Personal host pools are out of scope.', fullWidth: true },
    ],
  },
  {
    id: 'addie',
    title: 'ADDIE document',
    description: 'Generate a complete ADDIE instructional design document — all five phases, branded cover, and full table structure.',
    icon: '📐',
    fields: [
      { id: 'coursetitle', label: 'Course title', type: 'text', placeholder: 'e.g. Auto-scaling in Nerdio Manager for Enterprise', fullWidth: true },
      { id: 'product', label: 'Product', type: 'select', options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP', 'Other'] },
      { id: 'audience', label: 'Target audience', type: 'select', options: ['IT admins / engineers', 'MSP partners / resellers', 'End users', 'Management / sales'] },
      { id: 'phases', label: 'ADDIE phases needed', type: 'select', options: ['Complete document', 'A — Analyze only', 'D — Design only', 'D — Develop only', 'I — Implement only', 'E — Examine only'] },
      { id: 'author', label: 'Author name', type: 'text', placeholder: 'e.g. Bas van Kaam' },
    ],
  },
  {
    id: 'videoscript',
    title: 'Video script',
    description: 'Write a structured video script — voice-over intro, per-topic screen recording blocks, and production notes.',
    icon: '🎬',
    fields: [
      { id: 'product', label: 'Product', type: 'select', options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP'] },
      { id: 'topic', label: 'Video topic', hint: 'What feature or task does this video cover?', type: 'text', placeholder: 'e.g. Configuring an auto-scaling profile', fullWidth: true },
      { id: 'format', label: 'Video format', type: 'select', options: ['Voice-over intro + screen recording', 'On-camera talking head', 'Voice-over only', 'Intro or outro'] },
      { id: 'level', label: 'Audience knowledge level', type: 'select', options: ['Introductory', 'Intermediate', 'Advanced'] },
      { id: 'duration', label: 'Target duration', type: 'select', options: ['Under 5 minutes', '5–8 minutes', '8–12 minutes'] },
    ],
  },
  {
    id: 'questionpool',
    title: 'Question pool',
    description: 'Generate a complete, Bloom-aligned question pool for a Nerdio University course — multiple question types, KB-verified, style-compliant.',
    icon: '🎯',
    fields: [
      { id: 'coursetitle', label: 'Course title', type: 'text', placeholder: 'e.g. Auto-scaling in Nerdio Manager for Enterprise', fullWidth: true },
      { id: 'product', label: 'Product', type: 'select', options: ['Nerdio Manager for Enterprise', 'Nerdio Manager for MSP', 'Both'] },
      { id: 'difficulty', label: 'Difficulty level', hint: 'Sets the Bloom distribution: Introductory = 60% L1 / 40% L2, Intermediate = 30/50/20%, Advanced = 15/40/45%', type: 'select', options: ['Introductory', 'Intermediate', 'Advanced'] },
      { id: 'questioncount', label: 'Number of questions', type: 'select', options: ['10 questions', '15 questions', '20 questions', '25 questions', 'Claude to decide based on content'] },
      { id: 'bloomoverride', label: 'Bloom distribution', hint: 'Leave on "Use difficulty default" to apply automatic distribution based on difficulty level above', type: 'select', options: ['Use difficulty default', 'More recall (L1 heavy)', 'More application (L2 heavy)', 'More analysis (L3 heavy)', 'Equal mix'] },
      { id: 'qtypes', label: 'Question types to include', hint: 'Claude will mix all selected types. More variety = better pool.', type: 'select', options: ['All types (single answer, select two, true/false, fill in the blank)', 'Single answer + true/false only', 'Single answer only'] },
      { id: 'scope', label: 'Pool scope', type: 'select', options: ['Full course (multiple lessons)', 'Single lesson'] },
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

MANDATORY FIRST STEP — DO THIS BEFORE WRITING ANY CONTENT:
Search the Nerdio Help Center for this topic before writing a single word of the lesson.
- If product is "Nerdio Manager for Enterprise": search nmehelp.getnerdio.com
- If product is "Nerdio Manager for MSP": search nmmhelp.getnerdio.com
- Base all feature names, UI navigation paths, and technical claims on what you find in the KB
- Do not invent component names, architecture details, or feature behaviour that you cannot verify in the KB
- If a claim cannot be verified in the KB, flag it with ⚠ SME review required

Only after completing the KB search: write the lesson.

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
      return `Create a complete ADDIE instructional design document and return it as a single JSON object.

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

Return ONLY a valid JSON object with exactly these fields — no markdown, no explanation, no backticks:
{
  "parentGoal": "full text of the parent goal",
  "audienceRoles": "who this is for",
  "assumedKnowledge": "what they already know",
  "inScope": "what is in scope",
  "outOfScope": "what is out of scope",
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "coreConcepts": ["concept 1", "concept 2"],
  "outlineRows": [
    { "num": "1", "title": "lesson title", "covers": "what it covers", "media": "Text", "kc": "No" }
  ],
  "coreFlow": "explanation of the pedagogical sequence",
  "videosNeeded": "which lessons need video",
  "videoRecorder": "who records",
  "kcStrategy": "knowledge check strategy",
  "completionRate": "target completion rate",
  "assessmentScore": "target assessment score",
  "additionalMetrics": "additional success metrics",
  "launchPlan": "launch plan details",
  "firstCheckin": "first check-in after launch",
  "nextReview": "planned next content review",
  "auditNotes": "KB verification and SME flags"
}`

    case 'videoscript':
      return `Write a complete Nerdio University video script.

Product: ${fields.product}
Topic: ${fields.topic}
Format: ${fields.format}
Audience knowledge level: ${fields.level}
Target duration: ${fields.duration}

MANDATORY FIRST STEP — DO THIS BEFORE WRITING ANY CONTENT:
Search the Nerdio Help Center for this topic before writing anything.
- If product is "Nerdio Manager for Enterprise": search nmehelp.getnerdio.com
- If product is "Nerdio Manager for MSP": search nmmhelp.getnerdio.com
- Base all UI steps, feature names, and navigation paths on what you find in the KB
- Do not invent details that cannot be verified in the KB

Only after completing the KB search: write the script.

Structure:
- Part 1: Voice-over intro (under 60 seconds) — greet, name the topic, set expectations
- Part 2: Screen recording walkthrough — one block per topic, each with: topic title, key points as bullets, optional presenter notes
- Production notes table: format, estimated duration, tone, pacing, KB links to reference

Topic count by duration: under 5 min = 1–2 topics, 5–8 min = 2–3 topics, 8–12 min = 4–5 topics.
Natural spoken language throughout. No "Now I'm going to show you." No filler phrases.${AUDIT_INSTRUCTION}`

    case 'questionpool':
      return `You are the Nerdio Question Pool Studio. Generate a complete, publication-ready question pool.

Course title: ${fields.coursetitle}
Product: ${fields.product}
Difficulty level: ${fields.difficulty}
Questions requested: ${fields.questioncount}
Bloom distribution: ${fields.bloomoverride}
Question types: ${fields.qtypes}
Pool scope: ${fields.scope}

MANDATORY FIRST STEP: Search the Nerdio Help Center before writing any questions.
- Nerdio Manager for Enterprise: search nmehelp.getnerdio.com
- Nerdio Manager for MSP: search nmmhelp.getnerdio.com
- Base all correct answers and distractors on verified KB content
- If lesson documents were uploaded, use them as the primary source
- Flag unverifiable claims with: SME review required

BLOOM DISTRIBUTION:
If "Use difficulty default": apply these distributions:
- Introductory: 60% L1 Recall, 40% L2 Apply, 0% L3
- Intermediate: 30% L1, 50% L2, 20% L3 Analyze
- Advanced: 15% L1, 40% L2, 45% L3
If "More recall (L1 heavy)": 70% L1, 25% L2, 5% L3
If "More application (L2 heavy)": 20% L1, 60% L2, 20% L3
If "More analysis (L3 heavy)": 15% L1, 30% L2, 55% L3
If "Equal mix": 33% L1, 34% L2, 33% L3

QUESTION TYPE MIX — based on selected types:
If "All types": single answer a/b/c/d = 55-60%, select two = 15%, true/false = 15%, fill in the blank = 10%
If "Single answer + true/false only": single answer = 70%, true/false = 30%
If "Single answer only": 100% single answer a/b/c/d

CORRECT ANSWER PLACEMENT — CRITICAL RULE:
You must distribute correct answers randomly across all letter positions.
- Count the total number of single-answer questions in the pool
- Spread correct answers roughly evenly: approximately 25% each for a, b, c, d
- Never place the correct answer in the same position for more than 3 consecutive questions
- Before finalising, check your answer key. If more than 35% of answers are the same letter, redistribute.
- Example for 20 questions: roughly 5 correct answers each at positions a, b, c, d

RULES FOR EVERY QUESTION:
- Four options for single-answer; never "all of the above" or "none of the above"
- All options grammatically parallel and similar in length
- Correct answer must not be visually longer than distractors
- Distractors reflect realistic mistakes, not impossibilities
- Level 3: scenario with misconfiguration, decision point, or troubleshooting situation
- No gerunds opening a stem; no future tense
- "Select" for UI interaction — never "click" or "tap"
- UI labels bold, no quotation marks
- Sentence-style capitalisation throughout
- Second person in scenario stems; never "the user" or "the administrator"
- Full product name on first mention — never NME or NMM
- On-premises always hyphenated; multifactor authentication no hyphen
- Sign in / sign out — never log in / log out

OUTPUT FORMAT — use exactly this structure for every question:

---
**Q[n]. [Stem]**
*Objective: [objective text] | Bloom: Level [1/2/3] ([Recall/Apply/Analyze])*

a. [option]
b. [option]
c. [option]
d. [option]

Correct: [letter]) [text]
---

True/False format:
---
**Q[n]. [Statement]**
*Objective: [objective] | Bloom: Level [1/2/3]*

True / False

Correct: [True or False]
---

Fill in the blank format:
---
**Q[n]. [Sentence with _______ ]**
*Objective: [objective] | Bloom: Level [1/2/3]*

Correct: [accepted answers separated by commas]
---

After all questions output exactly:

## Pool summary
Total: [n] | L1=[n] ([%]) L2=[n] ([%]) L3=[n] ([%]) | Single=[n] Select2=[n] T/F=[n] FITB=[n]

## KB verification
[List every verified claim and any SME flags]

## Style compliance
[Confirm all checks passed or list exceptions]`

    default:
      return ''
  }
}
