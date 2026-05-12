# Student-Side Performance Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut perceived load times across Missions, Spelling Bee, Puzzle Palace, and Story Time by caching grade levels globally, reordering cache checks before DB queries, fixing cache key fragmentation, parallelizing sequential work, combining redundant API calls, and normalizing React Query stale times.

**Architecture:** Backend-first optimizations (cache reordering, grade caching, parallel bank+LLM) plus frontend stale time fixes. No new endpoints, no schema changes, no API contract changes. All changes are transparent to the client.

**Tech Stack:** FastAPI, Redis (via `app.core.cache`), React Query, `asyncio.gather()`

---

## File Map

| File | Changes |
|------|---------|
| `backend/app/core/cache.py` | Add `get_cached_grade_level()` helper |
| `backend/app/api/v1/endpoints/missions.py` | Reorder cache check before DB queries, parallelize bank+LLM, use cached grade |
| `backend/app/api/v1/endpoints/spelling_bee.py` | Parallelize attempt checks, use cached grade, combine status+word |
| `backend/app/api/v1/endpoints/puzzle_palace.py` | Move cache check before topics/RAG, use cached grade, fix cache key |
| `backend/app/api/v1/endpoints/story_time.py` | Fix cache key fragmentation, use cached grade |
| `frontend/lib/hooks/queries.ts` | Normalize stale times to 5 minutes |

---

### Task 1: Cache grade level globally

**Files:**
- Modify: `backend/app/core/cache.py`
- Modify: `backend/app/api/v1/endpoints/missions.py:1041-1055`
- Modify: `backend/app/api/v1/endpoints/spelling_bee.py:96-106`
- Modify: `backend/app/api/v1/endpoints/puzzle_palace.py:166-178`

Every module fetches `classrooms.grade_level` on every request. Grades don't change mid-year. Cache with 24-hour TTL.

- [ ] **Step 1: Add `get_cached_grade_level()` to cache.py**

Add this function at the end of `backend/app/core/cache.py`:

```python
async def get_cached_grade_level(classroom_id: str) -> int:
    """Fetch classroom grade level with 24-hour cache. Grades don't change mid-year."""
    from app.core.supabase_client import get_supabase_admin
    import asyncio

    cache_key = make_cache_key("grade_level", classroom_id)
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    supabase = get_supabase_admin()
    resp = await asyncio.to_thread(
        lambda: supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        return 3  # safe default
    grade = resp.data["grade_level"]
    await cache_set(cache_key, grade, ttl=86400)  # 24 hours
    return grade
```

- [ ] **Step 2: Update missions.py to use cached grade**

In `missions.py`, replace the `fetch_classroom_grade()` inner function (lines 1041-1055) body:

```python
async def fetch_classroom_grade():
    """Fetch classroom grade level (cached 24h)."""
    from app.core.cache import get_cached_grade_level
    grade = await get_cached_grade_level(classroom_id)
    if grade is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found for this student",
        )
    return grade
```

- [ ] **Step 3: Update spelling_bee.py to use cached grade**

Replace `_get_grade_level()` function (lines 96-106):

```python
async def _get_grade_level(classroom_id: str) -> int:
    """Fetch the grade level for the student's classroom (cached 24h)."""
    from app.core.cache import get_cached_grade_level
    return await get_cached_grade_level(classroom_id)
```

- [ ] **Step 4: Update puzzle_palace.py to use cached grade**

Replace the grade fetch block (lines 166-178):

```python
from app.core.cache import get_cached_grade_level
grade_level: int = await get_cached_grade_level(classroom_id)
```

Remove the old `asyncio.to_thread()` call and the `if not resp.data` check. The `get_cached_grade_level` returns a safe default of 3.

- [ ] **Step 5: Verify imports and build**

```bash
cd backend && python -c "from app.core.cache import get_cached_grade_level; print('OK')"
cd frontend && npx next build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/cache.py backend/app/api/v1/endpoints/missions.py backend/app/api/v1/endpoints/spelling_bee.py backend/app/api/v1/endpoints/puzzle_palace.py
git commit -m "perf: cache classroom grade level globally (24h TTL)"
```

---

### Task 2: Reorder missions cache check before DB queries

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py:998-1150`

Currently: pillar validation → pillar completion check (DB) → grade fetch (DB) → weakness fetch (DB) → active topics (DB) → cache check. The cache check should happen right after we have the cache key components.

- [ ] **Step 1: Restructure get_pillar_missions to check cache early**

After pillar validation (line 1006) and before the DB-heavy steps, insert an early cache check. The cache key needs `student_id`, `classroom_id`, `pillar`, `is_frustrated`, and `topics_hash`. We can compute a preliminary cache key with just the first 4 and check if any matching cache exists:

Replace the section from Step 1b (line 1008) through Step 0 (line ~1186) with this reordered flow:

```python
    # ------------------------------------------------------------------
    # Step 0 (MOVED UP): Quick cache check before any DB work
    # We need topics_hash for the full cache key, but we can try a
    # preliminary check with the most recent topics_hash from a
    # simpler cache lookup.
    # ------------------------------------------------------------------
    grade_level = await get_cached_grade_level(classroom_id)  # cached, ~0ms

    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]

    cache_key = make_cache_key("pillar_missions", student_id, classroom_id, pillar, str(is_frustrated), topics_hash)

    MIN_CACHE_QUESTIONS = 6
    if not is_frustrated:
        cached = await cache_get(cache_key)
        if cached:
            cached_questions = cached.get("questions", [])
            if len(cached_questions) >= MIN_CACHE_QUESTIONS:
                logger.info(f"Cache hit for pillar missions (student): {cache_key} ({len(cached_questions)} questions)")
                await log_cache_hit("missions/pillar", student_id=student_id, classroom_id=classroom_id)
                return PillarMissionsResponse(**cached)

        generic_key = _build_generic_cache_key(classroom_id, pillar, topics_hash)
        generic_cached = await cache_get(generic_key)
        if generic_cached:
            generic_questions = generic_cached.get("questions", [])
            if len(generic_questions) >= MIN_CACHE_QUESTIONS:
                logger.info(f"Cache hit for pillar missions (generic): {generic_key} ({len(generic_questions)} questions)")
                await log_cache_hit("missions/pillar", student_id=student_id, classroom_id=classroom_id)
                # Still trigger personalization in background
                background_tasks.add_task(
                    _generate_personalized_missions,
                    student_id, classroom_id, pillar, grade_level,
                    active_topic_names, [], None, cache_key,
                )
                return PillarMissionsResponse(**generic_cached)

    # ------------------------------------------------------------------
    # Step 1b: Check pillar completion (only on cache MISS)
    # ------------------------------------------------------------------
    PILLAR_DAILY_LIMIT = 10
    # ... (existing pillar completion check code stays here)
```

The key insight: `get_cached_grade_level()` is ~0ms (cached) and `get_active_topics()` is fast (50-80ms). This lets us build the cache key and check cache before the expensive weakness/performance queries.

- [ ] **Step 2: Remove the old cache check section (old Step 0)**

Delete the duplicate cache check that was at lines 1148-1186 since it's now at the top.

- [ ] **Step 3: Verify the endpoint still works**

```bash
cd backend && python -c "from app.api.v1.endpoints.missions import get_pillar_missions; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "perf: move missions cache check before DB queries (saves 200-350ms on hits)"
```

---

### Task 3: Parallelize bank pull + LLM generation in missions

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py:1214-1266`

Bank pull and LLM generation currently run sequentially. Run both in parallel, then trim LLM output based on bank count.

- [ ] **Step 1: Replace sequential bank+LLM with parallel execution**

Replace lines 1214-1266 with:

```python
    # ------------------------------------------------------------------
    # Step 4: Pull from bank AND generate via LLM in parallel
    # ------------------------------------------------------------------
    async def _pull_bank():
        try:
            return await pull_from_bank(
                grade_level=grade_level,
                pillar=pillar,
                topics=active_topic_names,
                count=BANK_QUESTIONS_COUNT,
                classroom_id=classroom_id,
            )
        except Exception as exc:
            logger.warning("Bank pull failed: %s", exc)
            return []

    async def _generate_llm():
        try:
            return await generate_pillar_missions(
                pillar=pillar,
                grade_level=grade_level,
                active_topics=active_topic_names,
                student_id=student_id,
                student_weaknesses=student_weaknesses,
                is_frustrated=is_frustrated,
                performance_profile=performance_profile,
                context_chunks=context_chunks,
                count=PILLAR_QUESTIONS_COUNT,  # generate full set, trim after
            )
        except Exception as exc:
            logger.error("LLM pillar generation failed for %s %s: %s", student_id, pillar, exc)
            return None

    bank_questions, llm_questions = await asyncio.gather(_pull_bank(), _generate_llm())

    # Trigger stale bank refresh in background
    from app.utils.question_bank import refresh_stale_slots
    background_tasks.add_task(refresh_stale_slots, classroom_id, grade_level, pillar, active_topic_names)

    logger.info("Bank provided %d, LLM provided %s for %s",
        len(bank_questions), len(llm_questions) if llm_questions else 0, pillar)
```

- [ ] **Step 2: Verify and commit**

```bash
cd backend && python -c "from app.api.v1.endpoints.missions import get_pillar_missions; print('OK')"
git add backend/app/api/v1/endpoints/missions.py
git commit -m "perf: parallelize bank pull + LLM generation (saves 200-600ms on miss)"
```

---

### Task 4: Parallelize spelling bee status checks

**Files:**
- Modify: `backend/app/api/v1/endpoints/spelling_bee.py:232-245, 248-268`

`daily-status` and `daily-word` both call `_count_today_attempts()` + `_has_correct_attempt_today()` sequentially.

- [ ] **Step 1: Parallelize in daily-status endpoint**

Replace lines 237-240:

```python
    student_id = student["sub"]
    attempts, already_correct = await asyncio.gather(
        _count_today_attempts(student_id),
        _has_correct_attempt_today(student_id),
    )
    can_play = attempts < MAX_ATTEMPTS and not already_correct
```

Add `import asyncio` at the top if not already imported.

- [ ] **Step 2: Parallelize in daily-word endpoint**

Replace lines 256-262:

```python
    student_id = student["sub"]
    classroom_id = student["classroom_id"]

    attempts, already_correct = await asyncio.gather(
        _count_today_attempts(student_id),
        _has_correct_attempt_today(student_id),
    )
    if attempts >= MAX_ATTEMPTS or already_correct:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You've already completed today's Spelling Bee! Come back tomorrow.",
        )
```

- [ ] **Step 3: Parallelize in submit endpoint too**

Same pattern for the submit endpoint's status check.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/spelling_bee.py
git commit -m "perf: parallelize spelling bee status checks (saves 40-60ms per request)"
```

---

### Task 5: Fix cache key fragmentation in Puzzle Palace and Story Time

**Files:**
- Modify: `backend/app/api/v1/endpoints/puzzle_palace.py:204`
- Modify: `backend/app/api/v1/endpoints/story_time.py:222`

Both modules include `sessions_used` in the cache key. This means session 2 always misses cache even though the same content could be reused. Use date instead.

- [ ] **Step 1: Fix puzzle_palace.py cache key**

Replace line 204:

```python
    # Old: cache_key = make_cache_key("puzzle_palace", classroom_id, topics_hash, str(sessions_used))
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = make_cache_key("puzzle_palace", classroom_id, topics_hash, today_str)
```

Add `from datetime import datetime, timezone` if not already imported.

- [ ] **Step 2: Fix story_time.py cache key**

Replace line 222:

```python
    # Old: cache_key = make_cache_key("story_time", classroom_id, topic_title, str(grade_level), str(sessions_used))
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = make_cache_key("story_time", classroom_id, topic_title, str(grade_level), today_str)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/puzzle_palace.py backend/app/api/v1/endpoints/story_time.py
git commit -m "perf: fix cache key fragmentation in puzzle palace and story time"
```

---

### Task 6: Move Puzzle Palace cache check before topics/RAG

**Files:**
- Modify: `backend/app/api/v1/endpoints/puzzle_palace.py:159-211`

Currently: grade fetch → session count → active topics → cache check. Move cache check right after we have the key.

- [ ] **Step 1: Reorder to check cache earlier**

Replace lines 159-211 with:

```python
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # Step 1: Get grade (cached) + session count in parallel
    from app.core.cache import get_cached_grade_level
    grade_level, sessions_used = await asyncio.gather(
        get_cached_grade_level(classroom_id),
        _count_today_sessions(student_id),
    )

    if sessions_used >= DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit reached ({DAILY_LIMIT} sessions per day). Come back tomorrow!",
        )

    # Step 2: Get topics + check cache
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]
    topic_label = ", ".join(active_topic_names) if active_topic_names else "General English"

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = make_cache_key("puzzle_palace", classroom_id, topics_hash, today_str)
    cached = await cache_get(cache_key)
    if cached:
        logger.info("Cache hit for puzzle palace: %s", cache_key)
        await log_cache_hit("puzzle_palace/rooms", student_id=student_id, classroom_id=classroom_id)
        await _log_session_start(student_id, classroom_id, grade_level)
        return PuzzlePalaceResponse(**cached)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/endpoints/puzzle_palace.py
git commit -m "perf: reorder puzzle palace to check cache before RAG/LLM work"
```

---

### Task 7: Normalize React Query stale times

**Files:**
- Modify: `frontend/lib/hooks/queries.ts:237, 253`

`useMyScores` refetches every 30s and `useDailyPillarStatus` every 60s. Both are too aggressive.

- [ ] **Step 1: Update stale times**

Change `useDailyPillarStatus` (line 237):

```typescript
    staleTime: 3 * 60 * 1000, // 3 minutes
```

Change `useMyScores` (line 253):

```typescript
    staleTime: 5 * 60 * 1000, // 5 minutes
```

- [ ] **Step 2: Build frontend**

```bash
cd frontend && npx next build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/hooks/queries.ts
git commit -m "perf: normalize React Query stale times to reduce background refetches"
```

---

### Task 8: Build, test, and push

- [ ] **Step 1: Frontend build**

```bash
cd frontend && npx next build
```

- [ ] **Step 2: Backend import check**

```bash
cd backend && python -c "
from app.core.cache import get_cached_grade_level
from app.api.v1.endpoints.missions import get_pillar_missions
from app.api.v1.endpoints.spelling_bee import submit_spelling_bee
from app.api.v1.endpoints.puzzle_palace import get_puzzle_palace_rooms
from app.api.v1.endpoints.story_time import get_story
print('All imports OK')
"
```

- [ ] **Step 3: Run backend tests**

```bash
cd backend && python -m pytest tests/test_missions.py tests/test_pillar_missions.py --tb=line -q
```

Expect same pre-existing failures, no new ones.

- [ ] **Step 4: Push**

```bash
git push
```
