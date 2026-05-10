'use client'

import { useState, useCallback } from 'react'

interface DocumentInfo {
  collectionName: string
  fileName: string
  chunkCount: number
  charCount: number
}

type ProcessingStep = 'idle' | 'extracting' | 'chunking' | 'embedding' | 'storing' | 'done' | 'error'

interface UploadZoneProps {
  onDocumentReady: (info: DocumentInfo) => void
  document: DocumentInfo | null
  onReset: () => void
}

const STEPS: { key: ProcessingStep; label: string; icon: string }[] = [
  { key: 'extracting', label: 'Extracting text…',         icon: '📄' },
  { key: 'chunking',   label: 'Chunking document…',       icon: '✂️' },
  { key: 'embedding',  label: 'Creating embeddings…',     icon: '🧠' },
  { key: 'storing',    label: 'Storing in vector DB…',    icon: '🗄️' },
]

function stepIndex(s: ProcessingStep) {
  return STEPS.findIndex((x) => x.key === s)
}

export default function UploadZone({ onDocumentReady, document, onReset }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState<ProcessingStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(pdf|txt|md)$/i)) {
        setError('Please upload a PDF or text file.')
        return
      }

      setError(null)
      setStep('extracting')

      const formData = new FormData()
      formData.append('file', file)

      try {
        // Simulate step progression while the server processes
        const progressTimer = setInterval(() => {
          setStep((prev) => {
            const idx = stepIndex(prev)
            if (idx < STEPS.length - 1) return STEPS[idx + 1].key
            return prev
          })
        }, 2200)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        clearInterval(progressTimer)

        if (!res.ok) {
          if (res.status === 413) {
            throw new Error('File is too large. Vercel free tier limits uploads to 4.5MB.')
          }
          
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            const body = await res.json()
            throw new Error(body.error || 'Upload failed')
          } else {
            const text = await res.text()
            throw new Error(`Upload failed: ${text.slice(0, 50)}...`)
          }
        }

        const data = await res.json()
        setStep('done')
        onDocumentReady(data)
      } catch (e: unknown) {
        setStep('error')
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    },
    [onDocumentReady],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  /* ── Render: processing ── */
  if (step !== 'idle' && step !== 'done' && step !== 'error') {
    const currentIdx = stepIndex(step)
    return (
      <div className="sidebar-body">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Processing document…</p>
        <div className="processing-steps">
          {STEPS.map((s, i) => {
            const isDone   = i < currentIdx
            const isActive = i === currentIdx
            return (
              <div key={s.key} className={`step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                {isDone   && <span className="step-icon">✅</span>}
                {isActive && <span className="spinner" />}
                {!isDone && !isActive && <span className="step-icon" style={{ opacity: 0.3 }}>{s.icon}</span>}
                <span>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── Render: document ready ── */
  if (step === 'done' && document) {
    const ext = document.fileName.split('.').pop()?.toUpperCase() ?? 'FILE'
    return (
      <div className="sidebar-body">
        <div className="doc-card">
          <div className="doc-card-header">
            <span className="doc-icon">{ext === 'PDF' ? '📕' : '📄'}</span>
            <div>
              <div className="doc-name">{document.fileName}</div>
              <div className="doc-meta">{ext} document</div>
            </div>
          </div>
          <div className="doc-stats">
            <div className="stat">
              <div className="stat-value">{document.chunkCount}</div>
              <div className="stat-label">Chunks</div>
            </div>
            <div className="stat">
              <div className="stat-value">{(document.charCount / 1000).toFixed(1)}k</div>
              <div className="stat-label">Characters</div>
            </div>
          </div>
          <div className="ready-badge">
            <span className="ready-dot" />
            Ready to chat
          </div>
        </div>
        <button className="new-doc-btn" onClick={onReset}>+ Upload new document</button>
      </div>
    )
  }

  /* ── Render: idle / error ── */
  return (
    <div className="sidebar-body">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
        />
        <span className="upload-icon">📂</span>
        <div className="upload-title">Drop your document here</div>
        <div className="upload-sub">or click to browse files</div>
        <div className="upload-badges">
          <span className="badge">PDF</span>
          <span className="badge">TXT</span>
          <span className="badge">MD</span>
        </div>
      </div>
      {error && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
