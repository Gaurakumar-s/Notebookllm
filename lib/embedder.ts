/**
 * Embedder — wraps OpenAI's text-embedding-3-small model.
 *
 * Model   : text-embedding-3-small
 * Dims    : 1536
 * Batching: up to 100 texts per API call to stay within rate limits.
 */

import OpenAI from 'openai'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const VECTOR_SIZE = 1536     // dimensions for text-embedding-3-small

/** Lazy getter so the client is created at runtime, not at build time. */
function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/** Embed a single string — used for query embedding at retrieval time. */
export async function embedText(text: string): Promise<number[]> {
  const res = await getClient().embeddings.create({ model: EMBEDDING_MODEL, input: text })
  return res.data[0].embedding
}

/**
 * Embed an array of strings in batches of 100.
 * Returns embeddings in the same order as the input array.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getClient()
  const BATCH = 100
  const all: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: batch })
    all.push(...res.data.map((d) => d.embedding))
  }

  return all
}
