# Curriculum Upload History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-grade upload history to the curriculum page — 6 grade cards each with an "Upload Book" modal and a list of past uploads by the current teacher.

**Architecture:** New `snc_uploads` DB table logs every successful embed. A new `GET /curriculum/uploads` endpoint returns the current teacher's history filtered by grade. The `/curriculum` frontend page is replaced with a 6-card grid; each card opens an `UploadBookModal` scoped to that grade and shows the history list below.

**Tech Stack:** Supabase (pgvector + RLS), FastAPI, Next.js 14 (App Router), TypeScript, Tailwind CSS

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/009_snc_uploads.sql` | `snc_uploads` table + RLS |
| Modify | `backend/app/api/v1/endpoints/curriculum.py` | Log upload + add GET endpoint |
| Create | `frontend/components/teacher/UploadBookModal.tsx` | Modal with fixed grade, book title input, file upload |
| Modify | `frontend/app/(teacher)/curriculum/page.tsx` | Replace with 6-grade-card grid + history |

---

## Task 1: DB Migration — snc_uploads table

**Files:**
- Create: `supabase/migrations/009_snc_uploads.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/009_snc_uploads.sql` with this exact content:

```sql
-- 009_snc_uploads.sql
-- Upload history: one row per successful PDF embed, scoped to the uploading teacher.
-- Run in Supabase SQL Editor after 008_switch_to_minilm_embeddings.sql

CREATE TABLE IF NOT EXISTS snc_uploads (
    id              UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id      UUID                     NOT NULL,   -- Supabase auth UID
    book_title      TEXT                     NOT NULL,
    grade_level     INT                      NOT NULL CHECK (grade_level BETWEEN 1 AND 6),
    filename        TEXT                     NOT NULL,
    total_chunks    INT                      NOT NULL DEFAULT 0,
    embedded_count  INT                      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_snc_uploads_teacher_grade
    ON snc_uploads (teacher_id, grade_level);

ALTER TABLE snc_uploads ENABLE ROW LEVEL SECURITY;

-- Teachers can only read/insert their own rows
CREATE POLICY "Teacher can insert own uploads"
    ON snc_uploads FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teacher can read own uploads"
    ON snc_uploads FOR SELECT
    USING (auth.uid() = teacher_id);
```

- [ ] **Step 2: Run the migration**

Open your Supabase project → SQL Editor → paste and run the above SQL.

Verify with:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'snc_uploads';
```
Expected: 8 columns (id, teacher_id, book_title, grade_level, filename, total_chunks, embedded_count, created_at).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_snc_uploads.sql
git commit -m "feat: add snc_uploads migration for upload history"
```

---

## Task 2: Backend — Log upload to snc_uploads

**Files:**
- Modify: `backend/app/api/v1/endpoints/curriculum.py`

- [ ] **Step 1: Write a failing test**

Add to `backend/tests/test_ingestion.py` (or create `backend/tests/test_upload_history.py`):

```python
# backend/tests/test_upload_history.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def test_upload_logs_to_snc_uploads():
    """After successful embed, an snc_uploads row must be inserted."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

    from app.api.v1.endpoints.curriculum import _log_upload
    _log_upload(
        supabase=mock_supabase,
        teacher_id="teacher-uuid-123",
        book_title="SNC Grade 3 English",
        grade_level=3,
        filename="snc_g3_english.pdf",
        total_chunks=45,
        embedded_count=45,
    )

    mock_supabase.table.assert_called_with("snc_uploads")
    insert_call = mock_supabase.table.return_value.insert.call_args[0][0]
    assert insert_call["teacher_id"] == "teacher-uuid-123"
    assert insert_call["grade_level"] == 3
    assert insert_call["embedded_count"] == 45
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/test_upload_history.py -v
```
Expected: `ImportError` or `AttributeError` — `_log_upload` does not exist yet.

- [ ] **Step 3: Add `_log_upload` helper and call it in the upload endpoint**

In `backend/app/api/v1/endpoints/curriculum.py`, add the helper just before the router definition and call it after successful embed:

```python
# Add this helper function after the imports, before router = APIRouter()

def _log_upload(
    supabase,
    teacher_id: str,
    book_title: str,
    grade_level: int,
    filename: str,
    total_chunks: int,
    embedded_count: int,
) -> None:
    """Insert one row into snc_uploads. Non-fatal — errors are swallowed."""
    try:
        supabase.table("snc_uploads").insert({
            "teacher_id": teacher_id,
            "book_title": book_title,
            "grade_level": grade_level,
            "filename": filename,
            "total_chunks": total_chunks,
            "embedded_count": embedded_count,
        }).execute()
    except Exception:
        pass  # history logging is non-fatal
```

Then in the `upload_snc_textbook` endpoint, after the successful embed block (after `embedded_count = await embed_and_store_chunks(...)`), add:

```python
    # ── 7. Log to upload history ──────────────────────────────────────────────
    _log_upload(
        supabase=supabase,
        teacher_id=teacher["sub"],   # Supabase JWT "sub" claim = user UUID
        book_title=book_title.strip(),
        grade_level=grade_level,
        filename=filename,
        total_chunks=len(processed_chunks),
        embedded_count=embedded_count,
    )
```

The `return` block stays immediately after this.

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_upload_history.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/curriculum.py backend/tests/test_upload_history.py
git commit -m "feat: log each PDF upload to snc_uploads history table"
```

---

## Task 3: Backend — GET /curriculum/uploads endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/curriculum.py`

- [ ] **Step 1: Write a failing test**

Add to `backend/tests/test_upload_history.py`:

```python
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


def test_get_uploads_returns_teacher_history(monkeypatch):
    """GET /curriculum/uploads returns rows for the current teacher only."""
    fake_rows = [
        {
            "id": "uuid-1",
            "book_title": "SNC Grade 3 English",
            "grade_level": 3,
            "filename": "snc_g3.pdf",
            "total_chunks": 45,
            "embedded_count": 45,
            "created_at": "2026-04-10T10:00:00+00:00",
        }
    ]
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.order.return_value.execute.return_value \
        .data = fake_rows

    monkeypatch.setattr(
        "app.api.v1.endpoints.curriculum.get_supabase_admin",
        lambda: mock_supabase,
    )

    from app.main import app
    client = TestClient(app)

    with patch("app.core.security.get_current_teacher", return_value={"sub": "teacher-uuid-123"}):
        response = client.get(
            "/api/v1/curriculum/uploads",
            headers={"Authorization": "Bearer fake-token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["book_title"] == "SNC Grade 3 English"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_upload_history.py::test_get_uploads_returns_teacher_history -v
```
Expected: 404 — endpoint does not exist yet.

- [ ] **Step 3: Add the GET endpoint**

Append to `backend/app/api/v1/endpoints/curriculum.py` (after the `/embed` endpoint):

```python
# ── GET /uploads  — upload history for the current teacher ────────────────────

@router.get("/uploads", status_code=200)
async def get_uploads(
    grade_level: int | None = None,
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return all snc_uploads rows for the current teacher, newest first.
    Optional query param: ?grade_level=3 to filter to one grade.
    """
    supabase = get_supabase_admin()
    teacher_id: str = teacher["sub"]

    query = (
        supabase.table("snc_uploads")
        .select("id, book_title, grade_level, filename, total_chunks, embedded_count, created_at")
        .eq("teacher_id", teacher_id)
    )
    if grade_level is not None:
        query = query.eq("grade_level", grade_level)

    result = query.order("created_at", desc=True).execute()
    return result.data
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_upload_history.py -v
```
Expected: both tests PASS.

- [ ] **Step 5: Smoke test with running server**

With backend running (`uvicorn app.main:app --reload`), open `http://localhost:8000/docs`, find `GET /api/v1/curriculum/uploads`, click Try It Out → Execute (you'll need a valid Bearer token from the teacher login).

Expected: 200 with an array (empty if no uploads yet).

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/curriculum.py
git commit -m "feat: add GET /curriculum/uploads history endpoint"
```

---

## Task 4: Frontend — UploadBookModal component

**Files:**
- Create: `frontend/components/teacher/UploadBookModal.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/teacher/UploadBookModal.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
}

interface Props {
  gradeLevel: number;
  onClose: () => void;
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

export default function UploadBookModal({ gradeLevel, onClose, onSuccess }: Props) {
  const [bookTitle, setBookTitle] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
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
    const chunkTimer = setTimeout(() => setUploadState("chunking"), 1500);
    const embedTimer = setTimeout(() => setUploadState("embedding"), 3000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please sign in again.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade_level", String(gradeLevel));
      formData.append("book_title", bookTitle.trim());

      const res = await fetch("http://localhost:8000/api/v1/curriculum/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body?.detail;
        const message = Array.isArray(detail)
          ? detail.map((d) => d?.msg ?? JSON.stringify(d)).join("; ")
          : typeof detail === "string"
          ? detail
          : `Server error ${res.status}`;
        throw new Error(message);
      }

      const result: UploadResult = await res.json();
      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);
      setUploadState("done");
      onSuccess(result);
    } catch (err: unknown) {
      clearTimeout(chunkTimer);
      clearTimeout(embedTimer);
      setUploadState("idle");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Upload Book — Grade {gradeLevel}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Book title */}
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
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* File picker / drop zone */}
          <div
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={[
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
              isLoading
                ? "cursor-not-allowed opacity-70 border-gray-200"
                : "cursor-pointer border-gray-300 hover:border-indigo-400 hover:bg-indigo-50",
            ].join(" ")}
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
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                <p className="text-sm font-medium text-indigo-600">
                  {STATE_LABELS[uploadState]}
                </p>
                <p className="text-xs text-gray-400">Do not close this window</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">
                  Click to select a PDF
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF only · SNC textbooks</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors on the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/teacher/UploadBookModal.tsx
git commit -m "feat: add UploadBookModal component for grade-scoped PDF uploads"
```

---

## Task 5: Frontend — Redesign curriculum page with grade cards

**Files:**
- Modify: `frontend/app/(teacher)/curriculum/page.tsx`

- [ ] **Step 1: Replace the curriculum page**

Overwrite `frontend/app/(teacher)/curriculum/page.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import UploadBookModal from "@/components/teacher/UploadBookModal";

interface UploadRecord {
  id: string;
  book_title: string;
  grade_level: number;
  filename: string;
  total_chunks: number;
  embedded_count: number;
  created_at: string;
}

const GRADE_COLORS: Record<number, { badge: string; button: string }> = {
  1: { badge: "bg-emerald-100 text-emerald-700", button: "bg-emerald-600 hover:bg-emerald-700" },
  2: { badge: "bg-sky-100 text-sky-700",         button: "bg-sky-600 hover:bg-sky-700" },
  3: { badge: "bg-violet-100 text-violet-700",   button: "bg-violet-600 hover:bg-violet-700" },
  4: { badge: "bg-amber-100 text-amber-700",     button: "bg-amber-600 hover:bg-amber-700" },
  5: { badge: "bg-rose-100 text-rose-700",       button: "bg-rose-600 hover:bg-rose-700" },
  6: { badge: "bg-indigo-100 text-indigo-700",   button: "bg-indigo-600 hover:bg-indigo-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CurriculumPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalGrade, setModalGrade] = useState<number | null>(null);

  const fetchUploads = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("http://localhost:8000/api/v1/curriculum/uploads", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data: UploadRecord[] = await res.json();
        setUploads(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const uploadsForGrade = (grade: number) =>
    uploads.filter((u) => u.grade_level === grade);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Knowledge Base</h1>
      <p className="text-sm text-gray-500 mb-8">
        Upload SNC textbook PDFs by grade. Each PDF is chunked and embedded into
        the vector database for the AI tutor.
      </p>

      {/* Grade cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((grade) => {
          const colors = GRADE_COLORS[grade];
          const gradeUploads = uploadsForGrade(grade);

          return (
            <div
              key={grade}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                  Grade {grade}
                </span>
                <button
                  onClick={() => setModalGrade(grade)}
                  className={`flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-colors ${colors.button}`}
                >
                  <Upload size={12} />
                  Upload Book
                </button>
              </div>

              {/* Upload history list */}
              <div className="px-5 py-3 min-h-[100px]">
                {loading && (
                  <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
                )}

                {!loading && gradeUploads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <BookOpen size={20} className="text-gray-300 mb-1" />
                    <p className="text-xs text-gray-400">No books uploaded yet</p>
                  </div>
                )}

                {!loading && gradeUploads.length > 0 && (
                  <ul className="space-y-2">
                    {gradeUploads.map((u) => (
                      <li key={u.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {u.book_title}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {u.filename} · {u.embedded_count} chunks
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                          {formatDate(u.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {modalGrade !== null && (
        <UploadBookModal
          gradeLevel={modalGrade}
          onClose={() => setModalGrade(null)}
          onSuccess={() => {
            setModalGrade(null);
            fetchUploads();   // refresh history after upload
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Manual test**

1. Start backend: `uvicorn app.main:app --reload` (in `backend/`)
2. Start frontend: `npm run dev` (in `frontend/`)
3. Log in as teacher → click **Knowledge Base** in dashboard header
4. Verify 6 grade cards render
5. Click **Upload Book** on any card → modal opens with correct grade in the title
6. Enter a book title, select a PDF → upload completes → modal closes → history row appears in the card

- [ ] **Step 4: Commit**

```bash
git add frontend/app/(teacher)/curriculum/page.tsx
git commit -m "feat: redesign curriculum page with per-grade upload cards and history"
```
