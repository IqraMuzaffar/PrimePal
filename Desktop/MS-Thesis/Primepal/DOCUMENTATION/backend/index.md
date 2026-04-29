# Backend

The backend is a FastAPI application serving the PrimePal API at `/api/v1`. It orchestrates three AI agents, manages authentication, and interfaces with Supabase (PostgreSQL + pgvector) and Redis.

## Subsections

| Section | Description |
|---------|-------------|
| [endpoints/](endpoints/index.md) | All API endpoint modules with route details |
| [agents/](agents/index.md) | AI agent implementations (curriculum, tutor, evaluator) |
| [core/](core/index.md) | Config, security, Supabase client, Redis cache |

## Directory Structure

```
backend/
├── app/
│   ├── main.py              → App entrypoint, CORS, lifespan (Redis init/shutdown)
│   ├── core/
│   │   ├── config.py        → pydantic-settings (reads .env)
│   │   ├── security.py      → JWT creation/validation for both teacher + student
│   │   ├── supabase_client.py → get_supabase() / get_supabase_admin()
│   │   └── cache.py         → Redis init/close + cache helpers
│   ├── api/v1/
│   │   ├── router.py        → Wires all endpoint routers
│   │   └── endpoints/       → 14 endpoint modules (see endpoints/index.md)
│   ├── agents/
│   │   ├── curriculum_agent/ → Agent A: ingestion + embedder
│   │   ├── tutor_agent/      → Agent B: mission generator + chatbot
│   │   └── evaluator_agent/  → Agent C: interaction logger + NLP evaluator
│   ├── schemas/              → Shared Pydantic models (topic.py, classroom.py)
│   ├── models/               → (Empty after dead code cleanup)
│   └── utils/                → pronunciation.py, code_generation.py
├── tests/                    → pytest + httpx async tests
├── requirements.txt          → Python dependencies
├── Dockerfile                → Production container image
└── .env                      → Environment variables (not committed)
```

## Entrypoint: main.py

The app initializes via a `lifespan` context manager that starts Redis on startup and closes it on shutdown. CORS is configured via `settings.ALLOWED_ORIGINS`. All routes are mounted under `/api/v1`.

## Key Patterns

- **Supabase as primary DB** — All data access uses the Supabase Python client, not SQLAlchemy ORM
- **Service role for admin ops** — `get_supabase_admin()` bypasses RLS for server-side operations
- **BackgroundTasks for logging** — Interaction logging happens after the response is sent
- **Redis caching** — LLM-generated content (missions, stories) is cached to reduce OpenAI API costs
