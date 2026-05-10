'use client'

import { useState, useCallback } from 'react'
import UploadZone from './components/UploadZone'
import ChatPanel from './components/ChatPanel'

interface DocumentInfo {
  collectionName: string
  fileName: string
  chunkCount: number
  charCount: number
}

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

export default function Home() {
  const [document, setDocument] = useState<DocumentInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDocumentReady = useCallback((info: DocumentInfo) => {
    setDocument(info)
    setMessages([])
    setError(null)
  }, [])

  const handleReset = useCallback(() => {
    setDocument(null)
    setMessages([])
    setError(null)
  }, [])

  const handleSendMessage = useCallback(
    async (question: string) => {
      if (!document) return

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, collectionName: document.collectionName }),
        })

        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Failed to get answer')

        const aiMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMsg])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [document],
  )

  return (
    <div className="app">
      {/* Left sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">📓</div>
          <div className="logo-text">
            <span className="logo-title">NotebookLM</span>
            <span className="logo-sub">RAG-powered document chat</span>
          </div>
        </div>
        <UploadZone
          onDocumentReady={handleDocumentReady}
          document={document}
          onReset={handleReset}
        />
      </aside>

      {/* Right chat panel */}
      <ChatPanel
        document={document}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}
