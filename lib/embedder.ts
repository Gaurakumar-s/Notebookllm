/**
 * Embedder — wraps Google Gemini's text-embedding-004 model.
 *
 * Model   : text-embedding-004
 * Dims    : 768
 * Batching: up to 100 texts per API call
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export const EMBEDDING_MODEL = 'gemini-embedding-2'
export const VECTOR_SIZE = 3072

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
 * Embed an array of strings.
 * We use sequential embedContent instead of batchEmbedContents due to SDK/API compatibility issues with text-embedding-004.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const all: number[][] = []
  
  // To avoid hitting rate limits instantly on the free tier, we can process them sequentially
  for (const text of texts) {
    const embedding = await embedText(text)
    all.push(embedding)
  }

  return all
}
