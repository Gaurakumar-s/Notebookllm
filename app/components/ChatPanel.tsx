'use client'

import { useState, useRef, useEffect } from 'react'

interface Source {
  text: string
  chunkIndex: number
  chunkTotal: number
  score: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp: Date
}

interface DocumentInfo {
  collectionName: string
  fileName: string
  chunkCount: number
  charCount: number
}

interface ChatPanelProps {
  document: DocumentInfo | null
  messages: Message[]
  isLoading: boolean
  error: string | null
  onSendMessage: (q: string) => void
}

function SourcesAccordion({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button className="sources-toggle" onClick={() => setOpen(!open)}>
        <span>{open ? '▾' : '▸'}</span>
        <span>{sources.length} source chunk{sources.length !== 1 ? 's' : ''} retrieved</span>
      </button>
      {open && (
        <div className="sources-panel">
          {sources.map((s, i) => (
            <div key={i} className="source-chip">
              <div className="source-header">
                <span className="source-label">Source {i + 1}</span>
                <span className="source-score">{(s.score * 100).toFixed(1)}% match</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {s.text.length > 280 ? s.text.slice(0, 280) + '…' : s.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const time = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`message ${msg.role}`}>
      <div className="message-avatar">{isUser ? '👤' : '🤖'}</div>
      <div className="message-body">
        <div className="message-bubble">{msg.content}</div>
        {msg.sources && msg.sources.length > 0 && <SourcesAccordion sources={msg.sources} />}
        <div className="message-time">{time}</div>
      </div>
    </div>
  )
}

export default function ChatPanel({ document, messages, isLoading, error, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const send = () => {
    const q = input.trim()
    if (!q || isLoading || !document) return
    onSendMessage(q)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  /* ── No document yet ── */
  if (!document) {
    return (
      <div className="chat-area">
        <div className="welcome">
          <span className="welcome-icon">📓</span>
          <h1>Chat with your documents</h1>
          <p>Upload a PDF or text file on the left to start an AI-powered conversation grounded in your document&apos;s actual content.</p>
          <div className="welcome-steps">
            {[
              { n: '1', text: 'Upload a PDF or text file' },
              { n: '2', text: 'Wait for indexing to complete' },
              { n: '3', text: 'Ask any question about it' },
            ].map((s) => (
              <div key={s.n} className="welcome-step">
                <span className="welcome-step-num">{s.n}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Chat ── */
  return (
    <div className="chat-area">
      <div className="messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginTop: 40 }}>
            📄 <strong style={{ color: 'var(--text-muted)' }}>{document.fileName}</strong> is ready.<br />
            <span style={{ marginTop: 6, display: 'block' }}>Ask anything about this document below ↓</span>
          </div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-body">
              <div className="typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="error-banner" style={{ maxWidth: 500 }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <div className="input-bar-inner">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="chat-input"
            placeholder={`Ask a question about "${document.fileName}"…`}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            rows={1}
            disabled={isLoading}
          />
          <button
            id="send-btn"
            className="send-btn"
            onClick={send}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
        <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
