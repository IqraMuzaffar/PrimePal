# Feature 4: Vector Storage & Curricular Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed SNC text chunks via OpenAI text-embedding-3-small and store them in Supabase pgvector, wiring it seamlessly into the Feature 3 upload pipeline so one PDF upload triggers the full chunk→embed→store flow.

**Architecture:** The `embedder.py` agent module holds the core async `embed_and_store_chunks()` function. The `/upload` endpoint in `curriculum.py` calls it after chunking. A standalone `/embed` endpoint allows re-embedding pre-processed chunks. Frontend gets a `FileUploadZone` component with a multi-step loading state to account for embedding latency.

**Tech Stack:** FastAPI, langchain-openai (OpenAIEmbeddings), Supabase Python client (service_role), Supabase pgvector extension, Next.js 14 (TSX), pytest + unittest.mock

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `AI_CONTEXT.md` | Mark F3 complete, add F4 section |
| Create | `supabase/migrations/004_feature4_pgvector.sql` | pgvector extension + snc_knowledge_base table |
| Rewrite | `backend/app/agents/curriculum_agent/embedder.py` | `embed_and_store_chunks()` core logic |
| Modify | `backend/app/api/v1/endpoints/curriculum.py` | Wire embedder into /upload, add /embed endpoint |
| Modify | `backend/tests/conftest.py` | Add OPENAI_API_KEY env var |
| Modify | `backend/tests/test_ingestion.py` | Patch `embed_and_store_chunks` in upload tests |
| Create | `backend/tests/test_knowledge_base.py` | Embedding unit + integration tests |
| Create | `frontend/app/(teacher)/curriculum/page.tsx` | Knowledge Base Upload page |
| Create | `frontend/components/teacher/FileUploadZone.tsx` | Upload zone with loading states |

---

### Task 1: Update AI_CONTEXT.md

**Files:**
- Modify: `AI_CONTEXT.md`

- [ ] **Step 1: Mark Feature 3 fully complete, add Feature 4 entry, update Supabase setup checklist**

In `AI_CONTEXT.md` section 5 (Feature Completion Status), change Feature 3 row from:
```
| 3 | SNC Document Ingestion (RAG Pipeline) | ✅ **Backend Complete & Tested** | See section 8; frontend pending |
```
to:
```
| 3 | SNC Document Ingestion (RAG Pipeline) | ✅ **Complete & Tested** | FastAPI PDF upload + chunking fully working. 13/13 tests pass. |
| 4 | Vector Storage & Curricular Tagging | 🔲 In Progress | pgvector migration ready; embedding pipeline being wired |
```

Also update section 8 note at the bottom (currently says "Frontend UI pending") to confirm both backend and tests pass, and chunking works perfectly.

Add a new section 9 (renaming current section 9 to 10, 10 to 11, etc.) titled **Feature 4 — Detailed Summary** with:
- pgvector migration file path
- embed_and_store_chunks function location and signature
- Integration point: /upload auto-calls embedding
- Standalone /embed endpoint

---

### Task 2: Supabase Migration — pgvector + snc_knowledge_base

**Files:**
- Create: `supabase/migrations/004_feature4_pgvector.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 004_feature4_pgvector.sql
-- Feature 4: Vector Storage & Curricular Tagging
-- Run this in the Supabase SQL Editor after 003_feature3_storage.sql

-- 1. Enable the pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the Knowledge Base table
--    embedding VECTOR(1536) matches OpenAI text-embedding-3-small (1536 dimensions)
CREATE TABLE IF NOT EXISTS snc_knowledge_base (
    id          UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    content     TEXT                     NOT NULL,
    metadata    JSONB                    NOT NULL,
    embedding   VECTOR(1536),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. HNSW index for ultra-fast cosine similarity search
--    (cosine distance is the standard for OpenAI embeddings)
CREATE INDEX IF NOT EXISTS idx_snc_embedding
    ON snc_knowledge_base
    USING hnsw (embedding vector_cosine_ops);

-- 4. GIN index on metadata for fast pre-filtering by grade_level
--    This lets the query engine filter by {"grade_level": 3} BEFORE doing vector math,
--    preventing Grade 6 vocabulary leaking into a Grade 2 chat.
CREATE INDEX IF NOT EXISTS idx_snc_metadata
    ON snc_knowledge_base
    USING GIN (metadata);

-- 5. Row Level Security — all direct access requires authentication
ALTER TABLE snc_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access"
    ON snc_knowledge_base
    FOR ALL
    USING (auth.role() = 'authenticated');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/004_feature4_pgvector.sql
git commit -m "feat(db): add pgvector migration for snc_knowledge_base table"
```

---

### Task 3: Implement embedder.py

**Files:**
- Rewrite: `backend/app/agents/curriculum_agent/embedder.py`

- [ ] **Step 1: Write the failing test (see Task 6 — test_embed_and_store_chunks_calls_openai)**

Skip ahead to Task 6 Step 1 to write the test first (TDD), then return here.

- [ ] **Step 2: Implement embed_and_store_chunks**

Replace the entire content of `backend/app/agents/curriculum_agent/embedder.py`:

```python
"""
Agent A - Curriculum Guardrail: Vector Storage & Curricular Tagging (Feature 4)

Embeds SNC text chunks using OpenAI text-embedding-3-small and stores them
in Supabase pgvector (snc_knowledge_base table).

Each chunk is a dict:  {"content": str, "metadata": {"grade_level": int, "book_title": str, "chunk_id": str}}
This is exactly the format returned by chunk_documents() in ingestion.py.
"""
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings


def _get_embeddings_model() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=settings.OPENAI_API_KEY,
    )


async def embed_and_store_chunks(chunks: list[dict], supabase_admin_client) -> int:
    """
    Generate vector embeddings for a list of text chunks and bulk-insert them
    into the snc_knowledge_base Supabase pgvector table.

    Args:
        chunks: List of {"content": str, "metadata": dict} dicts.
                This is the direct output of chunk_documents() from ingestion.py.
        supabase_admin_client: Supabase client initialised with the service_role key,
                               so it bypasses RLS for trusted server-side inserts.

    Returns:
        Number of records successfully inserted.

    Raises:
        Exception: Re-raises any OpenAI or Supabase error so the caller
                   (the upload endpoint) can return a meaningful HTTP 500.
    """
    if not chunks:
        return 0

    embeddings_model = _get_embeddings_model()
    texts = [chunk["content"] for chunk in chunks]

    # aembed_documents batches internally to respect OpenAI rate limits
    vectors = await embeddings_model.aembed_documents(texts)

    records = [
        {
            "content": chunk["content"],
            "metadata": chunk["metadata"],
            "embedding": vectors[i],
        }
        for i, chunk in enumerate(chunks)
    ]

    supabase_admin_client.table("snc_knowledge_base").insert(records).execute()
    return len(records)
```

- [ ] **Step 3: Run the embedder test to verify it passes**

```
cd backend && python -m pytest tests/test_knowledge_base.py::TestEmbedAndStoreChunks -v
```
Expected: all tests in that class PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/agents/curriculum_agent/embedder.py
git commit -m "feat(embedder): implement embed_and_store_chunks with OpenAI + Supabase pgvector"
```

---

### Task 4: Wire Embedding into /upload + Add /embed Endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/curriculum.py`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_ingestion.py`

- [ ] **Step 1: Add OPENAI_API_KEY to conftest.py**

In `backend/tests/conftest.py`, add after the existing `os.environ.setdefault` lines:

```python
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
```

- [ ] **Step 2: Replace curriculum.py with the updated version**

```python
"""
Feature 3 & 4: SNC Document Ingestion + Vector Storage (Agent A — Curriculum Guardrail)

Feature 3: Accept SNC PDF uploads, extract + chunk text.
Feature 4: Embed chunks and store in Supabase pgvector (snc_knowledge_base).
           After this feature, one /upload call triggers the full pipeline:
           PDF → extract → chunk → embed → store.
"""
import os
import tempfile
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from langchain_community.document_loaders import PyMuPDFLoader
from pydantic import BaseModel

from app.agents.curriculum_agent.embedder import embed_and_store_chunks
from app.agents.curriculum_agent.ingestion import chunk_documents
from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


# ── Pydantic models for /embed ─────────────────────────────────────────────────

class ChunkInput(BaseModel):
    content: str
    metadata: Dict[str, Any]


class EmbedRequest(BaseModel):
    chunks: List[ChunkInput]


# ── POST /upload  (Feature 3 + Feature 4 integrated pipeline) ─────────────────

@router.post("/upload", status_code=200)
async def upload_snc_textbook(
    file: UploadFile = File(...),
    grade_level: int = Form(...),
    book_title: str = Form(...),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Full pipeline: accept a PDF → extract text → chunk → embed → store in pgvector.

    Steps:
    1. Validate file (.pdf only) and grade_level (1–6).
    2. Upload raw PDF to Supabase Storage for auditing.
    3. Extract text via PyMuPDF.
    4. Chunk via RecursiveCharacterTextSplitter with SNC metadata.
    5. Generate embeddings (OpenAI text-embedding-3-small) and insert into snc_knowledge_base.
    """
    # ── 1. Validate ────────────────────────────────────────────────────────────
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )
    if not (1 <= grade_level <= 6):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="grade_level must be between 1 and 6.",
        )

    content = await file.read()
    tmp_path: str | None = None

    try:
        # ── 2. Write to temp file ──────────────────────────────────────────────
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # ── 3. Upload raw PDF to Supabase Storage for auditing ─────────────────
        supabase = get_supabase_admin()
        storage_path = f"grade_{grade_level}/{filename}"
        try:
            supabase.storage.from_("snc-textbooks").upload(
                storage_path,
                content,
                {"content-type": "application/pdf"},
            )
        except Exception:
            # Storage upload failure is non-fatal — processing continues.
            pass

        # ── 4. Extract text ────────────────────────────────────────────────────
        loader = PyMuPDFLoader(tmp_path)
        documents = loader.load()

        # ── 5. Chunk and apply metadata ────────────────────────────────────────
        processed_chunks = chunk_documents(documents, grade_level, book_title.strip())

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # ── 6. Embed and store in pgvector ────────────────────────────────────────
    # This runs after the temp file is cleaned up — supabase client is reused.
    try:
        embedded_count = await embed_and_store_chunks(processed_chunks, supabase)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chunking succeeded but embedding failed: {str(e)}",
        )

    return {
        "status": "success",
        "message": (
            f"Successfully processed {len(processed_chunks)} chunks "
            f"and stored {embedded_count} embeddings."
        ),
        "total_chunks": len(processed_chunks),
        "embedded_count": embedded_count,
        "sample_chunk": processed_chunks[0] if processed_chunks else None,
    }


# ── POST /embed  (Feature 4 standalone — embed pre-processed chunks) ──────────

@router.post("/embed", status_code=200)
async def embed_chunks(
    request: EmbedRequest,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Standalone embedding endpoint: accepts pre-processed chunks, embeds them,
    and stores in snc_knowledge_base. Used for re-processing or batch uploads.
    """
    if not request.chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No chunks provided for embedding.",
        )

    chunks_as_dicts = [
        {"content": c.content, "metadata": c.metadata}
        for c in request.chunks
    ]

    try:
        supabase = get_supabase_admin()
        embedded_count = await embed_and_store_chunks(chunks_as_dicts, supabase)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector embedding failed: {str(e)}",
        )

    return {
        "status": "success",
        "message": f"Successfully embedded and stored {embedded_count} chunks.",
        "embedded_count": embedded_count,
    }
```

- [ ] **Step 3: Patch embed_and_store_chunks in test_ingestion.py upload tests**

Every test in `TestUploadSNCTextbook` currently patches `PyMuPDFLoader` and `get_supabase_admin`. Now that `/upload` calls `embed_and_store_chunks`, add a third patch inside each `with` block:

```python
patch(
    "app.api.v1.endpoints.curriculum.embed_and_store_chunks",
    new=AsyncMock(return_value=2),  # returns 2 embedded chunks
),
```

Import `AsyncMock` at the top of `test_ingestion.py`:
```python
from unittest.mock import AsyncMock, MagicMock, patch
```

Also update response assertions in the two success tests to handle the new `embedded_count` field:
```python
assert "embedded_count" in body
assert body["embedded_count"] == 2
```

- [ ] **Step 4: Run existing ingestion tests to confirm they still pass**

```
cd backend && python -m pytest tests/test_ingestion.py -v
```
Expected: 13/13 PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/curriculum.py backend/tests/conftest.py backend/tests/test_ingestion.py
git commit -m "feat(curriculum): wire embed_and_store_chunks into /upload pipeline; add /embed endpoint"
```

---

### Task 5: Frontend — curriculum/page.tsx + FileUploadZone.tsx

**Files:**
- Create: `frontend/components/teacher/FileUploadZone.tsx`
- Create: `frontend/app/(teacher)/curriculum/page.tsx`

- [ ] **Step 1: Create FileUploadZone component**

Create `frontend/components/teacher/FileUploadZone.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getTeacherHeaders } from "@/lib/teacherAuth";

interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
  sample_chunk: { content: string; metadata: Record<string, unknown> } | null;
}

interface FileUploadZoneProps {
  onSuccess: (result: UploadResult) => void;
}

type UploadState = "idle" | "uploading" | "chunking" | "embedding" | "done";

const STATE_LABELS: Record<UploadState, string> = {
  idle: "",
  uploading: "Uploading PDF...",
  chunking: "Extracting & chunking text...",
  embedding: "Generating embeddings (this takes ~10–30s)...",
  done: "",
};

export default function FileUploadZone({ onSuccess }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [gradeLevel, setGradeLevel] = useState("3");
  const [bookTitle, setBookTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = uploadState !== "idle" && uploadState !== "done";

  const handleUpload = async (file: File) => {
    if (!bookTitle.trim()) {
      setError("Please enter a book title before uploading.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }

    setError(null);
    setUploadState("uploading");

    try {
      const headers = await getTeacherHeaders();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade_level", gradeLevel);
      formData.append("book_title", bookTitle.trim());

      // Simulate visible state progression for UX (embedding is the slow step)
      const chunkTimer = setTimeout(() => setUploadState("chunking"), 1500);
      const embedTimer = setTimeout(() => setUploadState("embedding"), 3000);

      const result = await apiFetch<UploadResult>("/curriculum/upload", {
        method: "POST",
        // apiFetch sets Content-Type: application/json by default — override for FormData
        headers: { Authorization: (headers as Record<string, string>).Authorization },
        body: formData,
      });

      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);

      setUploadState("done");
      setBookTitle("");
      onSuccess(result);
    } catch (err: unknown) {
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-4">
      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grade Level
          </label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            disabled={isLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Book Title
          </label>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. SNC Grade 3 English"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}
          ${isLoading ? "cursor-not-allowed opacity-70" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            {/* Spinner */}
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm font-medium text-blue-600">
              {STATE_LABELS[uploadState]}
            </p>
            <p className="text-xs text-gray-500">
              Please wait — do not close this page
            </p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-10 w-10 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">
              Drop a PDF here, or{" "}
              <span className="text-blue-600 underline">click to browse</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF only · SNC textbooks</p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create curriculum/page.tsx**

Create `frontend/app/(teacher)/curriculum/page.tsx`:

```tsx
"use client";

import { useState } from "react";

import FileUploadZone from "@/components/teacher/FileUploadZone";

interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
  sample_chunk: { content: string; metadata: Record<string, unknown> } | null;
}

export default function CurriculumPage() {
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Knowledge Base</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload SNC textbook PDFs. Each upload is automatically chunked and
        embedded into the vector database — this may take up to 30 seconds for
        large textbooks.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Upload Textbook
        </h2>
        <FileUploadZone onSuccess={setLastResult} />
      </div>

      {lastResult && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800">
            Upload complete!
          </p>
          <p className="text-sm text-green-700 mt-1">
            {lastResult.total_chunks} chunks extracted ·{" "}
            {lastResult.embedded_count} embeddings stored in vector database.
          </p>
          {lastResult.sample_chunk && (
            <details className="mt-2">
              <summary className="text-xs text-green-600 cursor-pointer">
                View sample chunk
              </summary>
              <pre className="mt-1 text-xs text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-auto max-h-32">
                {lastResult.sample_chunk.content}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify Next.js can find the page (no compilation errors)**

```
cd frontend && npm run build 2>&1 | tail -20
```
Expected: build succeeds with no TypeScript errors for the new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/teacher/FileUploadZone.tsx frontend/app/(teacher)/curriculum/page.tsx
git commit -m "feat(ui): add Knowledge Base Upload page with multi-step loading state"
```

---

### Task 6: Write tests/test_knowledge_base.py

**Files:**
- Create: `backend/tests/test_knowledge_base.py`

- [ ] **Step 1: Write the test file**

Create `backend/tests/test_knowledge_base.py`:

```python
"""
Tests for Feature 4: Vector Storage & Curricular Tagging

Covers:
  - embed_and_store_chunks()    (unit — mocked OpenAI, mocked Supabase)
  - POST /api/v1/curriculum/embed  (endpoint — mocked embedder)
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

# ── Constants ─────────────────────────────────────────────────────────────────

MOCK_TEACHER = {"id": "teacher-uuid-001"}

SAMPLE_CHUNKS = [
    {
        "content": "The cat sat on the mat. " * 10,  # > 50 chars
        "metadata": {"grade_level": 3, "book_title": "SNC Grade 3", "chunk_id": "SNC Grade 3_chunk_0"},
    },
    {
        "content": "Vocabulary exercise: circle the correct word. " * 5,
        "metadata": {"grade_level": 3, "book_title": "SNC Grade 3", "chunk_id": "SNC Grade 3_chunk_1"},
    },
]

FAKE_VECTORS = [[0.1] * 1536, [0.2] * 1536]


# ── Tests: embed_and_store_chunks() ──────────────────────────────────────────

class TestEmbedAndStoreChunks:
    """Unit tests — OpenAI and Supabase are both mocked."""

    async def test_calls_openai_embed_documents(self):
        """embed_and_store_chunks must call aembed_documents with the chunk texts."""
        mock_embeddings = AsyncMock()
        mock_embeddings.aembed_documents = AsyncMock(return_value=FAKE_VECTORS)

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            result = await embed_and_store_chunks(SAMPLE_CHUNKS, mock_supabase)

        mock_embeddings.aembed_documents.assert_called_once_with(
            [chunk["content"] for chunk in SAMPLE_CHUNKS]
        )
        assert result == len(SAMPLE_CHUNKS)

    async def test_inserts_correct_records_into_supabase(self):
        """Records inserted into Supabase must contain content, metadata, and embedding."""
        mock_embeddings = AsyncMock()
        mock_embeddings.aembed_documents = AsyncMock(return_value=FAKE_VECTORS)

        mock_supabase = MagicMock()
        insert_mock = MagicMock()
        mock_supabase.table.return_value.insert = insert_mock
        insert_mock.return_value.execute.return_value = MagicMock()

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            await embed_and_store_chunks(SAMPLE_CHUNKS, mock_supabase)

        inserted_records = insert_mock.call_args[0][0]
        assert len(inserted_records) == 2

        for i, record in enumerate(inserted_records):
            assert record["content"] == SAMPLE_CHUNKS[i]["content"]
            assert record["metadata"] == SAMPLE_CHUNKS[i]["metadata"]
            assert record["embedding"] == FAKE_VECTORS[i]

    async def test_returns_zero_for_empty_chunks(self):
        """When called with an empty list, must return 0 without calling OpenAI."""
        mock_embeddings = AsyncMock()
        mock_supabase = MagicMock()

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            result = await embed_and_store_chunks([], mock_supabase)

        mock_embeddings.aembed_documents.assert_not_called()
        assert result == 0

    async def test_uses_snc_knowledge_base_table(self):
        """Supabase insert must target the snc_knowledge_base table."""
        mock_embeddings = AsyncMock()
        mock_embeddings.aembed_documents = AsyncMock(return_value=FAKE_VECTORS)

        mock_supabase = MagicMock()
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

        with patch(
            "app.agents.curriculum_agent.embedder._get_embeddings_model",
            return_value=mock_embeddings,
        ):
            from app.agents.curriculum_agent.embedder import embed_and_store_chunks

            await embed_and_store_chunks(SAMPLE_CHUNKS, mock_supabase)

        mock_supabase.table.assert_called_once_with("snc_knowledge_base")


# ── Tests: POST /api/v1/curriculum/embed ─────────────────────────────────────

class TestEmbedEndpoint:
    """Integration tests for the standalone /embed endpoint."""

    @pytest.fixture(autouse=True)
    def _override_teacher_auth(self):
        from app.core.security import get_current_teacher
        from app.main import app

        app.dependency_overrides[get_current_teacher] = lambda: MOCK_TEACHER
        yield
        app.dependency_overrides.clear()

    async def test_embed_endpoint_returns_success(self, client: AsyncClient):
        """Happy path: valid chunks → 200 with embedded_count."""
        with (
            patch(
                "app.api.v1.endpoints.curriculum.get_supabase_admin",
                return_value=MagicMock(),
            ),
            patch(
                "app.api.v1.endpoints.curriculum.embed_and_store_chunks",
                new=AsyncMock(return_value=2),
            ),
        ):
            resp = await client.post(
                "/api/v1/curriculum/embed",
                json={
                    "chunks": [
                        {
                            "content": chunk["content"],
                            "metadata": chunk["metadata"],
                        }
                        for chunk in SAMPLE_CHUNKS
                    ]
                },
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["embedded_count"] == 2

    async def test_embed_endpoint_rejects_empty_chunks(self, client: AsyncClient):
        """Empty chunks list must be rejected with HTTP 400."""
        resp = await client.post(
            "/api/v1/curriculum/embed",
            json={"chunks": []},
        )
        assert resp.status_code == 400
        assert "No chunks" in resp.json()["detail"]

    async def test_embed_endpoint_requires_auth(self, client: AsyncClient):
        """Without the teacher auth override, the endpoint must reject with 403."""
        # Clear the dependency override for this test only
        from app.main import app
        app.dependency_overrides.clear()

        resp = await client.post(
            "/api/v1/curriculum/embed",
            json={"chunks": [{"content": "test", "metadata": {}}]},
        )
        assert resp.status_code == 403
```

- [ ] **Step 2: Run all knowledge base tests**

```
cd backend && python -m pytest tests/test_knowledge_base.py -v
```
Expected: 7/7 PASS.

- [ ] **Step 3: Run the full test suite to confirm nothing is broken**

```
cd backend && python -m pytest tests/ -v
```
Expected: all tests pass (13 ingestion + 10 classroom + 14 auth + 7 knowledge_base = 44 total).

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_knowledge_base.py
git commit -m "test(feature4): add pytest suite for embed_and_store_chunks and /embed endpoint"
```

---

### Task 7: Update AI_CONTEXT.md (Final)

**Files:**
- Modify: `AI_CONTEXT.md`

- [ ] **Step 1: Final AI_CONTEXT.md update**

1. Change Feature 3 row to `✅ **Complete & Tested**`.
2. Change Feature 4 row to `✅ **Complete & Tested**`.
3. Update the repository structure block: add `004_feature4_pgvector.sql`, `curriculum/page.tsx`, `FileUploadZone.tsx` to tree.
4. Update section 8 (Feature 3 summary) — remove "frontend pending" note, confirm both backend and tests pass, chunking works perfectly.
5. Add new section for Feature 4 with key files, architecture notes, and test count.
6. Update Supabase Setup Checklist to include step for `004_feature4_pgvector.sql`.

- [ ] **Step 2: Commit**

```bash
git add AI_CONTEXT.md
git commit -m "docs: mark Feature 3 and Feature 4 complete in AI_CONTEXT.md"
```

---

## Self-Review

**Spec coverage check:**
- ✅ pgvector extension + snc_knowledge_base table (Task 2)
- ✅ HNSW index + GIN metadata index (Task 2)
- ✅ RLS policy (Task 2)
- ✅ embed_and_store_chunks with OpenAI text-embedding-3-small (Task 3)
- ✅ Supabase service_role client for inserts (Task 3/4)
- ✅ /upload auto-triggers full pipeline (Task 4)
- ✅ Standalone /embed endpoint with ChunkInput/EmbedRequest pydantic models (Task 4)
- ✅ Frontend loading state with phase labels (Task 5)
- ✅ pytest mocking OpenAI (Task 6)
- ✅ Verify chunks saved correctly to Supabase (Task 6 — insert_mock assertions)
- ✅ Feature 3 fully complete marking (Task 7)

**Placeholder scan:** No TBD/TODO/placeholder steps — all code is concrete.

**Type consistency:**
- `embed_and_store_chunks(chunks: list[dict], supabase_admin_client)` — used identically in embedder.py, curriculum.py, and test mocks.
- `ChunkInput`, `EmbedRequest` — defined in curriculum.py, used only there.
- `UploadResult` interface — defined in FileUploadZone.tsx, re-declared in curriculum/page.tsx (acceptable — no shared types file needed for two files).
