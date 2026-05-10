# NotebookLM — RAG-Powered Document Chat

> Assignment 03 | Build your own version of Google NotebookLM

A full-stack web application where users upload any PDF or text file and have an AI-powered conversation with it — **answers are grounded strictly in the document's actual content**.

---

## 🚀 Live Demo

[**→ Open Live App**](https://your-app.vercel.app) *(replace after deployment)*

---

## 📐 Architecture

```
User Browser
    │
    ▼
Next.js 14 (Vercel Edge + Node.js API routes)
    │
    ├── POST /api/upload ─── RAG Ingestion Pipeline
    │       │  1. Extract text (pdf-parse / UTF-8)
    │       │  2. Chunk  (sliding window, 1000 chars, 200 overlap)
    │       │  3. Embed  (OpenAI text-embedding-3-small, 1536 dims)
    │       │  4. Store  (Qdrant Cloud — one collection per document)
    │       │
    └── POST /api/chat ──── RAG Retrieval & Generation
            │  1. Embed the user query
            │  2. Cosine-similarity search (top-5 chunks)
            │  3. Build grounding prompt (context only)
            │  4. Generate answer (GPT-4o-mini, temp=0.1)
            └─────────────────────────────────────────
```

---

## ✂️ Chunking Strategy — Sliding Window

**File:** `lib/chunker.ts`

| Parameter | Value |
|-----------|-------|
| Strategy  | Fixed-size sliding window |
| Chunk size | 1,000 characters |
| Overlap   | 200 characters |

**Why?**
- **Fixed size** → predictable, uniform embedding behaviour.
- **200-char overlap** → prevents semantic context from being lost at chunk boundaries (a sentence that straddles two windows appears fully in one of them).
- **Character-based** (not token-based) → language-agnostic and framework-independent.

Example with size=10, overlap=3:
```
Text    : "Hello World Foo Bar"
Chunk 1 : "Hello Worl"   (chars 0–10)
Chunk 2 : "orld Foo Ba"  (chars 7–17)
Chunk 3 : "o Bar"        (chars 14–end)
```

---

## 🧠 RAG Pipeline — Step by Step

### 1. Ingestion (`POST /api/upload`)
1. **Extract** — `pdf-parse` for PDFs; UTF-8 decode for plain text.
2. **Chunk** — Sliding window chunker splits the text into overlapping 1000-character segments.
3. **Embed** — Each chunk is sent to OpenAI `text-embedding-3-small` to produce a 1536-dimensional vector.
4. **Store** — A unique Qdrant Cloud collection is created (`doc-<uuid>`), and all chunk vectors + metadata are upserted.

### 2. Retrieval & Generation (`POST /api/chat`)
1. **Embed query** — The user's question is embedded using the same model.
2. **Search** — Qdrant cosine similarity search returns the 5 most relevant chunks.
3. **Prompt** — A strict system prompt provides only retrieved chunks as context; LLM is forbidden from using general knowledge.
4. **Generate** — GPT-4o-mini (`temperature=0.1`) produces a grounded, cited answer.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| Vector DB | Qdrant Cloud (cosine distance) |
| PDF Parsing | `pdf-parse` |
| Deployment | Vercel |

---

## 🔧 Local Setup

### 1. Clone
```bash
git clone https://github.com/your-username/notebook-llm
cd notebook-llm
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:
```bash
cp .env.example .env.local
```
| Variable | Where to get it |
|----------|-----------------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `QDRANT_URL` | [cloud.qdrant.io](https://cloud.qdrant.io) → Cluster URL |
| `QDRANT_API_KEY` | Qdrant Cloud → API Keys |

### 3. Run
```bash
npm run dev
# Open http://localhost:3000
```

---

## ☁️ Deployment (Vercel)

1. Push to GitHub (public repo)
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add the three environment variables in Vercel Project Settings
4. Deploy — done!

---

## 📁 Project Structure

```
├── app/
│   ├── layout.tsx              Root layout + metadata
│   ├── page.tsx                Main state management
│   ├── globals.css             Design system (dark glass theme)
│   ├── components/
│   │   ├── UploadZone.tsx      Drag-and-drop upload + processing states
│   │   └── ChatPanel.tsx       Chat UI + source attribution
│   └── api/
│       ├── upload/route.ts     Ingestion pipeline
│       └── chat/route.ts       Retrieval + generation
└── lib/
    ├── chunker.ts              Sliding-window chunker
    ├── embedder.ts             OpenAI embedding wrapper
    └── vectorStore.ts          Qdrant Cloud abstraction
```
