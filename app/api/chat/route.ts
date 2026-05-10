/**
 * POST /api/chat
 *
 * RAG Retrieval + Generation pipeline:
 *  1. Receive user question + collection name
 *  2. Embed the question (same model as documents)
 *  3. Search Qdrant for the 5 most relevant chunks (cosine similarity)
 *  4. Construct a strict grounding prompt with retrieved context only
 *  5. Call GPT-4o-mini with temperature=0.1 for factual, low-hallucination output
 *  6. Return the answer + source chunks for citation display
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { embedText } from '@/lib/embedder'
import { searchSimilar } from '@/lib/vectorStore'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const { question, collectionName } = await request.json()

    if (!question?.trim() || !collectionName) {
      return NextResponse.json(
        { error: 'question and collectionName are required.' },
        { status: 400 },
      )
    }

    // ── Step 1: Embed the question ──────────────────────────────────────────
    const queryVector = await embedText(question)

    // ── Step 2: Retrieve top-5 relevant chunks ──────────────────────────────
    const results = await searchSimilar(collectionName, queryVector, 5)

    if (results.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find relevant information in the document to answer your question.",
        sources: [],
      })
    }

    // ── Step 3: Build grounding context ────────────────────────────────────
    const context = results
      .map((r, i) =>
        `[Source ${i + 1}] (similarity: ${(r.score * 100).toFixed(1)}%)\n${r.payload.text}`,
      )
      .join('\n\n---\n\n')

    const systemPrompt = `You are a precise document assistant. Your ONLY job is to answer questions using the document context provided below.

STRICT RULES:
1. Answer ONLY from the provided context. Do NOT use general knowledge or training data.
2. If the answer is not present in the context, respond: "I don't see that information in the uploaded document."
3. Always cite your sources (e.g. "According to Source 2...").
4. Be concise, accurate, and well-structured.

DOCUMENT CONTEXT:
${context}`

    // ── Step 4: Generate grounded answer ───────────────────────────────────
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,   // low temp = factual, less creative hallucination
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    })

    const answer = completion.choices[0].message.content ?? 'No response generated.'

    return NextResponse.json({
      answer,
      sources: results.map((r) => ({
        text: r.payload.text,
        chunkIndex: r.payload.chunkIndex,
        chunkTotal: r.payload.chunkTotal,
        score: r.score,
      })),
    })
  } catch (err) {
    console.error('[/api/chat] Error:', err)
    return NextResponse.json({ error: 'Failed to generate answer.' }, { status: 500 })
  }
}
