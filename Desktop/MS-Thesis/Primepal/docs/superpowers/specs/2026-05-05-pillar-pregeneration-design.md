# Pillar Mission Pre-Generation Design Spec

## Problem

When a student requests pillar missions and the Redis cache is empty, they wait 2-4 seconds for an OpenAI LLM call (`gpt-4o-mini`, structured output, 10 questions). This happens:
- After every 1-hour cache TTL expiry
- When the teacher changes active topics (old cache keys no longer match)
- For the first student in any new session

This latency degrades the learning experience for primary school students (ages 6-12) who expect instant responses.

## Goal

Reduce pillar mission load time from ~2-4s to <100ms for ~90% of requests by pre-generating generic mission sets when the teacher updates active topics.

## Decisions Made

1. **Trigger:** Teacher action only (on topic update), not scheduled cron. No new infrastructure needed.
2. **Scope:** Pillar missions only (4 pillars x 10 questions). Daily missions stay as-is.
3. **Personalization:** Serve pre-generated generic version as fallback; generate personalized version in background on first student request.
4. **Integration point:** Hook into existing `save_active_topics()` in `classroom.py` via `BackgroundTasks`.

## Architecture

### Cache Key Strategy

**Current student-specific key:**
```
pillar_missions:{student_id}:{pillar}:{is_frustrated}:{topics_hash}
```

**New generic classroom-level key:**
```
pillar_missions_generic:{classroom_id}:{pillar}:{topics_hash}
```

The generic key stores pre-generated missions with no weakness personalization and `is_frustrated=False`. The topics_hash is computed identically to the existing code: `hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]`.

### Request Flow (Updated `get_pillar_missions`)

```
Student requests GET /missions/pillar?pillar=reading

1. Validate pillar, fetch grade_level + weaknesses + performance (parallel, unchanged)
2. Compute topics_hash (unchanged)
3. Check student-specific cache → HIT? Return it. DONE.
4. Check generic classroom cache → HIT?
   a. Return generic response immediately
   b. Fire BackgroundTasks: generate personalized version → cache with student-specific key
   DONE.
5. BOTH MISS → Generate on-demand (current behavior), cache student-specific key. DONE.
```

For frustrated students (`is_frustrated=True`): skip both caches, generate fresh (unchanged behavior).

### Pre-Generation Flow

```
Teacher calls PUT /{classroom_id}/active-topics

1. save_active_topics() saves topic IDs (unchanged)
2. BackgroundTasks fires pregenerate_pillar_missions(classroom_id)
3. Pre-gen function:
   a. Fetch grade_level from classrooms table
   b. Resolve active topics via get_active_topics()
   c. Compute topics_hash
   d. For each pillar in [reading, writing, listening, speaking]:
      - Check if generic cache already exists for this topics_hash → skip if yes
      - Call generate_pillar_missions(pillar, grade_level, active_topics,
            student_id="generic", student_weaknesses=[], is_frustrated=False)
      - Build PillarMissionsResponse, cache with generic key (TTL 3600s)
      - 1-second delay between pillars to avoid OpenAI rate limits
   e. Log success/failure per pillar
```

### Cost Efficiency Measures

1. **Skip if cache exists:** Before each LLM call, check if the generic cache already exists for that pillar + topics_hash. If the teacher re-saves the same topics, no LLM calls fire.
2. **Sequential generation with delay:** 4 pillars generated sequentially with 1s gaps to stay within OpenAI rate limits (avoids 429 retries which are more expensive).
3. **Shared TTL:** Generic cache uses the same 3600s (1h) TTL. No extra storage beyond what already exists.
4. **No per-student pre-gen:** Generic versions only. Personalized versions generate lazily on first student request and cache per-student as before.
5. **Fire-and-forget:** Pre-gen runs in BackgroundTasks. If it fails, students fall back to on-demand generation (current behavior). No retry loops.

### Redis Storage Impact

Per classroom with active topics: 4 additional keys (one per pillar). Each key stores ~10KB of JSON (10 questions with options, hints, etc.). Total: ~40KB per classroom. Negligible.

## Files Changed

### New File
- `backend/app/utils/pregenerate_missions.py` — Contains `pregenerate_pillar_missions(classroom_id: str)` async function.

### Modified Files
- `backend/app/api/v1/endpoints/classroom.py` — Add `BackgroundTasks` to `update_classroom_active_topics()`, fire pre-gen after saving topics.
- `backend/app/api/v1/endpoints/missions.py` — In `get_pillar_missions()`, add generic cache fallback check (step 4 above) and background personalization trigger.

## Error Handling

- Pre-generation failures are logged at ERROR level but never surface to users.
- If one pillar fails mid-generation, the others still cache (independent calls).
- If Redis is down, all caching gracefully degrades (existing behavior via `cache_get`/`cache_set` returning None/False).
- If `get_active_topics()` returns empty (no topics configured), skip pre-gen entirely (no point generating without topic context).

## What Does NOT Change

- All existing cache TTLs remain 1 hour
- Frustrated student flow (always fresh generation, never cached)
- Weakness-focused personalization (generated on-demand per student)
- Daily missions endpoint
- Frontend code (zero changes)
- Database schema (no new tables)
- `generate_pillar_missions()` function signature and behavior
- Point values, difficulty distribution, task type configs

## Testing Strategy

- Unit test: `pregenerate_pillar_missions()` calls generate for all 4 pillars, skips when cache exists
- Unit test: `get_pillar_missions()` falls back to generic cache when student cache misses
- Unit test: `update_classroom_active_topics()` fires background pre-gen task
- Integration test: Teacher updates topics → generic cache is warm → student gets instant response
