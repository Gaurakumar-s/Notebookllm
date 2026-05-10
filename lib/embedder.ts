/**
 * Embedder — wraps Google Gemini's text-embedding-004 model.
 *
 * Model   : text-embedding-004
 * Dims    : 768
 * Batching: up to 100 texts per API call
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export const EMBEDDING_MODEL = 'text-embedding-004'
export const VECTOR_SIZE = 768

/** Lazy getter for the Gemini client */
function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

/** Embed a single string — used for query embedding at retrieval time. */
export async function embedText(text: string): Promise<number[]> {
  const ai = getClient()
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL })
  const result = await model.embedContent(text)
  return result.embedding.values
}

/**
 * Embed an array of strings in batches of 100.
 * Returns embeddings in the same order as the input array.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const ai = getClient()
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL })
  const BATCH = 100
  const all: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const reqs = batch.map((t) => ({ content: { role: 'user', parts: [{ text: t }] } }))
    const result = await model.batchEmbedContents({ requests: reqs })
    all.push(...result.embeddings.map((e) => e.values))
  }

  return all
}
