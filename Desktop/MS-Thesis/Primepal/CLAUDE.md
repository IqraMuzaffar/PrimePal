# CLAUDE.md — PrimePal

## Project

PrimePal is an AI-powered ESL education platform for Pakistani primary school students. Three-agent architecture (Curriculum Guardrail, Tutor, Evaluator) with a Next.js 14 frontend and FastAPI backend on Supabase.

## Documentation

Hierarchical documentation lives in `DOCUMENTATION/` with index files at each level:

```
DOCUMENTATION/
├── index.md                    ← Start here: project overview, tech stack, quick start
├── architecture/
│   ├── index.md                ← System design, high-level diagram
│   ├── auth-flows.md           ← Dual auth: Supabase GoTrue + custom PyJWT
│   ├── agent-system.md         ← Three-agent architecture details
│   └── data-flow.md            ← Request lifecycles (missions, curriculum, chat, points)
├── backend/
│   ├── index.md                ← FastAPI app structure, key patterns
│   ├── endpoints/
│   │   ├── index.md            ← All 14 endpoint modules with route/auth summary
│   │   └── {auth,classroom,missions,speaking,...}.md  ← Per-endpoint details
│   ├── agents/
│   │   └── index.md            ← Agent A/B/C implementations
│   └── core/
│       ├── index.md            ← Core module listing
│       └── {config,security,supabase-client,cache}.md
├── frontend/
│   ├── index.md                ← Next.js structure, key patterns
│   ├── pages/
│   │   └── index.md            ← All routes by role (student/teacher/admin)
│   ├── components/
│   │   └── index.md            ← Student + teacher component catalog
│   └── lib/
│       ├── index.md            ← Utility module listing
│       ├── api.md              ← apiFetch usage and when NOT to use it
│       └── auth.md             ← Teacher, student, admin auth helpers
├── database/
│   ├── index.md                ← Table overview, pgvector setup
│   ├── tables.md               ← All tables with column definitions
│   ├── migrations.md           ← Migration index (001-025)
│   └── rls-policies.md         ← Row Level Security overview
├── api-reference/
│   └── index.md                ← Complete endpoint listing (method, path, auth)
└── deployment/
    ├── index.md                ← Deploy architecture, quick deploy steps
    ├── environment-variables.md ← All env vars for backend + frontend
    ├── docker.md               ← Docker Compose setup
    └── production-checklist.md  ← Pre-deploy checklist (linked to TICKETS/)
```

Navigation: every `index.md` summarizes its children so you can hop levels without loading everything.

## Audit Tracking

Pre-ship audit tickets live in `TICKETS/`. See `TICKETS/00-OVERVIEW.md` for status. Tickets 02, 04, 06, 08 are complete. Tickets 01 (partial), 03, 05, 07 need discussion.

## Key Architecture Facts

- **Two separate auth systems** — Teachers: Supabase GoTrue. Students: custom PyJWT. Never mix.
- **All DB access via Supabase client** — No SQLAlchemy ORM usage. `get_supabase()` for user-scoped, `get_supabase_admin()` for service-role.
- **Redis caches LLM outputs** — Missions, stories, spelling words are cached to reduce OpenAI spend.
- **Frontend API calls** — Use `apiFetch()` from `lib/api.ts` for teacher endpoints. Student endpoints use raw fetch with localStorage JWT. FormData uploads use raw fetch.

## Commands

```bash
# Backend
cd backend && uvicorn app.main:app --reload
cd backend && pytest

# Frontend
cd frontend && npm run dev
cd frontend && npm run build

# Docker
docker-compose up -d
```
