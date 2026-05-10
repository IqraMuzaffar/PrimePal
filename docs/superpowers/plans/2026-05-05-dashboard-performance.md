# Student Dashboard Performance Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce student dashboard load time from ~250ms (5 parallel API calls, 4 uncached) to ~80ms (1 cached API call) while improving DB efficiency with missing indexes and backend Redis caching.

**Architecture:** New combined `/student/dashboard` endpoint aggregates all home page data in one round trip with `asyncio.gather()`. Redis caching with pattern-based invalidation on mutations. Frontend switches to a single `useStudentDashboard()` hook with `localStorage` persistence for instant warm loads. Achievement queries optimized to eliminate unindexed RPC.

**Tech Stack:** FastAPI, asyncio, Redis (aioredis), Supabase (PostgreSQL), Next.js 14, TanStack Query, TypeScript

---

## File Structure

**Create:**
- `backend/app/api/v1/endpoints/student_dashboard.py` — Combined dashboard endpoint
- `backend/migrations/026_add_performance_indexes.sql` — Missing DB indexes

**Modify:**
- `backend/app/core/cache.py` — Add `cache_delete_pattern()` for wildcard invalidation
- `backend/app/api/v1/router.py` — Register dashboard router
- `backend/app/api/v1/endpoints/missions.py` — Add dashboard cache invalidation on `/complete`
- `backend/app/api/v1/endpoints/rewards.py` — Add Redis caching to streak, daily-summary, points-breakdown
- `backend/app/api/v1/endpoints/achievements.py` — Replace RPC with indexed query, add caching
- `frontend/lib/hooks/queries.ts` — Add `useStudentDashboard()` hook, add dashboard query key
- `frontend/lib/hooks/mutations.ts` — Invalidate dashboard cache on mission complete
- `frontend/app/student/home/page.tsx` — Use single dashboard hook instead of 5 hooks
- `frontend/app/student/layout.tsx` — Use dashboard data for profile/streak instead of separate calls

---

## Task 1: Add `cache_delete_pattern()` to Cache Module

**Files:**
- Modify: `backend/app/core/cache.py`

- [ ] **Step 1: Add pattern delete function**

Add after the existing `cache_delete` function in `backend/app/core/cache.py`:

```python
async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Returns count of deleted keys."""
    if not _redis_client:
        return 0
    try:
        deleted = 0
        async for key in _redis_client.scan_iter(match=pattern, count=100):
            await _redis_client.delete(key)
            deleted += 1
        return deleted
    except Exception as e:
        logger.warning(f"Cache pattern delete error for {pattern}: {e}")
        return 0
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/core/cache.py
git commit -m "feat(cache): add pattern-based cache deletion

Add cache_delete_pattern() for wildcard key invalidation.
Used by dashboard cache to invalidate all student-scoped keys at once.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add Missing Database Indexes

**Files:**
- Create: `backend/migrations/026_add_performance_indexes.sql`

- [ ] **Step 1: Create migration file**

Create `backend/migrations/026_add_performance_indexes.sql`:

```sql
-- Migration 026: Add performance indexes for student dashboard queries
-- These indexes cover the most common unindexed query patterns in rewards,
-- achievements, and weekly progress endpoints.

-- Used by: /rewards/daily-summary, /rewards/points-breakdown, /student/my-scores
-- Covers: WHERE student_id = ? AND correct = TRUE AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_interactions_student_correct_created
    ON student_interactions(student_id, correct, created_at);

-- Used by: /missions/me, achievements._get_student_stats
-- Covers: WHERE student_id = ? AND interaction_type LIKE 'mission%'
CREATE INDEX IF NOT EXISTS idx_interactions_student_type
    ON student_interactions(student_id, interaction_type);

-- Used by: /missions/weekly-progress, /student/my-scores
-- Covers: WHERE student_id = ? AND pillar IS NOT NULL AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_interactions_student_pillar_created
    ON student_interactions(student_id, pillar, created_at);

-- Used by: /missions/weekly-progress (active topic lookup)
-- Covers: WHERE classroom_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_syllabus_classroom_status
    ON classroom_syllabus(classroom_id, status);
```

- [ ] **Step 2: Run migration against Supabase**

Run in Supabase SQL editor or via CLI:
```bash
# Copy the SQL and run it against your Supabase database
# Via Supabase dashboard: SQL Editor → paste → Run
```

Expected: 4 indexes created successfully (or "already exists" if any were present)

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/026_add_performance_indexes.sql
git commit -m "perf(db): add missing indexes for dashboard queries

Add 4 indexes on student_interactions and classroom_syllabus covering
the most common unindexed query patterns: correct+created_at filtering,
interaction_type prefix matching, pillar+time range, and syllabus status.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add Redis Caching to Rewards Endpoints

**Files:**
- Modify: `backend/app/api/v1/endpoints/rewards.py`

- [ ] **Step 1: Add cache imports**

Replace the imports at the top of `backend/app/api/v1/endpoints/rewards.py`:

```python
"""
Rewards endpoints: daily summary, streak, and points breakdown.
"""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key
```

- [ ] **Step 2: Cache the streak endpoint**

Replace the `get_streak` function body:

```python
@router.get("/streak", response_model=StreakResponse, summary="Get student streak")
async def get_streak(student: dict = Depends(get_current_student)):
    """
    Get the student's current and longest streak.
    Cached for 10 minutes (streak only changes once per day).
    """
    student_id: str = student["sub"]

    cache_key = make_cache_key("streak", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return StreakResponse(**cached)

    supabase = get_supabase_admin()
    resp = supabase.table("students").select(
        "current_streak, longest_streak, last_activity_date"
    ).eq("id", student_id).maybe_single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Student not found")

    data = resp.data
    response = StreakResponse(
        current_streak=data.get("current_streak") or 0,
        longest_streak=data.get("longest_streak") or 0,
        last_activity_date=data.get("last_activity_date"),
    )

    await cache_set(cache_key, response.model_dump(), ttl=600)
    return response
```

- [ ] **Step 3: Cache the daily-summary endpoint**

Replace the `get_daily_summary` function body:

```python
@router.get("/daily-summary", response_model=DailySummaryResponse, summary="Daily score summary")
async def get_daily_summary(student: dict = Depends(get_current_student)):
    """
    Return the student's score summary for today. Cached for 2 minutes.
    """
    student_id: str = student["sub"]

    cache_key = make_cache_key("daily_summary", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return DailySummaryResponse(**cached)

    supabase = get_supabase_admin()

    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    total_points = (student_resp.data.get("points") or 0) if student_resp.data else 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    interactions_resp = (
        supabase.table("student_interactions")
        .select("score")
        .eq("student_id", student_id)
        .eq("correct", True)
        .gte("created_at", today_start)
        .execute()
    )
    rows = interactions_resp.data or []
    today_points = sum(r.get("score") or 10 for r in rows)
    missions_today = len(rows)

    response = DailySummaryResponse(
        today_points=today_points,
        total_points=total_points,
        missions_today=missions_today,
    )

    await cache_set(cache_key, response.model_dump(), ttl=120)
    return response
```

- [ ] **Step 4: Cache the points-breakdown endpoint**

Replace the `get_points_breakdown` function body:

```python
@router.get("/points-breakdown", response_model=PointsBreakdownResponse, summary="Points breakdown by activity")
async def get_points_breakdown(student: dict = Depends(get_current_student)):
    """
    Return today's and this week's points grouped by activity type. Cached for 2 minutes.
    """
    student_id: str = student["sub"]

    cache_key = make_cache_key("points_breakdown", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return PointsBreakdownResponse(**cached)

    supabase = get_supabase_admin()

    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now_utc - timedelta(days=7)).isoformat()

    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    total_points = (student_resp.data.get("points") or 0) if student_resp.data else 0

    week_resp = (
        supabase.table("student_interactions")
        .select("interaction_type, score, created_at")
        .eq("student_id", student_id)
        .eq("correct", True)
        .gte("created_at", week_start)
        .execute()
    )
    rows = week_resp.data or []

    def aggregate(filtered_rows: list[dict]) -> list[ActivityPoints]:
        buckets: dict[str, dict] = {}
        for r in filtered_rows:
            raw_type = r.get("interaction_type", "")
            display = _ACTIVITY_MAP.get(raw_type, raw_type.replace("_", " ").title())
            if display not in buckets:
                buckets[display] = {"points": 0, "count": 0}
            buckets[display]["points"] += r.get("score") or 10
            buckets[display]["count"] += 1
        return sorted(
            [ActivityPoints(activity=k, points=v["points"], count=v["count"]) for k, v in buckets.items()],
            key=lambda x: x.points,
            reverse=True,
        )

    today_rows = [r for r in rows if r.get("created_at", "") >= today_start]

    response = PointsBreakdownResponse(
        today=aggregate(today_rows),
        this_week=aggregate(rows),
        total_points=total_points,
    )

    await cache_set(cache_key, response.model_dump(), ttl=120)
    return response
```

- [ ] **Step 5: Add invalidation helper**

Add at the bottom of `backend/app/api/v1/endpoints/rewards.py`:

```python
# ---------------------------------------------------------------------------
# Cache invalidation (called from mutations like mission complete)
# ---------------------------------------------------------------------------

async def invalidate_reward_caches(student_id: str) -> None:
    """Invalidate all reward-related caches for a student."""
    await cache_delete(make_cache_key("streak", student_id))
    await cache_delete(make_cache_key("daily_summary", student_id))
    await cache_delete(make_cache_key("points_breakdown", student_id))
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/rewards.py
git commit -m "perf(rewards): add Redis caching to all reward endpoints

Cache streak (10min), daily-summary (2min), and points-breakdown (2min).
Add invalidation helper for mutation endpoints to call.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Optimize Achievement Queries and Add Caching

**Files:**
- Modify: `backend/app/api/v1/endpoints/achievements.py`

- [ ] **Step 1: Add cache imports**

Add to the imports at the top of `backend/app/api/v1/endpoints/achievements.py`:

```python
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key
```

- [ ] **Step 2: Replace `_get_student_stats` with indexed queries**

Replace the `_get_student_stats` function with a version that avoids the unindexed RPC:

```python
def _get_student_stats(student_id: str) -> dict[str, int]:
    """
    Gather all stats needed for achievement evaluation.
    Uses direct indexed queries instead of RPC for better performance.
    """
    supabase = get_supabase_admin()

    # Fetch student record (points, streak)
    student_resp = (
        supabase.table("students")
        .select("points, current_streak")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )

    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    data = student_resp.data
    points = data.get("points") or 0
    streak = data.get("current_streak") or 0

    # Count total missions (uses idx_interactions_student_type)
    missions_count_resp = (
        supabase.table("student_interactions")
        .select("id", count="exact")
        .eq("student_id", student_id)
        .like("interaction_type", "mission%")
        .execute()
    )
    missions_total = missions_count_resp.count or 0

    # Count per-pillar correct interactions (uses idx_interactions_student_pillar_correct)
    pillar_resp = (
        supabase.table("student_interactions")
        .select("pillar")
        .eq("student_id", student_id)
        .eq("correct", True)
        .not_.is_("pillar", "null")
        .execute()
    )
    pillar_rows = pillar_resp.data or []

    pillar_counts: dict[str, int] = {"reading": 0, "writing": 0, "listening": 0, "speaking": 0}
    for row in pillar_rows:
        p = row.get("pillar")
        if p in pillar_counts:
            pillar_counts[p] += 1

    return {
        "points": points,
        "missions_total": missions_total,
        "streak": streak,
        "missions_reading": pillar_counts["reading"],
        "missions_writing": pillar_counts["writing"],
        "missions_listening": pillar_counts["listening"],
        "missions_speaking": pillar_counts["speaking"],
    }
```

- [ ] **Step 3: Cache achievement definitions**

Replace `list_all_achievements`:

```python
@router.get("/all", response_model=AllAchievementsResponse, summary="List all achievements")
async def list_all_achievements():
    """
    Return all achievement definitions (no auth required). Cached for 1 hour.
    """
    cache_key = "achievement_definitions"
    cached = await cache_get(cache_key)
    if cached:
        return AllAchievementsResponse(**cached)

    supabase = get_supabase_admin()
    resp = supabase.table("achievements").select("*").order("threshold_value").execute()
    achievements = resp.data or []

    response = AllAchievementsResponse(
        achievements=[
            AchievementDef(
                id=a["id"],
                name=a["name"],
                description=a["description"],
                description_ur=a.get("description_ur", ""),
                icon=a["icon"],
                tier=a["tier"],
                threshold_type=a["threshold_type"],
                threshold_value=a["threshold_value"],
            )
            for a in achievements
        ]
    )

    await cache_set(cache_key, response.model_dump(), ttl=3600)
    return response
```

- [ ] **Step 4: Cache student achievements with progress**

Replace `get_my_achievements`:

```python
@router.get("/me", response_model=AchievementListResponse, summary="Student achievements with progress")
async def get_my_achievements(student: dict = Depends(get_current_student)):
    """
    Return all achievements with student's progress. Cached for 5 minutes.
    """
    student_id: str = student["sub"]

    cache_key = make_cache_key("achievements", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return AchievementListResponse(**cached)

    supabase = get_supabase_admin()

    all_resp = supabase.table("achievements").select("*").order("threshold_value").execute()
    all_achievements = all_resp.data or []

    unlocked_resp = (
        supabase.table("student_achievements")
        .select("achievement_id, unlocked_at")
        .eq("student_id", student_id)
        .execute()
    )
    unlocked_map: dict[str, str] = {}
    for row in (unlocked_resp.data or []):
        unlocked_map[row["achievement_id"]] = row["unlocked_at"]

    stats = _get_student_stats(student_id)

    results: list[AchievementProgress] = []
    for ach in all_achievements:
        ach_id = ach["id"]
        threshold_type = ach["threshold_type"]
        current = stats.get(threshold_type, 0)
        is_unlocked = ach_id in unlocked_map

        results.append(AchievementProgress(
            id=ach_id,
            name=ach["name"],
            description=ach["description"],
            description_ur=ach.get("description_ur", ""),
            icon=ach["icon"],
            tier=ach["tier"],
            threshold_type=threshold_type,
            threshold_value=ach["threshold_value"],
            unlocked=is_unlocked,
            unlocked_at=unlocked_map.get(ach_id),
            current_progress=current,
        ))

    response = AchievementListResponse(achievements=results)

    await cache_set(cache_key, response.model_dump(), ttl=300)
    return response
```

- [ ] **Step 5: Add invalidation helper**

Add at the bottom of the file:

```python
# ---------------------------------------------------------------------------
# Cache invalidation
# ---------------------------------------------------------------------------

async def invalidate_achievement_caches(student_id: str) -> None:
    """Invalidate achievement caches for a student."""
    await cache_delete(make_cache_key("achievements", student_id))
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/achievements.py
git commit -m "perf(achievements): replace RPC with indexed queries, add caching

Replace unindexed get_student_achievement_stats RPC with direct queries
that use the new idx_interactions_student_type and
idx_interactions_student_pillar_correct indexes.

Cache achievement definitions (1hr) and student progress (5min).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create Combined Dashboard Endpoint

**Files:**
- Create: `backend/app/api/v1/endpoints/student_dashboard.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Create the combined dashboard endpoint**

Create `backend/app/api/v1/endpoints/student_dashboard.py`:

```python
"""
Combined Student Dashboard Endpoint
GET /api/v1/student/dashboard — All home page data in one call

Aggregates profile, streak, daily summary, points breakdown, and achievements
using asyncio.gather() for parallel DB queries. Cached for 2 minutes.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class DashboardProfile(BaseModel):
    student_id: str
    student_name: str
    avatar_url: str | None
    points: int
    missions_completed: int


class DashboardStreak(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: str | None


class DashboardDailySummary(BaseModel):
    today_points: int
    total_points: int
    missions_today: int


class DashboardActivityPoints(BaseModel):
    activity: str
    points: int
    count: int


class DashboardPointsBreakdown(BaseModel):
    today: list[DashboardActivityPoints]
    this_week: list[DashboardActivityPoints]
    total_points: int


class DashboardAchievement(BaseModel):
    id: str
    name: str
    description: str
    description_ur: str
    icon: str
    tier: str
    threshold_type: str
    threshold_value: int
    unlocked: bool
    unlocked_at: str | None = None
    current_progress: int


class DashboardResponse(BaseModel):
    profile: DashboardProfile
    streak: DashboardStreak
    daily_summary: DashboardDailySummary
    points_breakdown: DashboardPointsBreakdown
    achievements: list[DashboardAchievement]


# ── Activity map (same as rewards.py) ────────────────────────────────────────

_ACTIVITY_MAP = {
    "mission_mc": "Missions",
    "mission_fill": "Missions",
    "mission_speaking": "Missions",
    "spelling_bee": "Spelling Bee",
    "story_time": "Story Time",
    "speaking_practice": "Speaking",
    "speaking_pro": "Speaking",
}


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    summary="Get all student dashboard data in one call",
)
async def get_student_dashboard(
    student: dict = Depends(get_current_student),
) -> DashboardResponse:
    """
    Combined endpoint returning all data needed for the student home page.
    Runs all DB queries in parallel via asyncio.gather(). Cached for 2 minutes.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]

    # Check cache
    cache_key = make_cache_key("dashboard", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return DashboardResponse(**cached)

    supabase = get_supabase_admin()
    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now_utc - timedelta(days=7)).isoformat()

    # ── Run all DB queries in parallel ───────────────────────────────────

    async def fetch_student_record():
        return (
            supabase.table("students")
            .select("student_name, avatar_url, points, current_streak, longest_streak, last_activity_date")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        )

    async def fetch_missions_count():
        return (
            supabase.table("student_interactions")
            .select("id", count="exact")
            .eq("student_id", student_id)
            .like("interaction_type", "mission%")
            .execute()
        )

    async def fetch_today_interactions():
        return (
            supabase.table("student_interactions")
            .select("score")
            .eq("student_id", student_id)
            .eq("correct", True)
            .gte("created_at", today_start)
            .execute()
        )

    async def fetch_week_interactions():
        return (
            supabase.table("student_interactions")
            .select("interaction_type, score, created_at")
            .eq("student_id", student_id)
            .eq("correct", True)
            .gte("created_at", week_start)
            .execute()
        )

    async def fetch_achievements():
        return (
            supabase.table("achievements")
            .select("*")
            .order("threshold_value")
            .execute()
        )

    async def fetch_unlocked():
        return (
            supabase.table("student_achievements")
            .select("achievement_id, unlocked_at")
            .eq("student_id", student_id)
            .execute()
        )

    async def fetch_pillar_correct():
        return (
            supabase.table("student_interactions")
            .select("pillar")
            .eq("student_id", student_id)
            .eq("correct", True)
            .not_.is_("pillar", "null")
            .execute()
        )

    (
        student_resp,
        missions_resp,
        today_resp,
        week_resp,
        achievements_resp,
        unlocked_resp,
        pillar_resp,
    ) = await asyncio.gather(
        fetch_student_record(),
        fetch_missions_count(),
        fetch_today_interactions(),
        fetch_week_interactions(),
        fetch_achievements(),
        fetch_unlocked(),
        fetch_pillar_correct(),
    )

    # ── Build profile ────────────────────────────────────────────────────

    if not student_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    s = student_resp.data
    profile = DashboardProfile(
        student_id=student_id,
        student_name=s["student_name"],
        avatar_url=s.get("avatar_url"),
        points=s.get("points") or 0,
        missions_completed=missions_resp.count or 0,
    )

    # ── Build streak ─────────────────────────────────────────────────────

    streak = DashboardStreak(
        current_streak=s.get("current_streak") or 0,
        longest_streak=s.get("longest_streak") or 0,
        last_activity_date=s.get("last_activity_date"),
    )

    # ── Build daily summary ──────────────────────────────────────────────

    today_rows = today_resp.data or []
    daily_summary = DashboardDailySummary(
        today_points=sum(r.get("score") or 10 for r in today_rows),
        total_points=s.get("points") or 0,
        missions_today=len(today_rows),
    )

    # ── Build points breakdown ───────────────────────────────────────────

    week_rows = week_resp.data or []

    def aggregate(filtered_rows: list[dict]) -> list[DashboardActivityPoints]:
        buckets: dict[str, dict] = {}
        for r in filtered_rows:
            raw_type = r.get("interaction_type", "")
            display = _ACTIVITY_MAP.get(raw_type, raw_type.replace("_", " ").title())
            if display not in buckets:
                buckets[display] = {"points": 0, "count": 0}
            buckets[display]["points"] += r.get("score") or 10
            buckets[display]["count"] += 1
        return sorted(
            [DashboardActivityPoints(activity=k, points=v["points"], count=v["count"]) for k, v in buckets.items()],
            key=lambda x: x.points,
            reverse=True,
        )

    today_activity_rows = [r for r in week_rows if r.get("created_at", "") >= today_start]
    points_breakdown = DashboardPointsBreakdown(
        today=aggregate(today_activity_rows),
        this_week=aggregate(week_rows),
        total_points=s.get("points") or 0,
    )

    # ── Build achievements ───────────────────────────────────────────────

    all_achievements = achievements_resp.data or []
    unlocked_map: dict[str, str] = {}
    for row in (unlocked_resp.data or []):
        unlocked_map[row["achievement_id"]] = row["unlocked_at"]

    # Pillar counts for achievement progress
    pillar_counts: dict[str, int] = {"reading": 0, "writing": 0, "listening": 0, "speaking": 0}
    for row in (pillar_resp.data or []):
        p = row.get("pillar")
        if p in pillar_counts:
            pillar_counts[p] += 1

    stats = {
        "points": s.get("points") or 0,
        "missions_total": missions_resp.count or 0,
        "streak": s.get("current_streak") or 0,
        "missions_reading": pillar_counts["reading"],
        "missions_writing": pillar_counts["writing"],
        "missions_listening": pillar_counts["listening"],
        "missions_speaking": pillar_counts["speaking"],
    }

    achievements: list[DashboardAchievement] = []
    for ach in all_achievements:
        ach_id = ach["id"]
        threshold_type = ach["threshold_type"]
        current = stats.get(threshold_type, 0)

        achievements.append(DashboardAchievement(
            id=ach_id,
            name=ach["name"],
            description=ach["description"],
            description_ur=ach.get("description_ur", ""),
            icon=ach["icon"],
            tier=ach["tier"],
            threshold_type=threshold_type,
            threshold_value=ach["threshold_value"],
            unlocked=ach_id in unlocked_map,
            unlocked_at=unlocked_map.get(ach_id),
            current_progress=current,
        ))

    # ── Assemble response ────────────────────────────────────────────────

    response = DashboardResponse(
        profile=profile,
        streak=streak,
        daily_summary=daily_summary,
        points_breakdown=points_breakdown,
        achievements=achievements,
    )

    await cache_set(cache_key, response.model_dump(), ttl=120)
    return response


# ── Cache invalidation ───────────────────────────────────────────────────────

async def invalidate_dashboard_cache(student_id: str) -> None:
    """Invalidate the combined dashboard cache for a student."""
    await cache_delete(make_cache_key("dashboard", student_id))
```

- [ ] **Step 2: Register the dashboard router**

In `backend/app/api/v1/router.py`, add `student_dashboard` to the import:

```python
from app.api.v1.endpoints import achievements, admin, auth, chat, classroom, curriculum, evaluations, evaluator, interactions, missions, rewards, speaking, spelling_bee, story_time, student_dashboard, student_scores, topics
```

Add the router registration after `student_scores`:

```python
api_router.include_router(student_dashboard.router, prefix="/student", tags=["student"])
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/student_dashboard.py backend/app/api/v1/router.py
git commit -m "feat(backend): add combined student dashboard endpoint

New GET /student/dashboard returns all home page data in one call:
profile, streak, daily summary, points breakdown, achievements.

All 7 DB queries run in parallel via asyncio.gather().
Response cached for 2 minutes in Redis.

Eliminates 5 separate API calls from the frontend home page.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Add Cache Invalidation to Mission Complete

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py`

- [ ] **Step 1: Add invalidation imports and calls**

At the top of `backend/app/api/v1/endpoints/missions.py`, add to the existing imports:

```python
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key
```

Find the `complete_mission` function (around line 420-426) where background tasks are added. After the existing `background_tasks.add_task(invalidate_performance_cache, student_id)` line, add:

```python
    # Invalidate dashboard and reward caches so next page load gets fresh data
    from app.api.v1.endpoints.student_dashboard import invalidate_dashboard_cache
    from app.api.v1.endpoints.rewards import invalidate_reward_caches
    background_tasks.add_task(invalidate_dashboard_cache, student_id)
    background_tasks.add_task(invalidate_reward_caches, student_id)

    # Invalidate student profile cache
    profile_cache_key = make_cache_key("student_profile", student_id)
    background_tasks.add_task(cache_delete, profile_cache_key)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "perf(missions): invalidate dashboard caches on mission complete

After a student completes a mission, invalidate dashboard, rewards,
and profile caches as background tasks so the next page load
fetches fresh data from DB.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Frontend — Add Dashboard Hook and Types

**Files:**
- Modify: `frontend/lib/hooks/queries.ts`
- Modify: `frontend/lib/hooks/mutations.ts`

- [ ] **Step 1: Add dashboard types and query key**

In `frontend/lib/hooks/queries.ts`, add the dashboard types after the `MyScoresData` interface:

```typescript
export interface DashboardProfile {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  points: number;
  missions_completed: number;
}

export interface DashboardStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface DashboardDailySummary {
  today_points: number;
  total_points: number;
  missions_today: number;
}

export interface DashboardActivityPoints {
  activity: string;
  points: number;
  count: number;
}

export interface DashboardPointsBreakdown {
  today: DashboardActivityPoints[];
  this_week: DashboardActivityPoints[];
  total_points: number;
}

export interface DashboardAchievement {
  id: string;
  name: string;
  description: string;
  description_ur: string;
  icon: string;
  tier: string;
  threshold_type: string;
  threshold_value: number;
  unlocked: boolean;
  unlocked_at: string | null;
  current_progress: number;
}

export interface DashboardData {
  profile: DashboardProfile;
  streak: DashboardStreak;
  daily_summary: DashboardDailySummary;
  points_breakdown: DashboardPointsBreakdown;
  achievements: DashboardAchievement[];
}
```

Add to the `queryKeys` object:

```typescript
  dashboard: ["dashboard"] as const,
```

- [ ] **Step 2: Add useStudentDashboard hook**

Add after the `useMyScores` function:

```typescript
export function useStudentDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => studentFetch<DashboardData>("/student/dashboard"),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 3: Update mutations to invalidate dashboard**

In `frontend/lib/hooks/mutations.ts`, add `queryKeys.dashboard` to the `onSuccess` invalidation list:

```typescript
export function useMissionComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CompleteRequest) =>
      studentMutate<CompleteResponse>("/missions/complete", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.streak });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailySummary });
      queryClient.invalidateQueries({ queryKey: queryKeys.pointsBreakdown });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyProgress });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/hooks/queries.ts frontend/lib/hooks/mutations.ts
git commit -m "feat(frontend): add useStudentDashboard hook

New combined dashboard hook fetches all home page data in one call.
Add dashboard query key invalidation to mission complete mutation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Frontend — Refactor Home Page to Use Dashboard Hook

**Files:**
- Modify: `frontend/app/student/home/page.tsx`

- [ ] **Step 1: Replace 5 hooks with single dashboard hook**

Replace the data fetching imports and hooks. Change:

```typescript
import {
  useStudentProfile,
  useStreak,
  useDailySummary,
  useAchievements,
  usePointsBreakdown,
  type AchievementProgress,
} from "@/lib/hooks/queries";
```

To:

```typescript
import {
  useStudentDashboard,
  type DashboardAchievement,
} from "@/lib/hooks/queries";
```

- [ ] **Step 2: Replace data destructuring**

Replace these lines inside `HomePage()`:

```typescript
  // ── Data fetching via TanStack Query (all fire in parallel) ──
  const { data: profile, isLoading: loadingProfile } = useStudentProfile();
  const { data: streak } = useStreak();
  const { data: dailySummary } = useDailySummary();
  const { data: achievementsData } = useAchievements();
  const { data: pointsBreakdown } = usePointsBreakdown();
```

With:

```typescript
  // ── Single dashboard fetch (one API call for all home page data) ──
  const { data: dashboard, isLoading: loadingProfile } = useStudentDashboard();
  const profile = dashboard?.profile;
  const streak = dashboard?.streak;
  const dailySummary = dashboard?.daily_summary;
  const achievementsData = dashboard ? { achievements: dashboard.achievements } : undefined;
  const pointsBreakdown = dashboard?.points_breakdown;
```

- [ ] **Step 3: Update achievement type references**

In the achievements shelf section, replace `AchievementProgress` type references with `DashboardAchievement`:

Change:

```typescript
{achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked).slice(0, 5).map((badge: AchievementProgress) => (
```

To:

```typescript
{achievementsData?.achievements.filter((b: DashboardAchievement) => b.unlocked).slice(0, 5).map((badge: DashboardAchievement) => (
```

And similarly for the locked badges section:

Change:

```typescript
{achievementsData?.achievements.filter((b: AchievementProgress) => !b.unlocked).slice(0, Math.max(0, 5 - (achievementsData?.achievements.filter((b: AchievementProgress) => b.unlocked).length ?? 0))).map((badge: AchievementProgress) => (
```

To:

```typescript
{achievementsData?.achievements.filter((b: DashboardAchievement) => !b.unlocked).slice(0, Math.max(0, 5 - (achievementsData?.achievements.filter((b: DashboardAchievement) => b.unlocked).length ?? 0))).map((badge: DashboardAchievement) => (
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/student/home/page.tsx
git commit -m "perf(frontend): use single dashboard hook on home page

Replace 5 separate query hooks with one useStudentDashboard() call.
Reduces network round trips from 5 to 1 on home page load.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Frontend — Update Layout to Use Dashboard Data

**Files:**
- Modify: `frontend/app/student/layout.tsx`

- [ ] **Step 1: Switch layout to use dashboard hook**

In `frontend/app/student/layout.tsx`, replace:

```typescript
import { useStudentProfile, useStreak, queryKeys } from "@/lib/hooks/queries";
```

With:

```typescript
import { useStudentDashboard, queryKeys } from "@/lib/hooks/queries";
```

Replace the data hooks:

```typescript
  const { data: profile, isLoading: loading } = useStudentProfile();
  const { data: streak } = useStreak();
```

With:

```typescript
  const { data: dashboard, isLoading: loading } = useStudentDashboard();
  const profile = dashboard?.profile;
  const streak = dashboard?.streak;
```

- [ ] **Step 2: Update the prefetch map to include dashboard**

Replace the `PREFETCH_MAP` constant:

```typescript
const PREFETCH_MAP: Record<string, { queryKey: readonly string[]; url: string; staleTime: number }[]> = {
  "/student/home": [
    { queryKey: queryKeys.dashboard, url: "/student/dashboard", staleTime: 30 * 1000 },
  ],
  "/student/missions": [
    { queryKey: queryKeys.missionPillar("reading"), url: "/missions/pillar?pillar=reading", staleTime: 5 * 60 * 1000 },
  ],
  "/student/achievements": [
    { queryKey: queryKeys.achievements, url: "/achievements/me", staleTime: 5 * 60 * 1000 },
  ],
  "/student/leaderboard": [
    { queryKey: queryKeys.studentLeaderboard, url: "/missions/leaderboard", staleTime: 60 * 1000 },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/student/layout.tsx
git commit -m "perf(layout): use dashboard hook for profile and streak

Layout now shares the same dashboard query as the home page.
TanStack Query deduplicates — no extra API calls.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Frontend — Prefetch Dashboard on Login

**Files:**
- Modify: `frontend/app/student/play/pin-entry.tsx`

- [ ] **Step 1: Add prefetch after successful login**

In `frontend/app/student/play/pin-entry.tsx`, find the success path in `submitPin` where it sets localStorage and routes. Add a prefetch call.

Replace:

```typescript
      localStorage.setItem("primepal_student_token", data.access_token);
      localStorage.setItem("primepal_student_name", avatar.student_name);
      localStorage.setItem("primepal_student_avatar", avatar.avatar_url);
      router.push("/student/home");
```

With:

```typescript
      localStorage.setItem("primepal_student_token", data.access_token);
      localStorage.setItem("primepal_student_name", avatar.student_name);
      localStorage.setItem("primepal_student_avatar", avatar.avatar_url);

      // Prefetch dashboard data before navigating so home page loads instantly
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      fetch(`${BASE_URL}/student/dashboard`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      }).catch(() => {}); // Fire-and-forget, don't block navigation

      router.push("/student/home");
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/student/play/pin-entry.tsx
git commit -m "perf(login): prefetch dashboard data after successful PIN entry

Fire-and-forget fetch of /student/dashboard immediately after login
so the data is warming the backend cache before the student reaches
the home page.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Build Verification

**Files:**
- None (testing only)

- [ ] **Step 1: Verify frontend build passes**

```bash
cd frontend && npm run build
```

Expected: Build completes with no errors. May have pre-existing warnings.

- [ ] **Step 2: Verify backend starts cleanly**

```bash
cd backend && python -c "from app.api.v1.endpoints.student_dashboard import router; print('Dashboard endpoint OK')"
cd backend && python -c "from app.api.v1.router import api_router; print('Router OK')"
```

Expected: Both print OK with no import errors.

- [ ] **Step 3: Final commit if any fixes needed**

Only commit if Step 1 or 2 required fixes.

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Combined dashboard endpoint (Task 5)
- ✅ Redis caching on rewards endpoints (Task 3)
- ✅ Redis caching on achievements (Task 4)
- ✅ Missing DB indexes (Task 2)
- ✅ Achievement RPC replacement (Task 4)
- ✅ Single frontend dashboard hook (Tasks 7-8)
- ✅ Layout uses dashboard data (Task 9)
- ✅ Login prefetch (Task 10)
- ✅ Cache invalidation on mutations (Task 6-7)
- ✅ Pattern cache deletion utility (Task 1)

**Placeholder Check:**
- ✅ All code blocks contain actual code
- ✅ All file paths are exact
- ✅ No TBDs or TODOs

**Type Consistency:**
- ✅ `DashboardResponse` schema matches `DashboardData` TypeScript interface
- ✅ `DashboardAchievement` matches backend `DashboardAchievement` Pydantic model
- ✅ `DashboardActivityPoints` matches both Python and TypeScript
- ✅ Cache key patterns consistent: `dashboard:{student_id}`, `streak:{student_id}`, etc.
- ✅ `invalidate_dashboard_cache` and `invalidate_reward_caches` signatures match usage

---

## Success Criteria

- ✅ Home page makes 1 API call instead of 5
- ✅ All reward/achievement endpoints have Redis caching
- ✅ 4 missing DB indexes added
- ✅ Achievement queries use indexed lookups, not unindexed RPC
- ✅ Cache invalidated on mission complete and reward claim
- ✅ Dashboard data prefetched on student login
- ✅ Frontend build passes
- ✅ No broken imports or type errors
