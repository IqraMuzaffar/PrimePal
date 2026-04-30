# A03 — Gradebook Upload & RAG Pipeline Management

**Priority:** HIGH
**Status:** TODO
**Depends on:** None (RAG pipeline exists, needs admin UI)

## What Exists

- PDF upload endpoint: `POST /curriculum/upload` (teacher-scoped)
- Ingestion pipeline: `backend/app/agents/ingestion.py` — PDF → text extraction → chunking (1000 chars, 200 overlap)
- Embedding pipeline: `backend/app/agents/embedder.py` — OpenAI text-embedding-3-small → pgvector
- `snc_knowledge_base` table: content + embedding + metadata (grade_level, book_title, chunk_id)
- `snc_uploads` table: file tracking (teacher_id, file_name, grade_level, book_title, total_chunks)
- Teacher curriculum page: `/teacher/curriculum` — PDF upload hub
- **No admin-specific upload interface**
- **No upload status tracking UI** (no progress/success/failed indicators)

## What Needs to Be Built

### 1. Admin-Exclusive Upload Rights

- The client specifies: **Admin has exclusive rights to upload foundational course documents**
- Move the upload capability from teacher to admin (or make it admin-only with teacher read-access)
- Admin page: `/admin/dashboard/curriculum` (stub exists, needs full implementation)

### 2. Grade-Level Book Management

Admin should see a clear view:

| Grade | Books Uploaded | Total Chunks | Status | Actions |
|-------|---------------|-------------|--------|---------|
| Grade 1 | English Textbook G1 | 245 chunks | Active | View / Replace / Delete |
| Grade 2 | English Textbook G2 | 312 chunks | Active | View / Replace / Delete |
| Grade 3 | (none) | — | Missing | Upload |

- Upload interface: select grade → upload PDF → assign book title
- Replace: upload new version, re-chunk and re-embed, mark old chunks as superseded
- Delete: remove all chunks for a book (with confirmation)

### 3. Embedding Status Tracking (ETL Pipeline)

The client explicitly requires visibility into the vectorization pipeline:

- After upload, show real-time status: **"Uploading" → "Extracting Text" → "Chunking" → "Embedding" → "Success"**
- If any step fails: show **"Failed"** with error message
- Backend: add a `status` column to `snc_uploads`: `pending | extracting | chunking | embedding | success | failed`
- Update status at each pipeline stage
- Frontend: poll or websocket for status updates on the admin curriculum page

### 4. Chunk Audit View

- Admin should be able to view the actual chunks generated from a book
- Click on a book → see paginated list of chunks with metadata
- Verify content quality before the data feeds into missions and chatbot
- This is the existing `/admin/dashboard/curriculum` stub — implement it fully

### 5. Backend Changes

- `PUT /admin/curriculum/upload` — admin-only upload (reuses existing ingestion pipeline)
- `GET /admin/curriculum/books` — list all uploaded books with status
- `GET /admin/curriculum/books/{id}/chunks` — paginated chunk viewer
- `DELETE /admin/curriculum/books/{id}` — delete book + all its chunks
- `GET /admin/curriculum/books/{id}/status` — poll embedding progress

## Engineering Notes

- The ingestion + embedding pipeline is already built — this ticket is about admin UX and status tracking
- The existing teacher upload can remain for convenience but admin is the "official" upload path
- ETL status tracking: simplest approach is to update the `snc_uploads` record at each stage, then poll from frontend
- Consider adding `error_message` column to `snc_uploads` for failed pipeline diagnostics

## Files to Touch

- `backend/app/endpoints/curriculum.py` — admin-only upload variant, status tracking
- `backend/app/endpoints/admin.py` — book management CRUD
- `backend/app/agents/ingestion.py` — update `snc_uploads.status` at each pipeline stage
- `backend/app/agents/embedder.py` — update status on completion/failure
- `frontend/src/app/admin/dashboard/curriculum/` — full implementation (replace stub)
- `supabase/migrations/` — add `status`, `error_message` columns to `snc_uploads`
