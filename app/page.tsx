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
  lesson:      ['Retrieving style rules', 'Writing lesson content', 'Adding knowledge check', 'Finalising output'],
  addie:       ['Retrieving style rules', 'Building Analyze section', 'Building Design section', 'Building Develop section', 'Building Implement & Examine', 'Finalising output'],
  videoscript: ['Retrieving style rules', 'Writing voice-over intro', 'Writing screen recording script', 'Adding production notes'],
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

    const missing = workflow.fields.filter(f => f.type === 'select').filter(f => !fields[f.id])
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
        fullText += chunk
        chunkCount += chunk.length
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


  const handleReview = async () => {
    if (!output || !activeWorkflow) return
    setReviewing(true)
    setReviewOutput(null)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: output, workflowId: activeWorkflow }),
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
        fullReview += chunk
        setReviewOutput(fullReview)
        if (reviewRef.current) reviewRef.current.scrollTop = reviewRef.current.scrollHeight
      }
    } catch (err) {
      setReviewOutput('Review failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setReviewing(false)
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

  const canGenerate = !generating && !!workflow &&
    workflow.fields.filter(f => f.type === 'select').every(f => !!fields[f.id])

  const textareaFields = ['topic', 'coursetitle', 'scope']

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
                        rows={field.id === 'scope' ? 4 : 3}
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

                    {/* Mode selector */}
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


          {/* Quality review */}
          {output && !generating && (
            <div className="review-section">
              <div className="review-header">
                <div>
                  <div className="review-title">Quality review</div>
                  <div className="review-sub">Style compliance, KB verification, and SME flags — powered by the Review Assistant</div>
                </div>
                {!reviewing && !reviewOutput && (
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
                {reviewOutput && !reviewing && (
                  <button className="btn-review-again" onClick={handleReview}>Run again</button>
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
            <div className="msg msg-success">
              <span className="msg-icon">✓</span>
              <span>Content generated successfully. Download your .docx above, or select Start over to generate something new.</span>
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
    </div>
  )
}
