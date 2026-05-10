/**
 * Vector Store — Qdrant Cloud client abstraction.
 *
 * Each uploaded document gets its own collection (named doc-<uuid>).
 * Similarity is measured with Cosine distance, which works well for
 * normalised text embeddings.
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import { VECTOR_SIZE } from './embedder'

const client = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
})

export interface ChunkPayload {
  text: string
  chunkIndex: number
  chunkTotal: number
  source: string        // original file name
  [key: string]: unknown  // required for Qdrant Record<string, unknown>
}

export interface VectorPoint {
  id: number
  vector: number[]
  payload: ChunkPayload
}

/** Create a Qdrant collection if it doesn't already exist. */
export async function createCollection(name: string): Promise<void> {
  const { collections } = await client.getCollections()
  if (collections.some((c) => c.name === name)) return

  await client.createCollection(name, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  })
}

/** Upsert a batch of vector points into an existing collection. */
export async function upsertVectors(name: string, points: VectorPoint[]): Promise<void> {
  await client.upsert(name, { wait: true, points })
}

/** Retrieve the top-k most similar chunks for a query vector. */
export async function searchSimilar(
  name: string,
  queryVector: number[],
  k = 5,
): Promise<Array<{ payload: ChunkPayload; score: number }>> {
  const results = await client.search(name, {
    vector: queryVector,
    limit: k,
    with_payload: true,
  })

  return results.map((r) => ({
    payload: r.payload as unknown as ChunkPayload,
    score: r.score,
  }))
}
