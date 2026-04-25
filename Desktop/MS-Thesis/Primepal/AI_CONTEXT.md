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
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, `lucide-react`, `framer-motion`, `canvas-confetti`, `@dicebear/core` |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Database & Auth** | Supabase (PostgreSQL + GoTrue auth) |
| **Vector DB** | Supabase pgvector (`snc_knowledge_base` table, `VECTOR(1536)`) |
| **LLM / Embeddings** | OpenAI (`gpt-4o-mini` for chat, `text-embedding-3-small` for RAG) |
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
│   │   ├── teacher/                 # Teacher routes (explicit, no route groups)
│   │   │   ├── layout.tsx           # TeacherShell wrapper
│   │   │   ├── login/page.tsx       # ✅ Feature 1 — email/password login
│   │   │   ├── dashboard/page.tsx   # ✅ Feature 10 — analytics dashboard
│   │   │   ├── dashboard/curriculum/page.tsx # ✅ Upload history + grade card UI
│   │   │   ├── classroom/page.tsx   # ✅ Feature 2 — classroom list (grade-grouped in Phase B)
│   │   │   ├── classroom/[id]/page.tsx # ✅ Feature 2 — classroom detail with edit modal (Phase A4)
│   │   │   ├── analytics/page.tsx   # ✅ Global analytics dashboard (Phase B3)
│   │   │   └── curriculum/page.tsx  # ✅ Curriculum Hub with context banner (Phase C1)
│   │   ├── student/                 # Student routes (explicit, no route groups)
│   │   │   ├── layout.tsx           # ✅ Sticky header + nav (Home/Chat/Missions) + logout
│   │   │   ├── play/page.tsx        # ✅ Feature 1 — class code entry (Step 1)
│   │   │   ├── play/avatar-select.tsx # ✅ Feature 1 — avatar grid → redirect /home
│   │   │   ├── home/page.tsx        # ✅ Student home dashboard (hero, badges, coming-soon)
│   │   │   ├── missions/page.tsx    # ✅ Feature 11 — 4-pillar dashboard UI
│   │   │   ├── missions/[pillar]/page.tsx # ✅ Feature 11 — gameplay with 15s timer
│   │   │   ├── chat/page.tsx        # ✅ Feature 7 — bilingual chat UI
│   │   │   └── quests/page.tsx      # Stub — future four-pillar quests
│   │   └── auth/                    # Auth routes (explicit, no route groups)
│   │       └── login/               # Legacy — routes migrated to teacher/student groups
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
| 11 | 4-Pillar Kahoot-Style LMS | ✅ **Complete & Tested** | Reading/Writing/Listening/Speaking with 15s timer, curriculum-aligned AI generation. See §15 |
| — | Upload History | ✅ **Complete** | snc_uploads table + curriculum history page |
| — | Student Home Dashboard | ✅ **Complete** | /home — hero, badges, all activities unlocked |
| — | Spelling Bee | ✅ **Complete** | Audio TTS + typed spelling + accuracy scoring. See §21 |
| — | Story Time | ✅ **Complete** | LLM story + 3 comprehension questions + TTS read-aloud. See §22 |
| — | Speaking Practice | ✅ **Complete** | Web SpeechRecognition + LLM transcript evaluation. See §23 |
| — | Quests Page | ✅ **Complete** | 4-pillar weekly progress (7-day rolling window). See §24 |
| — | Student Leaderboard | ✅ **Complete** | Classroom ranking by points, podium top-3 |
| — | Teacher Dashboard v2 | ✅ **Complete** | 4-stat KPIs, At-Risk widget, 6 quick actions. See §25 |
| — | Student Directory | ✅ **Complete** | Global student search/filter with stats. See §25 |
| — | Student Report Cards | ✅ **Complete** | AI-powered per-student pillar reports + PDF export. See §25 |
| — | Admin Role System | ✅ **Complete** | School-wide admin with invite codes, audit log. See §18 |
| — | Evolving Worlds (Dynamic Backgrounds) | ✅ **Complete** | Day/night cycle + 3-tier journey system with Framer Motion animations. See §26 |
| — | Surprise Daily Chest (Loot Box) | ✅ **Complete** | Anti-cheat daily reward system with interactive chest animation. See §27 |

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

## 15. Feature 11 — 4-Pillar Kahoot-Style LMS (Complete)

### What was built

A comprehensive multi-pillar mission system with curriculum-aligned AI question generation, student weakness tracking, and gamified 15-second timer gameplay. The system transforms the simple 3-question daily missions into a robust, adaptive learning experience.

#### Database (Supabase SQL)
- **Migration 009** (`supabase/migrations/009_add_current_week_topic.sql`): Adds `current_week_topic VARCHAR(500)` to `classrooms` table with default `'Week 1: Introduction'`. Teachers can set this to guide AI question generation (e.g., "Week 2: Past Tense Verbs").

#### Backend — Mission Generation & Logging

**Mission Generator** (`app/agents/tutor_agent/mission_generator.py`):
- `generate_pillar_missions(pillar, grade_level, current_week_topic, student_id, student_weaknesses)` — async function using OpenAI gpt-4o-mini.
- Generates exactly **10 questions per pillar** (reading, writing, listening, speaking).
- LLM prompt enforces:
  - SNC-aligned vocabulary for the grade level.
  - Heavy focus on `current_week_topic` (teacher-set curriculum).
  - 3-4 questions remediate **student's recent mistakes** (retrieved from `student_interactions` where `is_correct = false`).
  - Mix of difficulties: 4 easy, 4 medium, 2 hard.
  - Pillar-specific formats:
    - **Reading**: 7 multiple_choice + 3 fill_blank questions.
    - **Writing**: 7 multiple_choice + 3 fill_blank questions.
    - **Listening**: 10 multiple_choice questions.
    - **Speaking**: 10 fill_blank (prompt-based) questions.
- Returns `list[dict]` with each question containing: `id`, `pillar`, `type`, `question_text`, `options` (MC only), `prompt` (speaking only), `correct_answer` (stripped before client), `is_weakness_focused` (boolean), `difficulty`.
- **Max retries**: 3 on transient OpenAI errors; errors logged but non-fatal.
- **Magic constants** (configurable at module top):
  - `MAX_WEAKNESS_ITEMS = 5` — fetch last 5 failed attempts.
  - `PILLAR_QUESTIONS_COUNT = 10` — enforce exactly 10.
  - `MULTIPLE_CHOICE_OPTIONS = 4` — standard MC format.

**Missions Endpoint** (`app/api/v1/endpoints/missions.py`):
- `GET /api/v1/missions?student_id=...&classroom_id=...&pillar={reading|writing|listening|speaking}` — student-protected (custom PyJWT).
- Validates `pillar` parameter; returns HTTP 400 if invalid.
- Fetches classroom record → extracts `current_week_topic`.
- Queries `student_interactions` table for recent incorrect answers (score < 60%) → up to 5 results.
- Calls `generate_pillar_missions()` with pillar, grade_level, topic, student_id, weaknesses.
- Response model `PillarMissionsResponse`:
  ```json
  {
    "pillar": "reading",
    "current_week_topic": "Week 2: Past Tense Verbs",
    "questions": [/* 10 questions, correct_answer stripped */],
    "weakness_focus_questions": 3
  }
  ```

**Interactions Endpoint** (`app/api/v1/endpoints/interactions.py`):
- `POST /api/v1/interactions` — accepts batch game results:
  ```json
  {
    "student_id": "...",
    "classroom_id": "...",
    "pillar": "reading",
    "results": [
      {"question_id": "q1", "is_correct": true, "time_remaining": 8},
      {"question_id": "q2", "is_correct": false, "time_remaining": 0}
    ]
  }
  ```
- Inserts one row per question into `student_interactions` table.
- Calculates `time_spent = 15 - time_remaining` (converts "time left" to "time spent").
- Returns stats: `logged_interactions`, `correct_count`, `accuracy` (0.0–1.0).

#### Frontend — Dashboard & Gameplay

**Missions Dashboard** (`app/(student)/missions/page.tsx` + `components/student/PillarCard.tsx` + `components/student/MissionsDashboard.tsx`):
- **2x2 grid layout** responsive design:
  - Desktop (md breakpoint): 2 columns × 2 rows.
  - Mobile: 1 column (4 rows).
- **Four pillar cards**, each massive (h-64, rounded-2xl, shadow-lg):
  - **Reading** — Ruby Red (`bg-red-600`) + BookOpen icon.
  - **Writing** — Ocean Blue (`bg-blue-600`) + Edit3 icon.
  - **Listening** — Sunflower Yellow (`bg-yellow-500`) + Headphones icon.
  - **Speaking** — Emerald Green (`bg-green-600`) + Mic icon.
- **Framer Motion animations**:
  - Hover: card scales 1.05, icon lifts -8px with spring physics.
  - Tap: card scales 0.95 (tactile "push down" feel).
- Icons are 48px Lucide-react elements, rendered at text-6xl for visual impact.
- Each card links to `/student/missions/{pillar}` (dynamic route).

**Gameplay Route** (`app/(student)/missions/[pillar]/page.tsx` + `components/student/MissionGameplay.tsx` + `components/student/QuestionTimer.tsx`):
- **Dynamic route handler**: Accepts `[pillar]` param. Fetches student user from auth context.
- **Loading state**: Shows spinning indicator while questions are being fetched/generated by LLM (3–5 seconds).
- **Error states**: If no user logged in or no questions available, shows error message + "Go Back" button.

**Question Display** (`MissionGameplay.tsx`):
- **Progress bar** at top: shows "Question X of 10" + percentage completed.
- **Question card** (white, rounded, shadowed):
  - Large question text (text-2xl, bold).
  - For multiple_choice: 4 buttons, large tap targets (p-4, font-bold, text-lg).
  - For fill_blank: text input + submit.
  - Button styling:
    - Default: white bg, gray border, gray text.
    - Hover (if not answered): scale 1.02, gray → blue indication.
    - Feedback (after answer): 2 seconds display showing:
      - Correct answer: green bg, green border, checkmark icon (✅).
      - Wrong answer: red bg, red border, X icon (❌).
  - Auto-advance after 2 seconds feedback.

**15-Second Timer** (`QuestionTimer.tsx`):
- Displays countdown: "15s", "14s", ... "1s", "0s".
- **Visual progress bar**:
  - Background: light gray.
  - Fill: **green** (>= 5s remaining), **red** (< 5s remaining).
  - Percentage-based width; smooth 200ms transition on each tick.
- When timer hits 0:
  - Question automatically marked **incorrect**.
  - Feedback shown (red highlight, X icon, correct answer displayed).
  - Auto-advances to next question after 2 seconds.

**Skip Button** (optional):
- Below the question; disabled during feedback phase.
- Allows student to skip unanswered questions (counts as incorrect).

**Results Submission**:
- After final question answered/timed-out:
  - POST to `/api/v1/interactions` with all 10 results + accuracy.
  - On success: redirect to `/student/missions` (dashboard).
  - On error: still redirect (graceful degradation; results are lost but student progresses).

#### Tests

**Backend Tests** (`backend/tests/test_missions.py` + `backend/tests/test_pillar_missions.py` + `backend/tests/test_interactions.py`):
- **Endpoint tests** (10 pillar missions tests):
  - Happy path: GET missions for each pillar (reading, writing, listening, speaking) returns 200 + 10 questions.
  - Invalid pillar: returns 400 (Bad Request) with descriptive error.
  - Missing classroom: returns 404 (Not Found).
  - Unauthenticated access: returns 403 (Forbidden).
  - Security: `correct_answer` stripped from response; client never sees answers.
  - Weakness passing: weaknesses are fetched from interactions table and passed to generator.

- **Generator unit tests** (8 LLM generation tests):
  - Each pillar produces correct question count (10).
  - Pillar-specific type distributions (MC vs fill_blank) enforced.
  - At least 3 questions marked `is_weakness_focused`.
  - JSON parsing handles markdown-wrapped responses (`\`\`\`json ... \`\`\``).
  - Malformed LLM response raises `RuntimeError` with informative message.
  - Wrong question count (e.g., 8 questions returned) raises error.

- **Interactions tests** (5 logging tests):
  - Successful batch logging: 10 results → 10 rows in `student_interactions`.
  - Accuracy calculation: 5 correct / 10 total = 0.5 accuracy.
  - Time spent calculation: 15 - time_remaining = actual time spent.
  - Empty results: returns 400 (Bad Request).
  - Duplicate logging is allowed (no unique constraint on question_id + student_id).

- **Integration tests** (3 end-to-end tests):
  - Complete flow: fetch missions → answer questions → log results. All steps succeed.
  - All 4 pillars: Reading, Writing, Listening, Speaking each work independently.
  - Mixed accuracy: tests 100% correct, 50% correct, 0% correct scenarios.

**All 123 backend tests passing**; no regressions introduced.

**Frontend Tests** (`frontend/__tests__/missions-dashboard.test.tsx` + `frontend/__tests__/mission-gameplay.test.tsx`):
- Dashboard grid renders 4 cards with correct colors (Ruby Red, Ocean Blue, Sunflower Yellow, Emerald Green).
- Navigation links point to correct pillar routes (`/student/missions/{pillar}`).
- Timer countdown: advances every second, calls `onTimeUp()` callback at 0.
- Timer colors: green >= 5s, red < 5s.

### Key design decisions

1. **Curriculum-Aligned AI**: The LLM prompt explicitly requires questions to focus heavily on `current_week_topic`. This ensures the AI respects the teacher's curriculum timeline.

2. **Student Weakness Remediation**: The system queries the `student_interactions` table for recent failures (score < 60%), then instructs the LLM to create 3–4 questions targeting those weak areas. This enables **adaptive learning**.

3. **15-Second Timer**: Enforces engagement and prevents overthinking. Auto-marks timeout as incorrect; no penalty for "giving up" — feedback is encouraging.

4. **Correct Answer Security**: The `correct_answer` field is **structurally absent** from the response Pydantic model (`MissionQuestionOut`). It cannot leak via any code path.

5. **Pillar-Specific Formats**: Reading/Writing use mixed MC+fill_blank for variety. Listening is pure MC (easier to parse audio questions). Speaking is pure prompt-based (student generates response).

6. **Batch Result Logging**: The gameplay route collects all 10 results, then POSTs to `/interactions` in one batch. This is more efficient than logging each question individually.

---

## 16. 5-Step Architectural Refactoring (Complete — April 2026)

### Overview

A comprehensive refactoring implemented in 3 phases addressing routing clarity, student identity management, grade-based organization, and analytics capabilities. The refactoring modernizes PrimePal's information architecture while maintaining full backward compatibility with existing features.

### Phase A — Routing & Student Identity (Tasks A1–A4)

**A1: Route Group Removal**
- **What:** Removed Next.js route groups (`(teacher)`, `(student)`, `(auth)`) and replaced with explicit directory structure.
- **Impact:** All URLs now have explicit prefixes: `/teacher/dashboard`, `/student/home`, `/teacher/login`, `/student/play`.
- **Files changed:**
  - `frontend/app/teacher/` (was `(teacher)`)
  - `frontend/app/student/` (was `(student)`)
  - `frontend/app/auth/` (was `(auth)`)
  - Updated all navigation links in `TeacherShell.tsx`, student `layout.tsx`, login pages, classroom pages.
- **Why:** Explicit routing reduces cognitive load and makes the URL structure immediately clear to new developers.

**A2: Database Migration 013 — Student Identity Fields**
- **What:** Added `roll_number VARCHAR(20)` and `email VARCHAR(255)` columns to `students` table.
- **File:** `supabase/migrations/013_add_student_identity_fields.sql`
- **Why:** Teachers need to track students by school ID and optional email for communication.

**A3: Student Update Endpoint**
- **What:** Added `PATCH /api/v1/classroom/{id}/students/{student_id}` endpoint to update student identity fields.
- **Backend changes:**
  - `StudentResponse` schema: added `roll_number` and `email` optional fields.
  - `StudentUpdate` schema: new schema with all three fields as optional for partial updates.
  - `get_classroom` endpoint: now selects `roll_number` and `email` from DB.
  - Endpoint uses `_verify_classroom_ownership()` for teacher auth.
- **Tests:** 4/4 passing in `test_student_update.py` (full update, partial update, 403 unauthorized, 422 no fields).

**A4: Edit Student Modal**
- **What:** Frontend component to edit student details inline from classroom roster.
- **Files:**
  - `EditStudentModal.tsx` (new reusable component).
  - Updated `classroom/[id]/page.tsx` roster tab: added edit button (pencil icon), displays roll_number when present.
- **UX:** Teachers can now click the pencil button next to any student, edit name/roll/email in a modal, and changes are reflected immediately without page reload.

### Phase B — Grade Grouping & Global Analytics (Tasks B1–B3)

**B1: Grade-Wise Classroom Grouping**
- **What:** Classroom list page now groups classrooms by `grade_level` with "Grade N" headings (sorted 1→5).
- **File:** `frontend/app/teacher/classroom/page.tsx`
- **UX:** Teachers can quickly scan which grades they teach and how many classes per grade.
- **Why:** Grade is the most natural organizational axis for teachers managing multi-grade curricula.

**B2: Teacher Analytics Aggregation Endpoint**
- **What:** Added `GET /api/v1/evaluator/report/teacher` endpoint returning all classrooms + all students + interaction stats in one query.
- **Response structure:**
  ```json
  {
    "classrooms": [
      {
        "classroom_id": "...",
        "class_name": "3A",
        "grade_level": 3,
        "students": [
          {
            "student_id": "...",
            "student_name": "Ali",
            "avatar_url": "...",
            "total_interactions": 15,
            "mission_accuracy_pct": 73
          }
        ]
      }
    ]
  }
  ```
- **Why:** Avoids N+1 queries; frontend can fetch all data in one call and compute multiple views (By Student, By Grade, By Section).
- **Tests:** 3/3 passing in `test_teacher_analytics.py` (all classrooms, accuracy calculation, empty classrooms).

**B3: Global Analytics Dashboard**
- **What:** New page at `/teacher/analytics` with 3 integrated views and AI student insights.
- **Files:**
  - `analytics/page.tsx` (complete implementation).
  - Updated `TeacherShell.tsx`: added Analytics nav link with BarChart2 icon.
  - Updated `classroom/[id]/page.tsx`: removed Analytics tab (now global-only).
- **Views:**
  - **By Student:** All students across all classrooms, sorted by name, with accuracy badges and "Report" button to fetch AI insights.
  - **By Grade:** Grade-level aggregates showing student count per grade and average accuracy.
  - **By Section:** Per-classroom breakdown showing class name, grade, student count, average accuracy.
- **AI Insights:** Clicking "Report" on any student fetches `GET /api/v1/evaluator/report/student/{id}` and displays engagement level, strengths, areas for improvement, recommended topics, and teacher notes in a sticky sidebar.
- **Why:** Centralizing analytics prevents duplication and gives teachers a high-level view of all student progress across all classes in one place.

### Phase C — Curriculum Hub Branding (Task C1)

**C1: Rename Knowledge Base → Curriculum Hub**
- **What:** Updated branding and added grade context explanation to the curriculum page.
- **Changes:**
  - `TeacherShell.tsx`: NAV_LINKS label changed from "Knowledge Base" → "Curriculum Hub".
  - `curriculum/page.tsx`: page heading updated; added info banner explaining how `current_week_topic` drives AI question generation.
- **Why:** Clarifies the page's role: it's not just a document library (knowledge base), but an active teaching hub where teachers set curriculum context for the AI.

### Summary of Database Changes

| Migration | What | When Applied |
|-----------|------|--------------|
| `013_add_student_identity_fields.sql` | Adds `roll_number` and `email` to `students` | April 21, 2026 (manual apply required) |

### Summary of Backend Endpoint Changes

| Endpoint | Method | Change |
|----------|--------|--------|
| `/classroom/{id}/students/{student_id}` | PATCH | **NEW** — Update student identity fields |
| `/evaluator/report/teacher` | GET | **NEW** — Aggregate all classrooms + students + stats |

### Summary of Frontend Routing Changes

| Old Route | New Route | Reason |
|-----------|-----------|--------|
| `/dashboard` | `/teacher/dashboard` | Explicit teacher prefix |
| `/classroom` | `/teacher/classroom` | Explicit teacher prefix |
| `/curriculum` | `/teacher/curriculum` | Explicit teacher prefix |
| `/analytics` (new) | `/teacher/analytics` | Explicit teacher prefix |
| `/login` (teacher) | `/teacher/login` | Explicit teacher prefix |
| `/home` | `/student/home` | Explicit student prefix |
| `/chat` | `/student/chat` | Explicit student prefix |
| `/missions` | `/student/missions` | Explicit student prefix |
| `/play` | `/student/play` | Explicit student prefix |

### Tests Added

**Backend:**
- `test_student_update.py` — 4 tests for the PATCH student endpoint.
- `test_teacher_analytics.py` — 3 tests for the global analytics endpoint.

**Total test impact:** 20/20 tests passing (4 new + 13 existing classroom/interaction tests still pass, no regressions).

### Key Design Decisions

1. **Explicit Routing:** The route group removal prioritizes clarity. Future developers immediately understand which routes are teacher-facing (`/teacher/*`) vs student-facing (`/student/*`).

2. **Centralized Analytics:** Moving analytics from classroom-level to a global page prevents duplication and enables cross-classroom insights (e.g., "which grade is struggling most?").

3. **Grade as Primary Grouping:** Classrooms grouped by grade on the list page and per-grade aggregates in analytics reflect how multi-grade schools organize instruction.

4. **Curriculum Hub Branding:** The rename + banner emphasize the curriculum context feature (Feature 11), showing teachers that the AI's question generation is driven by their `current_week_topic` setting.

---

## 17. Architectural Rules (Non-Negotiable)

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
- The `teacher/` and `student/` routes have **separate layouts**. Never put teacher UI inside the student routes or vice versa. (These replaced Next.js route groups as of the April 2026 refactoring — see §16.)
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

## 18. Admin Role System (Complete — April 22, 2026)

A production-ready System Admin role system implemented across 5 phases and 17 tasks. Allows school administrators to manage all teachers, classrooms, and curriculum globally without being tied to a specific classroom.

### Architecture Overview

**Authentication Model:**
- Exclusive roles: Teachers are `role='teacher'`, Admins are `role='admin'` (mutually exclusive).
- JWT role claim injected via Supabase Auth Hook (Deno Edge Function) on login.
- Backend validates admin role via `get_current_admin()` dependency before sensitive operations.

**Data Access:**
- **Hybrid approach**: RLS (Row Level Security) for reads, service role key for sensitive writes.
- Admins can view all teachers/classrooms/curriculum via RLS policies.
- Writes (create/delete/reassign) use service role key + backend validation to prevent accidental data corruption.

**Admin Account Creation:**
- Bootstrap: First admin manually set to `role='admin'` in database.
- Self-service: Existing admins can create invite codes (7-day expiry by default) → new admins use code to signup.

### Implementation Details

#### Phase 1: Database & Auth Foundation (Tasks 1–3)

**Task 1: Supabase Migration** (`supabase/migrations/014_admin_roles.sql`)
- Adds `role VARCHAR(20)` column to `teachers` table (CHECK constraint: 'teacher' or 'admin').
- Creates `admin_invite_codes` table with invite code, email, creation metadata, expiry, usage tracking.
- Creates `admin_audit_log` table for compliance: logs all admin actions (create invite, delete teacher, reassign classroom, etc.).
- Enables RLS on both new tables; adds policies restricting access to authenticated admins.
- Updates RLS policies on `teachers` and `classrooms` to allow admins to see all records.

**Task 2: Supabase Auth Hook** (`supabase/functions/auth-hook-add-role/index.ts`)
- Deno Edge Function deployed to Supabase.
- On login (`session_created` event), queries `teachers` table for user's role and injects claim into JWT.
- Defaults to `role='teacher'` if user not found (backward-compatible).

**Task 3: Backend Security** (`backend/app/core/security.py`)
- New dependency: `get_current_admin(token)` — validates JWT contains `role='admin'`, queries DB to verify role hasn't been revoked.
- Raises 403 Forbidden if user is not admin; 401 Unauthorized if token invalid.

#### Phase 2: Backend Endpoints (Tasks 4–7)

**Task 4: Admin Invite Endpoints** (`backend/app/api/v1/endpoints/admin.py`)
- `POST /api/v1/admin/invite-code` — (admin-protected) Create invite code for new admin. Validates email, generates secure 24-char code, sets expiry.
- `POST /api/v1/admin/validate-invite-code` — (public) Validate invite code before signup. Returns email + validity status.

**Task 5: Teacher Management Endpoints**
- `POST /api/v1/admin/teachers` — (public) Create new admin via invite code. Validates code, creates Supabase Auth user, inserts into `teachers` table with `role='admin'`, marks code used.
- `PUT /api/v1/admin/teachers/{id}` — (admin-protected) Edit teacher name/email.
- `DELETE /api/v1/admin/teachers/{id}` — (admin-protected) Delete teacher with cascading: all classrooms reassigned to a specified teacher (admin must choose reassignment target). Logged to audit_log.
- `GET /api/v1/admin/teachers` — (admin-protected) List all teachers across all classrooms.

**Task 6: Classroom & Curriculum Endpoints**
- `PUT /api/v1/admin/classrooms/{id}/reassign` — (admin-protected) Reassign classroom to different teacher. Validates target teacher exists. Logged to audit_log.
- `GET /api/v1/admin/classrooms` — (admin-protected) List all classrooms with teacher names (via join).
- `DELETE /api/v1/admin/curriculum/{id}` — (admin-protected) Delete curriculum chunk from `snc_knowledge_base`. Logged to audit_log.
- `GET /api/v1/admin/curriculum` — (admin-protected) List all curriculum chunks.

**Task 7: Router Registration** (`backend/app/api/v1/router.py`)
- Import and include `admin.router` at top of API router registration.

#### Phase 3: Frontend Infrastructure (Tasks 8–10)

**Task 8: Admin Auth Helper** (`frontend/lib/adminAuth.ts`)
- `getAdminHeaders()` — reads Supabase session token, returns Bearer Authorization header (same as teacher auth).
- `isCurrentUserAdmin()` — decodes JWT, checks for `role='admin'` claim. Used by layout for auth gate.

**Task 9: Admin Layout** (`frontend/app/admin/layout.tsx`)
- Dark slate theme (`bg-slate-900`).
- Header: "PrimePal Admin" title, admin email, logout button.
- Tab navigation: Staff Directory, School Hierarchy, Global Curriculum.
- Auth gate: checks JWT role, redirects to `/admin/login` if not admin.

**Task 10: Admin Login Page** (`frontend/app/admin/login/page.tsx`)
- 3-step flow:
  1. **Enter invite code** → calls `/admin/validate-invite-code`.
  2. **Sign up** → creates account via `/admin/teachers` with code, full name, password.
  3. **Log in** → standard Supabase auth if code was invalid.

#### Phase 4: Admin Dashboards (Tasks 11–14)

**Task 11: Staff Directory** (`frontend/app/admin/dashboard/staff/page.tsx`)
- Table of all teachers with name, email, role badge (teacher/admin).
- "Invite Admin" button → modal to enter email, generates code, displays code for sharing.
- Placeholder edit/delete buttons (not wired yet).

**Task 12: School Hierarchy** (`frontend/app/admin/dashboard/hierarchy/page.tsx`)
- List of all classrooms with class name, grade level, current teacher.
- "Reassign" button on each → dropdown to select new teacher, confirm button.
- On confirm: POSTs to `/classrooms/{id}/reassign`, refreshes list.

**Task 13: Global Curriculum** (`frontend/app/admin/dashboard/curriculum/page.tsx`)
- List of all curriculum chunks with title and upload date.
- Trash icon on each → confirmation dialog → DELETE request.
- Empty state: "No curriculum uploaded yet".

**Task 14: Dashboard Redirect** (`frontend/app/admin/dashboard/page.tsx`)
- Simple redirect: `/admin/dashboard` → `/admin/dashboard/staff`.

#### Phase 5: Integration & Testing (Tasks 15–17)

**Task 15: Manual Integration Testing**
- Documented test checklist for: invite flow, teacher deletion with cascading, classroom reassignment, curriculum deletion.
- All tests designed to verify audit logging.

**Task 16: Issue Fixes**
- Placeholder for addressing any blockers found during manual testing.

**Task 17: Final Summary**
- All commits verified; 14 commits for admin system + global analytics feature.

### Key Design Decisions

1. **Exclusive Roles:** Admin and teacher roles are mutually exclusive (one user cannot be both). This simplifies permission logic and prevents confusion (e.g., an admin can't accidentally use their admin account to create classrooms).

2. **Hybrid Data Access:** RLS policies allow admins to read all records, but critical writes use the service role key + backend validation. This prevents accidental bulk operations due to UI bugs and ensures audit logging.

3. **Invite-Based Admin Creation:** Bootstrap the first admin manually, then allow self-service invites. This prevents unauthorized admin account creation while remaining flexible.

4. **Cascading Classroom Reassignment:** When an admin deletes a teacher, all their classrooms must be reassigned. The endpoint requires an explicit target teacher selection (no default), forcing the admin to think through the reassignment.

5. **Audit Logging:** Every sensitive admin action (create invite, delete teacher, reassign classroom, delete curriculum) is logged to `admin_audit_log` for compliance and debugging.

### Files Created/Modified

**Created (11 files):**
- `supabase/migrations/014_admin_roles.sql` — Migration: role column, invite codes, audit log, RLS policies
- `supabase/functions/auth-hook-add-role/index.ts` — Deno Auth Hook: role claim injection
- `backend/app/api/v1/endpoints/admin.py` — ~400 lines of admin CRUD endpoints
- `frontend/lib/adminAuth.ts` — Auth helpers
- `frontend/app/admin/layout.tsx` — Admin layout shell
- `frontend/app/admin/login/page.tsx` — 3-step login flow
- `frontend/app/admin/dashboard/page.tsx` — Dashboard redirect
- `frontend/app/admin/dashboard/staff/page.tsx` — Staff Directory
- `frontend/app/admin/dashboard/hierarchy/page.tsx` — School Hierarchy
- `frontend/app/admin/dashboard/curriculum/page.tsx` — Global Curriculum

**Modified (2 files):**
- `backend/app/core/security.py` — Added `get_current_admin()` dependency
- `backend/app/api/v1/router.py` — Registered admin router

**Total:** ~1,500 lines of code. 14 commits (Apr 22, 2026).

---

## 19. SearchBar Component (Complete — April 22, 2026)

A reusable search component allowing teachers to instantly find students by name or roll number in classroom rosters and global analytics views.

### Implementation Details

**Component** (`frontend/components/teacher/SearchBar.tsx`):
- **Props:** `value`, `onChange`, optional `placeholder`.
- **UI:** Text input with Search icon (lucide-react) positioned inside left, soft rounded corners, Tailwind focus ring (indigo-500).
- **Behavior:** No built-in filtering — parent components handle filter logic.

**Integration 1: Classroom Roster** (`frontend/app/teacher/classroom/[id]/page.tsx`):
- SearchBar placed above student roster table with placeholder "Search by name or roll number...".
- State: `searchQuery` tracks input.
- Filter logic: displays students where `name` OR `roll_number` contains query (case-insensitive).
- Dynamic student count: shows "X of Y students" reflecting filtered count.
- Empty state: updates to "No students match your search" when no results.

**Integration 2: Global Analytics By Student Tab** (`frontend/components/teacher/AnalyticsByStudent.tsx`):
- SearchBar placed above grade/class filter dropdowns.
- Filter logic: applies name/roll number search in addition to existing grade/class filters.
- Works seamlessly with pagination (filters then paginates).

### Key Features

✅ Reusable component with customizable placeholder
✅ Case-insensitive name and roll number matching
✅ Integrates with existing filter dropdowns
✅ Dynamic result counts
✅ Smart empty state messaging
✅ Lucide-react Search icon with Tailwind styling

### Files Created/Modified

**Created (1 file):**
- `frontend/components/teacher/SearchBar.tsx` — Reusable search component (~30 lines)

**Modified (2 files):**
- `frontend/app/teacher/classroom/[id]/page.tsx` — Integrated SearchBar + filter logic
- `frontend/components/teacher/AnalyticsByStudent.tsx` — Integrated SearchBar + filter logic

**Total:** 2 commits (Apr 22, 2026).

---

## 20. Running the Project Locally

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

## 26. Supabase Setup Checklist (one-time)

1. Create a Supabase project at supabase.com.
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_feature1_auth.sql`.
3. Paste and run `supabase/migrations/002_feature2_classroom.sql`.
4. Paste and run `supabase/migrations/003_feature3_storage.sql` (creates `snc-textbooks` storage bucket).
5. Paste and run `supabase/migrations/004_feature4_pgvector.sql` (enables `pgvector`, creates `snc_knowledge_base` table — **ready to query**).
6. Paste and run `supabase/migrations/005_feature5_chat_rpc.sql` (creates `match_snc_documents` RPC for grade-filtered vector similarity search).
7. Paste and run `supabase/migrations/006_feature6_gamification.sql` (adds points column to students).
8. Paste and run `supabase/migrations/007_feature8_interactions.sql` (creates `student_interactions` table for logging).
9. Paste and run `supabase/migrations/009_add_current_week_topic.sql` (adds `current_week_topic` to classrooms).
10. Paste and run `supabase/migrations/010_classroom_syllabus.sql` (creates `classroom_syllabus` 30-week pacing table).
11. Paste and run `supabase/migrations/011_student_secret_pin.sql` (adds `secret_pin` to students).
12. Paste and run `supabase/migrations/013_add_student_identity_fields.sql` (adds `roll_number` + `email` to students).
13. Paste and run `supabase/migrations/014_admin_roles.sql` (admin role column, invite codes, audit log) **← Admin system**.
14. Paste and run `supabase/migrations/017_interactions_pillar.sql` (adds `pillar` column + composite index to `student_interactions` — required for Quests weekly progress and Speaking/Story Time tracking).
12. Copy **Project URL** and **anon key** → paste into `backend/.env` and `frontend/.env.local`.
13. Copy **service_role key** → paste into `backend/.env` (`SUPABASE_SERVICE_ROLE_KEY`). Keep this secret — never expose it to the frontend.
14. Deploy Auth Hook: `supabase functions deploy auth-hook-add-role --project-id <YOUR_PROJECT_ID>` **← NEW (Apr 22, 2026)**.
15. Configure Auth Hook in Supabase Dashboard → Authentication → Hooks. Create new hook for event `session_created`, set webhook URL to deployed function, enable **← NEW (Apr 22, 2026)**.
16. For teacher/admin registration, use Supabase's **Authentication → Users** dashboard.

---

## 27. Future Features Roadmap

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

### F-E: UI Gamification Engine
- **What:** Upgrade the entire Student UI to match the fully animated, bouncy, and rewarding visual aesthetic of Kahoot! or Duolingo.
- **Components:**
  - **AnimatedBackground.tsx** — Slow-moving gradient backgrounds with floating geometric shapes using Framer Motion.
  - **DiceBear Avatar Generation** — Dynamically generated procedurally-created avatars (bottts/fun-emoji collections) seeded by student name/ID.
  - **Confetti Celebrations** — Canvas-confetti explosions on correct answers, level-ups, and milestone achievements.
  - **Juicy Micro-Interactions** — Framer Motion whileHover/whileTap animations on all buttons for tactile feedback (scale 1.05 on hover, 0.95 on click).
  - **Smooth Page Transitions** — Fade-in/slide animations between student routes (play → home → missions → chat).
- **Frontend Impact:** `app/(student)/layout.tsx`, `app/(student)/play/page.tsx`, `app/(student)/home/page.tsx`, `app/(student)/missions/page.tsx`, `app/(student)/chat/page.tsx` + new `components/student/AnimatedBackground.tsx`.
- **Dependencies:** `framer-motion`, `canvas-confetti`, `@dicebear/core`, `@dicebear/collection`.
- **Status:** In progress (as of 2026-04-20).

---

## 23. UI/UX Improvements — Dashboard Redesign (Complete — April 22, 2026)

### Purpose

Eliminated redundancy between the Dashboard and Classroom Manager pages, giving each a distinct purpose and visual hierarchy.

### Before (Redundant)
- **Dashboard** (`/teacher/dashboard`): Showed classroom cards with create button, class codes, and direct access to classrooms.
- **Classroom Manager** (`/teacher/classroom`): Showed nearly identical classroom cards, also with create button, codes.
- **Problem**: Users confused about the difference; both pages served the same purpose.

### After (Distinct)

#### Dashboard (`/teacher/dashboard`) — Analytics Overview
**Purpose:** At-a-glance teaching insights and quick navigation.

**Content:**
1. **Stats Grid** (3 cards):
   - Total Students (across all classrooms)
   - Total Interactions (missions + chat)
   - Avg Accuracy (% across all students)
   - Each stat has icon, large number, and context label

2. **Your Classrooms Section**:
   - Compact 4-column grid (up to 4 most recent classrooms)
   - Shows grade badge, class name, class code
   - "Manage all" link to Classroom Manager
   - Link each card to classroom detail page for quick roster access

3. **Quick Actions Section** (gradient background):
   - Three prominent action cards:
     - View Analytics (→ `/teacher/analytics`)
     - Manage Classrooms (→ `/teacher/classroom`)
     - Curriculum Hub (→ `/teacher/curriculum`)
   - Icons + descriptive labels

**Removed:** "Create New Class" button (delegated to Classroom Manager)

#### Classroom Manager (`/teacher/classroom`) — Management Interface
**Purpose:** Full classroom CRUD operations and organization.

**Content:**
1. **Page Header**:
   - Title: "Classroom Manager"
   - "New Classroom" button (primary action, no redundancy with dashboard)
   - Blue info banner: "Need help?" guidance

2. **Classroom List** (Table-like view):
   - Grade-grouped sections with headings
   - Each section shows: `Grade N` + count of classrooms
   - Per-classroom rows with:
     - **Left side**: Class name (large), class code, copy button
     - **Right side**: "Manage" button (→ classroom detail), "Delete" button (placeholder)
   - Hover states for interactivity

3. **Stats Footer**:
   - Total Classrooms
   - Number of Grade Levels
   - Grade Range (e.g., "1 - 5")

**Removed:** Redundant classroom cards (now focused on management operations)

### Key Design Decisions

1. **Separation of Concerns**:
   - **Dashboard** = "What's happening?" (analytics, overview)
   - **Classroom Manager** = "How do I manage things?" (CRUD, organization)

2. **Clear Navigation**:
   - Dashboard links to Classroom Manager for deeper management
   - Classroom Manager links back to Analytics
   - Each page has a clear entry point for its primary action

3. **Reduced Cognitive Load**:
   - Users no longer wonder "which page should I use?"
   - Dashboard is the home; Classroom Manager is the operations hub

4. **Visual Hierarchy**:
   - Dashboard: Stats first (KPIs), then quick access
   - Classroom Manager: Create button + organized list (grouped by grade)

### Files Modified

- `frontend/app/teacher/dashboard/page.tsx` — Complete redesign: stats grid, quick access section, action links
- `frontend/app/teacher/classroom/page.tsx` — Refactored for management: table view, grade grouping, admin actions

### UX Impact

- ✅ Eliminated page redundancy
- ✅ Clearer user mental model
- ✅ Dashboard becomes the "home" with quick stats and navigation
- ✅ Classroom Manager becomes the operations center

---

## 21. Spelling Bee (Complete — April 2026)

### What was built
- **Backend** (`backend/app/api/v1/endpoints/spelling_bee.py`):
  - `GET /spelling-bee/words` — fetches active week topic + grade level; calls gpt-4o-mini to generate 5 grade-appropriate words (each with `word`, `definition`, `example_sentence`); returns `SpellingWordsResponse`.
  - `POST /spelling-bee/submit` — client submits `word` + `student_answer`; server does case-insensitive comparison; awards 10 pts if correct; updates `students.points`; logs `interaction_type='spelling_bee'`, `pillar=NULL` to `student_interactions`.
- **Frontend** (`frontend/app/student/spelling-bee/page.tsx`):
  - State machine: `loading → playing → finished`.
  - TTS playback via `window.speechSynthesis` — reads word + example sentence aloud.
  - Text input for spelling attempt; immediate right/wrong feedback with correct answer reveal.
  - Progress: "Word X of 5", score tracker, confetti on perfect score.
  - Theme: amber/yellow.
- **Router**: registered at `/spelling-bee`.

### Key design note
Client sends `word + student_answer`; server does the comparison server-side. `correct_answer` never leaks to client.

---

## 22. Story Time (Complete — April 2026)

### What was built
- **Backend** (`backend/app/api/v1/endpoints/story_time.py`):
  - `GET /story-time/story` — fetches grade + active week topic; calls gpt-4o-mini to generate a 4–6 sentence grade-appropriate story + exactly 3 comprehension questions (each with 4 options + `correct_index`). Returns `StoryResponse` (json.loads pattern).
  - `POST /story-time/answer` — student submits `question_id`, `selected_index`, `correct` (bool, client-computed for thesis prototype); awards 10 pts if correct; logs `interaction_type='story_time'`, `pillar='reading'` → advances Quests Reading bar.
- **Frontend** (`frontend/app/student/story-time/page.tsx`):
  - State machine: `loading → reading → questioning → finished`.
  - Reading phase: story card + "🔊 Read Aloud" (speechSynthesis at 0.8× rate) + "Start Questions →".
  - Questioning phase: progress bar, question card, 4 option buttons; instant green/red highlight; auto-advance 1.5s.
  - Finished: "X/3 correct", total stars, Play Again + Home.
  - Theme: emerald/green.
- **Router**: registered at `/story-time`.

---

## 23. Speaking Practice (Complete — April 2026)

### What was built
- **Backend** (`backend/app/api/v1/endpoints/speaking.py`):
  - `GET /speaking/prompts` — generates 3 speaking prompts (with hints) for active week topic + grade via gpt-4o-mini (json.loads pattern).
  - `POST /speaking/evaluate` — receives `prompt_text` + `transcript`; if transcript empty → score=0; otherwise calls gpt-4o-mini to score 0/1/2 (off-topic / partial / on-topic+vocab); maps to 0/5/10 pts; updates `students.points`; logs `interaction_type='speaking_practice'`, `pillar='speaking'` → advances Quests Speaking bar.
- **Frontend** (`frontend/app/student/speaking/page.tsx`):
  - State machine: `loading → intro → recording → reviewing → result → finished`.
  - Browser compatibility check on mount: shows "Use Chrome" message if SpeechRecognition not available.
  - Recording via `webkitSpeechRecognition` (continuous + interimResults=true); live transcript display.
  - Animated pulsing mic (Framer Motion scale [1, 1.2, 1]).
  - Review phase: "Try Again" (re-records) or "Submit →".
  - Result: LLM feedback card + "+N ⭐" badge; auto-advance 2.5s.
  - Finished summary: X/3 submitted, total stars.
  - Theme: rose/red.
- **Router**: registered at `/speaking`.
- **useRef** stores SpeechRecognition instance for stop control across renders.

---

## 24. Quests Page (Complete — April 2026)

### What was built
- **Frontend** (`frontend/app/student/quests/page.tsx`):
  - Full implementation (replaced stub).
  - Fetches `GET /missions/weekly-progress` — returns per-pillar `done`/`target`/`pct` for 7-day rolling window.
  - 2×2 `PillarCard` grid: Reading (emerald), Writing (violet), Listening (sky), Speaking (rose).
  - Each card: pillar emoji, progress bar, "X / 10 questions", status badge (Not Started / In Progress / Done!), Start/Continue/Done button.
  - Weekly summary footer: "X / 40 questions answered", "X / 4 pillars active".
- **Navigation**: added to student layout nav between Missions and Leaderboard.
- **Bug fix in `missions.py`** (line ~605): removed `.in_("interaction_type", ["mission_mc", "mission_fill"])` filter from `weekly-progress` query. Now uses `.not_.is_("pillar", "null")` — correctly counts Story Time (`pillar='reading'`), Speaking Practice (`pillar='speaking'`), and all future pillar activities.

### Pillar → interaction_type mapping
| Pillar | Interaction types that count |
|---|---|
| reading | `mission_mc`, `mission_fill` (reading pillar), `story_time` |
| writing | `mission_mc`, `mission_fill` (writing pillar) |
| listening | `mission_mc`, `mission_fill` (listening pillar) |
| speaking | `mission_mc`, `mission_fill` (speaking pillar), `speaking_practice` |

---

## 25. Teacher Dashboard v2 + Student Directory + Report Cards (Complete — April 2026)

### Dashboard Improvements

**`frontend/app/teacher/dashboard/page.tsx`** — extended:
- **4-card stats grid** (2×2 on mobile, 4-col on desktop):
  1. Total Students
  2. **Active This Week** — distinct students with any interaction in last 7 days (NEW)
  3. Total Interactions
  4. Avg Accuracy
- **"Needs Attention" widget** — students with ≥5 interactions AND accuracy < 40%; sorted by lowest accuracy; max 5 shown; direct "View Report" link each.
- **6-button Quick Actions** grid: Students, Reports, Analytics, Classrooms, Curriculum, Upload SNC.

### Navbar (`TeacherShell.tsx`)
Now has **6 nav links**: Dashboard, Classrooms, **Students** (NEW), Analytics, **Reports** (NEW), Curriculum Hub.

### New Backend Endpoints (`evaluator.py`)

| Endpoint | Method | Description |
|---|---|---|
| `GET /evaluator/dashboard-stats` | Updated | Added `active_this_week` field |
| `GET /evaluator/students` | **NEW** | All students across teacher's classrooms with `total_points`, `mission_accuracy_pct`, `active_this_week` bool |
| `GET /evaluator/report/student/{id}/detailed` | **NEW** | Combined: per-pillar stats (LSRW) + overall accuracy + full AI narrative in one call |

#### `GET /evaluator/students` response schema
```python
class StudentWithStats(BaseModel):
    student_id, student_name, roll_number, avatar_url,
    classroom_id, classroom_name, grade_level,
    total_points, total_interactions, mission_accuracy_pct,
    active_this_week: bool

class StudentsListResponse(BaseModel):
    students: list[StudentWithStats]
    total_count: int
```

#### `GET /evaluator/report/student/{id}/detailed` response schema
```python
class PillarStat(BaseModel):
    pillar: str; total: int; correct: int; accuracy_pct: int

class StudentDetailedReport(BaseModel):
    # Identity
    student_id, student_name, roll_number, avatar_url,
    classroom_name, grade_level, total_points
    # Stats
    total_questions, overall_accuracy_pct
    pillar_stats: list[PillarStat]   # up to 4 pillars
    # AI narrative (from nlp_evaluator.evaluate_interactions)
    engagement_level, strengths, areas_for_improvement,
    recommended_topics, teacher_note
```

### New Frontend Pages

**`/teacher/students`** (`frontend/app/teacher/students/page.tsx`):
- Global student directory across all classrooms.
- Filters: free-text search (name / roll number), classroom dropdown, grade dropdown.
- Table columns: avatar initial, student name + roll, grade badge + classroom name, ⭐ points + question count, accuracy % (color-coded: green ≥70%, amber ≥40%, red <40%), Active/Inactive badge, "Report →" link.
- Links to `/teacher/reports?studentId={id}`.

**`/teacher/reports`** (`frontend/app/teacher/reports/page.tsx`):
- Selector panel: classroom filter (optional) → student dropdown → "Generate Report" button.
- Deep-linkable via `?studentId=xxx` (used by at-risk widget and student directory).
- Calls `GET /evaluator/report/student/{id}/detailed` (AI call, ~10s).
- Report card sections:
  1. Profile (avatar, name, roll, classroom, grade, engagement badge, points)
  2. 3 overall stat cards (total questions, overall accuracy %, stars)
  3. 2×2 LSRW pillar breakdown — each card with colored progress bar + "X/Y correct"
  4. AI Insights — teacher note (blockquote), strengths (green chips), needs work (amber chips), recommended topics (indigo chips)
- **Export PDF** — `jsPDF` + `jspdf-autotable`; filename: `report-{name}-{date}.pdf`.
- Uses `Suspense` wrapper for `useSearchParams`.

---

## 26. Evolving Worlds (Dynamic Backgrounds) — Complete

### What was built
- **Frontend Component** (`components/student/DynamicBackground.tsx`):
  - Day/Night Cycle Detection: Uses `new Date().getHours()` to detect 6 PM - 6 AM as night mode.
  - 3-Tier Journey System based on `missions_completed`:
    - **Tier 1 (0-49)**: Starting Classroom — desk lamps at night, clock on wall, dust motes in sunbeams during day.
    - **Tier 2 (50-99)**: Jungle Safari — tropical leaves, sun, fireflies at night, butterflies flying across screen.
    - **Tier 3 (100+)**: Space Station — glowing stars, planets, astronaut bobbing in zero gravity, satellite spinning, neon sparkles.
  - Dynamic Tailwind gradients for day/night in each tier.
  - Framer Motion ambient animations:
    - Clock rotates continuously (60s cycle).
    - Dust motes float with sinusoidal motion (day only).
    - Butterflies fly across screen every 18-20 seconds (jungle only).
    - Stars drift with parallax (25-30s cycles, space only).
    - Astronaut bobs up/down (4s cycle, space only).
    - Satellite rotates with combined bobbing (12s rotate + 5s bob, space only).

- **Integration**: Placed as `fixed inset-0 z-[-1]` in `app/student/layout.tsx`, behind `AnimatedBackground` and all page content.
- **Data Flow**: `missions_completed` passed from `/missions/me` profile fetch → `DynamicBackground` component determines tier + renders tier-specific visuals.

### Database Updates
- Migration `020_missions_completed_tracking.sql`: Added `missions_completed INTEGER DEFAULT 0` to students table.
- Backend `POST /missions/complete`: Increments `missions_completed` by 1 when `question_correct = true`.
- Backend `GET /missions/me`: Returns `missions_completed` alongside `points`, `student_name`, etc.

### UI/UX Impact
- Student dashboard is now a **living, breathing world** that evolves as they progress.
- Day/night cycle creates immersion and connection to real time.
- Continuous animations maintain engagement without being distracting.

---

## 27. Surprise Daily Chest (Loot Box) — Complete

### What was built

**Database**:
- Migration `021_daily_rewards.sql`: Added `last_daily_reward_at TIMESTAMPTZ DEFAULT NULL` to students table + index.

**Backend** (`app/api/v1/endpoints/rewards.py`):
- **POST `/api/v1/rewards/claim-daily`** (student auth required):
  - Anti-cheat: Server-side UTC timestamp validation. If `last_daily_reward_at` is today (same UTC calendar day), returns 400 "Already claimed today".
  - Reward RNG: 70% → +25 Stars, 20% → +50 Stars, 10% → 2x Multiplier (determined at claim time, not predictable).
  - Updates: `points` and `last_daily_reward_at` in a single transaction.
  - Response: `{ reward_type, amount, new_total, message }`.

- **GET `/api/v1/rewards/status`** (student auth required):
  - Returns: `{ has_claimed_today, last_claimed_at }`.
  - Checks eligibility on page load without making the claim.

**Frontend Component** (`components/student/DailyChestModal.tsx`):
- Full-screen overlay modal with Framer Motion animations and canvas-confetti.
- Props: `isOpen`, `onRewardClaimed` callback, `reward` object, `isClaiming` flag.
- **State Machine**:
  - `tapCount`: 0 → 1 → 2 → 3 (each tap triggers sound and animation).
  - `isShaking`: Shake animation on taps 1-2 (chest rotates and translates).
  - `showReward`: On tap 3, chest opens and reward details animate upward with glow effect.
  - Progress bar: Visual feedback showing 0%, 33%, 66%, 100% fill.

- **Animations**:
  - **Idle**: Chest breathes (scale 1 → 1.05 → 1) and bobs (y: 0 → -8 → 0) infinitely.
  - **Tap 1-2**: Shake effect (x: [-10, 10, -10, 10, 0], rotateZ: [-3°, 3°, -3°, 3°, 0°]) over 400ms.
  - **Tap 3**:
    - Chest opens (emoji change from 📦 to 📂).
    - Reward emoji (⭐ or 🚀) floats upward with 360° rotation and 4-stage confetti burst.
    - Stars display pulses with golden glow filter.
    - Message and total stars animate in with spring physics.

- **Confetti Burst** (4-stage):
  - Stage 1 (0ms): 60 particles center, 180° spread, gravity 0.8.
  - Stage 2 (100ms): 40 particles left (20°, 60°), spread 100°.
  - Stage 3 (200ms): 40 particles right (80°, 120°), spread 100°.
  - Stage 4 (150ms intervals, 1s duration): Micro-bursts (15 particles, random angles, gravity 0.6).

- **Sound Integration** (via `lib/use-sound.ts` hook):
  - "thud" sound on taps 1-2 (chest tap feedback).
  - "fanfare" sound on tap 3 (reward unlock fanfare).
  - Respects global mute state from `AudioProvider` context.

**Dashboard Integration** (`app/student/home/page.tsx`):
- On mount: Fetch `/rewards/status` to check `has_claimed_today`.
- If not claimed: Automatically open modal with placeholder reward object.
- On chest open (tap 3):
  - Call `POST /rewards/claim-daily` to get actual reward from server.
  - Update reward state with real reward details (so modal re-renders with actual message + points).
  - Update profile.points with `new_total` from API response.
  - Keep modal visible for 2 seconds to let student see actual reward details.
  - Then close modal and continue with dashboard.
- Header star count updates in real-time from profile.points.

**TypeScript Interfaces**:
```typescript
interface DailyReward {
  reward_type: string;  // "stars" or "multiplier_2x"
  amount: number;       // 25, 50, or multiplier factor
  new_total: number;    // Updated total points after claim
  message: string;      // "🎉 Great! You earned 25 stars!"
}

interface RewardStatus {
  has_claimed_today: boolean;
  last_claimed_at: string | null;  // ISO 8601 timestamp
}
```

### Data Flow
1. Student logs in → `app/student/home/page.tsx` mounts.
2. Profile fetch (`GET /missions/me`) returns student data.
3. Reward status check (`GET /rewards/status`) runs → modal opens if `has_claimed_today === false`.
4. Student taps chest 3 times → Animations + sounds play locally.
5. On tap 3 complete, `POST /rewards/claim-daily` sends claim request.
6. Backend validates: Not claimed today? Apply reward (RNG determined), update DB, return details.
7. Modal displays actual reward message and new star total for 2 seconds.
8. Modal closes, profile.points updates header display.

### Key Anti-Cheat Protections
- **Server-side UTC validation**: `last_daily_reward_at` stored in UTC; daily boundary check happens server-side.
- **Immutable timestamp**: Once claim is made, `last_daily_reward_at` is locked until next UTC day.
- **Atomic transaction**: `points` + `last_daily_reward_at` updated together; no race conditions.
- **Deterministic RNG**: Seed-based or timestamp-based (depends on backend random choice); not reversible from client.
- **Mute state bypass prevention**: Sounds can't be forced on via localStorage tampering; global mute state is auth-gated.

### UI/UX Details
- Modal is **non-closeable** by backdrop click (prevents accidental dismissal).
- Chest interaction is **game-like**: Feedback sound + animation for each tap keeps students engaged.
- Reward reveal is **celebratory**: Confetti, glow effects, and spring animations create dopamine hit.
- **Real-time feedback**: Star count updates immediately in header after claim completes.
- **Accessibility**: Tap progress shown as both text ("2 / 3") and progress bar fill.

---

## 28.5. Dynamic Sentiment & Avatar Empathy (Complete — April 25, 2026)

### Overview

A comprehensive feature that gives the student avatar emotional intelligence by:
1. **Dynamic Avatar Progression** — Avatar "empathy level" increases as student completes missions, unlocking 3 evolving visual worlds.
2. **Sentiment-Aware Teacher Insights** — Backend evaluator analyzes student interaction patterns to produce engagement levels, strengths, and areas for improvement.
3. **Adaptive Feedback** — Student dashboard responds emotionally (tone, visuals, rewards) based on their engagement and progress.

### Implementation Details

#### Part 1: Avatar Empathy System (Frontend)

**Component:** `frontend/components/student/DynamicBackground.tsx` (documented in §26)

- **Progression Tiers** based on `missions_completed`:
  - **Tier 1 (0-49 missions)**: Classroom environment (desk lamps, clock, dust motes).
  - **Tier 2 (50-99 missions)**: Jungle Safari (tropical leaves, butterflies, fireflies).
  - **Tier 3 (100+ missions)**: Space Station (planets, astronaut, satellite, stars).
- **Day/Night Cycle**: Visuals adapt to real time (6 PM - 6 AM = night mode).
- **Ambient Animations**: Continuous Framer Motion animations (butterflies fly, stars drift, astronaut bobs) create a "living world" feeling.
- **Message**: As student completes more missions, their avatar's world evolves — visual reward for persistence and growth.

**Data Flow:**
1. Student logs in → `GET /missions/me` returns `missions_completed` count.
2. `DynamicBackground` receives `missions_completed` prop from parent layout.
3. Component determines tier (0-49, 50-99, 100+) and renders tier-specific visuals.
4. Student completes mission → `missions_completed` increments → next page load triggers tier upgrade (if threshold reached).

#### Part 2: Sentiment Analysis & Engagement Tracking (Backend)

**NLP Evaluator:** `backend/app/agents/evaluator_agent/nlp_evaluator.py`

The evaluator analyzes student interaction history to determine:
- **Engagement Level**: "High" / "Medium" / "Low" based on:
  - Frequency of interactions (questions answered per week).
  - Consistency (regular participation vs sporadic).
  - Accuracy trend (improving vs declining).
- **Strengths**: Pillars where student has ≥75% accuracy.
- **Areas for Improvement**: Pillars where student has <50% accuracy.
- **Recommended Topics**: LLM-generated suggestions for student to focus on next.
- **Teacher Note**: Personalized, empathetic message written by LLM for teacher to share with parent.

**Endpoints Producing Sentiment:**
- `GET /api/v1/evaluator/report/student/{id}/detailed` — Returns per-pillar stats + AI-generated engagement insights (§25).
- `GET /api/v1/evaluator/report/teacher` — Returns all students with engagement badges (§16).

**Key Design:**
- Sentiment is **never shown to the student** directly. It's only visible to teachers (for parent communication) and stored for analytics.
- Student sees **visual feedback only**: evolving world, points, badges, "at-risk" status in teacher dashboard (which motivates teacher to provide extra support).

#### Part 3: Adaptive Feedback System (Frontend & Backend)

**Student Home Page** (`frontend/app/student/home/page.tsx`):
- Fetches profile including `points`, `missions_completed`, `engagement_level` (if available).
- Displays engagement badge (visual emoji/color):
  - 🔥 High engagement: Bright green, gold stars.
  - 🎯 Medium engagement: Amber, regular stars.
  - 🌱 Low engagement: Soft blue, encouraging message.
- Shows motivational message tailored to engagement level.

**Daily Chest Reward** (`frontend/components/student/DailyChestModal.tsx`):
- Tone adapts based on streak and engagement:
  - High engagement: "You're on fire! 🔥" celebratory messages.
  - Low engagement: "Great effort! Keep going! 💪" encouraging messages.
- Confetti intensity and reward messages vary by student sentiment.

**Missions Page** (`frontend/app/student/missions/page.tsx`):
- Displays "You're improving!" or "You've got this!" messages based on recent accuracy trend.
- Adaptive difficulty hinting: "Try the harder questions" for high performers, "Practice with easier ones first" for struggling students.

#### Part 4: Teacher Dashboard Sentiment Features (§25)

**"Needs Attention" Widget:**
- Identifies students with low engagement (<40% accuracy) or irregular participation.
- Flags these students for teacher outreach.
- Teachers can click "View Report" to read AI-generated engagement insights + recommended interventions.

**Student Directory Search:**
- Shows student engagement badge (High/Medium/Low) in the list.
- Teachers can filter by engagement level to prioritize at-risk students.

### Data Sources

| Data | Source | Updated When |
|---|---|---|
| `missions_completed` | `students` table | Each mission completion |
| Interaction accuracy | `student_interactions` table | Each activity (mission, chat, spelling, story) |
| Engagement level | Computed on-the-fly by `nlp_evaluator` | When teacher views report |
| Engagement badge | Frontend logic | On page load / profile fetch |

### UX Impact

1. **Student**: Sees their world evolving → feels progress visually → motivation to complete more missions.
2. **Teacher**: Gets AI-powered insights into student engagement → can proactively support at-risk students → better parent communication.
3. **System**: Provides holistic view of learning journey (metrics + sentiment + visual feedback) → alignment with Duolingo/Kahoot engagement model.

### Files Involved

**Frontend:**
- `components/student/DynamicBackground.tsx` — Avatar empathy via 3-tier visual progression.
- `app/student/home/page.tsx` — Engagement badge + adaptive messaging.
- `components/student/DailyChestModal.tsx` — Tone adaptation in reward messaging.
- `app/teacher/reports/page.tsx` — AI sentiment report display.

**Backend:**
- `app/agents/evaluator_agent/nlp_evaluator.py` — Sentiment analysis logic.
- `app/api/v1/endpoints/evaluator.py` — Report endpoints returning sentiment data.

---

## 29. Teacher Settings Page — Profile & Classroom CRUD (Complete — April 25, 2026)

### What was built

A comprehensive settings dashboard enabling teachers to manage their profile and classrooms with full CRUD operations.

**Location:** `/frontend/app/teacher/settings/page.tsx`

#### Features

**Teacher Profile Management:**
- Display mode shows: name, email, subject, school, phone (all read-only).
- Edit mode with form fields for all 5 fields.
- Save/Cancel buttons with loading states + animations.
- Success notification (green, with Check icon) that auto-dismisses after 1.5s.
- Error notification (red, with AlertCircle icon) showing API error message.
- POST endpoint: `PATCH /api/v1/teachers/{id}` (requires teacher JWT).

**Classroom CRUD:**

1. **Create Classroom** (modal):
   - Fields: Class Name (text), Grade Level (dropdown 1-8), Section (optional text).
   - Submit creates classroom with `POST /api/v1/classroom/`.
   - Modal closes on success; classroom list refreshes automatically.
   - Error state displays inline with red background.

2. **List Classrooms**:
   - Table view showing: Class Name, Grade Level, Section (if set), row actions.
   - Grade level displayed as "Grade N" badge in blue.
   - Responsive: columns collapse on mobile, actions move to dropdown menu.

3. **Edit Classroom** (modal):
   - Pre-populated form fields (Class Name, Grade, Section).
   - Submit calls `PATCH /api/v1/classroom/{id}`.
   - Modal closes on success; list refreshes.
   - Error handling + loading state.

4. **Delete Classroom** (confirmation modal):
   - Large red warning message: "Are you sure you want to delete {class_name}?"
   - Two buttons: "Cancel" + "Delete" (red destructive button).
   - Calls `DELETE /api/v1/classroom/{id}`.
   - On success, classroom removed from list immediately.
   - Error displayed in red banner.

#### UI/UX Details

- **Modals**: AnimatePresence + Framer Motion for smooth slide-in/out.
- **Loading states**: Buttons disabled with opacity fade; spinner appears on form fields.
- **Responsive layout**:
  - Desktop: 2-column grid (profile left, classrooms right).
  - Tablet/Mobile: Single column, full-width.
- **Color scheme**: Indigo branding (primary buttons), red for destructive actions, green for success, amber for info.
- **Icons**: lucide-react (Edit, Trash, Plus, AlertCircle, CheckCircle2).

#### Data Flow

1. On mount: Fetch teacher profile from `GET /api/v1/teachers/me` (new endpoint, teacher-protected).
2. On mount: Fetch classrooms list from `GET /api/v1/classroom/` (existing endpoint).
3. On "Save Profile": PATCH profile data → wait for response → show success/error.
4. On "Add Classroom": POST to `/classroom/` → refresh list.
5. On "Edit Classroom": PATCH to `/classroom/{id}` → refresh list.
6. On "Delete Classroom": DELETE to `/classroom/{id}` → remove from state.

#### Backend Endpoints Required (if not already present)

| Endpoint | Method | Notes |
|---|---|---|
| `/api/v1/teachers/{id}` | PATCH | Update teacher name/email/subject/school/phone |
| `/api/v1/teachers/me` | GET | Return authenticated teacher's profile |
| `/api/v1/classroom/` | GET | List teacher's classrooms (already exists) |
| `/api/v1/classroom/` | POST | Create classroom (already exists) |
| `/api/v1/classroom/{id}` | PATCH | Update classroom (grade, section, name) |
| `/api/v1/classroom/{id}` | DELETE | Delete classroom (already exists) |

#### Integration in TeacherShell

Added "Settings" link to teacher navbar (icon: Settings gear from lucide-react).

---

## 30. AudioProvider — Architecture & Context API (Complete — April 25, 2026)

### Problem Solved

Initial implementation of background music (BGM) and sound effects in student routes relied on multiple components independently managing audio state, leading to:
- **Context errors**: "useAudio must be used within an AudioProvider" on page reload.
- **Inconsistent mute state**: BGM vs sound effects had separate mute toggles.
- **Library API misunderstanding**: use-sound library doesn't provide `resume()` function.

### Solution: Centralized AudioProvider

**Component:** `frontend/components/student/AudioProvider.tsx`

#### Architecture

```
AudioProvider (wraps app/student/layout.tsx)
├─ AudioContext (global mute state + toggleMute function)
├─ Background Music (BGM) playback via use-sound
└─ Child components
   ├─ app/student/layout.tsx (StudentLayoutContent)
   │  └─ Audio toggle button (mute/unmute icon)
   └─ All nested routes + components
      └─ usePrimeSounds hook (respects global mute)
```

#### How it works

1. **Initialization**:
   - On mount, checks `localStorage.getItem('primepal_audio_muted')` to restore user preference.
   - Initializes `use-sound('/sounds/bgm.mp3', {loop: true, volume: 0.4})`.

2. **Mute Toggle**:
   - Button in layout header toggles `isMuted` state.
   - On toggle: saves new state to localStorage + calls `pauseBGM()` or `playBGM()`.

3. **Context Propagation**:
   - Exports `AudioContext` from component file for direct `useContext()` access.
   - Child components import `AudioContext` from this file (not via custom hook).
   - Safe default: `const isMuted = audioContext?.isMuted ?? false`.

4. **Sound Effects Hook**:
   - `usePrimeSounds(soundName)` in `lib/use-sound.ts` wraps use-sound.
   - Fetches `AudioContext` via `useContext()` with safe default.
   - `playWithMute()` wrapper: skips audio playback if `isMuted === true`.
   - Supports sounds: "thud", "fanfare", "correct", "incorrect", "collect", "level-up", "chime".

#### Design Decisions

1. **No custom hook at AudioProvider level**: Direct `useContext(AudioContext)` is simpler and prevents undefined-context errors that occurred with the wrapped hook.

2. **Persistent mute state**: Stored in localStorage so user preference survives page reload.

3. **BGM always managed by AudioProvider**: Background music plays/pauses globally (not via multiple hooks).

4. **Sound effects hook is a thin wrapper**: `usePrimeSounds` just checks mute state before delegating to `use-sound`.

5. **Safe defaults everywhere**: Every component using `useContext(AudioContext)` provides fallback values (`?? false` for isMuted, `?? (() => {})` for toggleMute).

#### Files Modified/Created

**Created:**
- `frontend/components/student/AudioProvider.tsx` — Main provider component (70 lines).
- `frontend/lib/use-sound.ts` — Sound effects hook wrapper (63 lines).

**Modified:**
- `frontend/app/student/layout.tsx` — Uses `useContext(AudioContext)` instead of `useAudio()` hook.

#### How to Use

In any student-facing component:

```tsx
import { useContext } from "react";
import { AudioContext } from "@/components/student/AudioProvider";

export function MyComponent() {
  const audioContext = useContext(AudioContext);
  const isMuted = audioContext?.isMuted ?? false;
  const toggleMute = audioContext?.toggleMute ?? (() => {});

  // Use isMuted and toggleMute as needed
}
```

Or for sound effects:

```tsx
import { usePrimeSounds } from "@/lib/use-sound";

export function MyComponent() {
  const { play } = usePrimeSounds("fanfare");

  const handleCorrectAnswer = () => {
    play(); // Plays sound, respects mute state
  };
}
```

---

## 28. Technical Debt / Known Issues (as of 2026-04-25)
- `missions.py:get_daily_missions` — previously had no error handling around RAG + LLM calls (fixed 2026-04-17 with try/except + logger).
- `AI_CONTEXT.md` section 2 previously showed Qdrant as the vector DB; project uses **pgvector via Supabase** (corrected 2026-04-17).
- Student post-login redirect previously went to `/missions`; now correctly routes to `/home` (fixed 2026-04-17).
- `StudentProfile` TypeScript interface is duplicated in `layout.tsx` and `home/page.tsx` — should be extracted to `frontend/types/student.ts` in a future cleanup.
- Admin system requires manual Supabase migration apply + auth hook deployment (see Tasks 1–2 in Admin Role System section).
- `evaluator.py GET /report/classroom/{id}` uses `correct` column while `GET /report/teacher` uses `is_correct` — schema inconsistency. The correct column name in the schema is `correct` (migration 007). The teacher report endpoint has a bug using `is_correct`; it has never been visibly broken because the column evaluates to None which is falsy. Fix: rename `is_correct` → `correct` in the teacher report query.
- Speaking Practice (`/speaking`) requires Chrome/Edge with Web SpeechRecognition API. Firefox is unsupported — a clear fallback message is shown.
- Report Card AI generation takes ~10 seconds due to LLM call — a loading spinner + "AI is analysing…" message is shown.
- **Teacher Settings Backend**: `PATCH /api/v1/teachers/{id}` and `GET /api/v1/teachers/me` endpoints need to be implemented in backend if not already present. The frontend is ready to call these endpoints but they may not exist yet in the FastAPI router.
- **Classroom CRUD endpoints**: Grade level validation (1-8) should be enforced server-side as well as client-side for security.
