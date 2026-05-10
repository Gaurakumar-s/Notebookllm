/**
 * POST /api/upload
 *
 * RAG Ingestion pipeline:
 *  1. Receive multipart file (PDF or plain text)
 *  2. Extract raw text
 *  3. Chunk with sliding-window strategy (1000 chars, 200 overlap)
 *  4. Embed all chunks via OpenAI text-embedding-3-small
 *  5. Create a unique Qdrant collection for this document
 *  6. Store all embedded chunks as vector points
 *  7. Return collection name + stats to the client
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { chunkText } from '@/lib/chunker'
import { embedTexts } from '@/lib/embedder'
import { createCollection, upsertVectors } from '@/lib/vectorStore'

export const runtime = 'nodejs'
export const maxDuration = 60   // allow up to 60 s for large PDFs

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name
    const buffer = Buffer.from(await file.arrayBuffer())

    // ── Step 1: Extract text ────────────────────────────────────────────────
    let text = ''

    if (fileName.toLowerCase().endsWith('.pdf')) {
      // Dynamic import avoids pdf-parse's test-file side-effect at module load
      const pdfParse = (await import('pdf-parse')).default
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else {
      // Plain text / markdown / etc.
      text = buffer.toString('utf-8')
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract any text from the uploaded file.' },
        { status: 422 },
      )
    }

    // ── Step 2: Chunk ───────────────────────────────────────────────────────
    const chunks = chunkText(text)

    // ── Step 3: Embed ───────────────────────────────────────────────────────
    const embeddings = await embedTexts(chunks.map((c) => c.text))

    // ── Step 4: Store in Qdrant ─────────────────────────────────────────────
    const collectionName = `doc-${uuidv4()}`
    await createCollection(collectionName)

    const points = chunks.map((chunk, i) => ({
      id: i,
      vector: embeddings[i],
      payload: {
        text: chunk.text,
        chunkIndex: chunk.index,
        chunkTotal: chunk.total,
        source: fileName,
      },
    }))

    await upsertVectors(collectionName, points)

    return NextResponse.json({
      success: true,
      collectionName,
      fileName,
      chunkCount: chunks.length,
      charCount: text.length,
    })
  } catch (err) {
    console.error('[/api/upload] Error:', err)
    return NextResponse.json({ error: 'Failed to process document.' }, { status: 500 })
  }
}
