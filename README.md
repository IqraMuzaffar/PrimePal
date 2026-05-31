# PrimePal: AI-Powered ESL Tutoring Platform for Pakistani Primary Schools

An AI-powered adaptive English tutoring platform designed for under-resourced Pakistani primary schools (Grades 1-5). Uses a three-agent architecture (Curriculum Guardrail, Tutor, Evaluator) with bilingual Urdu-English support, aligned to Pakistan's Single National Curriculum (SNC).

**Live App**: https://prime-pal-alpha.vercel.app
**GitHub**: https://github.com/IqraMuzaffar/PrimePal

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [External Services Setup](#external-services-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Docker Deployment](#docker-deployment)
7. [Database Setup (Supabase)](#database-setup-supabase)
8. [Running Tests](#running-tests)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [External Libraries](#external-libraries)
11. [Project Structure](#project-structure)

---

## Architecture Overview

```
Frontend (Next.js 14)          Backend (FastAPI)              Data Layer
┌──────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Student Portal  │────>│  Agent A: Curriculum │────>│ Supabase PostgreSQL │
│  Teacher Dash    │     │  Agent B: Tutor      │     │ + pgvector (RAG)    │
│  Admin Panel     │     │  Agent C: Evaluator  │     │ + GoTrue Auth       │
└──────────────────┘     └──────────────────────┘     │ Redis Cache         │
                                    │                  │ OpenAI API          │
                                    │                  └─────────────────────┘
                                    v
                         ┌──────────────────────┐
                         │  OpenAI gpt-4o-mini  │
                         │  Whisper STT         │
                         │  text-embedding-3    │
                         └──────────────────────┘
```

**Three AI Agents:**
- **Agent A (Knowledge Curator):** Ingests SNC textbook PDFs, creates vector embeddings, enforces grade-level curriculum boundaries via RAG
- **Agent B (Instructor):** Generates adaptive missions, bilingual chat, confidence builder mode
- **Agent C (Analyst):** Async interaction logging, NLP insight reports for teachers

**Auth Model:**
- Students: Custom PyJWT (class code + avatar + 4-digit PIN, no email needed)
- Teachers: Supabase GoTrue (email + password)
- Admins: Supabase GoTrue + invite code

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12+ | Backend runtime |
| Node.js | 20+ | Frontend runtime |
| npm | 10+ | Frontend package manager |
| Docker + Docker Compose | Latest | Container orchestration (optional) |
| Git | Latest | Version control |

---

## External Services Setup

You need accounts for these services before deploying:

### 1. Supabase (Database + Auth)

1. Go to https://supabase.com and create a new project
2. Note down:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: Found in Settings > API
   - **Service Role Key**: Found in Settings > API (keep secret!)
   - **Database Password**: Set during project creation
3. Enable the **pgvector** extension:
   - Go to Database > Extensions > Search "vector" > Enable
4. Run all migration files from `supabase/migrations/` in order (001 through 040)
   - Go to SQL Editor and paste each migration file

### 2. OpenAI API

1. Go to https://platform.openai.com and create an API key
2. Ensure your account has access to:
   - `gpt-4o-mini` (chat completions)
   - `text-embedding-3-small` (embeddings)
   - `whisper-1` (speech-to-text)
3. Estimated cost: $20-50/month for a class of 30-50 students

### 3. Redis (Optional)

- Required for production caching. The backend falls back to in-memory cache if Redis is unavailable.
- Docker Compose includes a Redis service automatically
- For managed Redis: use Redis Cloud free tier or similar

---

## Backend Setup

### Step 1: Create virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Application
APP_ENV=development
SECRET_KEY=generate-a-strong-random-string-here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Student JWT (separate from Supabase)
STUDENT_JWT_SECRET=generate-another-strong-random-string

# Redis (optional - falls back to in-memory)
REDIS_URL=redis://localhost:6379

# CORS
ALLOWED_ORIGINS=["http://localhost:3000"]
```

### Step 4: Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for interactive API documentation.

### Step 5: Verify health

```bash
curl http://localhost:8000/health
# Should return: {"status": "ok", "service": "primepal-api"}

curl http://localhost:8000/health/detailed
# Returns database, Redis, OpenAI status + 24h LLM stats
```

---

## Frontend Setup

### Step 1: Install dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Run the frontend

```bash
# Development (with Turbopack)
npm run dev

# Production build
npm run build
npm start
```

The app will be available at `http://localhost:3000`.

---

## Docker Deployment

The easiest way to run the full stack:

### Step 1: Set environment variables

Create a `.env` file in the project root with all required variables (see Backend Setup Step 3).

### Step 2: Build and run

```bash
docker-compose up -d --build
```

This starts three services:
- **Redis** on port 6379 (with health check)
- **Backend** on port 8000 (waits for Redis to be healthy)
- **Frontend** on port 3000 (waits for Backend to be healthy)

### Step 3: Verify

```bash
docker-compose ps          # Check all services are running
docker-compose logs -f     # View logs
curl http://localhost:8000/health/detailed  # Backend health
```

### Stop

```bash
docker-compose down        # Stop services
docker-compose down -v     # Stop and remove volumes
```

---

## Database Setup (Supabase)

### Running Migrations

The database schema is defined in 40+ SQL migration files in `supabase/migrations/`. Run them in numerical order:

```
001_feature1_auth.sql              - Auth tables + teacher profiles
002_feature2_classrooms.sql        - Classrooms + students + auto class codes
003_feature3_storage.sql           - PDF upload storage bucket
004_feature4_pgvector.sql          - Vector embeddings table + HNSW index
005_feature5_chat.sql              - Chat history + match RPC function
006_feature6_gamification.sql      - Points, streaks, leaderboard
007_feature7_interactions.sql      - Student interaction logging
008_switch_to_minilm_embeddings.sql - Embedding dimension switch
009-040                            - Incremental features (avatars, PINs,
                                     spelling bee, achievements, evaluations,
                                     announcements, question bank, etc.)
```

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `teachers` | Teacher accounts (linked to Supabase Auth) |
| `classrooms` | Class groups with auto-generated codes |
| `students` | Ghost-profile student records (no email/PII) |
| `snc_knowledge_base` | pgvector embeddings of SNC curriculum |
| `student_interactions` | All learning activity logs |
| `question_bank` | Pre-generated question pool for instant delivery |
| `evaluation_questions` | Pre/post test question bank |
| `evaluation_records` | Test responses |
| `achievements` | Badge definitions |
| `announcements` | Bilingual teacher announcements |
| `llm_metrics` | LLM API call tracking |

### Seeding SNC Topics

100 predefined SNC topics (5 grades x 4 skills x 5 topics) are seeded via migration `025_seed_snc_topics.sql`. These cover:

- Grade 1: Phonics, Colors, Numbers, Animals, Family
- Grade 2: Nouns, Verbs, Adjectives, Food & Drink, Community
- Grade 3: Prepositions, Tenses, Reading Comprehension, Vocabulary, Punctuation
- Grade 4: Grammar, Composition, Idioms, Letter Writing, Synonyms & Antonyms
- Grade 5: Complex Sentences, Literature, Technical Vocabulary, Essay Writing, Figurative Language

---

## Running Tests

```bash
cd backend

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app
```

**Test suite: 312+ tests** covering auth, missions, chat, curriculum ingestion, analytics, speaking, evaluations, and edge cases.

---

## API Endpoints Reference

| Module | Path Prefix | Auth | Description |
|--------|-------------|------|-------------|
| Auth | `/api/v1/auth` | Public | Student login, avatar fetch, teacher login |
| Classroom | `/api/v1/classroom` | Teacher | CRUD classrooms, manage students, active topics |
| Missions | `/api/v1/missions` | Student | Daily + pillar missions (Kahoot-style) |
| Chat | `/api/v1/chat` | Student | Bilingual RAG chatbot |
| Curriculum | `/api/v1/curriculum` | Teacher | SNC PDF upload + embedding pipeline |
| Topics | `/api/v1/topics` | Teacher | SNC topic management |
| Evaluations | `/api/v1/evaluations` | Mixed | Pre/post tests |
| Spelling Bee | `/api/v1/spelling-bee` | Student | Spelling practice with TTS |
| Story Time | `/api/v1/story-time` | Student | Reading comprehension stories |
| Puzzle Palace | `/api/v1/puzzle-palace` | Student | Challenge mode (5 rooms, 10 questions) |
| Speaking | `/api/v1/speaking` | Student | Speaking practice (browser + Whisper) |
| Rewards | `/api/v1/rewards` | Student | Daily chest, points |
| Interactions | `/api/v1/interactions` | Student | Activity logging |
| Student Scores | `/api/v1/student` | Student | Progress, streaks, achievements |
| Teacher | `/api/v1/teacher` | Teacher | Dashboard analytics, insight reports |
| Admin | `/api/v1/admin` | Admin | School-wide management, CSV exports |
| Monitoring | `/api/v1/admin/monitoring` | Admin | LLM metrics, performance stats |

Full interactive docs available at `http://localhost:8000/docs` (Swagger UI).

---

## External Libraries

### Backend (Python)

| Library | Version | Purpose | Link |
|---------|---------|---------|------|
| FastAPI | 0.111.0 | REST API framework | https://fastapi.tiangolo.com |
| Uvicorn | 0.29.0 | ASGI server | https://uvicorn.org |
| PyJWT | 2.8.0 | Student JWT tokens | https://pyjwt.readthedocs.io |
| Supabase | 2.4.6 | Database + auth client | https://supabase.com/docs/reference/python |
| OpenAI SDK | 1.58.1 | LLM + embeddings + Whisper | https://platform.openai.com/docs |
| LangChain | 0.3.25 | RAG orchestration | https://python.langchain.com |
| LangChain-OpenAI | 0.2.14 | OpenAI LangChain integration | https://python.langchain.com |
| pypdf | 4.2.0 | PDF text extraction | https://pypdf.readthedocs.io |
| Redis | 5.0.1 | Async caching | https://redis-py.readthedocs.io |
| slowapi | 0.1.9 | Rate limiting | https://github.com/laurentS/slowapi |
| Pydantic Settings | 2.4.0 | Config management | https://docs.pydantic.dev |
| httpx | 0.27.0 | Async HTTP client | https://www.python-httpx.org |
| pytest | 8.2.1 | Testing framework | https://docs.pytest.org |

### Frontend (Node.js)

| Library | Version | Purpose | Link |
|---------|---------|---------|------|
| Next.js | 14.2.35 | React framework (App Router) | https://nextjs.org |
| React | 18 | UI library | https://react.dev |
| TypeScript | 5 | Type-safe JavaScript | https://typescriptlang.org |
| @tanstack/react-query | 5.100.8 | Server state management | https://tanstack.com/query |
| @supabase/supabase-js | 2.43.4 | Supabase client | https://supabase.com/docs/reference/javascript |
| Tailwind CSS | 3.4.1 | Utility-first CSS | https://tailwindcss.com |
| Framer Motion | 12.38.0 | Animations | https://motion.dev |
| @dnd-kit | 6.3.1 | Drag and drop | https://dndkit.com |
| Lucide React | 0.381.0 | Icons | https://lucide.dev |
| canvas-confetti | 1.9.4 | Celebration effects | https://github.com/catdad/canvas-confetti |
| jsPDF | 4.2.1 | PDF report generation | https://github.com/parallax/jsPDF |
| react-markdown | 10.1.0 | Markdown rendering | https://github.com/remarkjs/react-markdown |

### Infrastructure

| Service | Purpose | Link |
|---------|---------|------|
| Supabase | Managed PostgreSQL + Auth + Storage | https://supabase.com |
| OpenAI API | LLM (gpt-4o-mini), Embeddings, Whisper STT | https://platform.openai.com |
| Redis | Caching layer | https://redis.io |
| Docker | Containerization | https://docker.com |
| Vercel | Frontend hosting | https://vercel.com |

---

## Project Structure

```
PrimePal/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── core/
│   │   │   ├── config.py              # Settings (env vars)
│   │   │   ├── security.py            # JWT + auth dependencies
│   │   │   ├── supabase_client.py     # Supabase SDK init
│   │   │   ├── cache.py               # Redis + in-memory fallback
│   │   │   ├── rate_limit.py          # slowapi rate limiter
│   │   │   └── llm_tracker.py         # LLM call tracking
│   │   ├── agents/
│   │   │   ├── curriculum_agent/      # Agent A: PDF ingestion, embedder
│   │   │   ├── tutor_agent/           # Agent B: missions, chatbot
│   │   │   └── evaluator_agent/       # Agent C: logging, NLP reports
│   │   ├── api/v1/
│   │   │   ├── router.py             # Route registry
│   │   │   └── endpoints/            # 16 endpoint modules
│   │   └── utils/
│   │       ├── question_bank.py       # Pre-generated question pool
│   │       ├── pregenerate_missions.py # Background question generation
│   │       └── pronunciation.py       # Whisper word-level scoring
│   ├── tests/                         # 312+ pytest tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── student/                   # Student routes
│   │   ├── teacher/                   # Teacher routes
│   │   └── admin/                     # Admin routes
│   ├── components/                    # React components
│   ├── lib/
│   │   ├── api.ts                     # apiFetch() wrapper
│   │   └── auth.ts                    # Auth helpers
│   ├── package.json
│   ├── Dockerfile
│   └── .env.local.example
├── supabase/
│   ├── migrations/                    # 40+ SQL migration files
│   └── functions/                     # Edge functions (auth hook)
├── docker-compose.yml
└── README.md
```

---

## Support

For questions or issues, contact:
- **Iqra Muzaffar** — MS Artificial Intelligence, LUMS
- **Supervisor**: Dr. Suleman Shahid
