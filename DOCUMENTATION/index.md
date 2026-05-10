# PrimePal Documentation

PrimePal is an AI-powered ESL education platform for Pakistani primary school students (ages 6-12). It addresses the "Mute English" phenomenon by combining a gamified student-facing mobile app with a teacher-facing analytics dashboard, built around a three-agent AI architecture.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide React, canvas-confetti, @dicebear/core |
| **Backend** | Python 3.12, FastAPI 0.111.0, Uvicorn |
| **Database & Auth** | Supabase (PostgreSQL + GoTrue auth for teachers/admins) |
| **Vector DB** | Supabase pgvector (`snc_knowledge_base` table, HNSW index, cosine similarity) |
| **LLM** | OpenAI `gpt-4o-mini` (chat, missions, translation, evaluation, spelling, stories, speaking) |
| **Embeddings** | HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (local, free, 384 dims) |
| **Speech-to-Text** | OpenAI Whisper (`whisper-1`) + Browser Web SpeechRecognition |
| **Student Auth** | Custom PyJWT (HS256) -- completely separate from Supabase auth |
| **Caching** | Redis 7 (Alpine, async via aioredis) |
| **Testing** | pytest + pytest-asyncio + httpx (backend), 123+ tests passing |
| **Containerization** | Docker Compose (backend + Redis) |

---

## Quick Start

### Prerequisites
- Python 3.12+, Node.js 18+, Docker (for Redis)
- Supabase project with pgvector enabled
- OpenAI API key

### Backend
```bash
cd backend
cp .env.example .env          # fill in SUPABASE_URL, keys, OPENAI_API_KEY, STUDENT_JWT_SECRET
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL/KEY
npm install
npm run dev                         # http://localhost:3000
```

### Docker (Redis + Backend)
```bash
docker-compose up -d           # starts Redis on :6379, backend on :8000
cd frontend && npm run dev     # frontend runs natively
```

### Run Tests
```bash
cd backend && pytest tests/ -v   # 123+ backend tests
cd frontend && npm run build     # type-check + build
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (user-scoped queries) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `STUDENT_JWT_SECRET` | Custom HS256 secret for student tokens |
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key for LLM + Whisper |

### Frontend (`frontend/.env.local`)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base (e.g. `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |

---

## Documentation Tree

```
DOCUMENTATION/
+-- index.md                         <-- You are here
+-- architecture/
|   +-- index.md                     System architecture overview + Mermaid diagram
|   +-- agent-system.md              Three-agent system (Curriculum, Tutor, Evaluator)
|   +-- auth-flows.md                Dual auth: Supabase GoTrue + custom PyJWT
|   +-- data-flow.md                 Request lifecycles (missions, chat, curriculum, etc.)
|   +-- features.md                  Feature catalog (Features 1-10 + extras)
+-- api-reference/
|   +-- index.md                     Complete endpoint listing (method, path, auth, schemas)
+-- backend/
|   +-- index.md                     FastAPI app structure, key patterns
|   +-- endpoints/
|   |   +-- index.md                 All 16 endpoint modules with route/auth summary
|   |   +-- {auth,classroom,missions,...}.md   Per-endpoint details
|   +-- agents/
|   |   +-- index.md                 Agent A/B/C implementations
|   +-- core/
|   |   +-- index.md                 Core module listing
|   |   +-- {config,security,supabase-client,cache,permissions}.md
|   +-- models/
|   |   +-- index.md                 Models directory
|   +-- schemas/
|   |   +-- index.md                 Shared Pydantic models
|   +-- utils/
|   |   +-- index.md                 Utility modules
|   +-- tests/
|       +-- index.md                 Test suite overview
+-- frontend/
|   +-- index.md                     Next.js structure, key patterns
|   +-- pages/
|   |   +-- index.md                 All routes by role (student/teacher/admin)
|   |   +-- {student,teacher,admin}.md
|   +-- components/
|   |   +-- index.md                 Student + teacher component catalog
|   |   +-- student.md               Student component details
|   |   +-- teacher.md               Teacher component details
|   +-- lib/
|   |   +-- index.md                 Utility module listing
|   |   +-- {api,auth,hooks,networking}.md
|   +-- types/
|       +-- index.md                 Shared TypeScript types
+-- database/
|   +-- index.md                     Table overview, pgvector setup
|   +-- tables.md                    All tables with column definitions
|   +-- migrations.md                Migration index (001-035 + backend RPCs)
|   +-- rls-policies.md              Row Level Security overview
|   +-- functions.md                 SQL functions, RPCs, and triggers
|   +-- schema-relationships.md      Foreign key map and entity relationship diagram
|   +-- edge-functions.md            Supabase Edge Function: auth-hook-add-role
+-- deployment/
    +-- index.md                     Deploy architecture, quick deploy steps
    +-- environment-variables.md     All env vars for backend + frontend
    +-- docker.md                    Docker Compose setup
    +-- production-checklist.md      Pre-deploy checklist
```

---

## Key Concepts for New Developers

### Two Separate Auth Systems
Teachers use **Supabase GoTrue** (email/password). Students use **custom PyJWT** (HS256) because they are ghost profiles without passwords. Never mix these systems. See [architecture/auth-flows.md](architecture/auth-flows.md).

### All DB Access via Supabase Client
No SQLAlchemy ORM. All operations use the Supabase Python client (`backend/app/core/supabase_client.py`):
- `get_supabase()` -- anon key, respects RLS
- `get_supabase_admin()` -- service role key, bypasses RLS

### Redis Caches LLM Outputs
Missions, stories, spelling words, and teacher role lookups are cached in Redis. Cache is best-effort -- if Redis is down, the app continues without caching. Module: `backend/app/core/cache.py`.

### Frontend API Patterns
- **Teacher endpoints**: `apiFetch()` from `frontend/lib/api.ts` (attaches Supabase session token)
- **Student endpoints**: Raw `fetch()` with `localStorage['primepal_student_token']`
- **FormData uploads**: Raw `fetch()` (to avoid default JSON Content-Type)

### Grade-Level Guardrail
Enforced at three layers:
1. **SQL RPC**: `match_snc_documents` filters by grade_level BEFORE vector math
2. **Endpoint logic**: grade_level resolved from DB, never from client
3. **LLM prompt**: Instructed to use only Grade N vocabulary

---

## API Endpoint Modules

All mounted under `/api/v1` via `backend/app/api/v1/router.py`:

| Prefix | Module | Auth | Purpose |
|---|---|---|---|
| `/achievements` | `achievements.py` | Student JWT | Badge/achievement system |
| `/admin` | `admin.py` | Admin (GoTrue) | School-wide admin operations |
| `/announcements` | `announcements.py` | Teacher/Student | Classroom announcements |
| `/auth` | `auth.py` | Public/Mixed | Student login, teacher profile, PIN reset |
| `/classroom` | `classroom.py` | Teacher GoTrue | CRUD classrooms + student roster |
| `/curriculum` | `curriculum.py` | Teacher GoTrue | PDF upload, embed, upload history |
| `/chat` | `chat.py` | Student JWT | Bilingual RAG chat |
| `/topics` | `topics.py` | Teacher/Student | SNC topic management |
| `/evaluations` | `evaluations.py` | Teacher GoTrue | Student evaluation reports |
| `/evaluator` | `evaluator.py` | Teacher GoTrue | NLP insight generation |
| `/missions` | `missions.py` | Student JWT | Daily + pillar missions |
| `/rewards` | `rewards.py` | Student JWT | Daily chest, streak, score summary |
| `/interactions` | `interactions.py` | Student JWT | Batch game result logging |
| `/spelling-bee` | `spelling_bee.py` | Student JWT | Word spelling practice |
| `/story-time` | `story_time.py` | Student JWT | Reading comprehension stories |
| `/speaking` | `speaking.py` | Student JWT | Voice eval + pronunciation |

---

## Repository Structure

```
Primepal/
+-- frontend/                   Next.js 14 App Router
|   +-- app/
|   |   +-- teacher/            Teacher routes (/teacher/dashboard, /teacher/classroom, etc.)
|   |   +-- student/            Student routes (/student/home, /student/missions, etc.)
|   |   +-- admin/              Admin routes
|   |   +-- auth/               Legacy auth routes
|   +-- components/             Reusable UI components (student/ and teacher/ subdirs)
|   +-- lib/                    Utilities (api.ts, teacherAuth.ts, adminAuth.ts, etc.)
|   +-- types/                  Shared TypeScript types
+-- backend/                    FastAPI application
|   +-- app/
|   |   +-- main.py             App entrypoint, CORS, lifespan (Redis init)
|   |   +-- core/               Config, security, Supabase client, cache
|   |   +-- api/v1/             Router + 16 endpoint modules
|   |   +-- agents/             Three-agent system (curriculum, tutor, evaluator)
|   |   +-- models/             Pydantic models
|   |   +-- schemas/            Request/response schemas
|   +-- tests/                  pytest test suite (123+ tests)
+-- supabase/
|   +-- migrations/             SQL migration files
+-- DOCUMENTATION/              This documentation
+-- TICKETS/                    Pre-ship audit tracking
+-- docker-compose.yml          Redis + backend orchestration
+-- AI_CONTEXT.md               Detailed AI assistant context
+-- CLAUDE.md                   Project overview for AI assistants
```
