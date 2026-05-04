# Backend

The backend is a **FastAPI** application serving the PrimePal API at `/api/v1`. It orchestrates three AI agents (Curriculum Guardrail, Tutor, Evaluator), manages dual authentication (Supabase GoTrue for teachers, custom PyJWT for students), and interfaces with Supabase (PostgreSQL + pgvector) and Redis.

## Subsections

| Section | Description |
|---------|-------------|
| [endpoints/](endpoints/index.md) | All 16 API endpoint modules with route details |
| [agents/](agents/index.md) | AI agent implementations (curriculum, tutor, evaluator) |
| [core/](core/index.md) | Config, security, Supabase client, Redis cache, permissions |
| [utils/](utils/index.md) | Utility modules: pronunciation, streaks, code generation, performance profiling |
| [schemas/](schemas/index.md) | Shared Pydantic models (classroom, topic) |
| [models/](models/index.md) | Models directory (currently empty `__init__.py` after dead code cleanup) |
| [tests/](tests/index.md) | pytest + httpx async test suite (13 test files, 80+ test cases) |

## Directory Structure

```
backend/
├── app/
│   ├── main.py                  -> App entrypoint, CORS, lifespan (Redis init/shutdown)
│   ├── core/
│   │   ├── config.py            -> pydantic-settings (reads .env)
│   │   ├── security.py          -> JWT creation/validation for both teacher + student
│   │   ├── supabase_client.py   -> get_supabase() / get_supabase_admin()
│   │   ├── cache.py             -> Redis init/close + cache helpers
│   │   └── permissions.py       -> Role-based permission checking (admin vs teacher)
│   ├── api/v1/
│   │   ├── router.py            -> Wires all 16 endpoint routers
│   │   └── endpoints/           -> 16 endpoint modules (see endpoints/index.md)
│   ├── agents/
│   │   ├── curriculum_agent/    -> Agent A: ingestion + embedder
│   │   ├── tutor_agent/         -> Agent B: mission generator + chatbot
│   │   └── evaluator_agent/     -> Agent C: interaction logger + NLP evaluator
│   ├── schemas/                 -> Shared Pydantic models (topic.py, classroom.py)
│   ├── models/                  -> (Empty __init__.py after dead code cleanup)
│   └── utils/                   -> pronunciation, code_generation, streak, performance_profile
├── tests/                       -> pytest + httpx async tests (13 test files)
├── requirements.txt             -> Python dependencies
├── Dockerfile                   -> Production container image
└── .env                         -> Environment variables (not committed)
```

## Entrypoint: `main.py`

**File:** `backend/app/main.py`

The FastAPI app is created with an async `lifespan` context manager that manages the Redis connection pool:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis("redis://localhost:6379")
    yield
    await close_redis()

app = FastAPI(
    title="PrimePal API",
    description="AI-powered English language learning platform for Pakistani primary students",
    version="0.1.0",
    lifespan=lifespan,
)
```

**CORS** is configured via `settings.ALLOWED_ORIGINS` using `CORSMiddleware`:
- `allow_origins` = `settings.ALLOWED_ORIGINS` (default: `["http://localhost:3000"]`)
- `allow_credentials=True`
- `allow_methods=["*"]`
- `allow_headers=["*"]`

**Logging** is configured at `DEBUG` level via `logging.basicConfig(level=logging.DEBUG)`.

All API routes are mounted from `api_router` at prefix `/api/v1`:
```python
app.include_router(api_router, prefix="/api/v1")
```

A health check endpoint exists at:
```
GET /health  ->  {"status": "ok", "service": "primepal-api"}
```

## Router Wiring: `api/v1/router.py`

The `api_router` includes 16 endpoint routers:

| Router Import | Prefix | Tag |
|---------------|--------|-----|
| `achievements` | `/achievements` | achievements |
| `admin` | (none -- uses own prefix) | admin |
| `announcements` | `/announcements` | announcements |
| `auth` | `/auth` | auth |
| `classroom` | `/classroom` | classroom |
| `curriculum` | `/curriculum` | curriculum |
| `chat` | `/chat` | chat |
| `topics` | `/topics` | topics |
| `evaluations` | `/evaluations` | evaluations |
| `evaluator` | `/evaluator` | evaluator |
| `missions` | `/missions` | missions |
| `rewards` | `/rewards` | rewards |
| `interactions` | `/interactions` | interactions |
| `spelling_bee` | `/spelling-bee` | spelling-bee |
| `story_time` | `/story-time` | story-time |
| `speaking` | `/speaking` | speaking |

Note: The `admin` router does not receive a prefix from `api_router` -- it defines its own route prefixes internally.

## Key Patterns

- **Supabase as primary DB** -- All data access uses the Supabase Python client (`supabase-py`), not SQLAlchemy ORM. Tables are accessed via `.table("name").select()/insert()/update()/delete()` chains.
- **Two Supabase clients** -- `get_supabase()` returns the anon-key client (respects RLS). `get_supabase_admin()` returns the service-role client (bypasses RLS for server-side operations). Both are `@lru_cache(maxsize=1)` singletons.
- **Dual auth system** -- Teachers use Supabase GoTrue JWTs validated via `supabase.auth.get_user()`. Students use custom HS256 JWTs signed with `STUDENT_JWT_SECRET`. Never mix these. See [core/security.md](core/security.md).
- **Role-based permissions** -- Admin vs teacher permission checks via `check_permission()`. Admin has wildcard `"*"` access. See [core/permissions.md](core/permissions.md).
- **BackgroundTasks for logging** -- Interaction logging happens after the response is sent via FastAPI's `BackgroundTasks` so it never adds latency to student-facing responses.
- **Redis caching** -- LLM-generated content (missions, stories, spelling words) is cached to reduce OpenAI API costs. Various TTLs: performance profiles (1hr), teacher roles (1hr), leaderboard (2min). See [core/cache.md](core/cache.md).
- **Grade-level guardrail** -- Grade is always resolved server-side from the student's JWT `classroom_id` -> classroom DB record. The client cannot supply or override it.
- **Structured LLM output** -- LangChain's `ChatOpenAI.with_structured_output()` is used for type-safe LLM responses (missions, reports, tutor replies).
- **Correct answers stripped** -- Mission endpoints strip `correct_answer` from responses before sending to the client. The client sends `question_correct: bool` back (trusted in thesis prototype).
- **Affective Filter management** -- When a student is frustrated (3+ consecutive incorrect answers), the mission generator produces "Confidence Builder" questions with reduced difficulty.
