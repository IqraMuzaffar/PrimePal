# Mission Loading Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce mission loading time from 15-60 seconds to < 500ms by implementing background pre-generation and aggressive caching.

**Architecture:** Move from synchronous on-demand LLM generation to a background job system that pre-generates and caches missions for all active students. Implement stale-while-revalidate pattern to serve cached data instantly while refreshing in background.

**Tech Stack:** FastAPI BackgroundTasks, Redis cache (extend TTL), async database queries (asyncio.gather), optional APScheduler for cron jobs

---

## Problem Analysis

**Current Bottlenecks:**
1. LLM generation: 5-20 seconds per call (PRIMARY - 90% of delay)
2. LLM retries: Up to 3 attempts = 15-60 seconds worst case
3. Sequential database queries: ~250-1000ms
4. On-demand generation: Students wait for full generation
5. Cache misses after 1-hour TTL: First student waits full time

**Target Performance:**
- Cache hit: < 100ms
- Cache miss: < 500ms (serve stale data, generate in background)
- Background generation: Don't care (async)

---

## File Structure

**New Files:**
- `backend/app/jobs/mission_pregeneration.py` - Background job to pre-generate missions
- `backend/app/api/v1/endpoints/admin_jobs.py` - Admin endpoint to trigger jobs manually

**Modified Files:**
- `backend/app/api/v1/endpoints/missions.py` - Add stale-while-revalidate, parallelize queries
- `backend/app/core/cache.py` - Add cache warming functions
- `backend/app/main.py` - Register background job scheduler

---

## Task 1: Parallelize Database Queries

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py:678-742`

**Goal:** Reduce database query time from ~500ms to ~200ms by running queries concurrently.

- [ ] **Step 1: Import asyncio.gather**

```python
# At top of missions.py, add to imports:
import asyncio
```

- [ ] **Step 2: Refactor database queries to run in parallel**

Find this section (around line 678-742):

```python
# Current sequential code:
classroom_resp = (
    supabase.table("classrooms")
    .select("grade_level")
    .eq("id", classroom_id)
    .maybe_single()
    .execute()
)

active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)

interactions_resp = (
    supabase.table("student_interactions")
    .select("original_message, interaction_type")
    .eq("student_id", student_id)
    .eq("correct", False)
    .order("created_at", desc=True)
    .limit(5)
    .execute()
)

performance_profile = await get_student_performance_profile(student_id)
```

Replace with:

```python
# Parallelize independent queries
async def fetch_classroom_grade():
    resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found for this student",
        )
    return resp.data["grade_level"]

async def fetch_weaknesses():
    try:
        resp = (
            supabase.table("student_interactions")
            .select("original_message, interaction_type")
            .eq("student_id", student_id)
            .eq("correct", False)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        return [
            r["original_message"]
            for r in (resp.data or [])
            if r.get("original_message")
        ]
    except Exception as exc:
        logger.warning("Could not fetch student weaknesses: %s", exc)
        return []

# Run all queries in parallel
grade_level, student_weaknesses, performance_profile = await asyncio.gather(
    fetch_classroom_grade(),
    fetch_weaknesses(),
    get_student_performance_profile(student_id)
)

# Fetch active topics (depends on grade_level)
active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
active_topic_names = [t["topic_name"] for t in active_topic_objs]
topics_hash = str(hash(tuple(sorted(active_topic_names))))
```

- [ ] **Step 3: Test the endpoint**

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# In another terminal, time the request
time curl -X GET "http://localhost:8000/api/v1/missions/pillar?pillar=reading" \
  -H "Authorization: Bearer <STUDENT_JWT>"
```

Expected: Response time improves by ~200-400ms

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "perf: parallelize database queries in mission generation

Reduces query time from ~500ms to ~200ms by running classroom,
weaknesses, and performance profile queries concurrently with
asyncio.gather()"
```

---

## Task 2: Extend Cache TTL and Add Stale-While-Revalidate

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py:700-807`
- Modify: `backend/app/core/cache.py` (add helper functions)

**Goal:** Serve cached data instantly, refresh in background. Change TTL from 1 hour to 24 hours.

- [ ] **Step 1: Add background refresh function to cache.py**

In `backend/app/core/cache.py`, add after existing functions:

```python
async def cache_set_with_ttl(key: str, value: dict, ttl: int) -> None:
    """Set cache with custom TTL (in seconds)."""
    redis = await get_redis()
    if redis:
        try:
            await redis.setex(
                key,
                ttl,
                json.dumps(value, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {e}")

async def cache_is_stale(key: str, max_age: int) -> bool:
    """Check if cache entry is older than max_age seconds."""
    redis = await get_redis()
    if not redis:
        return True

    try:
        ttl = await redis.ttl(key)
        if ttl < 0:  # Key doesn't exist or has no expiry
            return True

        # If remaining TTL < (total TTL - max_age), it's stale
        # For 24h cache with 1h max_age: stale if TTL < 23h
        return ttl < (86400 - max_age)  # 86400 = 24 hours
    except Exception as e:
        logger.warning(f"Cache staleness check failed for {key}: {e}")
        return True
```

- [ ] **Step 2: Implement stale-while-revalidate in missions endpoint**

In `backend/app/api/v1/endpoints/missions.py`, replace cache check section:

```python
# OLD CODE (around line 700-707):
cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
if not is_frustrated:
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for pillar missions: {cache_key}")
        return PillarMissionsResponse(**cached)
```

Replace with:

```python
# NEW CODE - Stale-while-revalidate pattern
from fastapi import BackgroundTasks

cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
cached = await cache_get(cache_key)

if cached and not is_frustrated:
    # Check if cache is stale (older than 1 hour)
    is_stale = await cache_is_stale(cache_key, max_age=3600)  # 1 hour

    if not is_stale:
        # Fresh cache hit - return immediately
        logger.info(f"Cache hit (fresh) for pillar missions: {cache_key}")
        return PillarMissionsResponse(**cached)
    else:
        # Stale cache - return stale data but refresh in background
        logger.info(f"Cache hit (stale) for pillar missions: {cache_key}, refreshing in background")

        # Schedule background refresh (don't await)
        background_tasks.add_task(
            refresh_mission_cache,
            cache_key=cache_key,
            student_id=student_id,
            classroom_id=classroom_id,
            pillar=pillar,
            is_frustrated=is_frustrated
        )

        return PillarMissionsResponse(**cached)

# If no cache at all, continue with synchronous generation below
```

- [ ] **Step 3: Add background refresh function**

Add before the `get_pillar_missions` endpoint definition:

```python
async def refresh_mission_cache(
    cache_key: str,
    student_id: str,
    classroom_id: str,
    pillar: str,
    is_frustrated: bool
):
    """Background task to refresh stale mission cache."""
    try:
        supabase = get_supabase_admin()

        # Parallelize queries
        async def fetch_classroom_grade():
            resp = supabase.table("classrooms").select("grade_level").eq("id", classroom_id).maybe_single().execute()
            return resp.data["grade_level"] if resp.data else 1

        async def fetch_weaknesses():
            try:
                resp = (
                    supabase.table("student_interactions")
                    .select("original_message, interaction_type")
                    .eq("student_id", student_id)
                    .eq("correct", False)
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute()
                )
                return [r["original_message"] for r in (resp.data or []) if r.get("original_message")]
            except:
                return []

        grade_level, student_weaknesses, performance_profile = await asyncio.gather(
            fetch_classroom_grade(),
            fetch_weaknesses(),
            get_student_performance_profile(student_id)
        )

        active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
        active_topic_names = [t["topic_name"] for t in active_topic_objs]

        # Generate new missions
        missions = await generate_pillar_missions(
            pillar=pillar,
            grade_level=grade_level,
            active_topics=active_topic_names,
            student_id=student_id,
            student_weaknesses=student_weaknesses,
            is_frustrated=is_frustrated,
            performance_profile=performance_profile,
        )

        if missions:
            # Prepare response
            weakness_focus_count = sum(1 for q in missions if q.get("is_weakness_focused", False))
            mission_questions = []
            for q in missions:
                if isinstance(q, dict):
                    q_filtered = {k: v for k, v in q.items() if k != "is_weakness_focused"}
                    if "type" in q_filtered and "task_type" not in q_filtered:
                        q_filtered["task_type"] = q_filtered.pop("type")
                    mq = MissionQuestion(**q_filtered)
                    mission_questions.append(mq)

            response = PillarMissionsResponse(
                pillar=pillar,
                active_topics_summary=", ".join(active_topic_names) if active_topic_names else None,
                questions=[_strip_answer(q) for q in mission_questions],
                weakness_focus_questions=weakness_focus_count,
            )

            # Update cache with 24-hour TTL
            await cache_set_with_ttl(cache_key, response.model_dump(), ttl=86400)
            logger.info(f"Background refresh complete for {cache_key}")

    except Exception as e:
        logger.error(f"Background mission refresh failed for {cache_key}: {e}", exc_info=True)
```

- [ ] **Step 4: Update cache TTL after successful generation**

Find the cache_set call at the end of get_pillar_missions (around line 805):

```python
# OLD:
await cache_set(cache_key, response.model_dump(), ttl=3600)  # 1 hour

# NEW:
await cache_set_with_ttl(cache_key, response.model_dump(), ttl=86400)  # 24 hours
```

- [ ] **Step 5: Add BackgroundTasks to endpoint signature**

Update the endpoint signature:

```python
async def get_pillar_missions(
    pillar: str = Query(..., description="Pillar type: reading, writing, listening, speaking"),
    is_frustrated: bool = Query(False, description="If True, generate 'Confidence Builder' questions to recover affective state"),
    student: dict = Depends(get_current_student),
    background_tasks: BackgroundTasks = BackgroundTasks(),  # ADD THIS
):
```

- [ ] **Step 6: Test stale-while-revalidate**

```bash
# First request - cache miss, slow
time curl -X GET "http://localhost:8000/api/v1/missions/pillar?pillar=reading" \
  -H "Authorization: Bearer <STUDENT_JWT>"
# Expected: 5-20 seconds (LLM generation)

# Second request immediately - cache hit, fast
time curl -X GET "http://localhost:8000/api/v1/missions/pillar?pillar=reading" \
  -H "Authorization: Bearer <STUDENT_JWT>"
# Expected: < 100ms (cache hit)

# Wait 2 hours, third request - stale cache, still fast
sleep 7200
time curl -X GET "http://localhost:8000/api/v1/missions/pillar?pillar=reading" \
  -H "Authorization: Bearer <STUDENT_JWT>"
# Expected: < 500ms (stale cache served, refresh in background)
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py backend/app/core/cache.py
git commit -m "perf: implement stale-while-revalidate for mission cache

- Extend cache TTL from 1h to 24h
- Serve stale cache instantly while refreshing in background
- Add cache_set_with_ttl and cache_is_stale helpers
- Results: <100ms for fresh cache, <500ms for stale cache"
```

---

## Task 3: Pre-Generate Missions for Active Students (Background Job)

**Files:**
- Create: `backend/app/jobs/__init__.py`
- Create: `backend/app/jobs/mission_pregeneration.py`
- Modify: `backend/app/main.py` (add startup event)

**Goal:** Pre-warm cache for all active students so first request is always < 100ms.

- [ ] **Step 1: Create jobs module init file**

Create `backend/app/jobs/__init__.py`:

```python
"""Background job modules for async tasks."""
```

- [ ] **Step 2: Create mission pre-generation job**

Create `backend/app/jobs/mission_pregeneration.py`:

```python
"""Background job to pre-generate missions for active students."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.core.supabase_client import get_supabase_admin
from app.core.cache import make_cache_key, cache_get, cache_set_with_ttl
from app.agents.tutor_agent.mission_generator import generate_pillar_missions
from app.utils.performance_profile import get_student_performance_profile
from app.api.v1.endpoints.missions import get_active_topics, MissionQuestion, PillarMissionsResponse, _strip_answer

logger = logging.getLogger(__name__)


async def pregen_student_missions(
    student_id: str,
    classroom_id: str,
    grade_level: int,
    pillar: str
) -> bool:
    """
    Pre-generate and cache missions for one student/pillar combination.

    Returns True if successfully generated and cached.
    """
    try:
        supabase = get_supabase_admin()

        # Check if already cached
        cache_key = make_cache_key("pillar_missions", student_id, pillar, "False", "")
        existing = await cache_get(cache_key)
        if existing:
            logger.debug(f"Missions already cached for student {student_id[:8]} pillar {pillar}")
            return True

        # Fetch data in parallel
        async def fetch_weaknesses():
            try:
                resp = (
                    supabase.table("student_interactions")
                    .select("original_message, interaction_type")
                    .eq("student_id", student_id)
                    .eq("correct", False)
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute()
                )
                return [r["original_message"] for r in (resp.data or []) if r.get("original_message")]
            except:
                return []

        student_weaknesses, performance_profile = await asyncio.gather(
            fetch_weaknesses(),
            get_student_performance_profile(student_id)
        )

        active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
        active_topic_names = [t["topic_name"] for t in active_topic_objs]
        topics_hash = str(hash(tuple(sorted(active_topic_names))))

        # Update cache key with topics hash
        cache_key = make_cache_key("pillar_missions", student_id, pillar, "False", topics_hash)

        # Generate missions
        missions = await generate_pillar_missions(
            pillar=pillar,
            grade_level=grade_level,
            active_topics=active_topic_names,
            student_id=student_id,
            student_weaknesses=student_weaknesses,
            is_frustrated=False,
            performance_profile=performance_profile,
        )

        if not missions:
            logger.warning(f"Failed to generate missions for student {student_id[:8]} pillar {pillar}")
            return False

        # Build response object
        weakness_focus_count = sum(1 for q in missions if q.get("is_weakness_focused", False))
        mission_questions = []
        for q in missions:
            if isinstance(q, dict):
                q_filtered = {k: v for k, v in q.items() if k != "is_weakness_focused"}
                if "type" in q_filtered and "task_type" not in q_filtered:
                    q_filtered["task_type"] = q_filtered.pop("type")
                mq = MissionQuestion(**q_filtered)
                mission_questions.append(mq)

        response = PillarMissionsResponse(
            pillar=pillar,
            active_topics_summary=", ".join(active_topic_names) if active_topic_names else None,
            questions=[_strip_answer(q) for q in mission_questions],
            weakness_focus_questions=weakness_focus_count,
        )

        # Cache for 24 hours
        await cache_set_with_ttl(cache_key, response.model_dump(), ttl=86400)
        logger.info(f"Pre-generated missions for student {student_id[:8]} pillar {pillar}")
        return True

    except Exception as e:
        logger.error(f"Pre-generation failed for student {student_id[:8]} pillar {pillar}: {e}")
        return False


async def pregen_all_active_students():
    """
    Pre-generate missions for all students active in the last 7 days.

    Runs for all 4 pillars per student.
    """
    logger.info("Starting mission pre-generation for active students...")
    supabase = get_supabase_admin()

    try:
        # Find students active in last 7 days
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        students_resp = (
            supabase.table("students")
            .select("id, classroom_id")
            .gte("last_activity_date", cutoff)
            .execute()
        )

        if not students_resp.data:
            logger.info("No active students found for pre-generation")
            return

        students = students_resp.data
        logger.info(f"Found {len(students)} active students for pre-generation")

        # Get classroom grade levels (batch query)
        classroom_ids = list(set(s["classroom_id"] for s in students if s.get("classroom_id")))
        classrooms_resp = (
            supabase.table("classrooms")
            .select("id, grade_level")
            .in_("id", classroom_ids)
            .execute()
        )

        grade_map = {c["id"]: c["grade_level"] for c in (classrooms_resp.data or [])}

        # Generate for all pillars
        pillars = ["reading", "writing", "listening", "speaking"]
        tasks = []

        for student in students:
            student_id = student["id"]
            classroom_id = student.get("classroom_id")
            if not classroom_id:
                continue

            grade_level = grade_map.get(classroom_id, 1)

            for pillar in pillars:
                tasks.append(
                    pregen_student_missions(student_id, classroom_id, grade_level, pillar)
                )

        # Run all pre-generation tasks concurrently (with semaphore to limit concurrency)
        semaphore = asyncio.Semaphore(10)  # Max 10 concurrent LLM calls

        async def bounded_task(task):
            async with semaphore:
                return await task

        results = await asyncio.gather(*[bounded_task(task) for task in tasks], return_exceptions=True)

        success_count = sum(1 for r in results if r is True)
        total_count = len(tasks)

        logger.info(
            f"Mission pre-generation complete: {success_count}/{total_count} successful "
            f"({len(students)} students × {len(pillars)} pillars)"
        )

    except Exception as e:
        logger.error(f"Mission pre-generation job failed: {e}", exc_info=True)
```

- [ ] **Step 3: Add startup event to trigger initial pre-generation**

In `backend/app/main.py`, add after the lifespan function:

```python
@app.on_event("startup")
async def startup_pregeneration():
    """Pre-generate missions for active students on server startup."""
    import asyncio
    from app.jobs.mission_pregeneration import pregen_all_active_students

    # Run in background task (don't block startup)
    asyncio.create_task(pregen_all_active_students())
    logger.info("Mission pre-generation job scheduled")
```

- [ ] **Step 4: Test the pre-generation job**

```bash
# Restart backend - pre-generation runs on startup
cd backend
uvicorn app.main:app --reload

# Check logs for:
# INFO: Mission pre-generation job scheduled
# INFO: Starting mission pre-generation for active students...
# INFO: Found N active students for pre-generation
# INFO: Pre-generated missions for student XXXXXXXX pillar reading
# INFO: Mission pre-generation complete: X/Y successful

# Test that missions load instantly for pre-generated students
time curl -X GET "http://localhost:8000/api/v1/missions/pillar?pillar=reading" \
  -H "Authorization: Bearer <STUDENT_JWT>"
# Expected: < 100ms (cache hit from pre-generation)
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/jobs/ backend/app/main.py
git commit -m "feat: add mission pre-generation background job

- Pre-generate missions for all active students on startup
- Runs for all 4 pillars per student (last 7 days activity)
- Limits to 10 concurrent LLM calls
- Results: First load is <100ms instead of 5-20 seconds"
```

---

## Task 4: Add Admin Endpoint to Manually Trigger Pre-Generation

**Files:**
- Create: `backend/app/api/v1/endpoints/admin_jobs.py`
- Modify: `backend/app/api/v1/router.py` (register new router)

**Goal:** Allow admins to manually trigger mission pre-generation without server restart.

- [ ] **Step 1: Create admin jobs endpoint**

Create `backend/app/api/v1/endpoints/admin_jobs.py`:

```python
"""Admin endpoints for triggering background jobs."""
import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel

from app.api.dependencies import get_current_teacher, check_admin
from app.jobs.mission_pregeneration import pregen_all_active_students

router = APIRouter(prefix="/admin/jobs", tags=["admin-jobs"])
logger = logging.getLogger(__name__)


class JobTriggerResponse(BaseModel):
    message: str
    job_name: str
    status: str


@router.post("/pregen-missions", response_model=JobTriggerResponse)
async def trigger_mission_pregeneration(
    background_tasks: BackgroundTasks,
    _teacher: dict = Depends(check_admin),
):
    """
    Manually trigger mission pre-generation for all active students.

    Runs in background. Check server logs for progress.

    Authentication: admin JWT required.
    """
    background_tasks.add_task(pregen_all_active_students)

    return JobTriggerResponse(
        message="Mission pre-generation job started in background",
        job_name="pregen_all_active_students",
        status="running"
    )
```

- [ ] **Step 2: Register the router**

In `backend/app/api/v1/router.py`, add:

```python
# Add import at top
from app.api.v1.endpoints import admin_jobs

# Add router registration with other routers
api_router.include_router(admin_jobs.router)
```

- [ ] **Step 3: Test the admin endpoint**

```bash
# Get admin JWT token
ADMIN_TOKEN="<your-admin-jwt>"

# Trigger pre-generation
curl -X POST "http://localhost:8000/api/v1/admin/jobs/pregen-missions" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response:
# {
#   "message": "Mission pre-generation job started in background",
#   "job_name": "pregen_all_active_students",
#   "status": "running"
# }

# Check server logs for progress
tail -f backend/backend.log
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/admin_jobs.py backend/app/api/v1/router.py
git commit -m "feat: add admin endpoint to trigger mission pre-generation

Admin endpoint: POST /api/v1/admin/jobs/pregen-missions
Allows manual cache warming without server restart"
```

---

## Task 5: Add Frontend Loading States

**Files:**
- Modify: `frontend/app/student/missions/[pillar]/page.tsx`

**Goal:** Improve perceived performance with better loading UX.

- [ ] **Step 1: Add loading progress component**

In `frontend/app/student/missions/[pillar]/page.tsx`, update the loading state:

```tsx
// Find the loading state (around line 80-88):
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600 text-lg">Loading questions...</p>
      </div>
    </div>
  );
}
```

Replace with:

```tsx
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="text-center max-w-md">
        {/* Animated spinner */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <motion.div
            className="absolute inset-0 border-4 border-indigo-200 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-0 border-4 border-transparent border-t-indigo-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            📚
          </div>
        </div>

        {/* Loading message */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Preparing Your Questions
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Our AI is creating personalized questions just for you...
        </p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>

        <p className="text-gray-400 text-xs mt-4">
          This usually takes just a moment...
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Import motion if not already imported**

At the top of the file, ensure framer-motion is imported:

```tsx
import { motion } from 'framer-motion';
```

- [ ] **Step 3: Test loading state**

```bash
cd frontend
npm run dev

# Navigate to any mission pillar
# Observe improved loading animation
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/student/missions/[pillar]/page.tsx
git commit -m "ui: improve mission loading state with animated spinner

- Add rotating spinner animation
- Show friendly loading message
- Add animated progress bar
- Improves perceived performance during LLM generation"
```

---

## Performance Metrics

**Before Optimization:**
- First load (cache miss): 15-60 seconds (LLM + retries)
- Second load (cache hit): 100-200ms
- After 1 hour (cache expired): 15-60 seconds again

**After Optimization:**
- First load (pre-generated): < 100ms (cache hit)
- Subsequent loads: < 100ms (cache hit)
- Stale cache (1-24 hours): < 500ms (stale data served, refresh in background)
- Cache miss (rare): 5-20 seconds (LLM generation, no retries needed if pre-gen works)

**Expected Improvement:**
- 99% of requests: 150x-600x faster (15-60s → 100ms)
- 1% of requests: Same or slightly better (pre-generation reduces cold starts)

---

## Self-Review

✅ **Spec coverage:**
- Root cause addressed: LLM generation moved to background
- Parallelize database queries: Task 1
- Stale-while-revalidate: Task 2
- Background pre-generation: Task 3
- Admin trigger: Task 4
- UX improvements: Task 5

✅ **Placeholder scan:** No TBDs, no placeholders, all code complete

✅ **Type consistency:** Consistent use of `cache_key`, `student_id`, `pillar` throughout

✅ **Testing:** Each task has explicit test steps with expected output

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-04-optimize-mission-loading.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
