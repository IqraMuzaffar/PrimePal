# PrimePal — AI Context & Long-Term Memory

**Read this file at the start of every session before touching any code.**
Last updated: 2026-04-29

---

## 1. Project Overview

**PrimePal** is an AI-powered ESL (English as a Second Language) gamified education platform for Pakistani primary school students (Grades 1–5). It addresses the "Mute English" phenomenon — students who pass written exams but cannot speak or comprehend English — by combining a gamified student-facing app with a teacher-facing analytics and curriculum management dashboard.

### The three AI agents
| Agent | Role |
|---|---|
| **Agent A — Curriculum Guardrail** | Enforces SNC vocabulary boundaries. Every student interaction is grounded in grade-appropriate SNC textbook content via RAG (pgvector). |
| **Agent B — Tutor** | Drives learning across all 4 LSRW pillars (Listening, Speaking, Reading, Writing). Generates daily missions and pillar-specific question sets. Also handles bilingual chat. |
| **Agent C — Evaluator** | Silently logs all student interactions (BackgroundTasks), produces teacher-facing NLP reports, tracks pillar-wise accuracy and weakness patterns. |

### The two user roles
- **Teacher** — authenticates via Supabase GoTrue (email/password). Manages classrooms, uploads SNC PDFs, controls curriculum topics, views analytics.
- **Student** — authenticates via custom PyJWT (class code + avatar selection + secret PIN). Ghost profiles — not real Supabase Auth users.

These are **completely separate authentication systems** — never mix them.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI libs | `lucide-react`, `framer-motion`, `canvas-confetti`, `jspdf`, `jspdf-autotable` |
| Backend | Python 3.12, FastAPI 0.111.0, Uvicorn |
| Database & Auth | Supabase (PostgreSQL + GoTrue) |
| Vector DB | Supabase pgvector — `snc_knowledge_base` table, `VECTOR(384)` (all-MiniLM-L6-v2) |
| LLM | OpenAI `gpt-4o-mini` (missions, chat) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (local, 384-dim, free) |
| Speech-to-Text | OpenAI Whisper (`whisper-1`) |
| Student JWT | PyJWT HS256 — custom secret, separate from Supabase JWT |
| Caching | In-memory Python dict (`app/core/cache.py`) — TTL-based, no Redis required |
| Testing | pytest + pytest-asyncio (backend) |
| Containerization | Docker + docker-compose (Dockerfile in `backend/`) |

### Key embedding note
The vector column is **384-dimensional** (all-MiniLM-L6-v2), NOT 1536 (OpenAI text-embedding-3-small). Migration `008_switch_to_minilm_embeddings.sql` dropped and recreated the table with the correct dimension. The AI_CONTEXT.md previously stated 1536 — that was outdated.

---

## 3. Repository Structure

```
Primepal/
├── AI_CONTEXT.md                        ← YOU ARE HERE. Read first every session.
├── docker-compose.yml                   ← Runs backend + optional services
│
├── frontend/                            Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx                   Root layout
│   │   ├── page.tsx                     Root page (redirect to /teacher/login)
│   │   │
│   │   ├── teacher/                     ✅ CANONICAL teacher routes
│   │   │   ├── layout.tsx               → TeacherShell wrapper (sidebar nav)
│   │   │   ├── login/page.tsx           Email/password login → Supabase GoTrue
│   │   │   ├── dashboard/page.tsx       KPI cards + classroom quick-access + quick links
│   │   │   ├── dashboard/curriculum/    Curriculum dashboard sub-page
│   │   │   ├── classroom/page.tsx       Classroom list (grade-grouped)
│   │   │   ├── classroom/[id]/page.tsx  Classroom detail: roster + Active Topics pills + PIN mgmt
│   │   │   ├── classroom/[id]/syllabus/ Legacy 30-week calendar (UI removed, table kept)
│   │   │   ├── curriculum/page.tsx      Curriculum Hub: upload PDFs per grade + topic tag
│   │   │   ├── analytics/page.tsx       Global analytics: By Student / By Grade / By Section tabs
│   │   │   ├── students/page.tsx        Student directory (global search + stats)
│   │   │   ├── students/[id]/report/    Per-student AI report card + PDF export
│   │   │   ├── announcements/page.tsx   Bilingual announcements (scope: classroom/grade/school)
│   │   │   ├── missions/page.tsx        Teacher missions overview
│   │   │   ├── reports/page.tsx         Reports page
│   │   │   └── settings/page.tsx        Settings page
│   │   │
│   │   ├── student/                     ✅ CANONICAL student routes
│   │   │   ├── layout.tsx               Sticky gamified header (avatar + points + nav)
│   │   │   ├── play/page.tsx            Step 1: class code entry
│   │   │   ├── play/avatar-select.tsx   Step 2: avatar grid → redirect /home
│   │   │   ├── play/pin-entry.tsx       Step 3: 4-digit PIN entry
│   │   │   ├── home/page.tsx            Student home: hero + all activity cards
│   │   │   ├── missions/page.tsx        4-pillar dashboard (2×2 grid)
│   │   │   ├── missions/[pillar]/page.tsx 15s-timer Kahoot gameplay
│   │   │   ├── chat/page.tsx            Bilingual RAG chatbot UI
│   │   │   ├── quests/page.tsx          4-pillar weekly progress (rolling 7-day)
│   │   │   ├── leaderboard/page.tsx     Class leaderboard by points (podium top-3)
│   │   │   ├── speaking/page.tsx        Speaking practice (Web SpeechRecognition + LLM eval)
│   │   │   ├── spelling-bee/page.tsx    Spelling bee (TTS audio + typed answer)
│   │   │   └── story-time/page.tsx      LLM story + 3 comprehension questions + TTS
│   │   │
│   │   ├── admin/                       Admin role system
│   │   │   ├── login/page.tsx           Admin login (invite code)
│   │   │   ├── layout.tsx               Admin shell
│   │   │   └── dashboard/               Admin dashboard: overview, staff, hierarchy, curriculum
│   │   │
│   │   └── auth/                        Auth helpers (layout + login pages mirror)
│   │
│   ├── components/
│   │   ├── teacher/
│   │   │   ├── TeacherShell.tsx         Sidebar nav + mobile hamburger
│   │   │   ├── CreateClassroomModal.tsx Modal: class name + grade + section
│   │   │   ├── BulkAddStudentsModal.tsx Textarea → bulk student creation
│   │   │   ├── EditStudentModal.tsx     Edit student name/roll/email inline
│   │   │   ├── UploadBookModal.tsx      PDF upload with optional topic tag dropdown
│   │   │   ├── FileUploadZone.tsx       Drag-drop zone with 3-phase loading states
│   │   │   ├── SearchBar.tsx            Reusable search input
│   │   │   ├── AnalyticsByStudent.tsx   Analytics view: all students sorted by name
│   │   │   ├── AnalyticsByGrade.tsx     Analytics view: grade-level aggregates
│   │   │   ├── AnalyticsByClass.tsx     Analytics view: per-classroom breakdown
│   │   │   ├── AnalyticsOverview.tsx    Analytics overview stats
│   │   │   ├── TabbedDashboard.tsx      Tab container for analytics
│   │   │   └── TabNavigation.tsx        Tab nav component
│   │   │
│   │   └── student/
│   │       ├── MissionsDashboard.tsx    4-pillar card grid (Framer Motion)
│   │       ├── PillarCard.tsx           Single pillar card (hover/tap animations)
│   │       ├── MissionGameplay.tsx      Question display + answer feedback logic
│   │       ├── QuestionTimer.tsx        15s countdown + green→red bar
│   │       ├── AnimatedBackground.tsx   Parallax animated background
│   │       ├── AudioProvider.tsx        Sound system context provider
│   │       ├── AvatarShowcase.tsx       Avatar display with customization UI
│   │       ├── AvatarCustomizeModal.tsx Avatar style/color picker modal
│   │       ├── DailyChestModal.tsx      Daily reward loot box animation
│   │       ├── DynamicBackground.tsx    Day/night cycle + 3-tier journey system
│   │       ├── PrimePalAvatar.tsx       Dicebear avatar renderer
│   │       └── SpeakingPronunciationFeedback.tsx Pronunciation feedback UI
│   │
│   ├── lib/
│   │   ├── api.ts                       Typed fetch wrapper (uses NEXT_PUBLIC_API_URL)
│   │   ├── supabase/client.ts           Browser-side Supabase client
│   │   ├── teacherAuth.ts               getTeacherHeaders() — Supabase session → Bearer token
│   │   ├── adminAuth.ts                 Admin auth helpers
│   │   ├── avatarGenerator.ts           Dicebear URL builder
│   │   ├── avatarHelper.ts              Avatar utility helpers
│   │   ├── use-sound.ts                 Sound hook wrapper
│   │   └── useProgressiveHydration.ts  SSR hydration helper
│   │
│   └── types/
│       ├── index.ts                     Shared interfaces: Classroom, Student, SncTopic, Pillar...
│       └── analytics.ts                 Analytics-specific types
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini                       asyncio_mode = auto
│   ├── .env.example
│   │
│   ├── app/
│   │   ├── main.py                      FastAPI app: CORS, startup, routers
│   │   │
│   │   ├── core/
│   │   │   ├── config.py                pydantic-settings → reads .env
│   │   │   ├── security.py              create_student_token, get_current_student, get_current_teacher
│   │   │   ├── supabase_client.py       get_supabase() / get_supabase_admin()
│   │   │   └── cache.py                 In-memory TTL cache (dict-based, no Redis)
│   │   │
│   │   ├── api/v1/
│   │   │   ├── router.py                Wires all 15 endpoint routers
│   │   │   └── endpoints/
│   │   │       ├── auth.py              /auth — student login + avatar fetch + PIN
│   │   │       ├── classroom.py         /classroom — CRUD + bulk students + active-topics
│   │   │       ├── curriculum.py        /curriculum — PDF upload + embed pipeline
│   │   │       ├── topics.py            /topics — SNC topic listing by grade
│   │   │       ├── missions.py          /missions — daily + pillar + complete + me + leaderboard
│   │   │       ├── interactions.py      /interactions — batch result logging
│   │   │       ├── chat.py              /chat — guardrailed RAG chatbot
│   │   │       ├── evaluator.py         /evaluator — teacher reports + AI insights
│   │   │       ├── rewards.py           /rewards — daily chest reward system
│   │   │       ├── speaking.py          /speaking — speech evaluation endpoint
│   │   │       ├── spelling_bee.py      /spelling-bee — word selection + TTS
│   │   │       ├── story_time.py        /story-time — LLM story + comprehension
│   │   │       ├── announcements.py     /announcements — bilingual announcements
│   │   │       ├── admin.py             Admin-scoped endpoints
│   │   │       └── tutor.py             Tutor stub
│   │   │
│   │   ├── agents/
│   │   │   ├── curriculum_agent/
│   │   │   │   ├── ingestion.py         clean_snc_text(), chunk_documents()
│   │   │   │   └── embedder.py          embed_and_store_chunks() → pgvector insert
│   │   │   ├── tutor_agent/
│   │   │   │   ├── chatbot.py           RAG retrieval + guardrailed LLM response
│   │   │   │   ├── mission_generator.py generate_daily_missions() + generate_pillar_missions()
│   │   │   │   └── quest_generator.py   (legacy stub)
│   │   │   └── evaluator_agent/
│   │   │       ├── interaction_logger.py log_interaction() — silent BackgroundTask
│   │   │       ├── nlp_evaluator.py     Student insight generation
│   │   │       └── report_builder.py    Teacher report construction
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.py                  StudentLoginRequest, StudentTokenResponse
│   │   │   └── classroom.py             ClassroomCreate/Response/Detail, StudentBulkCreate...
│   │   │
│   │   └── utils/
│   │       ├── code_generation.py       Memorable class code generator (grade+section based)
│   │       └── pronunciation.py         Pronunciation scoring utilities
│   │
│   └── tests/
│       ├── conftest.py                  Env vars + AsyncClient fixture
│       ├── test_auth.py                 14 tests — student login, JWT, avatars
│       ├── test_classroom.py            10 tests — CRUD, bulk add, ownership
│       ├── test_ingestion.py            13 tests — PDF pipeline, chunking, cleaning
│       ├── test_knowledge_base.py       7 tests — embed_and_store_chunks, /embed endpoint
│       ├── test_chat.py                 19 tests — RAG chat + bilingual translation
│       ├── test_missions.py             13 tests — daily missions, /complete, /me, leaderboard
│       ├── test_pillar_missions.py      ⚠️ 11 tests — 8 FAILING (signature change: active_topics)
│       ├── test_interactions.py         7 tests — batch logging
│       ├── test_evaluator.py            Teacher report tests
│       ├── test_student_update.py       4 tests — PATCH student
│       ├── test_teacher_analytics.py    3 tests — aggregated report
│       ├── test_upload_history.py       Upload history tests
│       └── test_topics.py              4 tests — SNC topics endpoint ✅
│
└── supabase/
    └── migrations/                     Run in order in Supabase SQL Editor
        ├── 001_feature1_auth.sql        teachers, classrooms, students + RLS
        ├── 002_feature2_classroom.sql   grade_level + auto class_code trigger
        ├── 003_feature3_storage.sql     snc-textbooks private storage bucket
        ├── 004_feature4_pgvector.sql    pgvector extension + snc_knowledge_base (VECTOR(1536))
        ├── 005_feature5_chat_rpc.sql    match_snc_documents() RPC
        ├── 006_feature6_gamification.sql students.points column
        ├── 007_feature8_interactions.sql student_interactions table
        ├── 008_switch_to_minilm_embeddings.sql Drops & recreates snc_knowledge_base as VECTOR(384)
        ├── 009_snc_uploads.sql          snc_uploads table (upload history)
        ├── 010_avatar_customization.sql avatar_style, theme_color columns on students
        ├── 011_secret_pin.sql           secret_pin column on students
        ├── 012_add_current_week_topic.sql classrooms.current_week_topic (kept, not used in missions)
        ├── 013_add_student_identity_fields.sql students.roll_number, email
        ├── 014_admin_roles.sql          admin_users, admin_audit_log tables
        ├── 015_classroom_syllabus.sql   classroom_syllabus table (30-week calendar, UI removed)
        ├── 016_spelling_bee_type.sql    spelling_bee interaction type
        ├── 017_interactions_pillar.sql  pillar column on student_interactions
        ├── 018_classroom_section.sql    classrooms.section column
        ├── 019_pronunciation_data.sql   pronunciation scoring tables
        ├── 020_missions_completed_tracking.sql students.missions_completed column
        ├── 021_daily_rewards.sql        daily_rewards table (anti-cheat chest)
        ├── 022_sentiment_affective_filter.sql Sentiment/frustration tracking
        ├── 022_announcements_bilingual.sql announcements table (bilingual)
        ├── 023_announcements_scope_levels.sql scope column (classroom/grade/school)
        ├── 023_snc_topics_and_active_topics.sql ← LATEST: snc_topics + classroom_active_topics
        ├── 024_unique_classroom_section.sql Unique constraint on grade+section per teacher
        └── 025_student_self_access_policy.sql RLS: students can read their own records
```

---

## 4. Environment Variables

### Backend — `backend/.env`
```env
APP_ENV=development
SECRET_KEY=any-long-random-string

# Supabase (Settings → API in dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Never expose to frontend

# Student authentication (custom JWT, separate from Supabase)
STUDENT_JWT_SECRET=any-long-random-string

# OpenAI
OPENAI_API_KEY=sk-...
CHAT_MODEL=gpt-4o-mini             # Cost-optimized; do NOT change to gpt-4o
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# CORS
ALLOWED_ORIGINS=["http://localhost:3000"]

# Not currently used (Supabase handles DB, Qdrant not wired):
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/primepal
QDRANT_URL=http://localhost:6333
```

### Frontend — `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 5. How to Run Locally

```bash
# 1. Clone
git clone https://github.com/IqraMuzaffar/PrimePal.git && cd PrimePal

# 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env           # then fill in real values
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local  # then fill in real values
npm run dev                    # runs on http://localhost:3000

# 4. Supabase migrations
# Open Supabase dashboard → SQL Editor
# Run each file in supabase/migrations/ in numeric order (001 → 025)
# Skip any that fail with "already exists" — they're already applied
```

API docs: `http://localhost:8000/docs`

---

## 6. Complete API Endpoint Reference

### Auth — `/api/v1/auth`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/classroom/{class_code}/avatars` | None | Fetch student roster for visual login |
| POST | `/auth/student/login` | None | Student login → custom JWT |
| PATCH | `/auth/student/{id}/pin` | Teacher | Set/update student PIN |

### Classroom — `/api/v1/classroom`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/classroom/` | Teacher | Create classroom (memorable code, auto-section) |
| GET | `/classroom/` | Teacher | List own classrooms |
| GET | `/classroom/{id}` | Teacher | Detail + full student roster |
| PATCH | `/classroom/{id}` | Teacher | Update classroom (current_week_topic, legacy) |
| DELETE | `/classroom/{id}` | Teacher | Delete if 0 students |
| POST | `/classroom/{id}/students/bulk` | Teacher | Bulk add by name list |
| POST | `/classroom/{id}/students/bulk-v2` | Teacher | Bulk add with name+roll+email |
| DELETE | `/classroom/{id}/students/{sid}` | Teacher | Remove student |
| PATCH | `/classroom/{id}/students/{sid}` | Teacher | Update student name/roll/email |
| GET | `/classroom/{id}/active-topics` | Teacher | Get active SNC topics for classroom |
| PUT | `/classroom/{id}/active-topics` | Teacher | Set active SNC topics (delete-then-insert) |
| GET | `/classroom/{id}/syllabus` | Teacher | 30-week pacing calendar (legacy) |
| PATCH | `/classroom/{id}/syllabus/{week}` | Teacher | Update week status (legacy) |

### Topics — `/api/v1/topics`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/topics?grade_level={1-5}` | None | List all SNC topics for a grade |

### Curriculum — `/api/v1/curriculum`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/curriculum/upload` | Teacher | Upload PDF → chunk → embed → store |
| GET | `/curriculum/uploads` | Teacher | List upload history |
| POST | `/curriculum/embed` | Teacher | Re-embed pre-chunked text |

### Missions — `/api/v1/missions`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/missions/daily` | Student | Generate 3 daily questions (RAG-grounded, topic-aware) |
| POST | `/missions/complete` | Student | Record answer, award 10 pts if correct |
| GET | `/missions/me` | Student | Student profile + points + missions_completed |
| GET | `/missions/pillar?pillar=reading` | Student | Generate 10 pillar questions (active topics + weakness-weighted) |
| GET | `/missions/leaderboard` | Student | Class leaderboard sorted by points |
| GET | `/missions/weekly-progress` | Student | 4-pillar progress (7-day rolling window) |

### Chat — `/api/v1/chat`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/chat` | Student | Bilingual RAG chat (Roman Urdu → translate → RAG → bilingual reply) |

### Evaluator — `/api/v1/evaluator`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/evaluator/report/teacher` | Teacher | All classrooms + students + interaction stats |
| GET | `/evaluator/report/student/{id}` | Teacher | Per-student AI insight report |

### Interactions — `/api/v1/interactions`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/interactions` | Student | Batch-log 10 pillar mission results |

### Rewards — `/api/v1/rewards`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/rewards/daily-chest` | Student | Claim daily chest (anti-cheat: once per day) |
| GET | `/rewards/daily-chest/status` | Student | Check if chest claimed today |

### Speaking — `/api/v1/speaking`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/speaking/evaluate` | Student | Evaluate spoken transcript (LLM scoring) |

### Spelling Bee — `/api/v1/spelling-bee`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/spelling-bee/word` | Student | Get a grade-appropriate word to spell |
| POST | `/spelling-bee/check` | Student | Check spelling attempt |

### Story Time — `/api/v1/story-time`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/story-time/story` | Student | Generate an LLM story for grade level |
| POST | `/story-time/answer` | Student | Check comprehension question answer |

### Announcements — `/api/v1/announcements`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/announcements/` | Teacher | Create bilingual announcement |
| GET | `/announcements/` | Teacher/Student | List announcements (scoped) |

---

## 7. Database Schema (Key Tables)

### `teachers`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
email TEXT UNIQUE NOT NULL
full_name TEXT
created_at TIMESTAMPTZ DEFAULT now()
-- RLS: teachers can only read/update their own row
```

### `classrooms`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
teacher_id UUID REFERENCES teachers(id)
class_name TEXT NOT NULL
class_code VARCHAR(6) UNIQUE    -- Auto-generated memorable code (e.g. "3A-PRM")
grade_level INTEGER NOT NULL    -- 1–5
section TEXT                    -- A, B, C etc.
current_week_topic VARCHAR(500) -- Legacy; now replaced by active_topics system
created_at TIMESTAMPTZ DEFAULT now()
```

### `students`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
classroom_id UUID REFERENCES classrooms(id)
student_name TEXT NOT NULL
avatar_url TEXT
avatar_style TEXT DEFAULT 'adventurer'
theme_color TEXT DEFAULT '#6366f1'
secret_pin VARCHAR(4)           -- 4-digit PIN for login
roll_number VARCHAR(20)         -- Optional school roll number
email VARCHAR(255)              -- Optional
points INTEGER DEFAULT 0
missions_completed INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT now()
-- NOT a Supabase Auth user — custom JWT system only
```

### `snc_knowledge_base`
```sql
id BIGSERIAL PRIMARY KEY
content TEXT NOT NULL           -- Raw chunk text
embedding VECTOR(384)           -- all-MiniLM-L6-v2 embeddings (NOT 1536)
metadata JSONB                  -- {grade_level, book_title, chunk_id, topic_id?, topic_name?}
-- HNSW index on embedding (vector_cosine_ops)
-- GIN index on metadata (pre-filter by grade before vector math)
```

### `snc_uploads` (upload history)
```sql
id UUID PRIMARY KEY
teacher_id UUID REFERENCES teachers(id)
book_title TEXT
grade_level INTEGER
filename TEXT
total_chunks INTEGER
embedded_count INTEGER
created_at TIMESTAMPTZ DEFAULT now()
```

### `snc_topics` (NEW — 2026-04-29)
```sql
id SERIAL PRIMARY KEY
grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 5)
topic_name TEXT NOT NULL
-- Grade 1: Phonics, Colors, Numbers, Animals, Family, Body Parts, Greetings
-- Grade 2: Nouns, Verbs, Adjectives, Food & Drink, Community, Simple Sentences, Rhyming
-- Grade 3: Prepositions, Tenses, Reading Comprehension, Vocabulary, Punctuation, Story Sequencing
-- Grade 4: Grammar, Composition, Idioms, Letter Writing, Synonyms & Antonyms, Paragraphs
-- Grade 5: Complex Sentences, Literature, Technical Vocabulary, Essay Writing, Figurative Language, Debate
-- RLS: SELECT for all (public reference data)
```

### `classroom_active_topics` (NEW — 2026-04-29)
```sql
classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE
topic_id INTEGER REFERENCES snc_topics(id) ON DELETE CASCADE
PRIMARY KEY (classroom_id, topic_id)
-- IMPORTANT: If NO rows exist for a classroom → treat ALL grade topics as active (default)
-- A row is only inserted when teacher explicitly saves a selection
-- RLS: teacher owns the classroom
```

### `student_interactions`
```sql
id UUID PRIMARY KEY
student_id UUID REFERENCES students(id)
classroom_id UUID REFERENCES classrooms(id)
grade_level INTEGER
interaction_type TEXT CHECK (IN ('chat','mission_mc','mission_fill','spelling_bee','speaking'))
original_message TEXT
translated_message TEXT
correct BOOLEAN
context_used BOOLEAN
pillar TEXT                     -- reading/writing/listening/speaking
created_at TIMESTAMPTZ DEFAULT now()
```

### `daily_rewards`
```sql
id UUID PRIMARY KEY
student_id UUID REFERENCES students(id)
reward_date DATE NOT NULL
points_awarded INTEGER
created_at TIMESTAMPTZ DEFAULT now()
UNIQUE(student_id, reward_date)  -- Anti-cheat: one chest per student per day
```

---

## 8. Feature Completion Status

| Feature | Status | Key files |
|---|---|---|
| Auth (teacher GoTrue + student custom JWT) | ✅ Complete | `auth.py`, `security.py`, `student/play/` |
| Classroom Manager (CRUD + bulk students + PIN) | ✅ Complete | `classroom.py`, `classroom/[id]/page.tsx` |
| SNC Document Ingestion (PDF → chunks) | ✅ Complete | `ingestion.py`, `curriculum.py` |
| Vector Storage & RAG Retrieval (pgvector) | ✅ Complete | `embedder.py`, `snc_knowledge_base` |
| Guardrailed Tutor Chat | ✅ Complete | `chatbot.py`, `chat.py` |
| Gamified Daily Missions (3 questions, points) | ✅ Complete | `mission_generator.py`, `missions.py` |
| Bilingual Chat (Roman Urdu ↔ English) | ✅ Complete | `chatbot.py` translate step |
| Interaction Logger (BackgroundTasks) | ✅ Complete | `interaction_logger.py` |
| NLP Evaluator + Teacher Reports | ✅ Complete | `nlp_evaluator.py`, `evaluator.py` |
| 4-Pillar Kahoot LMS (15s timer) | ✅ Complete | `MissionGameplay.tsx`, `/missions/[pillar]` |
| Student Leaderboard | ✅ Complete | `/missions/leaderboard`, `leaderboard/page.tsx` |
| Weekly Quests Progress | ✅ Complete | `/missions/weekly-progress`, `quests/page.tsx` |
| Spelling Bee | ✅ Complete | `spelling_bee.py`, `spelling-bee/page.tsx` |
| Story Time | ✅ Complete | `story_time.py`, `story-time/page.tsx` |
| Speaking Practice | ✅ Complete | `speaking.py`, `speaking/page.tsx` |
| Upload History | ✅ Complete | `snc_uploads` table, `curriculum/page.tsx` |
| Avatar Customization | ✅ Complete | `AvatarCustomizeModal.tsx`, avatar columns |
| Secret PIN Login | ✅ Complete | `pin-entry.tsx`, `PATCH /auth/student/{id}/pin` |
| Global Analytics Dashboard | ✅ Complete | `analytics/page.tsx`, `AnalyticsBy*.tsx` |
| Student Report Cards + PDF Export | ✅ Complete | `students/[id]/report/page.tsx`, jspdf |
| Admin Role System | ✅ Complete | `admin/` routes, `admin.py`, `014_admin_roles.sql` |
| Daily Chest (Loot Box) | ✅ Complete | `DailyChestModal.tsx`, `rewards.py` |
| Evolving Worlds (Dynamic Backgrounds) | ✅ Complete | `DynamicBackground.tsx`, `AnimatedBackground.tsx` |
| Bilingual Announcements | ✅ Complete | `announcements.py`, `announcements/page.tsx` |
| **Shared Curriculum KB + Active Topics** | ✅ Complete | See §9 below |

---

## 9. Latest Feature — Shared Curriculum Knowledge Base (2026-04-29)

### What it replaces
The old system used a free-text `current_week_topic` field per classroom (e.g., "Week 2: Past Tense"). Teachers typed arbitrary text, the LLM used it loosely. No structure.

### What it does now
- **Global predefined SNC topics** (Grade 1–5, ~6–7 topics each) stored in `snc_topics` table
- **Per-classroom topic activation** via `classroom_active_topics` junction table
- **Default = all active**: if no rows exist for a classroom → all grade topics are treated as active
- **Mission generation** now resolves active topics → builds topic-aware seed phrase → injects into LLM prompt
- **Upload tagging**: teachers can tag uploaded PDFs to a specific topic for better vector retrieval

### Data flow
```
Teacher toggles topic pills → PUT /classroom/{id}/active-topics → DB saved

Student requests missions:
  GET /missions/daily
    → resolve classroom.grade_level
    → get_active_topics(classroom_id, grade_level)  ← returns all grade topics if none saved
    → active_topic_names = ["Phonics", "Colors", ...]
    → topics_hash = hash(sorted(active_topic_names))
    → cache_key = "daily_missions:{classroom_id}:{is_frustrated}:{topics_hash}"
    → seed_phrase = "English topics: Phonics, Colors, ..."
    → retrieve_grade_filtered_chunks(seed_phrase, grade_level)
    → generate_daily_missions(grade_level, chunks, active_topics)
    → LLM prompt: "ACTIVE TOPICS: generate STRICTLY based on these: Phonics, Colors"
```

### Files changed
- `supabase/migrations/023_snc_topics_and_active_topics.sql` — tables + seed + RLS
- `backend/app/api/v1/endpoints/topics.py` — GET /topics endpoint
- `backend/app/api/v1/endpoints/classroom.py` — get_active_topics(), save_active_topics(), GET/PUT endpoints
- `backend/app/api/v1/endpoints/missions.py` — daily + pillar topic resolution, topics_hash cache key
- `backend/app/agents/tutor_agent/mission_generator.py` — active_topics param + prompt injection
- `frontend/types/index.ts` — SncTopic interface
- `frontend/app/teacher/classroom/[id]/page.tsx` — pill toggle UI replaces free-text field
- `frontend/components/teacher/UploadBookModal.tsx` — optional topic dropdown
- `frontend/app/teacher/curriculum/page.tsx` — fetches topics on upload open

### `SncTopic` TypeScript type
```typescript
export interface SncTopic {
  id: number;
  grade_level: number;
  topic_name: string;
}
```

---

## 10. Key Architecture Decisions

### Authentication — Two completely separate systems
- **Teachers**: Supabase GoTrue → standard JWT → validated via `supabase.auth.get_user(token)` in `get_current_teacher()` dependency
- **Students**: Custom PyJWT HS256 → `STUDENT_JWT_SECRET` → validated via `decode_student_token()` in `get_current_student()` dependency
- Student tokens contain: `sub` (student UUID), `classroom_id`, `name`, `avatar_url`
- Never mix these. A teacher token will fail student endpoints and vice versa.

### Grade-level guardrail — enforced at 3 layers
1. **SQL RPC**: `WHERE (metadata->>'grade_level')::int = grade_level_filter` runs BEFORE cosine distance
2. **Endpoint logic**: `grade_level` is always fetched from DB server-side, never from request body
3. **LLM system prompt**: "Use ONLY Grade {grade_level} vocabulary"

### correct_answer security
- `MissionQuestionOut` Pydantic model structurally omits `correct_answer` — it cannot leak
- Server trusts `question_correct: bool` from client (thesis prototype engagement model)

### Caching strategy
- Daily missions: 1 hour TTL, key = `daily_missions:{classroom_id}:{is_frustrated}:{topics_hash}`
- Pillar missions: 1 hour TTL, key = `pillar_missions:{student_id}:{pillar}:{is_frustrated}:{topics_hash}`
- Leaderboard: 10 min TTL
- Student profile: 5 min TTL
- `topics_hash` invalidates cache when teacher changes active topics
- Cache is in-memory dict (`cache.py`) — no Redis required, resets on server restart

### RAG pipeline
1. Teacher uploads PDF → `PyMuPDFLoader` extract → `RecursiveCharacterTextSplitter` chunk (1000 chars, 200 overlap) → `all-MiniLM-L6-v2` embed (384-dim) → insert to `snc_knowledge_base`
2. Student requests missions → build seed phrase from active topics → embed seed → `match_snc_documents` RPC (grade-filtered cosine search) → top-5 chunks → LLM
3. Student chats → translate Roman Urdu to English → embed → grade-filtered retrieval → guardrailed bilingual LLM

### Affective Filter / Confidence Builder
- If `is_frustrated=True` (3 consecutive wrong answers in frontend), endpoint passes this to LLM
- LLM generates easier questions with encouragement, lower grade-level vocabulary
- Frustrated sessions skip cache (fresh questions each time)

### Interaction logging
- All student activity logged via `BackgroundTasks` → never blocks response
- `log_interaction()` is synchronous (Supabase client is sync) — runs in thread pool
- Silently swallows all exceptions — logging failure never crashes student experience

---

## 11. Known Issues / Technical Debt

### ⚠️ 18 Failing Tests (as of 2026-04-29)
The `active_topics` signature change in `mission_generator.py` broke tests that still pass `current_week_topic`. Files to fix:
- `backend/tests/test_pillar_missions.py` — 8 failing (uses old `current_week_topic` param)
- `backend/tests/test_missions.py` — 3 failing (mock for `generate_daily_missions` missing `active_topics`)
- `backend/tests/test_chat.py` — 3 failing (RPC mock structure changed)
- `backend/tests/test_classroom.py` — 1 failing (classroom creation test)

To fix: update mock calls to pass `active_topics=["General English"]` instead of `current_week_topic`.

### Legacy route groups
Both `frontend/app/(teacher)/` and `frontend/app/teacher/` exist. The canonical routes are `app/teacher/` and `app/student/`. The `(teacher)` / `(student)` / `(auth)` groups are legacy and being phased out. Don't add new pages to the route groups.

### `classroom_syllabus` table
Kept in DB for data safety but the 30-week UI entry point was removed. The `GET/PATCH /classroom/{id}/syllabus` endpoints still exist but are no longer linked from the UI.

### `DATABASE_URL` and `QDRANT_URL` in config
Both env vars exist but are not actively used — Supabase handles the DB directly via the Python client, and Qdrant is not wired up (pgvector is used instead).

---

## 12. Frontend Routing — Canonical URLs

| Page | URL | Auth required |
|---|---|---|
| Teacher login | `/teacher/login` | None |
| Teacher dashboard | `/teacher/dashboard` | Teacher session |
| Classroom list | `/teacher/classroom` | Teacher session |
| Classroom detail | `/teacher/classroom/{id}` | Teacher session |
| Curriculum Hub | `/teacher/curriculum` | Teacher session |
| Analytics | `/teacher/analytics` | Teacher session |
| Student directory | `/teacher/students` | Teacher session |
| Student report | `/teacher/students/{id}/report` | Teacher session |
| Announcements | `/teacher/announcements` | Teacher session |
| Admin login | `/admin/login` | None |
| Admin dashboard | `/admin/dashboard` | Admin session |
| Student class code entry | `/student/play` | None |
| Student avatar select | `/student/play` (step 2) | None |
| Student PIN entry | `/student/play/pin-entry` | None |
| Student home | `/student/home` | Student JWT |
| Missions dashboard | `/student/missions` | Student JWT |
| Pillar gameplay | `/student/missions/{pillar}` | Student JWT |
| Chat | `/student/chat` | Student JWT |
| Quests | `/student/quests` | Student JWT |
| Leaderboard | `/student/leaderboard` | Student JWT |
| Speaking | `/student/speaking` | Student JWT |
| Spelling Bee | `/student/spelling-bee` | Student JWT |
| Story Time | `/student/story-time` | Student JWT |

---

## 13. Common Patterns

### Getting teacher auth in frontend
```typescript
import { getTeacherHeaders } from "@/lib/teacherAuth";
const headers = await getTeacherHeaders();
const data = await apiFetch<SomeType>("/endpoint", { headers });
```

### Getting student auth in frontend
Student JWT is stored in `localStorage["primepal_student_token"]`. The student `layout.tsx` reads it and injects into requests.

### Backend: protect endpoint for teacher
```python
from app.core.security import get_current_teacher
@router.get("/path")
async def my_endpoint(teacher: dict = Depends(get_current_teacher)):
    teacher_id = teacher["id"]
```

### Backend: protect endpoint for student
```python
from app.core.security import get_current_student
@router.get("/path")
async def my_endpoint(student: dict = Depends(get_current_student)):
    student_id = student["sub"]
    classroom_id = student["classroom_id"]
```

### Backend: get supabase admin client (bypasses RLS)
```python
from app.core.supabase_client import get_supabase_admin
supabase = get_supabase_admin()
```

### Backend: log interaction in background
```python
from fastapi import BackgroundTasks
from app.agents.evaluator_agent.interaction_logger import log_interaction
async def endpoint(background_tasks: BackgroundTasks, ...):
    background_tasks.add_task(log_interaction, student_id=..., ...)
```

### Adding a new backend endpoint
1. Create `backend/app/api/v1/endpoints/myfeature.py` with `router = APIRouter()`
2. Import and register in `backend/app/api/v1/router.py`
3. Add tests in `backend/tests/test_myfeature.py`

### Adding a new migration
1. Create `supabase/migrations/NNN_description.sql` (next number in sequence)
2. Run it manually in Supabase SQL Editor
3. Commit the file

---

## 14. Thesis Context

- **Researcher**: Iqra Muzaffar, MS AI student
- **Topic**: Adaptive AI tutoring for ESL in Pakistani primary schools (Grades 1–5)
- **Key research claims the system demonstrates**:
  1. SNC-grounded RAG prevents out-of-curriculum vocabulary (Curriculum Guardrail)
  2. Affective Filter management (Confidence Builder mode when student is frustrated)
  3. Adaptive learning via weakness-weighted question generation
  4. Multi-modal LSRW skill coverage
  5. Bilingual support for Roman Urdu ↔ English code-switching
- **Deployment**: Not yet deployed (targeting Vercel for frontend, Railway/Render for backend)
- **SNC**: Single National Curriculum — the standardized Pakistani primary school curriculum
