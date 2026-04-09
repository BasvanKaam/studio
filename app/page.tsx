'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { workflows, WorkflowId } from '@/lib/workflows'

// ─── Types ────────────────────────────────────────────────────────────────────
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

const PHASES_BY_WORKFLOW: Record<WorkflowId, string[]> = {
  lesson:      ['Retrieving style rules', 'Writing lesson content', 'Adding knowledge check', 'Finalising output'],
  addie:       ['Retrieving style rules', 'Building Analyze section', 'Building Design section', 'Building Develop section', 'Building Implement & Examine', 'Finalising output'],
  videoscript: ['Retrieving style rules', 'Writing voice-over intro', 'Writing screen recording script', 'Adding production notes'],
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const Logo = () => (
  <svg width="52" height="22" viewBox="0 0 120 50" fill="none" className="logo">
    <circle cx="30" cy="25" r="18" stroke="currentColor" strokeWidth="5" fill="none"/>
    <path d="M48 25 L72 25" stroke="currentColor" strokeWidth="5"/>
    <circle cx="90" cy="25" r="18" stroke="currentColor" strokeWidth="5" fill="none"/>
    <line x1="90" y1="10" x2="90" y2="40" stroke="currentColor" strokeWidth="4"/>
    <line x1="78" y1="25" x2="102" y2="25" stroke="currentColor" strokeWidth="4"/>
  </svg>
)

const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const IconReset = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
)

const IconGenerate = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowId | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [phases, setPhases] = useState<Phase[]>([])
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const outputRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ncs-history')
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const saveHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => {
      const updated = [item, ...prev].slice(0, 20) // keep last 20
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
  }

  const handleFieldChange = (id: string, value: string) => {
    setFields(prev => ({ ...prev, [id]: value }))
  }

  const initPhases = (workflowId: WorkflowId): Phase[] =>
    (PHASES_BY_WORKFLOW[workflowId] || ['Generating']).map((label, i) => ({
      label,
      status: i === 0 ? 'active' : 'pending',
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

    // Validate all select fields
    const missing = workflow.fields
      .filter(f => f.type === 'select')
      .filter(f => !fields[f.id])
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
    const phaseInterval = 600 // chars per phase advance

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: activeWorkflow, fields }),
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
        fullText += chunk
        chunkCount += chunk.length

        // Advance phases based on content length
        const targetPhase = Math.min(
          Math.floor(chunkCount / phaseInterval),
          currentPhases.length - 1
        )
        const currentActive = currentPhases.findIndex(p => p.status === 'active')
        if (targetPhase > currentActive) {
          currentPhases = advancePhase(currentPhases)
          setPhases([...currentPhases])
        }

        setOutput(fullText)

        // Auto-scroll output
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }

      // Mark all phases done
      setPhases(currentPhases.map(p => ({ ...p, status: 'done' })))

      // Save to history
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
  }

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort()
    setOutput(null)
    setError(null)
    setPhases([])
    setGenerating(false)
    setFields({})
  }

  const handleHistoryItem = (item: HistoryItem) => {
    setActiveWorkflow(item.workflowId)
    setFields(item.fields)
    setOutput(item.content)
    setError(null)
    setPhases(
      (PHASES_BY_WORKFLOW[item.workflowId] || ['Generating']).map(label => ({ label, status: 'done' as const }))
    )
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

  const canGenerate = !generating && !!workflow &&
    workflow.fields.filter(f => f.type === 'select').every(f => !!fields[f.id])

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <Logo />
        <div className="header-text">
          <h1>Nerdio Content Studio</h1>
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
            {workflows.map(w => (
              <button
                key={w.id}
                className={`wf-card${activeWorkflow === w.id ? ' active' : ''}`}
                onClick={() => handleWorkflowSelect(w.id)}
                disabled={generating}
              >
                <span className="wf-icon">{w.icon}</span>
                <div className="wf-title">{w.title}</div>
                <div className="wf-desc">{w.description}</div>
              </button>
            ))}
          </div>

          {/* Intake form */}
          {workflow && !output && (
            <div className="form-panel">
              <div className="label" style={{ marginBottom: 20 }}>{workflow.title} — details</div>
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
              </div>

              <button className="btn-generate" onClick={handleGenerate} disabled={!canGenerate}>
                {generating ? (
                  <><span className="spinner" />Generating — this takes about 30 seconds…</>
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
                  {generating ? 'Generating…' : `${workflow?.title || 'Output'} — ready`}
                </span>
                <div className="header-actions">
                  {!generating && (
                    <button className="btn-download" onClick={handleDownload} disabled={downloading}>
                      <IconDownload />
                      {downloading ? 'Preparing…' : 'Download .docx'}
                    </button>
                  )}
                  <button className="btn-reset" onClick={handleReset}>
                    <IconReset />
                    Start over
                  </button>
                </div>
              </div>
              <div className="output-content" ref={outputRef}>{output}</div>
            </div>
          )}

          {/* Success message after download */}
          {output && !generating && !error && (
            <div className="msg msg-success">
              <span className="msg-icon">✓</span>
              <span>Content generated successfully. Download your .docx above, or select Start over to generate something new.</span>
            </div>
          )}

        </div>

        {/* Right column — history */}
        <div className="history-panel">
          <div className="label">Recent outputs</div>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">
                No history yet.<br />Generated content will appear here.
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
              Clear history
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
