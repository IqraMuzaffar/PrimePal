# Chat Endpoints

**Module:** `backend/app/api/v1/endpoints/chat.py`
**Prefix:** `/api/v1/chat`
**Auth:** Student JWT (`get_current_student`) for all endpoints
**Features:** Guardrailed Bilingual Tutor (Feature 5), Bilingual Code-Switching (Feature 7)

## Overview

The core tutoring chat interface. Implements a three-step pipeline: translate student message to English, retrieve grade-filtered SNC context via pgvector, then generate a guardrailed bilingual (Minglish) response. Grade level is resolved server-side from the classroom record and cannot be overridden by the client.

---

## POST `/api/v1/chat`

Send a student message and receive a grade-appropriate, SNC-grounded bilingual reply.

**Request Body:** `ChatRequest`
```json
{
  "message": "mujhe animals ke bare mein batao"
}
```

**Validation:** `message` must be 1-1000 characters.

**Response:** `ChatResponse`
```json
{
  "reply": "Bilingual Minglish response (shown by default)",
  "english_reply": "Pure English response (shown when student toggles)",
  "grade_level": 3,
  "context_used": true,
  "translated_query": "Tell me about animals"
}
```

**Business Logic:**
1. Resolve `grade_level` from `classrooms` table (hard guardrail)
2. Translate student message to English via `translate_to_english()` (gpt-4o-mini)
3. Retrieve grade-filtered SNC context chunks via `retrieve_grade_filtered_chunks()` (pgvector RPC)
4. Generate guardrailed bilingual response via `get_guardrailed_response()` (gpt-4o)
5. Log interaction in background via `log_interaction()`

**DB Tables:** `classrooms` (grade lookup), `snc_knowledge_base` (vector search via RPC), `student_interactions` (background log)

**Errors:**
- 404: Classroom not found for this student

---

## POST `/api/v1/chat/stream`

Streaming version of the chat endpoint. Returns Server-Sent Events (SSE).

**Request Body:** `ChatRequest` (same as above)

**Response:** `text/event-stream` with SSE events:
```
data: {"type": "status", "content": "Thinking..."}
data: {"type": "token", "content": "Hello"}
data: {"type": "token", "content": " there"}
data: {"type": "done"}
```

**Business Logic:**
1. Same pipeline as POST `/chat`: resolve grade, translate, retrieve context
2. Stream tokens via `stream_guardrailed_response()` async generator
3. Log interaction after stream completes (via `asyncio.to_thread`)

**DB Tables:** Same as POST `/chat`

**Errors:**
- 404: Classroom not found for this student
