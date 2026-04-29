# Three-Agent System

PrimePal's backend is organized around three AI agents, each with a distinct responsibility.

## Agent A — Curriculum Guardrail

**Location:** `backend/app/agents/curriculum_agent/`

**Purpose:** Ensures the AI never teaches out-of-syllabus content. Processes SNC (Single National Curriculum) textbooks into searchable vector embeddings.

**Components:**
- `ingestion.py` — PDF text extraction, cleaning, chunking (RecursiveCharacterTextSplitter, chunk_size=1000, overlap=200)
- `embedder.py` — Converts chunks to OpenAI `text-embedding-3-small` vectors, stores in Supabase `snc_knowledge_base` table

**Data flow:**
```
Teacher uploads PDF → ingestion.py cleans + chunks → embedder.py embeds → pgvector stores
```

**Triggered by:** `POST /api/v1/curriculum/upload`

## Agent B — Tutor

**Location:** `backend/app/agents/tutor_agent/`

**Purpose:** Student-facing AI that generates learning content and conversations across all four language pillars.

**Components:**
- `mission_generator.py` — Generates daily/pillar missions using RAG-retrieved curriculum context
- `chatbot.py` — Bilingual conversational AI with code-switching support (Urdu/English)

**Powers these endpoints:**
- `/api/v1/missions/daily` — 3 daily questions
- `/api/v1/missions/pillar/{pillar}` — Pillar-specific missions (reading/writing/listening/speaking)
- `/api/v1/chat` — Bilingual chatbot with RAG guardrails
- `/api/v1/spelling-bee/words` — Grade-appropriate spelling words
- `/api/v1/story-time/story` — AI-generated stories with comprehension questions
- `/api/v1/speaking/prompts` — Speaking practice prompts

## Agent C — Evaluator

**Location:** `backend/app/agents/evaluator_agent/`

**Purpose:** Silent observer that logs all student-AI interactions and produces teacher-facing analytics.

**Components:**
- `interaction_logger.py` — Background task that writes to `student_interactions` table
- `nlp_evaluator.py` — Parses interaction logs to evaluate reading/writing/listening/speaking performance

**Powers these endpoints:**
- `/api/v1/interactions` — Log student interactions
- `/api/v1/evaluator/report/student/{id}` — Per-student performance report
- `/api/v1/evaluator/report/classroom/{id}` — Classroom-wide analytics
- `/api/v1/evaluator/report/teacher` — Teacher's full dashboard data
