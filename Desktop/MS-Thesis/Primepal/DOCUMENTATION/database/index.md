# Database

PrimePal uses Supabase (PostgreSQL) with pgvector for vector storage. All schema changes are managed via SQL migration files.

## Subsections

| File | Description |
|------|-------------|
| [tables.md](tables.md) | All tables with column definitions |
| [migrations.md](migrations.md) | Migration file listing and what each does |
| [rls-policies.md](rls-policies.md) | Row Level Security policy overview |

## Key Tables

| Table | Purpose |
|-------|---------|
| `teachers` | Teacher accounts (linked to Supabase Auth) |
| `classrooms` | Class groups with auto-generated codes |
| `students` | Student ghost profiles (no real email) |
| `student_interactions` | All student-AI interaction logs |
| `snc_knowledge_base` | Vector embeddings of SNC curriculum (pgvector) |
| `snc_topics` | SNC topic metadata by grade |
| `snc_uploads` | Upload history for curriculum PDFs |
| `announcements` | Teacher announcements (bilingual) |
| `daily_rewards` | Daily chest claim tracking |
| `missions_completed` | Mission completion tracking |

## pgvector Setup

The `snc_knowledge_base` table stores curriculum embeddings:
- `embedding VECTOR(1536)` — OpenAI text-embedding-3-small output
- HNSW index with `vector_cosine_ops` for similarity search
- GIN index on `metadata` JSONB for grade-level pre-filtering

## Migration Location

All migrations live in `supabase/migrations/` and are numbered sequentially (001-025+).
