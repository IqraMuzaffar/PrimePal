# Curriculum Endpoints

**Module:** `backend/app/api/v1/endpoints/curriculum.py`
**Prefix:** `/api/v1/curriculum`
**Auth:** Teacher (GoTrue JWT)

## Endpoints

### POST `/curriculum/upload`
Full pipeline: PDF upload + text extraction + chunking + embedding.
**Body:** `multipart/form-data` with `file` (PDF), `grade_level` (1-6), `book_title`, `topic_tag?`
**Pipeline:** PyMuPDF extraction → clean_snc_text() → chunk_documents() → embed_and_store_chunks()
**Response:** `{ status, message, total_chunks, embedded_count, sample_chunk }`

### POST `/curriculum/embed`
Standalone re-embedding endpoint for pre-processed chunks.
**Body:** `{ chunks: [{ content, metadata }] }`

### GET `/curriculum/uploads`
List all uploaded curriculum files with metadata.

## Pipeline Details
1. Validates `.pdf` extension
2. Writes to temp file, extracts text via PyMuPDF
3. Cleans text (strips page numbers, SNC headers)
4. Chunks with RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
5. Embeds via OpenAI text-embedding-3-small
6. Stores vectors in `snc_knowledge_base` (pgvector)
7. Uploads raw PDF to Supabase Storage as backup
8. Temp file always deleted in `finally` block
