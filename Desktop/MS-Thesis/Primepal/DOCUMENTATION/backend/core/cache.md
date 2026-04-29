# Cache (Redis)

**File:** `backend/app/core/cache.py`

Redis-based caching for expensive LLM-generated content.

## Lifecycle
- `init_redis(url)` — Called during app lifespan startup
- `close_redis()` — Called during app lifespan shutdown

## What Gets Cached
- Daily mission questions (keyed by student + date, TTL: 24h)
- Story time stories (keyed by student + grade, TTL varies)
- Spelling bee word sets
- Speaking prompts

## Purpose
Each LLM call costs real money (OpenAI API). Caching ensures a student refreshing the page doesn't trigger a new LLM call. Typical cache key pattern: `missions:{student_id}:{date}`.
