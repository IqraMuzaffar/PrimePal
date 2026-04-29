# Data Flow

## Student Mission Flow (typical request lifecycle)

```
1. Student opens missions page
2. Frontend: GET /api/v1/missions/daily (Bearer: student JWT)
3. Backend: get_current_student() validates JWT, extracts student_id
4. Backend: Fetches student's classroom → grade_level
5. Backend: Checks Redis cache for today's missions
6. If cache miss:
   a. RAG query: searches snc_knowledge_base filtered by grade_level
   b. LLM call: gpt-4o-mini generates 3 questions using curriculum context
   c. Stores in Redis cache (TTL: 24h)
7. Returns mission questions to frontend
8. Student answers → POST /api/v1/missions/daily/submit
9. Backend: Evaluates answers, awards points (UPDATE students SET points)
10. Backend: Logs interaction via BackgroundTask → student_interactions table
11. Returns score + feedback to frontend
```

## Curriculum Upload Flow

```
1. Teacher uploads PDF via drag-drop zone
2. Frontend: POST /api/v1/curriculum/upload (multipart/form-data)
3. Backend: Validates PDF, extracts text (PyMuPDF)
4. Agent A ingestion: clean_snc_text() → chunk_documents()
5. Agent A embedder: embed_and_store_chunks() → OpenAI embeddings API
6. Stores vectors in snc_knowledge_base (pgvector)
7. Uploads raw PDF to Supabase Storage (backup)
8. Returns chunk count + sample to frontend
```

## Chat Flow (Bilingual Code-Switching)

```
1. Student types message (potentially in Roman Urdu / Minglish)
2. Frontend: POST /api/v1/chat { message, student_id }
3. Backend: RAG retrieval from snc_knowledge_base (grade-filtered)
4. Backend: LLM call with system prompt enforcing:
   - Respond bilingually if student uses Urdu
   - Socratic scaffolding (don't give answers directly)
   - Stay within SNC curriculum bounds
5. Backend: Logs interaction (BackgroundTask)
6. Returns AI response to frontend
```

## Points System

Points are awarded by multiple endpoints: missions, spelling-bee, story-time, speaking. Each follows:

```
1. Fetch current student points from DB
2. Calculate new_total = current + earned
3. UPDATE students SET points = new_total
```

**Known issue:** This is a read-modify-write pattern vulnerable to race conditions under concurrent requests. See TICKETS/05-SECURITY-HARDENING.md for the planned atomic increment fix.
