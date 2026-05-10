# Mission System QA Fixes

Critical fixes to the student mission generation pipeline addressing task count, performance, reporting accuracy, and scoring visibility.

## Issues Fixed

### 1. Missions generating fewer than 10 tasks (Critical)

**Root cause:** `validate_topic_alignment()` used word-boundary matching that rejected most LLM-generated questions. Keywords adjacent to punctuation (e.g., `"cat."`) failed to match after `.split()`.

**Fixes:**
- Switched from word-boundary to substring matching with `len >= 2` guard
- Added missing fields to searchable text: `sentence_start`, `correct_answer`, `word_bank`, `correct_order`, `word_with_blanks`
- Final-attempt fallback returns all 10 LLM-generated questions if validation is too aggressive

### 2. Slow mission loading (Performance)

**Root cause:** Pre-generation ran all 4 pillars sequentially with 1-second delays (~60s total). Frontend only prefetched the reading pillar.

**Fixes:**
- Parallel pre-generation via `asyncio.gather()` (~4x faster)
- Frontend prefetches all 4 pillars on hover (was only reading)

### 3. NLP evaluator and reports missing most mission data (Reporting)

**Root cause:** Mission completion logs `interaction_type` as `mission_{task_type}` (e.g., `mission_sentence_scramble`), but evaluator/reports only looked for `"mission_mc"` and `"mission_fill"`.

**Fixes:**
- NLP evaluator: `startswith("mission_")` instead of exact match
- Evaluator endpoints: same fix in 2 locations
- Admin endpoint: `like("mission_%")` for DB queries
- Rewards breakdown: groups all `mission_*` types under "Missions"
- Frustration detection: same `like("mission_%")` pattern

### 4. Score field missing in interaction logging

**Root cause:** `POST /interactions` endpoint didn't populate the `score` field, causing daily summary to always default to 10.

**Fix:** Added `score` field (10 if correct, 0 if incorrect) to interaction inserts.

### 5. `is_weakness_focused` always reported as 0

**Root cause:** Flag was hardcoded to `False` in mission generator.

**Fix:** Detects if the current pillar is in the student's weak areas and sets the flag accordingly.

### 6. Student scores not refreshing after mission completion

**Root cause:** `myScores` query key was not invalidated in the mutation's `onSuccess`.

**Fix:** Added `["myScores"]` invalidation to `useMissionComplete`.

### 7. Evaluation continue button routing

**Fix:** Changed from `/student/home` to `/student/missions`.

## Files Changed

| File | Change |
|------|--------|
| `backend/app/agents/tutor_agent/mission_generator.py` | Topic validation fix, weakness detection |
| `backend/app/utils/pregenerate_missions.py` | Parallel pre-generation |
| `backend/app/agents/evaluator_agent/nlp_evaluator.py` | Mission type filter fix |
| `backend/app/api/v1/endpoints/evaluator.py` | Mission type filter fix (2 locations) |
| `backend/app/api/v1/endpoints/admin.py` | Mission type filter fix |
| `backend/app/api/v1/endpoints/interactions.py` | Score field + frustration detection fix |
| `backend/app/api/v1/endpoints/rewards.py` | Mission type grouping fix |
| `backend/tests/test_pregenerate_missions.py` | Fixed mock data (`topic_name` key) |
| `frontend/app/student/layout.tsx` | Prefetch all 4 pillars |
| `frontend/lib/hooks/mutations.ts` | Invalidate myScores on completion |
| `frontend/app/student/evaluation/page.tsx` | Continue button routes to missions |
