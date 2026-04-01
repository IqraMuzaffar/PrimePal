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
| **Vector DB** | Qdrant (stores SNC curriculum embeddings) |
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
│   │   │   ├── dashboard/page.tsx   # Feature 10 (stub)
│   │   │   ├── classroom/page.tsx   # Feature 2 (stub)
│   │   │   └── analytics/page.tsx   # Feature 10 (stub)
│   │   ├── (student)/               # Student route group
│   │   │   ├── layout.tsx           # Gamified yellow header
│   │   │   ├── play/page.tsx        # ✅ Feature 1 — class code entry (Step 1)
│   │   │   ├── play/avatar-select.tsx # ✅ Feature 1 — avatar grid (Step 2)
│   │   │   ├── quests/page.tsx      # Features 5 & 6 (stub)
│   │   │   └── chat/page.tsx        # Feature 7 (stub)
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
│   │   │       ├── curriculum.py    # Features 3 & 4 (stub)
│   │   │       ├── tutor.py         # Features 5–7 (stub)
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
QDRANT_URL=http://localhost:6333
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
| 1 | Smart Auth & Role Management | ✅ **Complete & Tested** | See section 6 |
| 2 | Classroom Manager (Registry) | ✅ **Complete & Tested** | See section 7 |
| 3 | SNC Document Ingestion (RAG Pipeline) | 🔲 Stub only | Agent A scaffolded |
| 4 | Vector Storage & Curricular Tagging | 🔲 Stub only | Qdrant client not yet wired |
| 5 | Multi-Modal Quest Architect | 🔲 Stub only | Agent B scaffolded |
| 6 | Four-Pillar Interactive UI | 🔲 Stub only | `/quests` page scaffolded |
| 7 | Bilingual Code-Switching Chatbot | 🔲 Stub only | `/chat` page scaffolded |
| 8 | Multi-Modal Interaction Logger | 🔲 Stub only | `interaction.py` model exists |
| 9 | NLP Insight Generator | 🔲 Stub only | Agent C scaffolded |
| 10 | Four-Skill Action Plan Dashboard | 🔲 Stub only | `/dashboard` + `/analytics` scaffolded |

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
  - `app/(student)/play/avatar-select.tsx` — avatar grid → POST login → store JWT as `localStorage['primepal_student_token']` → redirect `/missions`.
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

## 8. Architectural Rules (Non-Negotiable)

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
- The RAG pipeline must **only** retrieve content tagged with the correct `grade` and `week` metadata from Qdrant. Never allow the LLM to answer from general knowledge for curriculum questions — always ground in SNC chunks.
- SNC vocabulary is the single source of truth. Agent A is the gatekeeper.

### Testing
- Tests live in `backend/tests/`. Always mock `get_supabase` at the endpoint import path (`app.api.v1.endpoints.<module>.get_supabase`) — do not mock at the source module.
- `conftest.py` must set all required environment variables **before** any app imports, because `pydantic-settings` reads them at import time.
- Run tests with: `cd backend && python -m pytest tests/ -v`

---

## 9. Running the Project Locally

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

## 10. Supabase Setup Checklist (one-time)

1. Create a Supabase project at supabase.com.
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_feature1_auth.sql`.
3. Copy **Project URL** and **anon key** → paste into `backend/.env` and `frontend/.env.local`.
4. Copy **service_role key** → paste into `backend/.env` (`SUPABASE_SERVICE_ROLE_KEY`). Keep this secret — never expose it to the frontend.
5. For teacher registration, use Supabase's **Authentication → Users** dashboard or build a `/register` endpoint in Feature 2.
