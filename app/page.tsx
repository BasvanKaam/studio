'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { workflows, WorkflowId } from '@/lib/workflows'

interface HistoryItem {
  id: string
  workflowId: WorkflowId
  workflowTitle: string
  topic: string
  content: string
  fields: Record<string, string>
  timestamp: number
}

type Phase = { label: string; status: 'pending' | 'active' | 'done' }
type DocumentMode = 'inspiration' | 'adapt' | 'basis'

const PHASES_BY_WORKFLOW: Record<WorkflowId, string[]> = {
  lesson:       ['Retrieving style rules', 'Writing lesson content', 'Adding knowledge check', 'Finalising output'],
  addie:        ['Retrieving style rules', 'Building Analyze section', 'Building Design section', 'Building Develop section', 'Building Implement & Examine', 'Finalising output'],
  videoscript:  ['Retrieving style rules', 'Writing voice-over intro', 'Writing screen recording script', 'Adding production notes'],
  questionpool: ['Searching Nerdio KB', 'Extracting learning objectives', 'Generating questions', 'Running style audit', 'Finalising pool'],
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconDownload = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const IconReset = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
)

const IconGenerate = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
  </svg>
)

const IconHistory = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
)

const IconTrash = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
  </svg>
)

const IconUpload = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17,8 12,3 7,8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const IconFile = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
  </svg>
)

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ─── Workflow SVG icons ───────────────────────────────────────────────────────
const IconLesson = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
)

const IconAddie = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="9" x2="9" y2="21"/>
  </svg>
)

const IconVideo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23,7 16,12 23,17 23,7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)

const WORKFLOW_ICONS: Record<string, () => JSX.Element> = {
  lesson:      IconLesson,
  addie:       IconAddie,
  videoscript: IconVideo,
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowId | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [phases, setPhases] = useState<Phase[]>([])
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [correctedOutput, setCorrectedOutput] = useState<string | null>(null)
  const [reviewCountdown, setReviewCountdown] = useState<number | null>(null)
  const [funFactIndex, setFunFactIndex] = useState(0)
  const [reviewRound, setReviewRound] = useState(0)
  const [contentStats, setContentStats] = useState<{words: number, readingTime: number, sections: number, hasKC: boolean, hasObjectives: boolean, hasPrivatePreview: boolean, noteCallouts: number, practiceCallouts: number, analogyCallouts: number, totalCallouts: number, hasProcedures: boolean, paragraphs: number, avgParaWords: number} | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [reviewOutput, setReviewOutput] = useState<string | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Document upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [documentText, setDocumentText] = useState<string>('')
  const [documentMode, setDocumentMode] = useState<DocumentMode>('inspiration')
  const [extraInstructions, setExtraInstructions] = useState<string>('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string>('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCooldown = (seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    setCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const outputRef  = useRef<HTMLDivElement>(null)
  const reviewRef  = useRef<HTMLDivElement>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ncs-history')
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const saveHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => {
      const updated = [item, ...prev].slice(0, 20)
      try { localStorage.setItem('ncs-history', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  const workflow = workflows.find(w => w.id === activeWorkflow)

  const handleWorkflowSelect = (id: WorkflowId) => {
    if (generating) return
    setActiveWorkflow(id)
    setFields({})
    setOutput(null)
    setError(null)
    setPhases([])
    setUploadedFile(null)
    setDocumentText('')
    setExtraInstructions('')
    setExtractError('')
    setReviewOutput(null)
    setCorrectedOutput(null)
    setReviewCountdown(null)
    setReviewRound(0)
    setContentStats(null)
  }

  const handleFieldChange = (id: string, value: string) => {
    setFields(prev => ({ ...prev, [id]: value }))
  }

  // ── File upload ──────────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setDocumentText('')
    setExtractError('')
    setExtracting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/extract', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to read file')
      setDocumentText(data.text || '')
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Failed to read file')
      setUploadedFile(null)
    } finally {
      setExtracting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setDocumentText('')
    setExtractError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Generate ─────────────────────────────────────────────────────────────────
  const initPhases = (workflowId: WorkflowId): Phase[] =>
    (PHASES_BY_WORKFLOW[workflowId] || ['Generating']).map((label, i) => ({
      label, status: i === 0 ? 'active' : 'pending',
    }))

  const advancePhase = (phases: Phase[]): Phase[] => {
    const activeIdx = phases.findIndex(p => p.status === 'active')
    return phases.map((p, i) => {
      if (i === activeIdx) return { ...p, status: 'done' }
      if (i === activeIdx + 1) return { ...p, status: 'active' }
      return p
    })
  }

  const handleGenerate = async () => {
    if (!activeWorkflow || !workflow) return

    const optionalFields = ['bloomoverride']
    const missing = workflow.fields.filter(f => f.type === 'select').filter(f => !fields[f.id] && !optionalFields.includes(f.id))
    if (missing.length > 0) {
      setError(`Select a value for: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    setGenerating(true)
    setOutput(null)
    setError(null)

    const initialPhases = initPhases(activeWorkflow)
    setPhases(initialPhases)

    const controller = new AbortController()
    abortRef.current = controller

    let fullText = ''
    let currentPhases = initialPhases
    let chunkCount = 0
    const phaseInterval = 600

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: activeWorkflow,
          fields,
          documentText: documentText || undefined,
          documentName: uploadedFile?.name || undefined,
          documentMode: documentText ? documentMode : undefined,
          extraInstructions: extraInstructions || undefined,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const cleanChunk = chunk.replace(/__SEARCHING__/g, '\n⟳ Searching Nerdio documentation\n')
        fullText += cleanChunk
        chunkCount += cleanChunk.length
        const targetPhase = Math.min(Math.floor(chunkCount / phaseInterval), currentPhases.length - 1)
        const currentActive = currentPhases.findIndex(p => p.status === 'active')
        if (targetPhase > currentActive) {
          currentPhases = advancePhase(currentPhases)
          setPhases([...currentPhases])
        }
        setOutput(fullText)
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
      }

      setPhases(currentPhases.map(p => ({ ...p, status: 'done' })))

      const topic = fields.topic || fields.coursetitle || workflow.title
      saveHistory({
        id: Date.now().toString(),
        workflowId: activeWorkflow,
        workflowTitle: workflow.title,
        topic,
        content: fullText,
        fields: { ...fields },
        timestamp: Date.now(),
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Generation failed')
      setPhases(prev => prev.map(p => p.status === 'active' ? { ...p, status: 'pending' } : p))
    } finally {
      setGenerating(false)
      const cooldownSeconds: Record<string, number> = {
        lesson: 30, addie: 45, videoscript: 30, questionpool: 60,
      }
      if (activeWorkflow) startCooldown(cooldownSeconds[activeWorkflow] || 30)
    }
  }

  const handleDownload = async () => {
    if (!output || !workflow || !activeWorkflow) return
    setDownloading(true)
    try {
      const topic = fields.topic || fields.coursetitle || workflow.title
      const filename = `Nerdio_${workflow.title.replace(/\s+/g, '_')}_${topic.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}`
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: correctedOutput || output, workflowId: activeWorkflow, fields, filename }),
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }




  const FUN_FACTS = [
    "Pro tip: This is exactly enough time to refill your coffee. Your future self will thank you.",
    "Fun fact: The average IT admin reads 47 KB articles before lunch. You're already ahead.",
    "Challenge: Find a typo in your own lesson before the reviewer does. Winner gets bragging rights.",
    "Two minutes. That's 120 seconds. Or one very short standup meeting. Use it wisely.",
    "Did you know? Claude has now reviewed more Nerdio lessons than any human. Probably.",
    "This is your moment. Stretch. Breathe. Pretend you meant to schedule this break.",
    "The reviewer is currently reading every line of your lesson very, very carefully. Or so we'd like you to believe.",
    "Two minutes on the clock. Just enough time to question every word choice you made today.",
    "Somewhere in Redmond, a Microsoft engineer is updating an API you just documented.",
    "Quality takes time. Great content takes two minutes and a countdown timer.",
  ]

  useEffect(() => {
    if (reviewCountdown === null) {
      setFunFactIndex(0)
      return
    }
    const interval = setInterval(() => {
      setFunFactIndex(i => (i + 1) % 10)
    }, 7000)
    return () => clearInterval(interval)
  }, [reviewCountdown !== null])

  const calcContentStats = (text: string) => {
    const wordList = text.trim().split(/\s+/)
    const words = wordList.length
    const readingTime = Math.max(1, Math.round(words / 200))
    const sections = (text.match(/^#{1,2} /gm) || []).length
    const hasKC = /knowledge check/i.test(text)
    const hasObjectives = /after completing this lesson/i.test(text)
    const hasPrivatePreview = /private preview/i.test(text)
    const noteCallouts = (text.match(/\*\*Note:/g) || []).length
    const practiceCallouts = (text.match(/\*\*In practice:/g) || []).length
    const analogyCallouts = (text.match(/\*\*Think of it this way:/g) || []).length
    const totalCallouts = noteCallouts + practiceCallouts + analogyCallouts
    const hasProcedures = /^\d+\./m.test(text)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 80).length
    const avgParaWords = paragraphs > 0 ? Math.round(words / paragraphs) : 0
    return { words, readingTime, sections, hasKC, hasObjectives, hasPrivatePreview, noteCallouts, practiceCallouts, analogyCallouts, totalCallouts, hasProcedures, paragraphs, avgParaWords }
  }

  const handleReview = async () => {
    const contentToReview = correctedOutput || output
    if (!contentToReview || !activeWorkflow) return
    setReviewOutput(null)
    setReviewRound(r => r + 1)
    setContentStats(calcContentStats(contentToReview))

    // 120-second cooldown to avoid rate limit
    setReviewCountdown(120)
    await new Promise<void>(resolve => {
      let seconds = 120
      const interval = setInterval(() => {
        seconds -= 1
        setReviewCountdown(seconds)
        if (seconds <= 0) {
          clearInterval(interval)
          setReviewCountdown(null)
          resolve()
        }
      }, 1000)
    })

    setReviewing(true)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: contentToReview, workflowId: activeWorkflow }),
      })

      if (!res.ok) throw new Error('Review failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response stream')

      let fullReview = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const cleanChunk = chunk.replace(/__SEARCHING__/g, '\n⟳ Searching Nerdio documentation\n')
        fullReview += cleanChunk
        setReviewOutput(fullReview)
        if (reviewRef.current) reviewRef.current.scrollTop = reviewRef.current.scrollHeight
      }
    } catch (err) {
      setReviewOutput('Review failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setReviewing(false)
      startCooldown(45)
    }
  }


  const handleApply = async () => {
    const baseContent = correctedOutput || output
    if (!baseContent || !reviewOutput || !activeWorkflow) return
    setApplying(true)
    setCorrectedOutput(null)

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: baseContent, reviewOutput, workflowId: activeWorkflow }),
      })

      if (!res.ok) throw new Error('Apply failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No stream')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setCorrectedOutput(fullText)
      }
    } catch (err) {
      setCorrectedOutput('Apply failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setApplying(false)
      startCooldown(30)
    }
  }

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort()
    setOutput(null)
    setError(null)
    setPhases([])
    setGenerating(false)
    setFields({})
    setUploadedFile(null)
    setDocumentText('')
    setExtraInstructions('')
    setExtractError('')
    setReviewOutput(null)
    setCorrectedOutput(null)
    setReviewCountdown(null)
    setReviewRound(0)
    setContentStats(null)
  }

  const handleHistoryItem = (item: HistoryItem) => {
    setActiveWorkflow(item.workflowId)
    setFields(item.fields)
    setOutput(item.content)
    setError(null)
    setPhases((PHASES_BY_WORKFLOW[item.workflowId] || ['Generating']).map(label => ({ label, status: 'done' as const })))
  }

  const handleClearHistory = () => {
    setHistory([])
    try { localStorage.removeItem('ncs-history') } catch { /* ignore */ }
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const canGenerate = !generating && cooldown === 0 && !!workflow &&
    workflow.fields.filter(f => f.type === 'select').every(f => !!fields[f.id])

  const textareaFields = ['topic', 'scope']

  // Format ADDIE JSON for display in output panel
  const formatAddieForDisplay = (text: string): string => {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return text
      const data = JSON.parse(jsonMatch[0])
      let out = '## ADDIE — ' + (data.outlineRows?.[0] ? 'Draft' : '') + '\n\n'
      if (data.parentGoal) out += '**Parent goal**\n' + data.parentGoal + '\n\n'
      if (data.audienceRoles) out += '**Audience**\n' + data.audienceRoles + '\n\n'
      if (data.assumedKnowledge) out += '**Assumed knowledge**\n' + data.assumedKnowledge + '\n\n'
      if (data.inScope) out += '**In scope**\n' + data.inScope + '\n\n'
      if (data.outOfScope) out += '**Out of scope**\n' + data.outOfScope + '\n\n'
      if (data.objectives?.length) out += '**Learning objectives**\n' + data.objectives.map((o: string) => '• ' + o).join('\n') + '\n\n'
      if (data.coreConcepts?.length) out += '**Core concepts**\n' + data.coreConcepts.map((c: string) => '• ' + c).join('\n') + '\n\n'
      if (data.outlineRows?.length) {
        out += '**Course outline**\n'
        data.outlineRows.forEach((r: {num: string, title: string, covers: string, media: string, kc: string}) => {
          out += `${r.num}. ${r.title} | ${r.media} | KC: ${r.kc}\n   ${r.covers}\n`
        })
        out += '\n'
      }
      if (data.coreFlow) out += '**Core flow**\n' + data.coreFlow + '\n\n'
      if (data.launchPlan) out += '**Launch plan**\n' + data.launchPlan + '\n\n'
      if (data.auditNotes) out += '---\n**Quality audit**\n' + data.auditNotes + '\n'
      return out
    } catch {
      return text
    }
  }

  const modeLabelMap: Record<DocumentMode, string> = {
    inspiration: 'Use as inspiration',
    adapt:       'Adapt and improve',
    basis:       'Use as foundation',
  }

  const modeDescMap: Record<DocumentMode, string> = {
    inspiration: 'Draw from its structure, terminology, and examples to enrich new content.',
    adapt:       'Rewrite the existing content to comply with the Nerdio style guide.',
    basis:       'Build the new output directly from this document as the source.',
  }

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="header-text">
          <h1><span className="brand">Nerdio</span> Content Studio</h1>
          <p>Learning &amp; Development — Nerdio University content generation</p>
        </div>
        <span className="header-badge">Beta</span>
      </header>

      <div className="layout">

        {/* Left column */}
        <div>

          {/* Workflow selector */}
          <div className="label">Select a workflow</div>
          <div className="workflow-grid">
            {workflows.map(w => {
              const Icon = WORKFLOW_ICONS[w.id]
              return (
                <button
                  key={w.id}
                  data-workflow={w.id}
                  className={`wf-card${activeWorkflow === w.id ? ' active' : ''}`}
                  onClick={() => handleWorkflowSelect(w.id)}
                  disabled={generating}
                >
                  {Icon && <span className="wf-icon"><Icon /></span>}
                  <div className="wf-title">{w.title}</div>
                  <div className="wf-desc">{w.description}</div>
                </button>
              )
            })}
          </div>

          {/* Intake form */}
          {workflow && !output && (
            <div className="form-panel" data-workflow={activeWorkflow}>
              <div className="label" style={{ marginBottom: 24 }}>{workflow.title} — details</div>
              <div className="form-grid">
                {workflow.fields.map(field => (
                  <div key={field.id} className={`field${field.fullWidth ? ' full' : ''}`}>
                    <label className="field-label">{field.label}</label>
                    {field.hint && <span className="field-hint">{field.hint}</span>}
                    {field.type === 'select' ? (
                      <select
                        className="field-select"
                        value={fields[field.id] || ''}
                        onChange={e => handleFieldChange(field.id, e.target.value)}
                        disabled={generating}
                      >
                        <option value="" disabled>Select…</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : textareaFields.includes(field.id) ? (
                      <textarea
                        className="field-textarea"
                        placeholder={field.placeholder}
                        value={fields[field.id] || ''}
                        onChange={e => handleFieldChange(field.id, e.target.value)}
                        disabled={generating}
                        rows={field.id === 'scope' ? 4 : field.id === 'topic' ? 3 : 2}
                      />
                    ) : (
                      <input
                        type="text"
                        className="field-input"
                        placeholder={field.placeholder}
                        value={fields[field.id] || ''}
                        onChange={e => handleFieldChange(field.id, e.target.value)}
                        disabled={generating}
                      />
                    )}
                  </div>
                ))}

                {/* Extra instructions */}
                <div className="field full">
                  <label className="field-label">Additional instructions</label>
                  <span className="field-hint">Specific guidance for this output — what to focus on, what to avoid, tone, length, etc.</span>
                  <textarea
                    className="field-textarea"
                    placeholder="e.g. Focus on the configuration steps for Nutanix AHV. Keep the lesson under 800 words. Avoid repeating concepts from lesson 2."
                    value={extraInstructions}
                    onChange={e => setExtraInstructions(e.target.value)}
                    disabled={generating}
                    rows={3}
                  />
                </div>
              </div>

              {/* Document upload section */}
              <div className="upload-section">
                <div className="upload-label">
                  <IconUpload />
                  Reference document
                  <span className="upload-optional">optional — .docx or .pdf</span>
                </div>

                {!uploadedFile && !extracting && (
                  <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                    <IconFile />
                    <span>Select a document to use as reference</span>
                    <span className="upload-sub">Existing lesson, ADDIE, notes, or any Word or PDF file</span>
                  </div>
                )}

                {extracting && (
                  <div className="upload-extracting">
                    <div className="upload-extracting-icon" />
                    <span>Reading document…</span>
                    <span className="upload-extracting-sub">Extracting text — this takes a few seconds</span>
                  </div>
                )}

                {uploadedFile && documentText && !extracting && (
                  <div className="upload-success">
                    <div className="upload-file-info">
                      <IconFile />
                      <span className="upload-filename">{uploadedFile.name}</span>
                      <span className="upload-chars">{documentText.length.toLocaleString()} characters read</span>
                      <button className="upload-remove" onClick={handleRemoveFile} title="Remove file">
                        <IconX />
                      </button>
                    </div>

                    {/* Mode selector — hidden for question pool */}
                    {activeWorkflow !== 'questionpool' && (
                      <div className="mode-grid">
                        {(Object.keys(modeLabelMap) as DocumentMode[]).map(mode => (
                          <button
                            key={mode}
                            className={`mode-btn${documentMode === mode ? ' active' : ''}`}
                            onClick={() => setDocumentMode(mode)}
                            disabled={generating}
                          >
                            <span className="mode-btn-label">{modeLabelMap[mode]}</span>
                            <span className="mode-btn-desc">{modeDescMap[mode]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {activeWorkflow === 'questionpool' && (
                      <div className="upload-qp-note">
                        Claude uses these lessons as the primary source for all questions.
                      </div>
                    )}
                  </div>
                )}

                {extractError && (
                  <div className="msg msg-error" style={{ marginTop: 8 }}>
                    <span className="msg-icon">⚠</span>
                    <span>{extractError}</span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>

              <button className="btn-generate" onClick={handleGenerate} disabled={!canGenerate}>
                {generating ? (
                  <><span className="spinner" />Generating — this takes about 30 seconds…</>
                ) : cooldown > 0 ? (
                  <>⏳ Please wait {cooldown}s before generating again</>
                ) : (
                  <><IconGenerate />Generate {workflow.title}</>
                )}
              </button>

              {error && (
                <div className="msg msg-error">
                  <span className="msg-icon">⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Progress phases */}
          {generating && phases.length > 0 && (
            <div className="progress-block">
              <div className="progress-title">Generation progress</div>
              <div className="phase-list">
                {phases.map((phase, i) => (
                  <div key={i} className="phase-item">
                    <div className={`phase-dot ${phase.status}`} />
                    <span className={`phase-label ${phase.status}`}>{phase.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output */}
          {output && (
            <div className="output-panel">
              <div className="output-header">
                <span className="output-label">
                  {generating ? 'Generating…' : correctedOutput ? `${workflow?.title || 'Output'} — corrected and ready` : `${workflow?.title || 'Output'} — ready`}
                </span>
                {output && (
                  <span className="word-count">
                    {(correctedOutput || output).trim().split(/\s+/).length.toLocaleString()} words
                  </span>
                )}
                <div className="header-actions">
                  {!generating && correctedOutput && (
                    <button className="btn-download" onClick={handleDownload} disabled={downloading}>
                      <IconDownload />
                      {downloading ? 'Preparing…' : 'Download corrected .docx'}
                    </button>
                  )}
                  {!generating && !correctedOutput && (
                    <button className="btn-download" onClick={handleDownload} disabled={downloading}>
                      <IconDownload />
                      {downloading ? 'Preparing…' : 'Download .docx'}
                    </button>
                  )}
                  {!generating && correctedOutput && (
                    <button className="btn-download-original" onClick={async () => {
                      if (!workflow || !activeWorkflow) return
                      setDownloading(true)
                      try {
                        const topic = fields.topic || fields.coursetitle || workflow.title
                        const filename = `Nerdio_${workflow.title.replace(/\s+/g, '_')}_${topic.slice(0, 40).replace(/[^a-zA-Z0-9]/g, '_')}_original`
                        const res = await fetch('/api/download', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content: output, workflowId: activeWorkflow, fields, filename }),
                        })
                        if (!res.ok) throw new Error('Download failed')
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${filename}.docx`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Download failed')
                      } finally {
                        setDownloading(false)
                      }
                    }} disabled={downloading}>
                      Download original
                    </button>
                  )}
                  <button className="btn-reset" onClick={handleReset}>
                    <IconReset />
                    Start over
                  </button>
                </div>
              </div>
              <div className="output-content" ref={outputRef}>{activeWorkflow === 'addie' && output ? formatAddieForDisplay(output) : output}</div>
            </div>
          )}


          {/* Quality review */}
          {output && !generating && (
            <div className="review-section">
              <div className="review-header">
                <div>
                  <div className="review-title">Quality review{reviewRound > 1 ? ` — round ${reviewRound}` : ''}</div>
                  <div className="review-sub">Style compliance, KB verification, and SME flags — powered by the Review Assistant</div>
                </div>
                {!reviewing && !reviewOutput && reviewCountdown === null && (
                  <button className="btn-review" onClick={handleReview}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Run quality review
                  </button>
                )}
                {reviewing && (
                  <div className="review-running">
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                    Reviewing…
                  </div>
                )}
                {reviewCountdown !== null && (
                  <div className="review-countdown-full">
                    <div className="review-countdown-top">
                      <div className="countdown-ring">
                        <svg width="64" height="64" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(167,149,199,0.15)" strokeWidth="5"/>
                          <circle
                            cx="32" cy="32" r="27" fill="none"
                            stroke="#A795C7" strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 27}`}
                            strokeDashoffset={`${2 * Math.PI * 27 * (reviewCountdown / 120)}`}
                            transform="rotate(-90 32 32)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                          />
                          <text x="32" y="38" textAnchor="middle" fill="#A795C7" fontSize="16" fontWeight="700" fontFamily="Poppins, sans-serif">
                            {reviewCountdown}
                          </text>
                        </svg>
                      </div>
                      <div className="countdown-text">
                        <div className="countdown-label">Preparing review {reviewRound > 0 ? `— round ${reviewRound}` : ''}…</div>
                        <div className="countdown-sub">Review starts in {reviewCountdown} seconds. In the meantime, see what's new with the University Assistant ↘</div>
                      </div>
                    </div>
                    <div className="fun-fact-bar">
                      <span className="fun-fact-icon">💡</span>
                      <span className="fun-fact-text">{FUN_FACTS[funFactIndex]}</span>
                    </div>

                    {contentStats && (
                      <div className="content-stats-grid">
                        <div className="stats-row">
                          <div className="stat-card">
                            <span className="stat-value">{contentStats.words.toLocaleString()}</span>
                            <span className="stat-label">words</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">~{contentStats.readingTime} min</span>
                            <span className="stat-label">reading time</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">{contentStats.sections}</span>
                            <span className="stat-label">sections</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">{contentStats.paragraphs}</span>
                            <span className="stat-label">paragraphs</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">{contentStats.avgParaWords}</span>
                            <span className="stat-label">words / para</span>
                          </div>
                        </div>
                        <div className="stats-row">
                          <div className={`stat-card stat-flag ${contentStats.hasObjectives ? 'flag-ok' : 'flag-warn'}`}>
                            <span className="stat-value">{contentStats.hasObjectives ? '✓' : '✗'}</span>
                            <span className="stat-label">objectives</span>
                          </div>
                          <div className={`stat-card stat-flag ${contentStats.hasKC ? 'flag-ok' : 'flag-warn'}`}>
                            <span className="stat-value">{contentStats.hasKC ? '✓' : '✗'}</span>
                            <span className="stat-label">knowledge check</span>
                          </div>
                          <div className={`stat-card stat-flag ${contentStats.hasProcedures ? 'flag-ok' : 'flag-neutral'}`}>
                            <span className="stat-value">{contentStats.hasProcedures ? '✓' : '—'}</span>
                            <span className="stat-label">procedures</span>
                          </div>
                          <div className={`stat-card stat-flag ${contentStats.hasPrivatePreview ? 'flag-ok' : 'flag-neutral'}`}>
                            <span className="stat-value">{contentStats.hasPrivatePreview ? '✓' : '—'}</span>
                            <span className="stat-label">preview disclosed</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">{contentStats.totalCallouts}</span>
                            <span className="stat-label">
                              callouts
                              {contentStats.totalCallouts > 0 && (
                                <span className="callout-breakdown">
                                  {contentStats.noteCallouts > 0 && ` ${contentStats.noteCallouts}×note`}
                                  {contentStats.practiceCallouts > 0 && ` ${contentStats.practiceCallouts}×practice`}
                                  {contentStats.analogyCallouts > 0 && ` ${contentStats.analogyCallouts}×analogy`}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              {reviewOutput && !reviewing && !applying && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {!correctedOutput && (
                      <button className="btn-apply" onClick={handleApply}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Apply corrections
                      </button>
                    )}
                    {correctedOutput && (
                      <span className="apply-done">✓ Corrections applied</span>
                    )}
                    <button className="btn-review-again" onClick={handleReview}>Re-run review</button>
                  </div>
                )}
                {applying && (
                  <div className="review-running">
                    <span className="spinner" style={{ width: 18, height: 18 }} />
                    Applying corrections…
                  </div>
                )}
              </div>

              {reviewOutput && (
                <div className="review-output" ref={reviewRef}>
                  {reviewOutput}
                </div>
              )}
            </div>
          )}

          {output && !generating && !error && (
            <div className="msg msg-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="msg-icon">✓</span>
                <span>Content generated. Apply corrections from the audit above, or run a full quality review below.</span>
              </span>
              {!reviewOutput && !applying && !correctedOutput && (
                <button className="btn-apply" style={{ flexShrink: 0 }} onClick={handleApply}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Apply audit corrections
                </button>
              )}
              {correctedOutput && !reviewOutput && (
                <span className="apply-done">✓ Audit corrections applied</span>
              )}
            </div>
          )}

        </div>

        {/* Right column — history */}
        <div className="history-panel">
          <div className="label">
            <IconHistory />
            Recent outputs
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">
                No history yet.<br />Generated content appears here.
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} className="history-item" onClick={() => handleHistoryItem(item)}>
                  <div className="history-item-type">{item.workflowTitle}</div>
                  <div className="history-item-title">{item.topic}</div>
                  <div className="history-item-date">{formatDate(item.timestamp)}</div>
                </div>
              ))
            )}
          </div>
          {history.length > 0 && (
            <button className="btn-clear-history" onClick={handleClearHistory}>
              <IconTrash />
              Clear history
            </button>
          )}
        </div>

      </div>

      {/* Floating chat button + popup */}
      <div className="chat-widget">
        {chatOpen && (
          <div className="chat-popup">
            <div className="chat-popup-header">
              <span className="chat-popup-title">Nerdio University Assistant</span>
              <button className="chat-popup-close" onClick={() => setChatOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <iframe
              src="https://uniassistant-delta.vercel.app"
              className="chat-iframe"
              title="Nerdio University Assistant"
              allow="clipboard-write"
            />
          </div>
        )}
        <button
          className={`chat-fab${chatOpen ? ' active' : ''}`}
          onClick={() => setChatOpen(o => !o)}
          title="Nerdio University Assistant"
        >
          {chatOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
                <path d="M7 8h.01M12 8h.01M17 8h.01"/>
              </svg>
              <span className="chat-fab-label">University Assistant</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
