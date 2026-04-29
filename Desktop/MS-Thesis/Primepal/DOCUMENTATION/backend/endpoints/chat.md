# Chat Endpoints

**Module:** `backend/app/api/v1/endpoints/chat.py`
**Prefix:** `/api/v1/chat`
**Auth:** Student (custom PyJWT)

## Endpoints

### POST `/chat`
Bilingual RAG-powered conversational AI.
**Body:** `{ message, student_id? }`
**Response:** `{ response, sources? }`

## Behavior
- Accepts input in English, Urdu, or Roman Urdu (Minglish)
- RAG retrieval from `snc_knowledge_base` filtered by student's grade level
- System prompt enforces:
  - Respond bilingually if the student uses Urdu
  - Use Socratic scaffolding (guide, don't give direct answers)
  - Stay within SNC curriculum boundaries
- Interactions are logged via BackgroundTask to `student_interactions` table
