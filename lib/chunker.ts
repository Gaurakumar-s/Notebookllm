/**
 * Chunking Strategy: Fixed-Size Sliding Window
 * =============================================
 * Strategy  : Split text into overlapping fixed-size character windows.
 * Chunk size : 1000 characters
 * Overlap    : 200 characters
 *
 * Rationale:
 *  - Fixed size gives predictable, uniform embedding behaviour.
 *  - Overlap of 200 chars prevents losing semantic context at boundaries
 *    (e.g. a sentence that straddles two chunks is fully present in one of them).
 *  - Character-based (not token-based) for language-agnostic simplicity.
 *
 * Example with size=10, overlap=3:
 *   Text   : "Hello World Foo Bar"
 *   Chunk 1: "Hello Worl"   (0–10)
 *   Chunk 2: "orld Foo Ba"  (7–17)
 *   Chunk 3: "o Bar"        (14–18)
 */

export interface TextChunk {
  text: string
  index: number   // 0-based position in chunk array
  total: number   // total number of chunks for this document
  charStart: number
  charEnd: number
}

const CHUNK_SIZE = 1000
const OVERLAP = 200

export function chunkText(text: string): TextChunk[] {
  // Normalise whitespace — collapse newlines / tabs into single spaces
  const clean = text.replace(/\s+/g, ' ').trim()

  const chunks: TextChunk[] = []
  let start = 0

  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length)
    chunks.push({
      text: clean.slice(start, end),
      index: chunks.length,
      total: 0,         // back-filled below
      charStart: start,
      charEnd: end,
    })
    if (end === clean.length) break
    start += CHUNK_SIZE - OVERLAP
  }

  // Back-fill total now that we know it
  const total = chunks.length
  chunks.forEach((c) => { c.total = total })

  return chunks
}
