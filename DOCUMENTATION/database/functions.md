# SQL Functions, RPCs & Triggers

## RPC Functions

### `match_snc_documents`

**Source**: Migration 005 (created with VECTOR(1536)), migration 008 (recreated with VECTOR(384))

Grade-filtered cosine similarity search over the `snc_knowledge_base` table. Used by the tutor chatbot to retrieve relevant curriculum chunks for a student's grade level.

```sql
CREATE OR REPLACE FUNCTION match_snc_documents(
    query_embedding    VECTOR(384),
    grade_level_filter INT,
    match_count        INT DEFAULT 5
)
RETURNS TABLE (
    id          UUID,
    content     TEXT,
    metadata    JSONB,
    similarity  FLOAT
)
LANGUAGE plpgsql
```

**Parameters**:
- `query_embedding` -- 384-dimensional vector from MiniLM (all-MiniLM-L6-v2) embedding of the search query
- `grade_level_filter` -- Integer (1-5), filters results by `metadata->>'grade_level'` BEFORE vector math
- `match_count` -- Maximum number of results to return (default 5)

**Returns**: Rows ordered by cosine similarity (most relevant first). Similarity is computed as `1 - (embedding <=> query_embedding)`, where `<=>` is pgvector's cosine distance operator.

**Logic**:
1. Filters `snc_knowledge_base` rows where `metadata->>'grade_level'` matches `grade_level_filter`
2. Orders by cosine distance (ascending = most similar first)
3. Limits to `match_count` rows
4. Returns similarity score (0-1, higher = more similar)

**Permissions**: `GRANT EXECUTE ON FUNCTION match_snc_documents TO authenticated;`

**Called by**: `backend/app/agents/tutor_agent/chatbot.py` via `supabase.rpc("match_snc_documents", ...)`

---

## Trigger Functions

### `generate_class_code()`

**Source**: Migration 002

Automatically generates a unique 6-character uppercase hexadecimal class code for new classrooms on INSERT.

```sql
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
```

**Trigger**: `set_class_code` -- `BEFORE INSERT ON classrooms FOR EACH ROW EXECUTE FUNCTION generate_class_code()`

**Security**: `SECURITY DEFINER` -- runs with the privileges of the function owner, bypassing RLS. This is necessary to query the full `classrooms` table for uniqueness checking (RLS would otherwise limit visibility to the caller's own rows, allowing duplicate codes across teachers).

**Logic**:
1. If `NEW.class_code` is already set (non-NULL, non-empty), honours the caller's value
2. Otherwise, loops up to 100 attempts:
   - Generates a candidate: `upper(substring(md5(random()::text) from 1 for 6))`
   - Checks if the code already exists in `classrooms`
   - If unique, assigns it and exits the loop
3. Raises exception if no unique code found after 100 attempts

---

## Function Summary

| Function | Type | Language | Source Migration | Purpose |
|----------|------|----------|-----------------|---------|
| `match_snc_documents(VECTOR(384), INT, INT)` | RPC | plpgsql | 005 (created), 008 (updated to 384-dim) | Grade-filtered vector similarity search for RAG |
| `generate_class_code()` | Trigger | plpgsql | 002 | Auto-generate unique 6-char hex class codes on classroom INSERT |

## Notes

- The `get_student_achievement_stats` RPC referenced in the achievements endpoint is not defined in any migration file. It may be created via the Supabase dashboard or a manual SQL execution.
- All functions use `plpgsql` (PL/pgSQL procedural language).
- `match_snc_documents` was originally created with `VECTOR(1536)` for OpenAI embeddings and was replaced with `VECTOR(384)` when the project switched to MiniLM (sentence-transformers/all-MiniLM-L6-v2) in migration 008.
