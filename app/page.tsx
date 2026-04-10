const handleGenerate = async () => {
if (!activeWorkflow || !workflow) return

    const missing = workflow.fields.filter(f => f.type === 'select').filter(f => !fields[f.id])
    const optionalFields = ['bloomoverride']
    const missing = workflow.fields.filter(f => f.type === 'select').filter(f => !fields[f.id] && !optionalFields.includes(f.id))
if (missing.length > 0) {
setError(`Select a value for: ${missing.map(f => f.label).join(', ')}`)
return
@@ -701,20 +702,27 @@ export default function Home() {
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
