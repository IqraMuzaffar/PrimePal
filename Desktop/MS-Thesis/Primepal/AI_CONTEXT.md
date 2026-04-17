# PrimePal — AI Context & Long-Term Memory

This file is the source of truth for any AI assistant working on this codebase.
Read it at the start of every session before touching any code.

---

## 1. Project Overview

**PrimePal** is an AI-powered ESL (English as a Second Language) education platform for Pakistani primary school students. It addresses the "Mute English" phenomenon by combining a gamified student-facing mobile app with a teacher-facing analytics dashboard.

The system is built around three AI agents:
- **Agent A (Curriculum Guardrail):** Enforces SNC (Single National Curriculum) vocabulary boundaries via RAG.
- **Agent B (Tutor):** Drives learning across all four pillars — Reading, Writing, Listening, Speaking.
- **Agent C (Evaluator):** Silently monitors progress and produces actionable teacher reports.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, `lucide-react` |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Database & Auth** | Supabase (PostgreSQL + GoTrue auth) |
| **Vector DB** | Supabase pgvector (`snc_knowledge_base` table, `VECTOR(1536)`) |
| **LLM / Embeddings** | OpenAI (`gpt-4o` for chat, `text-embedding-3-small` for RAG) |
| **Speech-to-Text** | OpenAI Whisper (`whisper-1`) |
| **Student JWT** | PyJWT (HS256, custom secret — separate from Supabase JWT) |
| **Testing** | pytest + pytest-asyncio + httpx (backend); structure in place for frontend |

### Key package versions
- `next`: 14.2.35
- `@supabase/supabase-js`: ^2.43.4
- `fastapi`: 0.111.0
- `supabase` (Python): 2.4.6
- `PyJWT`: 2.8.0
- `pydantic-settings`: 2.2.1

---

## 3. Repository Structure

```
Primepal/
├── frontend/                        # Next.js 14 App Router
│   ├── app/
│   │   ├── (teacher)/               # Teacher route group
│   │   │   ├── layout.tsx           # Pass-through (no sidebar yet)
│   │   │   ├── login/page.tsx       # ✅ Feature 1 — email/password login
│   │   │   ├── dashboard/page.tsx   # ✅ Feature 10 — analytics dashboard
│   │   │   ├── dashboard/curriculum/page.tsx # ✅ Upload history + grade card UI
│   │   │   ├── classroom/page.tsx   # ✅ Feature 2 — classroom list
│   │   │   └── classroom/[id]/page.tsx # ✅ Feature 2 — classroom detail with tabs
│   │   ├── (student)/               # Student route group
│   │   │   ├── layout.tsx           # ✅ Sticky header + nav (Home/Chat/Missions) + logout
│   │   │   ├── play/page.tsx        # ✅ Feature 1 — class code entry (Step 1)
│   │   │   ├── play/avatar-select.tsx # ✅ Feature 1 — avatar grid → redirect /home
│   │   │   ├── home/page.tsx        # ✅ Student home dashboard (hero, badges, coming-soon)
│   │   │   ├── missions/page.tsx    # ✅ Feature 6 — daily missions game UI
│   │   │   ├── chat/page.tsx        # ✅ Feature 7 — bilingual chat UI
│   │   │   └── quests/page.tsx      # Stub — future four-pillar quests
│   │   └── (auth)/                  # Legacy stubs — superseded by (teacher)/(student)
│   ├── lib/
│   │   ├── api.ts                   # Typed fetch wrapper (uses NEXT_PUBLIC_API_URL)
│   │   └── supabase/client.ts       # Browser-side Supabase client
│   └── types/index.ts               # Shared TypeScript types
│
├── backend/                         # FastAPI
│   ├── app/
│   │   ├── main.py                  # App entrypoint, CORS middleware
│   │   ├── core/
│   │   │   ├── config.py            # pydantic-settings (reads .env)
│   │   │   ├── security.py          # ✅ create_student_token, get_current_student
│   │   │   └── supabase_client.py   # ✅ get_supabase() / get_supabase_admin()
│   │   ├── api/v1/
│   │   │   ├── router.py            # Wires all endpoint routers
│   │   │   └── endpoints/
│   │   │       ├── auth.py          # ✅ Feature 1 — avatar fetch + student login
│   │   │       ├── classroom.py     # Feature 2 (stub)
│   │   │       ├── curriculum.py    # ✅ Features 3 & 4 — /upload + /embed (complete)
│   │   │       ├── tutor.py         # Features 5–7 (stub)
│   │   │       ├── chat.py          # Feature 5 — /chat guardrailed RAG endpoint
│   │   │       └── evaluator.py     # Features 8–10 (stub)
│   │   ├── agents/
│   │   │   ├── curriculum_agent/    # Agent A: ingestion.py, embedder.py (stubs)
│   │   │   ├── tutor_agent/         # Agent B: quest_generator.py, chatbot.py (stubs)
│   │   │   └── evaluator_agent/     # Agent C: nlp_evaluator.py, report_builder.py (stubs)
│   │   ├── models/                  # SQLAlchemy: user.py, classroom.py, interaction.py
│   │   └── schemas/                 # Pydantic: auth.py, classroom.py
│   ├── tests/
│   │   ├── conftest.py              # Sets env vars before app import; AsyncClient fixture
│   │   └── test_auth.py             # ✅ 14 tests — all passing
│   ├── requirements.txt
│   ├── pytest.ini                   # asyncio_mode = auto
│   └── .gitignore
│
└── supabase/
    └── migrations/
        └── 001_feature1_auth.sql    # ✅ teachers, classrooms, students + RLS policies
```

---

## 4. Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STUDENT_JWT_SECRET=...          # Custom secret for student JWTs (not Supabase's JWT secret)
DATABASE_URL=postgresql+asyncpg://...
OPENAI_API_KEY=sk-...
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 5. Feature Completion Status

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Smart Auth & Role Management | ✅ **Complete & Tested** | Teachers: Supabase GoTrue. Students: custom PyJWT. See §6 |
| 2 | Classroom Manager (Registry) | ✅ **Complete & Tested** | CRUD + bulk student add. See §7 |
| 3 | SNC Document Ingestion (RAG Pipeline) | ✅ **Complete & Tested** | PDF upload → chunk → embed pipeline. See §8 |
| 4 | Vector Storage & Curricular Tagging | ✅ **Complete & Tested** | pgvector + snc_knowledge_base. See §9 |
| 5 | Guardrailed Tutor (Student AI Chatbot) | ✅ **Complete & Tested** | RAG chat with grade filter. See §10 |
| 6 | Gamified Missions (Daily Questions UI) | ✅ **Complete & Tested** | 3 questions/day, points system, home dashboard. See §11 |
| 7 | Bilingual Code-Switching Chatbot | ✅ **Complete & Tested** | Roman Urdu → English translation + bilingual reply. See §12 |
| 8 | Multi-Modal Interaction Logger | ✅ **Complete & Tested** | BackgroundTasks logging to student_interactions. See §13 |
| 9 | NLP Insight Generator | ✅ **Complete & Tested** | Evaluator agent producing teacher-facing insights. See §14 |
| 10 | Four-Skill Action Plan Dashboard | ✅ **Complete** | Analytics tab in classroom detail page |
| — | Upload History | ✅ **Complete** | snc_uploads table + curriculum history page |
| — | Student Home Dashboard | ✅ **Complete** | /home — hero, badges, coming-soon cards, persistent nav |

---

## 6. Feature 1 — Detailed Summary (Complete)

### What was built
- **Supabase SQL** (`supabase/migrations/001_feature1_auth.sql`): `teachers`, `classrooms`, `students` tables with full RLS.
- **Backend**:
  - `GET /api/v1/auth/classroom/{class_code}/avatars` — returns student roster for visual login grid.
  - `POST /api/v1/auth/student/login` — validates student belongs to classroom, issues custom HS256 JWT.
  - `app/core/security.py` — `create_student_token()`, `decode_student_token()`, `get_current_student()` FastAPI dependency.
- **Frontend**:
  - `app/(teacher)/login/page.tsx` — professional email/password form → `supabase.auth.signInWithPassword()` → redirect `/dashboard`.
  - `app/(student)/play/page.tsx` — gamified two-step login: enter class code → fetch avatars.
  - `app/(student)/play/avatar-select.tsx` — avatar grid → POST login → store JWT as `localStorage['primepal_student_token']` → redirect `/home`.
- **Tests**: 14/14 passing (`tests/test_auth.py`).

### Auth architecture note
Teachers authenticate via **Supabase GoTrue** (standard OAuth flow, JWT managed by Supabase).
Students authenticate via a **custom PyJWT** because they are ghost profiles, not Supabase Auth users.
These are two completely separate token systems — never mix them up.

---

## 7. Feature 2 — Detailed Summary (Complete)

### What was built
- **Supabase SQL** (`supabase/migrations/002_feature2_classroom.sql`): Adds `grade_level INTEGER` column to `classrooms` and creates a BEFORE INSERT trigger (`generate_class_code`) that auto-generates a unique 6-char hex class code. The function uses `SECURITY DEFINER` so the collision check bypasses RLS and sees all rows, and has a 100-iteration guard to prevent infinite loops.
- **Backend**:
  - `GET /api/v1/classroom/` — list authenticated teacher's classrooms, newest first.
  - `POST /api/v1/classroom/` — create classroom; trigger auto-generates `class_code`.
  - `GET /api/v1/classroom/{id}` — get classroom detail + full student roster.
  - `POST /api/v1/classroom/{id}/students/bulk` — bulk-create student ghost profiles with random avatars from a 6-item list; strips empty/whitespace names.
  - `DELETE /api/v1/classroom/{id}/students/{student_id}` — remove a student; returns 404 if student not found.
  - `get_current_teacher()` dependency in `app/core/security.py` — validates Supabase GoTrue JWTs via `supabase.auth.get_user(token)`, returns `{"id": teacher_uuid}`.
- **Frontend**:
  - `app/(teacher)/classroom/page.tsx` — responsive classroom card grid with grade badge, class code copy button (clipboard API), "New Classroom" button.
  - `app/(teacher)/classroom/[id]/page.tsx` — classroom detail: header with class code copy, Roster/Missions/Analytics tabs, student list with avatars, remove with confirm dialog, "Add Students" button.
  - `components/teacher/CreateClassroomModal.tsx` — form: class name + grade level (1–5) → POST /classroom/.
  - `components/teacher/BulkAddStudentsModal.tsx` — textarea (comma/newline separated) → POST /classroom/{id}/students/bulk. Stays open after success so teacher can add more batches.
  - `lib/teacherAuth.ts` — `getTeacherHeaders()` helper reads Supabase session token for backend Bearer auth.
- **Tests**: 10/10 passing (`tests/test_classroom.py`): create (201 + 403), list (owned + empty), detail (with roster + wrong teacher 403), bulk add (success + empty name filter), remove (success 204 + 404 not found).

### Auth note for Feature 2
All classroom endpoints require a Supabase GoTrue JWT in the `Authorization: Bearer` header. The frontend gets this from `supabase.auth.getSession()` via `getTeacherHeaders()`. This is validated server-side by `get_current_teacher` in `security.py` — completely separate from the student custom PyJWT system.

---

## 8. Feature 3 — Detailed Summary (Backend Complete)

### What was built
- **Supabase Storage** (`supabase/migrations/003_feature3_storage.sql`): Creates `snc-textbooks` private bucket with RLS policies restricting upload/view to authenticated teachers only.
- **Backend utilities** (`app/agents/curriculum_agent/ingestion.py`):
  - `clean_snc_text(text)` — strips isolated page numbers, "Single National Curriculum" headers, collapses blank lines.
  - `chunk_documents(documents, grade_level, book_title)` — uses `RecursiveCharacterTextSplitter` (chunk_size=1000, overlap=200), applies strict metadata (`grade_level`, `book_title`, `chunk_id`) to every chunk, discards chunks < 50 chars.
- **Backend endpoint** (`app/api/v1/endpoints/curriculum.py`):
  - `POST /api/v1/curriculum/upload` — teacher-protected (Supabase GoTrue JWT), accepts `multipart/form-data` with `file` (PDF), `grade_level` (1–6), `book_title`. Validates `.pdf` extension, writes to temp file, uploads raw PDF to Supabase Storage, extracts text via `PyMuPDFLoader`, chunks via `chunk_documents`, returns `{status, message, total_chunks, sample_chunk}`. Temp file always deleted in `finally` block.
- **Requirements**: `pymupdf==1.24.3` added to `requirements.txt`.
- **Tests**: 13/13 passing (`tests/test_ingestion.py`): endpoint (valid PDF × 2, txt rejected, jpg rejected, all-short chunks, no auth), `clean_snc_text` × 3, `chunk_documents` × 4.

### Key design notes
- `PyMuPDFLoader` is imported at module level in `curriculum.py` — safe without pymupdf installed (lazy internal import), and patchable at `app.api.v1.endpoints.curriculum.PyMuPDFLoader` in tests.
- Supabase Storage upload is non-fatal (wrapped in try/except) — PDF processing continues even if backup fails.
- The `/upload` endpoint now auto-calls `embed_and_store_chunks` after chunking (Feature 4 integration).
- Frontend UI: `app/(teacher)/curriculum/page.tsx` + `components/teacher/FileUploadZone.tsx`.

---

## 9. Feature 4 — Detailed Summary (Complete)

### What was built
- **Supabase SQL** (`supabase/migrations/004_feature4_pgvector.sql`): Enables `pgvector` extension, creates `snc_knowledge_base` table with `VECTOR(1536)` embedding column. HNSW index (`vector_cosine_ops`) for fast similarity search. GIN index on `metadata` JSONB for pre-filtering by `grade_level` before vector math. RLS policy restricts access to authenticated users.
- **Backend utility** (`app/agents/curriculum_agent/embedder.py`):
  - `embed_and_store_chunks(chunks, supabase_admin_client)` — async function that takes the `list[dict]` output of `chunk_documents()`, calls `OpenAIEmbeddings(model="text-embedding-3-small").aembed_documents()` for bulk embedding, and bulk-inserts records into `snc_knowledge_base` via the service_role Supabase client. Returns count of inserted records.
- **Backend endpoint** (`app/api/v1/endpoints/curriculum.py`):
  - `/upload` now runs the full pipeline: PDF → extract → chunk → embed → store. Returns `{status, message, total_chunks, embedded_count, sample_chunk}`.
  - `POST /api/v1/curriculum/embed` — standalone endpoint accepting `EmbedRequest` (list of `ChunkInput`); teacher-protected. Allows re-embedding pre-processed chunks without re-uploading PDFs.
- **Frontend**:
  - `app/(teacher)/curriculum/page.tsx` — Knowledge Base Upload page.
  - `components/teacher/FileUploadZone.tsx` — drag-drop upload zone with 3-phase loading states: "Uploading PDF…" → "Extracting & chunking…" → "Generating embeddings (10–30s)…". Blocks interaction during processing.
- **Tests**: 7/7 passing (`tests/test_knowledge_base.py`): `embed_and_store_chunks` unit tests (OpenAI called correctly, records structured correctly, empty list returns 0, targets correct table), `/embed` endpoint tests (success, empty chunks 400, no-auth 403).

### Key design notes
- `embed_and_store_chunks` is patched at `app.api.v1.endpoints.curriculum.embed_and_store_chunks` in tests — consistent with project patching conventions.
- Supabase service_role client (`get_supabase_admin()`) is used for pgvector inserts to bypass user-level RLS.
- OpenAI API key is read from `settings.OPENAI_API_KEY` (already in `config.py`); set `OPENAI_API_KEY=test-openai-key` is added to `conftest.py`.
- The `apiFetch` in `FileUploadZone.tsx` overrides the default `Content-Type: application/json` header so that `FormData` sends the correct `multipart/form-data` boundary.

---

## 10. Feature 5 — Detailed Summary (Complete)

### What was built
- **Supabase SQL** (`supabase/migrations/005_feature5_chat_rpc.sql`): Adds `match_snc_documents(query_embedding VECTOR(1536), grade_level_filter INT, match_count INT)` RPC. The `WHERE` clause pre-filters rows by `grade_level` **before** vector math runs — Grade 3 students can never receive Grade 5 vocabulary chunks by construction.
- **Agent logic** (`app/agents/tutor_agent/chatbot.py`):
  - `retrieve_grade_filtered_chunks(query, grade_level, supabase_admin_client)` — embeds the student message with `text-embedding-3-small`, calls the `match_snc_documents` RPC with the classroom's `grade_level` as a hard filter, returns content strings.
  - `get_guardrailed_response(message, grade_level, context_chunks)` — runs a `ChatPromptTemplate | ChatOpenAI(gpt-4o)` chain with a 6-rule system prompt enforcing: grade-appropriate vocabulary only, SNC-grounded answers only, Minglish tolerance, topic scope guard, short responses, encouraging tone.
- **Backend endpoint** (`app/api/v1/endpoints/chat.py`):
  - `POST /api/v1/chat` — student-protected (custom PyJWT). Resolves `grade_level` server-side from `classrooms` table (client cannot override). Calls retrieval → LLM. Returns `{reply, grade_level, context_used}`.
- **Router**: `chat.router` wired at prefix `/chat` in `router.py`.
- **Tests**: 13/13 passing (`tests/test_chat.py`) — endpoint integration (happy path, 404, 422, 403), grade guardrail (advanced question uses Grade 3 filter, grade not overridable via body), retrieval unit tests (correct RPC params, empty list, grade isolation), LLM unit tests (returns content, handles empty context).

### Key design notes — The Guardrail
The `grade_level` is extracted from the student's JWT (`classroom_id`) and looked up in the `classrooms` table **server-side**. The student's message text plays no role in grade selection. Even if a Grade 3 student asks a question that uses Grade 5 vocabulary, the vector search is constrained to `metadata->>'grade_level' = 3`. This is enforced at three layers:
1. **SQL RPC** — `WHERE (metadata->>'grade_level')::int = grade_level_filter` runs before cosine distance is computed.
2. **Endpoint logic** — `grade_level` is always resolved from the DB, never from the request body.
3. **System prompt** — LLM is instructed to use only Grade `{grade_level}` vocabulary even when context is sparse.

---

## 11. Feature 6 — Detailed Summary (Complete)

### What was built
- **Supabase SQL** (`supabase/migrations/006_feature6_gamification.sql`): Adds `points INTEGER DEFAULT 0` column to `students` table (idempotent `ADD COLUMN IF NOT EXISTS`).
- **Agent logic** (`app/agents/tutor_agent/mission_generator.py`):
  - Pydantic schemas `QuestionOption`, `MissionQuestion`, `DailyMissions` — serve as structured-output target.
  - `generate_daily_missions(grade_level, context_chunks)` — uses `ChatOpenAI.with_structured_output(DailyMissions)` to generate exactly 3 questions (2 multiple_choice + 1 fill_blank). Has a fallback prompt for when no SNC context is available yet.
- **Backend endpoints** (`app/api/v1/endpoints/missions.py`):
  - `GET /api/v1/missions/daily` — resolves `grade_level` from DB, retrieves 5 SNC chunks via `retrieve_grade_filtered_chunks` (reused from Feature 5), generates missions via LLM. `correct_answer` is **structurally absent** from `MissionQuestionOut` — it can never leak.
  - `POST /api/v1/missions/complete` — awards 10 points if `question_correct=True`, updates `students.points` in DB. Returns `{points_awarded, new_total}`.
  - `GET /api/v1/missions/me` — returns `{student_id, student_name, avatar_url, points}`.
- **Frontend** (`app/(student)/missions/page.tsx`):
  - State machine: `loading → question → answered → results`. Shows one question at a time with a gradient progress bar.
  - Multiple choice: 2×2 button grid; fill-in-the-blank: text input + submit.
  - On any answer: POSTs to `/complete`, shows `+10 ⭐` fly-up badge, auto-advances after 1.5s.
  - Results screen: session points + total, "Play Again" and "Chat with PrimePal" buttons.
- **Student layout** (`app/(student)/layout.tsx`): Sticky gamified header with student avatar, name, and `⭐ points` pill. Fetches from `/missions/me` on mount; degrades gracefully when token absent.
- **Chat UI** (`app/(student)/chat/page.tsx`): Messaging-app layout. Tutor bubbles (white/yellow, left) + student bubbles (orange, right). Animated typing indicator. Auto-scroll. Enter-to-send.
- **Tests**: 13/13 passing (`tests/test_missions.py`) — `/daily` endpoint, `/complete` points logic, `/me` profile, grade guardrail (retrieve called with correct grade_level), generator unit tests.

### Gamification architecture note
The `correct_answer` is **never sent to the client**. The `MissionQuestionOut` Pydantic model simply does not have the field — it cannot leak via any code path. The `/complete` endpoint trusts `question_correct: bool` from the client (engagement model, thesis prototype). Points accumulate in `students.points` server-side.

---

## 12. Feature 7 — Detailed Summary (Complete)

### What was built
- **Agent logic** (`app/agents/tutor_agent/chatbot.py`) — updated:
  - `TutorResponse(BaseModel)` with `bilingual_reply: str` and `english_reply: str`.
  - `translate_to_english(query: str) -> str` — async gpt-4o-mini call that converts Roman Urdu / Minglish to standard English. Returns the input unchanged if already English.
  - `get_guardrailed_response` signature updated to `(original_message, translated_message, grade_level, context_chunks) -> TutorResponse`. Uses `ChatOpenAI.with_structured_output(TutorResponse)` for a single-call bilingual response.
- **Backend endpoint** (`app/api/v1/endpoints/chat.py`):
  - Step 2 added: `translated_query = await translate_to_english(body.message)` before vector search.
  - Vector search uses `translated_query` (not raw Urdu) for accurate embeddings.
  - `ChatResponse` now includes `reply` (Minglish), `english_reply` (pure English), `grade_level`, `context_used`, `translated_query`.
- **Frontend** (`app/(student)/chat/page.tsx`):
  - Placeholder updated to `"Ask me anything in English or Roman Urdu!"`.
  - `Message` interface stores optional `englishReply` on tutor messages.
  - Per-bubble toggle button (`🇬🇧 English only` / `🔄 Bilingual`) below every tutor message — each toggles independently via a `Set<number>` state.
- **Tests**: 19/19 passing (`tests/test_chat.py`) — existing tests updated (translate_to_english mocked, TutorResponse-shaped mocks), 5 new Feature 7 tests in `TestFeature7Translation`.

### Key design notes
- Translation uses cheap gpt-4o-mini (temperature=0) for cost efficiency; bilingual generation uses gpt-4o (settings.CHAT_MODEL).
- A single LLM call with `with_structured_output(TutorResponse)` returns both bilingual and English replies — no second API call needed.
- The translation step is transparent: `translated_query` is echoed in the response so the teacher dashboard (Feature 10) can display what query was actually searched.

---

## 13. Feature 8 — Detailed Summary (Complete)

### What was built
- **Supabase SQL** (`supabase/migrations/007_feature8_interactions.sql`): `student_interactions` table with columns `id`, `student_id`, `classroom_id`, `grade_level`, `interaction_type` (CHECK: chat/mission_mc/mission_fill), `original_message`, `translated_message`, `correct`, `context_used`, `created_at`. Three indexes (student_id, classroom_id, created_at DESC) and an RLS SELECT policy for teachers.
- **Logger utility** (`app/agents/evaluator_agent/interaction_logger.py`): Synchronous `log_interaction(**kwargs)` that inserts via `get_supabase_admin()`. Silently swallows all exceptions — logging failure never crashes a student response.
- **Chat endpoint hook** (`app/api/v1/endpoints/chat.py`): Accepts `BackgroundTasks`; registers `log_interaction` (interaction_type="chat", correct=None, context_used derived from chunk list).
- **Missions complete hook** (`app/api/v1/endpoints/missions.py`): Accepts `BackgroundTasks`; fetches classroom grade_level; registers `log_interaction` (interaction_type="mission_mc", correct=body.question_correct).
- **Tests**: 7/7 passing (`tests/test_interactions.py`) — unit (insert payload, mission record, silent error), chat endpoint (context_used=True/False), missions complete (correct True/False).

### Key design notes
- `log_interaction` is synchronous by design — `BackgroundTasks` runs it in a thread pool, not the async event loop. This matches the synchronous Supabase Python client.
- `interaction_type` CHECK constraint enforces valid values at the DB layer.
- Service-role client bypasses RLS for inserts; teacher GoTrue auth gates reads.

---

## 14. Architectural Rules (Non-Negotiable)

### Database & Security
- **Always enable Row Level Security (RLS)** on every Supabase table. Never disable it.
- Use `get_supabase()` (anon key) for public/student-facing reads. Use `get_supabase_admin()` (service role) only for trusted server-side writes that need to bypass RLS.
- Student profiles are **ghost profiles** in the `students` table — they are NOT Supabase Auth users and have no password.

### Backend
- **Use `FastAPI BackgroundTasks`** for any heavy or async processing (NLP evaluation, embedding pipeline, interaction logging). Never block the request-response cycle for these.
- All API routes live under `/api/v1/`. The prefix is set in `main.py` via `app.include_router(api_router, prefix="/api/v1")`.
- Environment variables are loaded via `pydantic-settings` in `app/core/config.py`. Always add new env vars there — never hardcode secrets.
- The Supabase Python client is synchronous. For the scale of this thesis project, calling it inside `async def` endpoints is acceptable.

### Frontend
- The `(teacher)` and `(student)` route groups have **separate layouts**. Never put teacher UI inside the student group or vice versa.
- Use `lib/api.ts` (`apiFetch`) for all calls to the FastAPI backend.
- Use `lib/supabase/client.ts` only for Supabase Auth operations (teacher login/logout/session).
- Student JWT is stored in `localStorage` under the key `primepal_student_token`.
- All student-facing UI must be **mobile-first, touch-friendly, large tap targets**. These are primary school children on shared smartphones.

### RAG / Curriculum
- The RAG pipeline must **only** retrieve content tagged with the correct `grade_level` metadata from `snc_knowledge_base` (pgvector). Never allow the LLM to answer from general knowledge for curriculum questions — always ground in SNC chunks.
- SNC vocabulary is the single source of truth. Agent A is the gatekeeper.

### Testing
- Tests live in `backend/tests/`. Always mock `get_supabase` at the endpoint import path (`app.api.v1.endpoints.<module>.get_supabase`) — do not mock at the source module.
- `conftest.py` must set all required environment variables **before** any app imports, because `pydantic-settings` reads them at import time.
- Run tests with: `cd backend && python -m pytest tests/ -v`

---

## 15. Running the Project Locally

```bash
# Backend
cd backend
cp .env.example .env          # fill in your Supabase + OpenAI keys
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
# API docs: http://localhost:8000/docs

# Frontend
cd frontend
cp .env.local.example .env.local   # fill in Supabase public keys
npm install
npm run dev                         # http://localhost:3000

# Tests
cd backend
python -m pytest tests/ -v
```

---

## 16. Supabase Setup Checklist (one-time)

1. Create a Supabase project at supabase.com.
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_feature1_auth.sql`.
3. Paste and run `supabase/migrations/002_feature2_classroom.sql`.
4. Paste and run `supabase/migrations/003_feature3_storage.sql` (creates `snc-textbooks` storage bucket).
5. Paste and run `supabase/migrations/004_feature4_pgvector.sql` (enables `pgvector`, creates `snc_knowledge_base` table — **ready to query**).
6. Paste and run `supabase/migrations/005_feature5_chat_rpc.sql` (creates `match_snc_documents` RPC for grade-filtered vector similarity search).
7. Copy **Project URL** and **anon key** → paste into `backend/.env` and `frontend/.env.local`.
8. Copy **service_role key** → paste into `backend/.env` (`SUPABASE_SERVICE_ROLE_KEY`). Keep this secret — never expose it to the frontend.
9. For teacher registration, use Supabase's **Authentication → Users** dashboard.

---

## 17. Future Features Roadmap

These features are designed and stubbed in the student home dashboard as locked "Coming Soon" cards. They are the next implementation priorities in order.

### F-A: Class Leaderboard
- **What:** Weekly/all-time ranking of students by points within a classroom.
- **Backend:** `GET /api/v1/missions/leaderboard` — queries `students` table filtered by `classroom_id`, ordered by `points DESC`, returns top 10 with rank, name, avatar, points.
- **Frontend:** `/leaderboard` page. Podium UI for top 3, ranked list for 4–10. Updates on mission complete.
- **DB:** No new table needed — uses existing `students.points`.

### F-B: Spelling Bee
- **What:** Audio-first game: student hears a word (TTS), types the spelling, gets immediate feedback.
- **Backend:** `GET /api/v1/spelling/daily` — picks 5 grade-appropriate words from `snc_knowledge_base`, returns `{word, definition, audio_url}`. Audio via OpenAI TTS (`tts-1`).
- **Frontend:** `/spelling` page. "Play" button triggers audio, input box, submit, reveal.
- **DB:** New `spelling_attempts` table (student_id, word, correct, created_at).

### F-C: Story Time
- **What:** LLM-generated short stories using grade-appropriate SNC vocabulary. Student reads and answers 1 comprehension question.
- **Backend:** `GET /api/v1/story/daily` — retrieves 3 SNC chunks, generates a 100-word illustrated story with 1 MC comprehension question via structured LLM output.
- **Frontend:** `/story` page. Story card with large text, then question card. Awards 15 points on correct answer.
- **DB:** No new table — reuse `student_interactions` with `interaction_type='story'`.

### F-D: Speaking Practice
- **What:** Student holds a button to record speech, Whisper transcribes it, PrimePal gives feedback.
- **Backend:** `POST /api/v1/speak` — accepts audio blob, calls Whisper, grades pronunciation via LLM comparison with target phrase.
- **Frontend:** `/speaking` page. Hold-to-record mic button. Shows transcript + feedback.
- **DB:** New `speaking_attempts` table (student_id, target_phrase, transcript, score, created_at).

### Technical Debt / Known Issues (as of 2026-04-17)
- `missions.py:get_daily_missions` — previously had no error handling around RAG + LLM calls (fixed 2026-04-17 with try/except + logger).
- `AI_CONTEXT.md` section 2 previously showed Qdrant as the vector DB; project uses **pgvector via Supabase** (corrected 2026-04-17).
- Student post-login redirect previously went to `/missions`; now correctly routes to `/home` (fixed 2026-04-17).
- `StudentProfile` TypeScript interface is duplicated in `layout.tsx` and `home/page.tsx` — should be extracted to `frontend/types/student.ts` in a future cleanup.
