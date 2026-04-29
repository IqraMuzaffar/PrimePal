# Architecture

This section covers PrimePal's system design, authentication flows, and data architecture.

## Subsections

| File | Description |
|------|-------------|
| [auth-flows.md](auth-flows.md) | Dual auth system: Supabase GoTrue (teachers/admin) + custom PyJWT (students) |
| [agent-system.md](agent-system.md) | Three-agent architecture and how they interact |
| [data-flow.md](data-flow.md) | Request lifecycle from frontend to database and back |

## High-Level Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Next.js Frontend  │     │   Admin Panel        │
│   (Student + Teacher)│     │   (/admin/*)         │
└────────┬────────────┘     └────────┬────────────┘
         │ HTTPS                      │ HTTPS
         ▼                            ▼
┌─────────────────────────────────────────────────┐
│              FastAPI Backend (:8000)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Agent A  │  │ Agent B  │  │   Agent C    │  │
│  │Curriculum│  │  Tutor   │  │  Evaluator   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │          │
│       ▼              ▼               ▼          │
│  ┌──────────────────────────────────────────┐   │
│  │         OpenAI API (gpt-4o-mini)         │   │
│  │         + Whisper + Embeddings           │   │
│  └──────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌──────────┐  ┌──────────┐  ┌────────┐
│ Supabase │  │ pgvector │  │ Redis  │
│PostgreSQL│  │(vectors) │  │(cache) │
└──────────┘  └──────────┘  └────────┘
```

## Key Design Decisions

1. **Dual auth** — Teachers use Supabase GoTrue (standard OAuth). Students use custom PyJWT because they are "ghost profiles" without real email addresses.
2. **Supabase over raw PostgreSQL** — RLS policies enforce data isolation per teacher. Service role key bypasses RLS only for server-side admin operations.
3. **pgvector over external vector DB** — Keeps everything in one Supabase instance. SNC curriculum embeddings use `VECTOR(1536)` with HNSW indexing.
4. **OpenAI gpt-4o-mini** — 90% cheaper than gpt-4o, sufficient for primary school English content.
5. **Redis** — Caches expensive LLM responses (mission generation, story generation) to reduce OpenAI costs and latency.
