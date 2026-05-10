# Curriculum Endpoints

**Module:** `backend/app/api/v1/endpoints/curriculum.py`
**Prefix:** `/api/v1/curriculum`
**Auth:** Teacher GoTrue JWT (`get_current_teacher`) for all endpoints
**Features:** SNC Document Ingestion (Feature 3), Vector Storage (Feature 4)

## Overview

Agent A (Curriculum Guardrail) endpoints. Handles PDF upload, text extraction, chunking, embedding, and storage in Supabase pgvector. This is the RAG pipeline that feeds the tutor chatbot and mission generator.

---

## POST `/api/v1/curriculum/upload`

**Permission:** `curriculum:upload`

Full pipeline: accept a PDF, extract text, chunk, embed, store in pgvector.

**Request:** multipart/form-data
- `file` (UploadFile, required) -- PDF only
- `grade_level` (int, required) -- 1 to 6
- `book_title` (string, required)

**Response:** 200
```json
{
  "status": "success",
  "message": "Successfully processed 45 chunks and stored 45 embeddings.",
  "total_chunks": 45,
  "embedded_count": 45,
  "sample_chunk": { "content": "...", "metadata": {...} }
}
```

**Business Logic:**
1. Validate file extension (.pdf only) and grade_level (1-6)
2. Write to temp file, upload raw PDF to Supabase Storage (`snc-textbooks` bucket)
3. Extract text via `PyPDFLoader`
4. Chunk via `chunk_documents()` (RecursiveCharacterTextSplitter with SNC metadata)
5. Embed via `embed_and_store_chunks()` (OpenAI text-embedding-3-small) and insert into `snc_knowledge_base`
6. Log upload to `snc_uploads` table

**DB Tables:** `snc_knowledge_base` (insert embeddings), `snc_uploads` (history log)
**Storage:** `snc-textbooks` Supabase bucket

**Errors:**
- 400: Not a PDF file
- 422: Invalid grade_level
- 500: Embedding failed

---

## POST `/api/v1/curriculum/embed`

**Permission:** `curriculum:upload`

Standalone embedding endpoint: accepts pre-processed chunks, embeds them, and stores in pgvector. Used for re-processing or batch uploads.

**Request Body:** `EmbedRequest`
```json
{
  "chunks": [
    { "content": "Text content...", "metadata": { "grade_level": 3, "book_title": "..." } }
  ]
}
```

**Response:** 200
```json
{
  "status": "success",
  "message": "Successfully embedded and stored 10 chunks.",
  "embedded_count": 10
}
```

**DB Tables:** `snc_knowledge_base`

**Errors:** 400 (no chunks), 500 (embedding failure)

---

## GET `/api/v1/curriculum/uploads`

Return upload history for the current teacher, newest first.

**Query Parameters:**
- `grade_level` (int, optional) -- filter by grade

**Response:** 200 -- list of upload records
```json
[
  {
    "id": "uuid",
    "book_title": "Grade 3 English",
    "grade_level": 3,
    "filename": "textbook.pdf",
    "total_chunks": 45,
    "embedded_count": 45,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

**DB Tables:** `snc_uploads` (filtered by teacher_id)
