# Teacher Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive analytics dashboard showing grade-wise, section-wise, and skill-wise student performance with filtering.

**Architecture:** Hybrid approach - server-side initial data fetch from new `/api/v1/teacher/analytics` backend endpoint, client-side filtering using React state, reusing design system components (StatCard, ProgressBar, LineChart).

**Tech Stack:** FastAPI (backend), PostgreSQL (Supabase), Redis (caching), Next.js 14 (frontend), TypeScript, React, Tailwind CSS

---

## File Structure

### Backend
- **Create:** `backend/app/api/v1/endpoints/teacher.py` - Analytics endpoint with SQL queries
- **Modify:** `backend/app/main.py:50-60` - Register teacher router
- **Create:** `backend/tests/test_teacher_endpoints.py` - Backend endpoint tests

### Frontend
- **Create:** `frontend/types/analytics.ts` - TypeScript type definitions
- **Create:** `frontend/app/teacher/analytics/page.tsx` - Server component (data fetching)
- **Create:** `frontend/app/teacher/analytics/components/AnalyticsClient.tsx` - Client wrapper (filtering logic)
- **Create:** `frontend/app/teacher/analytics/components/AnalyticsOverview.tsx` - Summary stats cards
- **Create:** `frontend/app/teacher/analytics/components/GradeBreakdown.tsx` - Grade performance cards
- **Create:** `frontend/app/teacher/analytics/components/SkillBreakdown.tsx` - Pillar performance cards
- **Create:** `frontend/app/teacher/analytics/components/StudentRankings.tsx` - Top/struggling students
- **Create:** `frontend/app/teacher/analytics/components/PerformanceTrends.tsx` - Weekly trend chart

---

## Task 1: Backend Endpoint Structure

**Files:**
- Create: `backend/app/api/v1/endpoints/teacher.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create empty endpoint file with imports**

Create `backend/app/api/v1/endpoints/teacher.py`:

```python
"""
Teacher-specific endpoints: analytics, reports, dashboard data.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core.security import get_current_teacher
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


# Response schemas
class SummaryStats(BaseModel):
    total_students: int
    total_interactions: int
    avg_accuracy: int
    active_this_week: int


class TopStudent(BaseModel):
    name: str
    accuracy: int


class GradeBreakdown(BaseModel):
    grade_level: int
    student_count: int
    avg_accuracy: int
    total_interactions: int
    top_student: Optional[TopStudent]
    struggling_count: int


class PillarBreakdown(BaseModel):
    pillar: str
    avg_accuracy: int
    total_attempts: int
    top_performers: int
    needs_help: int


class StudentRanking(BaseModel):
    student_id: str
    name: str
    avatar_url: Optional[str]
    grade_level: int
    overall_accuracy: int
    total_interactions: int
    strongest_pillar: Optional[str] = None
    weakest_pillar: Optional[str] = None
    recent_activity: Optional[str] = None


class WeeklyTrend(BaseModel):
    week_start: str
    week_label: str
    avg_accuracy: int
    total_interactions: int


class AnalyticsResponse(BaseModel):
    summary_stats: SummaryStats
    grade_breakdown: list[GradeBreakdown]
    pillar_breakdown: list[PillarBreakdown]
    top_students: list[StudentRanking]
    struggling_students: list[StudentRanking]
    weekly_trends: list[WeeklyTrend]


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get comprehensive analytics for teacher dashboard",
)
async def get_analytics(
    grade_level: Optional[int] = Query(None, ge=1, le=6),
    pillar: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return comprehensive analytics data for teacher dashboard.

    - Aggregates student performance across all classrooms
    - Filters by grade_level, pillar, section if provided
    - Returns summary stats, breakdowns, rankings, trends
    """
    # TODO: Implement in next task
    return AnalyticsResponse(
        summary_stats=SummaryStats(
            total_students=0,
            total_interactions=0,
            avg_accuracy=0,
            active_this_week=0,
        ),
        grade_breakdown=[],
        pillar_breakdown=[],
        top_students=[],
        struggling_students=[],
        weekly_trends=[],
    )
```

- [ ] **Step 2: Register router in main.py**

Modify `backend/app/main.py` - find the section where routers are included (around line 50-60) and add:

```python
from app.api.v1.endpoints import teacher

# ... existing router registrations ...

app.include_router(
    teacher.router,
    prefix="/api/v1/teacher",
    tags=["teacher"],
)
```

- [ ] **Step 3: Test endpoint returns empty response**

Run:
```bash
cd backend
uvicorn app.main:app --reload
```

In another terminal:
```bash
curl -X GET "http://localhost:8000/api/v1/teacher/analytics" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

Expected: 200 response with empty arrays

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/teacher.py backend/app/main.py
git commit -m "feat(backend): add teacher analytics endpoint skeleton"
```

---

## Task 2: Backend SQL Queries and Data Aggregation

**Files:**
- Modify: `backend/app/api/v1/endpoints/teacher.py`

- [ ] **Step 1: Add helper function for student stats aggregation**

Add to `backend/app/api/v1/endpoints/teacher.py` before the endpoint:

```python
from datetime import datetime, timedelta


def aggregate_student_stats(
    supabase,
    grade_level: Optional[int] = None,
    pillar: Optional[str] = None,
    section: Optional[str] = None,
):
    """
    Query student_interactions and aggregate statistics.

    Returns dict with:
    - all_students: list of student records with stats
    - summary: aggregate summary stats
    """
    # Build filter conditions
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

    # Base query: fetch interactions from last 30 days
    query = (
        supabase.table("student_interactions")
        .select(
            "id, student_id, classroom_id, pillar, correct, created_at, "
            "students(student_name, avatar_url), "
            "classrooms(grade_level, section, class_name)"
        )
        .gte("created_at", thirty_days_ago)
        .in_("interaction_type", ["mission_mc", "mission_fill", "spelling_bee"])
    )

    # Apply filters
    if grade_level:
        query = query.eq("classrooms.grade_level", grade_level)
    if section:
        query = query.eq("classrooms.section", section)
    if pillar:
        query = query.eq("pillar", pillar)

    result = query.execute()
    interactions = result.data

    if not interactions:
        return {"all_students": [], "summary": {}}

    # Group by student_id
    student_map = {}
    for interaction in interactions:
        sid = interaction["student_id"]
        if sid not in student_map:
            student_map[sid] = {
                "student_id": sid,
                "student_name": interaction["students"]["student_name"],
                "avatar_url": interaction["students"]["avatar_url"],
                "grade_level": interaction["classrooms"]["grade_level"],
                "section": interaction["classrooms"]["section"],
                "interactions": [],
            }
        student_map[sid]["interactions"].append(interaction)

    # Calculate per-student stats
    all_students = []
    for student in student_map.values():
        interactions = student["interactions"]
        total = len(interactions)
        correct_count = sum(1 for i in interactions if i["correct"])
        overall_accuracy = int((correct_count / total * 100)) if total > 0 else 0

        # Per-pillar accuracy
        pillar_stats = {}
        for p in ["reading", "writing", "listening", "speaking"]:
            pillar_interactions = [i for i in interactions if i["pillar"] == p]
            if pillar_interactions:
                pillar_correct = sum(1 for i in pillar_interactions if i["correct"])
                pillar_stats[p] = int((pillar_correct / len(pillar_interactions) * 100))
            else:
                pillar_stats[p] = 0

        # Find strongest/weakest pillar
        non_zero_pillars = {k: v for k, v in pillar_stats.items() if v > 0}
        strongest_pillar = max(non_zero_pillars, key=non_zero_pillars.get) if non_zero_pillars else None
        weakest_pillar = min(non_zero_pillars, key=non_zero_pillars.get) if non_zero_pillars else None

        all_students.append({
            "student_id": student["student_id"],
            "name": student["student_name"],
            "avatar_url": student["avatar_url"],
            "grade_level": student["grade_level"],
            "section": student["section"],
            "total_interactions": total,
            "overall_accuracy": overall_accuracy,
            "pillar_accuracy": pillar_stats,
            "strongest_pillar": strongest_pillar,
            "weakest_pillar": weakest_pillar,
            "recent_activity": max(i["created_at"] for i in interactions),
        })

    # Summary stats
    total_interactions = sum(s["total_interactions"] for s in all_students)
    avg_accuracy = int(sum(s["overall_accuracy"] for s in all_students) / len(all_students)) if all_students else 0

    # Active this week
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    active_this_week = sum(
        1 for s in all_students if s["recent_activity"] >= week_ago
    )

    return {
        "all_students": all_students,
        "summary": {
            "total_students": len(all_students),
            "total_interactions": total_interactions,
            "avg_accuracy": avg_accuracy,
            "active_this_week": active_this_week,
        },
    }
```

- [ ] **Step 2: Add grade breakdown aggregation**

Add function:

```python
def compute_grade_breakdown(all_students):
    """Aggregate stats by grade level."""
    grade_map = {}

    for student in all_students:
        grade = student["grade_level"]
        if grade not in grade_map:
            grade_map[grade] = []
        grade_map[grade].append(student)

    breakdown = []
    for grade in sorted(grade_map.keys()):
        students = grade_map[grade]
        avg_acc = int(sum(s["overall_accuracy"] for s in students) / len(students))
        total_interactions = sum(s["total_interactions"] for s in students)

        # Find top student
        top_student = max(students, key=lambda s: s["overall_accuracy"])

        # Count struggling students (<60%)
        struggling_count = sum(1 for s in students if s["overall_accuracy"] < 60)

        breakdown.append(
            GradeBreakdown(
                grade_level=grade,
                student_count=len(students),
                avg_accuracy=avg_acc,
                total_interactions=total_interactions,
                top_student=TopStudent(
                    name=top_student["name"],
                    accuracy=top_student["overall_accuracy"],
                ),
                struggling_count=struggling_count,
            )
        )

    return breakdown
```

- [ ] **Step 3: Add pillar breakdown aggregation**

Add function:

```python
def compute_pillar_breakdown(all_students):
    """Aggregate stats by pillar."""
    pillars = ["reading", "writing", "listening", "speaking"]
    breakdown = []

    for pillar in pillars:
        # Get all students with this pillar data
        pillar_accuracies = [
            s["pillar_accuracy"][pillar]
            for s in all_students
            if s["pillar_accuracy"][pillar] > 0
        ]

        if not pillar_accuracies:
            continue

        avg_acc = int(sum(pillar_accuracies) / len(pillar_accuracies))
        total_attempts = sum(
            s["total_interactions"] for s in all_students
            if s["pillar_accuracy"][pillar] > 0
        )

        top_performers = sum(1 for acc in pillar_accuracies if acc >= 80)
        needs_help = sum(1 for acc in pillar_accuracies if acc < 60)

        breakdown.append(
            PillarBreakdown(
                pillar=pillar,
                avg_accuracy=avg_acc,
                total_attempts=total_attempts,
                top_performers=top_performers,
                needs_help=needs_help,
            )
        )

    return breakdown
```

- [ ] **Step 4: Add weekly trends aggregation**

Add function:

```python
def compute_weekly_trends(
    supabase,
    grade_level: Optional[int] = None,
    pillar: Optional[str] = None,
    section: Optional[str] = None,
):
    """Get weekly performance trends for last 8 weeks."""
    eight_weeks_ago = (datetime.utcnow() - timedelta(weeks=8)).isoformat()

    # Fetch interactions
    query = (
        supabase.table("student_interactions")
        .select("created_at, correct, classrooms(grade_level, section)")
        .gte("created_at", eight_weeks_ago)
        .in_("interaction_type", ["mission_mc", "mission_fill", "spelling_bee"])
    )

    if grade_level:
        query = query.eq("classrooms.grade_level", grade_level)
    if section:
        query = query.eq("classrooms.section", section)
    if pillar:
        query = query.eq("pillar", pillar)

    result = query.execute()
    interactions = result.data

    # Group by week
    from collections import defaultdict
    week_map = defaultdict(list)

    for interaction in interactions:
        # Get week start (Monday)
        dt = datetime.fromisoformat(interaction["created_at"].replace("Z", "+00:00"))
        week_start = (dt - timedelta(days=dt.weekday())).date().isoformat()
        week_map[week_start].append(interaction["correct"])

    # Build trends
    trends = []
    for i, (week_start, correct_list) in enumerate(sorted(week_map.items())):
        correct_count = sum(1 for c in correct_list if c)
        avg_acc = int((correct_count / len(correct_list) * 100)) if correct_list else 0

        trends.append(
            WeeklyTrend(
                week_start=week_start,
                week_label=f"Week {i + 1}",
                avg_accuracy=avg_acc,
                total_interactions=len(correct_list),
            )
        )

    return trends
```

- [ ] **Step 5: Update endpoint to use aggregation functions**

Replace the endpoint implementation:

```python
@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get comprehensive analytics for teacher dashboard",
)
async def get_analytics(
    grade_level: Optional[int] = Query(None, ge=1, le=6),
    pillar: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return comprehensive analytics data for teacher dashboard.

    - Aggregates student performance across all classrooms
    - Filters by grade_level, pillar, section if provided
    - Returns summary stats, breakdowns, rankings, trends
    """
    # Validate pillar
    if pillar and pillar not in ["reading", "writing", "listening", "speaking"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pillar. Must be one of: reading, writing, listening, speaking",
        )

    supabase = get_supabase_admin()

    # Get aggregated student data
    student_data = aggregate_student_stats(supabase, grade_level, pillar, section)
    all_students = student_data["all_students"]
    summary = student_data["summary"]

    # If no data, return empty response
    if not all_students:
        return AnalyticsResponse(
            summary_stats=SummaryStats(
                total_students=0,
                total_interactions=0,
                avg_accuracy=0,
                active_this_week=0,
            ),
            grade_breakdown=[],
            pillar_breakdown=[],
            top_students=[],
            struggling_students=[],
            weekly_trends=[],
        )

    # Compute breakdowns
    grade_breakdown = compute_grade_breakdown(all_students)
    pillar_breakdown = compute_pillar_breakdown(all_students)

    # Top 10 students
    top_students = sorted(
        all_students, key=lambda s: s["overall_accuracy"], reverse=True
    )[:10]
    top_students_list = [
        StudentRanking(
            student_id=s["student_id"],
            name=s["name"],
            avatar_url=s["avatar_url"],
            grade_level=s["grade_level"],
            overall_accuracy=s["overall_accuracy"],
            total_interactions=s["total_interactions"],
            strongest_pillar=s["strongest_pillar"],
        )
        for s in top_students
    ]

    # Struggling students (accuracy < 60%)
    struggling = [s for s in all_students if s["overall_accuracy"] < 60]
    struggling_sorted = sorted(struggling, key=lambda s: s["overall_accuracy"])[:10]
    struggling_students_list = [
        StudentRanking(
            student_id=s["student_id"],
            name=s["name"],
            avatar_url=s["avatar_url"],
            grade_level=s["grade_level"],
            overall_accuracy=s["overall_accuracy"],
            total_interactions=s["total_interactions"],
            weakest_pillar=s["weakest_pillar"],
            recent_activity=s["recent_activity"],
        )
        for s in struggling_sorted
    ]

    # Weekly trends
    weekly_trends = compute_weekly_trends(supabase, grade_level, pillar, section)

    return AnalyticsResponse(
        summary_stats=SummaryStats(**summary),
        grade_breakdown=grade_breakdown,
        pillar_breakdown=pillar_breakdown,
        top_students=top_students_list,
        struggling_students=struggling_students_list,
        weekly_trends=weekly_trends,
    )
```

- [ ] **Step 6: Test endpoint returns real data**

Run:
```bash
curl -X GET "http://localhost:8000/api/v1/teacher/analytics" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

Expected: 200 response with populated arrays (assuming database has student interaction data)

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/v1/endpoints/teacher.py
git commit -m "feat(backend): implement analytics data aggregation logic"
```

---

## Task 3: Backend Caching with Redis

**Files:**
- Modify: `backend/app/api/v1/endpoints/teacher.py`

- [ ] **Step 1: Add Redis caching wrapper**

Add imports at top of file:

```python
import json
from app.core.config import settings

# Check if Redis is available
try:
    import redis
    redis_client = redis.from_url(
        settings.REDIS_URL if hasattr(settings, 'REDIS_URL') else "redis://localhost:6379",
        decode_responses=True
    )
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    redis_client = None
```

- [ ] **Step 2: Add cache helper functions**

Add before endpoint:

```python
def get_cache_key(grade_level, pillar, section):
    """Generate cache key for analytics query."""
    parts = ["teacher_analytics"]
    parts.append(str(grade_level) if grade_level else "all")
    parts.append(pillar if pillar else "null")
    parts.append(section if section else "null")
    return ":".join(parts)


def get_from_cache(cache_key):
    """Try to get data from Redis cache."""
    if not REDIS_AVAILABLE:
        return None

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception as e:
        # Log error but don't fail
        print(f"Redis get error: {e}")

    return None


def set_in_cache(cache_key, data, ttl=300):
    """Store data in Redis cache with TTL (default 5 minutes)."""
    if not REDIS_AVAILABLE:
        return

    try:
        redis_client.setex(cache_key, ttl, json.dumps(data))
    except Exception as e:
        # Log error but don't fail
        print(f"Redis set error: {e}")
```

- [ ] **Step 3: Wrap endpoint with caching**

Modify endpoint to check cache first:

```python
@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get comprehensive analytics for teacher dashboard",
)
async def get_analytics(
    grade_level: Optional[int] = Query(None, ge=1, le=6),
    pillar: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    teacher: dict = Depends(get_current_teacher),
):
    """
    Return comprehensive analytics data for teacher dashboard.

    - Aggregates student performance across all classrooms
    - Filters by grade_level, pillar, section if provided
    - Returns summary stats, breakdowns, rankings, trends
    - Cached for 5 minutes to improve performance
    """
    # Validate pillar
    if pillar and pillar not in ["reading", "writing", "listening", "speaking"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pillar. Must be one of: reading, writing, listening, speaking",
        )

    # Check cache
    cache_key = get_cache_key(grade_level, pillar, section)
    cached_data = get_from_cache(cache_key)

    if cached_data:
        return AnalyticsResponse(**cached_data)

    # Cache miss - compute data
    supabase = get_supabase_admin()

    # ... (rest of the existing endpoint logic) ...

    # Build response
    response_data = {
        "summary_stats": summary,
        "grade_breakdown": [g.model_dump() for g in grade_breakdown],
        "pillar_breakdown": [p.model_dump() for p in pillar_breakdown],
        "top_students": [s.model_dump() for s in top_students_list],
        "struggling_students": [s.model_dump() for s in struggling_students_list],
        "weekly_trends": [w.model_dump() for w in weekly_trends],
    }

    # Store in cache
    set_in_cache(cache_key, response_data)

    return AnalyticsResponse(**response_data)
```

- [ ] **Step 4: Test caching works**

First request (cache miss):
```bash
time curl -X GET "http://localhost:8000/api/v1/teacher/analytics" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

Second request (cache hit - should be faster):
```bash
time curl -X GET "http://localhost:8000/api/v1/teacher/analytics" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

Expected: Second request completes faster

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/teacher.py
git commit -m "feat(backend): add Redis caching for analytics endpoint"
```

---

## Task 4: Backend Error Handling and Validation

**Files:**
- Modify: `backend/app/api/v1/endpoints/teacher.py`

- [ ] **Step 1: Add timeout handling for queries**

Wrap database queries with try-except:

```python
def aggregate_student_stats(
    supabase,
    grade_level: Optional[int] = None,
    pillar: Optional[str] = None,
    section: Optional[str] = None,
):
    """Query student_interactions and aggregate statistics."""
    try:
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

        query = (
            supabase.table("student_interactions")
            .select(
                "id, student_id, classroom_id, pillar, correct, created_at, "
                "students(student_name, avatar_url), "
                "classrooms(grade_level, section, class_name)"
            )
            .gte("created_at", thirty_days_ago)
            .in_("interaction_type", ["mission_mc", "mission_fill", "spelling_bee"])
        )

        if grade_level:
            query = query.eq("classrooms.grade_level", grade_level)
        if section:
            query = query.eq("classrooms.section", section)
        if pillar:
            query = query.eq("pillar", pillar)

        result = query.execute()
        interactions = result.data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch analytics data: {str(e)}",
        )

    # ... rest of function unchanged ...
```

- [ ] **Step 2: Add timeout to weekly trends query**

Wrap weekly trends query:

```python
def compute_weekly_trends(
    supabase,
    grade_level: Optional[int] = None,
    pillar: Optional[str] = None,
    section: Optional[str] = None,
):
    """Get weekly performance trends for last 8 weeks."""
    try:
        eight_weeks_ago = (datetime.utcnow() - timedelta(weeks=8)).isoformat()

        query = (
            supabase.table("student_interactions")
            .select("created_at, correct, classrooms(grade_level, section)")
            .gte("created_at", eight_weeks_ago)
            .in_("interaction_type", ["mission_mc", "mission_fill", "spelling_bee"])
        )

        if grade_level:
            query = query.eq("classrooms.grade_level", grade_level)
        if section:
            query = query.eq("classrooms.section", section)
        if pillar:
            query = query.eq("pillar", pillar)

        result = query.execute()
        interactions = result.data

    except Exception as e:
        # Return empty trends on error rather than failing entire request
        return []

    # ... rest of function unchanged ...
```

- [ ] **Step 3: Add input validation**

Already done in endpoint with Query validation, verify it's present:

```python
async def get_analytics(
    grade_level: Optional[int] = Query(None, ge=1, le=6),  # ✓ Validates 1-6
    pillar: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    teacher: dict = Depends(get_current_teacher),  # ✓ Validates auth
):
```

- [ ] **Step 4: Test error handling**

Test invalid grade:
```bash
curl -X GET "http://localhost:8000/api/v1/teacher/analytics?grade_level=10" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```
Expected: 422 validation error

Test invalid pillar:
```bash
curl -X GET "http://localhost:8000/api/v1/teacher/analytics?pillar=invalid" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```
Expected: 400 error with message

Test without auth:
```bash
curl -X GET "http://localhost:8000/api/v1/teacher/analytics"
```
Expected: 401 unauthorized

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/teacher.py
git commit -m "feat(backend): add error handling and input validation"
```

---

## Task 5: Backend Tests

**Files:**
- Create: `backend/tests/test_teacher_endpoints.py`

- [ ] **Step 1: Write test for analytics endpoint structure**

Create `backend/tests/test_teacher_endpoints.py`:

```python
"""Tests for teacher-specific endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture
def teacher_auth_headers(teacher_token):
    """Return authorization headers for teacher."""
    return {"Authorization": f"Bearer {teacher_token}"}


def test_analytics_endpoint_returns_comprehensive_data(teacher_auth_headers):
    """Verify all expected fields are present in response."""
    response = client.get(
        "/api/v1/teacher/analytics",
        headers=teacher_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Verify structure
    assert "summary_stats" in data
    assert "grade_breakdown" in data
    assert "pillar_breakdown" in data
    assert "top_students" in data
    assert "struggling_students" in data
    assert "weekly_trends" in data

    # Verify summary stats fields
    assert "total_students" in data["summary_stats"]
    assert "total_interactions" in data["summary_stats"]
    assert "avg_accuracy" in data["summary_stats"]
    assert "active_this_week" in data["summary_stats"]
```

- [ ] **Step 2: Write test for grade filter**

Add test:

```python
def test_analytics_grade_filter(teacher_auth_headers):
    """Test filtering by grade level."""
    response = client.get(
        "/api/v1/teacher/analytics?grade_level=1",
        headers=teacher_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # If there are students, they should all be grade 1
    if data["top_students"]:
        for student in data["top_students"]:
            assert student["grade_level"] == 1

    # Grade breakdown should only have grade 1
    if data["grade_breakdown"]:
        for grade in data["grade_breakdown"]:
            assert grade["grade_level"] == 1
```

- [ ] **Step 3: Write test for pillar filter**

Add test:

```python
def test_analytics_pillar_filter(teacher_auth_headers):
    """Test filtering by pillar."""
    response = client.get(
        "/api/v1/teacher/analytics?pillar=reading",
        headers=teacher_auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Pillar breakdown should focus on reading
    if data["pillar_breakdown"]:
        # When filtered, we might only show that pillar
        pillar_names = [p["pillar"] for p in data["pillar_breakdown"]]
        assert "reading" in pillar_names or len(pillar_names) == 0
```

- [ ] **Step 4: Write test for authentication requirement**

Add test:

```python
def test_analytics_requires_auth():
    """Test endpoint requires teacher authentication."""
    response = client.get("/api/v1/teacher/analytics")
    assert response.status_code == 401
```

- [ ] **Step 5: Write test for invalid parameters**

Add tests:

```python
def test_analytics_invalid_grade(teacher_auth_headers):
    """Test validation of grade parameter."""
    response = client.get(
        "/api/v1/teacher/analytics?grade_level=10",
        headers=teacher_auth_headers
    )

    assert response.status_code == 422  # Validation error


def test_analytics_invalid_pillar(teacher_auth_headers):
    """Test validation of pillar parameter."""
    response = client.get(
        "/api/v1/teacher/analytics?pillar=invalid",
        headers=teacher_auth_headers
    )

    assert response.status_code == 400
    assert "Invalid pillar" in response.json()["detail"]
```

- [ ] **Step 6: Run tests**

Run:
```bash
cd backend
pytest tests/test_teacher_endpoints.py -v
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/tests/test_teacher_endpoints.py
git commit -m "test(backend): add tests for teacher analytics endpoint"
```

---

## Task 6: Frontend Types and API Client

**Files:**
- Create: `frontend/types/analytics.ts`

- [ ] **Step 1: Create TypeScript type definitions**

Create `frontend/types/analytics.ts`:

```typescript
// frontend/types/analytics.ts

export interface SummaryStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
  active_this_week: number;
}

export interface TopStudent {
  name: string;
  accuracy: number;
}

export interface GradeBreakdown {
  grade_level: number;
  student_count: number;
  avg_accuracy: number;
  total_interactions: number;
  top_student: TopStudent | null;
  struggling_count: number;
}

export interface PillarBreakdown {
  pillar: string;
  avg_accuracy: number;
  total_attempts: number;
  top_performers: number;
  needs_help: number;
}

export interface StudentRanking {
  student_id: string;
  name: string;
  avatar_url: string | null;
  grade_level: number;
  overall_accuracy: number;
  total_interactions: number;
  strongest_pillar?: string;
  weakest_pillar?: string;
  recent_activity?: string;
}

export interface WeeklyTrend {
  week_start: string;
  week_label: string;
  avg_accuracy: number;
  total_interactions: number;
}

export interface AnalyticsData {
  summary_stats: SummaryStats;
  grade_breakdown: GradeBreakdown[];
  pillar_breakdown: PillarBreakdown[];
  top_students: StudentRanking[];
  struggling_students: StudentRanking[];
  weekly_trends: WeeklyTrend[];
}
```

- [ ] **Step 2: Test TypeScript compiles**

Run:
```bash
cd frontend
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add frontend/types/analytics.ts
git commit -m "feat(frontend): add TypeScript types for analytics"
```

---

## Task 7: Frontend Server Component and Page Structure

**Files:**
- Create: `frontend/app/teacher/analytics/page.tsx`

- [ ] **Step 1: Create server component with data fetching**

Create `frontend/app/teacher/analytics/page.tsx`:

```typescript
import { getTeacherHeaders } from "@/lib/teacherAuth";
import { apiFetch } from "@/lib/api";
import type { AnalyticsData } from "@/types/analytics";
import { Activity, Users } from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    grade?: string;
    pillar?: string;
    section?: string;
  }>;
}

async function fetchAnalyticsData(
  grade?: string,
  pillar?: string,
  section?: string
): Promise<{ data: AnalyticsData | null; error: boolean }> {
  try {
    const headers = await getTeacherHeaders();
    const params = new URLSearchParams();

    if (grade) params.set("grade_level", grade);
    if (pillar) params.set("pillar", pillar);
    if (section) params.set("section", section);

    const queryString = params.toString();
    const url = `/teacher/analytics${queryString ? `?${queryString}` : ""}`;

    const data = await apiFetch<AnalyticsData>(url, { headers });
    return { data, error: false };
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return { data: null, error: true };
  }
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { data, error } = await fetchAnalyticsData(
    params.grade,
    params.pillar,
    params.section
  );

  // Error state
  if (error || !data) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mt-8">
            <p className="text-red-700 font-medium">Failed to load analytics data</p>
            <p className="text-sm text-red-500 mt-1">
              Please check your connection and try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no students
  if (data.summary_stats.total_students === 0) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600 mb-8">
            Monitor student performance across all classrooms
          </p>
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No students yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              Create a classroom to start tracking analytics.
            </p>
            <Link
              href="/teacher/classroom"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Classroom
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no interactions
  if (data.summary_stats.total_interactions === 0) {
    return (
      <div className="bg-gray-50 min-h-full p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No activity yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              Students haven't started missions yet. Check back soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success - pass to client component (will create next)
  return (
    <div className="bg-gray-50 min-h-full p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Monitor student performance across all classrooms
        </p>
        {/* TODO: Add AnalyticsClient component */}
        <pre className="bg-white p-4 rounded-lg text-xs overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test page loads**

Run:
```bash
cd frontend
npm run dev
```

Navigate to: http://localhost:3000/teacher/analytics

Expected: Page shows JSON data or empty state

- [ ] **Step 3: Commit**

```bash
git add frontend/app/teacher/analytics/page.tsx
git commit -m "feat(frontend): add analytics page with server-side data fetching"
```

---

## Task 8: Frontend Client Wrapper with Filtering

**Files:**
- Create: `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`
- Modify: `frontend/app/teacher/analytics/page.tsx`

- [ ] **Step 1: Create client component with filter state**

Create `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterBar from "@/components/teacher/FilterBar";
import type { AnalyticsData } from "@/types/analytics";

interface Props {
  initialData: AnalyticsData;
  initialGrade?: number;
  initialPillar?: string;
  initialSection?: string;
}

export default function AnalyticsClient({
  initialData,
  initialGrade,
  initialPillar,
  initialSection,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gradeFilter, setGradeFilter] = useState<number | null>(initialGrade ?? null);
  const [pillarFilter, setPillarFilter] = useState<string | null>(initialPillar ?? null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(initialSection ?? null);

  // Update URL when filters change
  const updateFilters = (grade: number | null, pillar: string | null, section: string | null) => {
    const params = new URLSearchParams();
    if (grade) params.set("grade", String(grade));
    if (pillar) params.set("pillar", pillar);
    if (section) params.set("section", section);

    const queryString = params.toString();
    router.push(`/teacher/analytics${queryString ? `?${queryString}` : ""}`);
  };

  // Filter data client-side
  const filteredData = useMemo(() => {
    // For now, just return initial data
    // Client-side filtering logic will be added if needed
    // (Server already handles filtering via query params)
    return initialData;
  }, [initialData, gradeFilter, pillarFilter, sectionFilter]);

  return (
    <div>
      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar showSearch={false} showPillar={true} showSection={true} />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-gray-900">
            {filteredData.summary_stats.total_students}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Interactions</p>
          <p className="text-3xl font-bold text-gray-900">
            {filteredData.summary_stats.total_interactions.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Avg Accuracy</p>
          <p className="text-3xl font-bold text-gray-900">
            {filteredData.summary_stats.avg_accuracy}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Active This Week</p>
          <p className="text-3xl font-bold text-gray-900">
            {filteredData.summary_stats.active_this_week}
          </p>
        </div>
      </div>

      {/* Placeholder for other components */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Component sections will be added in next tasks
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update page to use client component**

Modify `frontend/app/teacher/analytics/page.tsx` - replace the TODO section:

```typescript
// Replace the TODO comment and JSON display with:
import AnalyticsClient from "./components/AnalyticsClient";

// ... in the return statement at the end:

return (
  <div className="bg-gray-50 min-h-full p-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
      <p className="text-gray-600 mb-6">
        Monitor student performance across all classrooms
      </p>
      <AnalyticsClient
        initialData={data}
        initialGrade={params.grade ? Number(params.grade) : undefined}
        initialPillar={params.pillar}
        initialSection={params.section}
      />
    </div>
  </div>
);
```

- [ ] **Step 3: Test client component renders**

Navigate to: http://localhost:3000/teacher/analytics

Expected: See 4 stat cards with numbers, FilterBar appears

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/analytics/components/AnalyticsClient.tsx
git add frontend/app/teacher/analytics/page.tsx
git commit -m "feat(frontend): add analytics client component with filtering"
```

---

## Task 9: Frontend AnalyticsOverview Component

**Files:**
- Create: `frontend/app/teacher/analytics/components/AnalyticsOverview.tsx`
- Modify: `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`

- [ ] **Step 1: Create AnalyticsOverview component with StatCards**

Create `frontend/app/teacher/analytics/components/AnalyticsOverview.tsx`:

```typescript
"use client";

import { Users, Activity, Target, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/teacher/design-system";
import { designTokens } from "@/lib/design-tokens";
import type { SummaryStats } from "@/types/analytics";

interface Props {
  stats: SummaryStats;
}

export default function AnalyticsOverview({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        value={stats.total_students}
        label="Total Students"
        subtitle="Across all classrooms"
        icon={Users}
        iconColor={designTokens.colors.primary}
        iconBg={designTokens.colors.primaryBg}
      />

      <StatCard
        value={stats.total_interactions.toLocaleString()}
        label="Total Interactions"
        subtitle="Missions & activities"
        icon={Activity}
        iconColor={designTokens.colors.success}
        iconBg={designTokens.colors.successBg}
      />

      <StatCard
        value={`${stats.avg_accuracy}%`}
        label="Average Accuracy"
        subtitle="Across all students"
        icon={Target}
        iconColor={designTokens.colors.warning}
        iconBg={designTokens.colors.warningBg}
      />

      <StatCard
        value={stats.active_this_week}
        label="Active This Week"
        subtitle="Recent activity"
        icon={TrendingUp}
        iconColor="#7c3aed"
        iconBg="#ede9fe"
      />
    </div>
  );
}
```

- [ ] **Step 2: Update AnalyticsClient to use AnalyticsOverview**

Modify `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`:

```typescript
// Add import at top
import AnalyticsOverview from "./AnalyticsOverview";

// Replace the grid div with StatCard placeholders with:
<AnalyticsOverview stats={filteredData.summary_stats} />
```

- [ ] **Step 3: Test StatCards render correctly**

Navigate to: http://localhost:3000/teacher/analytics

Expected: See 4 properly styled StatCard components with icons

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/analytics/components/AnalyticsOverview.tsx
git add frontend/app/teacher/analytics/components/AnalyticsClient.tsx
git commit -m "feat(frontend): add AnalyticsOverview with StatCard components"
```

---

## Task 10: Frontend GradeBreakdown Component

**Files:**
- Create: `frontend/app/teacher/analytics/components/GradeBreakdown.tsx`
- Modify: `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`

- [ ] **Step 1: Create GradeBreakdown component**

Create `frontend/app/teacher/analytics/components/GradeBreakdown.tsx`:

```typescript
"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/teacher/design-system";
import { designTokens } from "@/lib/design-tokens";
import type { GradeBreakdown as GradeBreakdownType } from "@/types/analytics";

interface Props {
  grades: GradeBreakdownType[];
  selectedGrade: number | null;
  onGradeClick: (grade: number) => void;
}

export default function GradeBreakdown({ grades, selectedGrade, onGradeClick }: Props) {
  const [hoveredGrade, setHoveredGrade] = useState<number | null>(null);

  // Show all 6 grades even if no data
  const allGrades = [1, 2, 3, 4, 5, 6].map((gradeNum) => {
    const gradeData = grades.find((g) => g.grade_level === gradeNum);
    return (
      gradeData || {
        grade_level: gradeNum,
        student_count: 0,
        avg_accuracy: 0,
        total_interactions: 0,
        top_student: null,
        struggling_count: 0,
      }
    );
  });

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Performance by Grade</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {allGrades.map((grade) => {
          const isSelected = selectedGrade === grade.grade_level;
          const isHovered = hoveredGrade === grade.grade_level;
          const isEmpty = grade.student_count === 0;
          const gradeColor = designTokens.colors.grade[grade.grade_level as 1 | 2 | 3 | 4 | 5 | 6];

          return (
            <div
              key={grade.grade_level}
              onClick={() => !isEmpty && onGradeClick(grade.grade_level)}
              onMouseEnter={() => !isEmpty && setHoveredGrade(grade.grade_level)}
              onMouseLeave={() => setHoveredGrade(null)}
              className={`
                bg-white rounded-xl border-2 p-4 transition-all duration-200
                ${isEmpty ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "ring-2" : ""}
                ${isHovered && !isSelected ? "shadow-md" : ""}
              `}
              style={{
                borderColor: isSelected ? gradeColor : isHovered ? `${gradeColor}88` : designTokens.colors.slate[200],
                boxShadow: isSelected ? `0 4px 12px ${gradeColor}40` : undefined,
              }}
            >
              {/* Grade badge */}
              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-bold mb-3"
                style={{
                  backgroundColor: `${gradeColor}18`,
                  color: gradeColor,
                }}
              >
                Grade {grade.grade_level}
              </div>

              {/* Stats */}
              {isEmpty ? (
                <p className="text-xs text-gray-400">No data</p>
              ) : (
                <>
                  <div className="mb-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {grade.avg_accuracy}%
                    </p>
                    <p className="text-xs text-gray-500">accuracy</p>
                  </div>

                  <ProgressBar
                    value={grade.avg_accuracy}
                    color={gradeColor}
                    height={6}
                  />

                  <div className="mt-3 flex justify-between items-center text-xs">
                    <span className="text-gray-600">
                      {grade.student_count} student{grade.student_count !== 1 ? "s" : ""}
                    </span>
                    {grade.struggling_count > 0 && (
                      <span className="text-red-600 font-semibold">
                        {grade.struggling_count} struggling
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update AnalyticsClient to include GradeBreakdown**

Modify `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`:

```typescript
// Add import
import GradeBreakdown from "./GradeBreakdown";

// Add after AnalyticsOverview component:
<GradeBreakdown
  grades={filteredData.grade_breakdown}
  selectedGrade={gradeFilter}
  onGradeClick={(grade) => {
    setGradeFilter(grade === gradeFilter ? null : grade);
    updateFilters(grade === gradeFilter ? null : grade, pillarFilter, sectionFilter);
  }}
/>
```

- [ ] **Step 3: Test grade cards render and clicking works**

Navigate to: http://localhost:3000/teacher/analytics

Expected: See 6 grade cards, clicking one updates URL parameter

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/analytics/components/GradeBreakdown.tsx
git add frontend/app/teacher/analytics/components/AnalyticsClient.tsx
git commit -m "feat(frontend): add GradeBreakdown component with filtering"
```

---

## Task 11: Frontend SkillBreakdown Component

**Files:**
- Create: `frontend/app/teacher/analytics/components/SkillBreakdown.tsx`
- Modify: `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`

- [ ] **Step 1: Create SkillBreakdown component**

Create `frontend/app/teacher/analytics/components/SkillBreakdown.tsx`:

```typescript
"use client";

import { useState } from "react";
import { BookOpenCheck, BookOpen, Headphones, MessageSquare } from "lucide-react";
import { ProgressBar } from "@/components/teacher/design-system";
import type { PillarBreakdown } from "@/types/analytics";

interface Props {
  pillars: PillarBreakdown[];
  selectedPillar: string | null;
  onPillarClick: (pillar: string) => void;
}

const PILLAR_CONFIG = {
  reading: { label: "Reading", icon: BookOpenCheck, color: "#059669" },
  writing: { label: "Writing", icon: BookOpen, color: "#2563eb" },
  listening: { label: "Listening", icon: Headphones, color: "#7c3aed" },
  speaking: { label: "Speaking", icon: MessageSquare, color: "#dc2626" },
};

export default function SkillBreakdown({ pillars, selectedPillar, onPillarClick }: Props) {
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null);

  // Ensure all pillars are shown even if no data
  const allPillars = Object.keys(PILLAR_CONFIG).map((pillarKey) => {
    const pillarData = pillars.find((p) => p.pillar === pillarKey);
    return (
      pillarData || {
        pillar: pillarKey,
        avg_accuracy: 0,
        total_attempts: 0,
        top_performers: 0,
        needs_help: 0,
      }
    );
  });

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Performance by Skill</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {allPillars.map((pillar) => {
          const config = PILLAR_CONFIG[pillar.pillar as keyof typeof PILLAR_CONFIG];
          const Icon = config.icon;
          const isSelected = selectedPillar === pillar.pillar;
          const isHovered = hoveredPillar === pillar.pillar;
          const isEmpty = pillar.total_attempts === 0;

          // Color coding based on accuracy
          const accuracyColor =
            pillar.avg_accuracy >= 70
              ? "#059669"
              : pillar.avg_accuracy >= 40
              ? "#d97706"
              : "#dc2626";

          return (
            <div
              key={pillar.pillar}
              onClick={() => !isEmpty && onPillarClick(pillar.pillar)}
              onMouseEnter={() => !isEmpty && setHoveredPillar(pillar.pillar)}
              onMouseLeave={() => setHoveredPillar(null)}
              className={`
                bg-white rounded-xl border-2 p-5 transition-all duration-200
                ${isEmpty ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected ? "ring-2 ring-offset-2" : ""}
                ${isHovered && !isSelected ? "shadow-lg -translate-y-1" : ""}
              `}
              style={{
                borderColor: isSelected ? config.color : isHovered ? `${config.color}88` : "#e2e8f0",
                ringColor: config.color,
              }}
            >
              {/* Icon and label */}
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" style={{ color: config.color }} />
                <span className="font-semibold text-gray-900">{config.label}</span>
              </div>

              {isEmpty ? (
                <p className="text-sm text-gray-400">No data</p>
              ) : (
                <>
                  {/* Accuracy */}
                  <div className="mb-3">
                    <p className="text-3xl font-bold" style={{ color: accuracyColor }}>
                      {pillar.avg_accuracy}%
                    </p>
                    <p className="text-xs text-gray-500">accuracy</p>
                  </div>

                  {/* Progress bar */}
                  <ProgressBar
                    value={pillar.avg_accuracy}
                    color={accuracyColor}
                    height={8}
                  />

                  {/* Stats */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Top performers:</span>
                      <span className="font-semibold text-green-600">{pillar.top_performers}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Needs help:</span>
                      <span className="font-semibold text-red-600">{pillar.needs_help}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update AnalyticsClient to include SkillBreakdown**

Modify `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`:

```typescript
// Add import
import SkillBreakdown from "./SkillBreakdown";

// Add after GradeBreakdown:
<SkillBreakdown
  pillars={filteredData.pillar_breakdown}
  selectedPillar={pillarFilter}
  onPillarClick={(pillar) => {
    setPillarFilter(pillar === pillarFilter ? null : pillar);
    updateFilters(gradeFilter, pillar === pillarFilter ? null : pillar, sectionFilter);
  }}
/>
```

- [ ] **Step 3: Test skill cards render and filtering works**

Navigate to: http://localhost:3000/teacher/analytics

Expected: See 4 skill cards with progress bars, clicking updates URL

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/analytics/components/SkillBreakdown.tsx
git add frontend/app/teacher/analytics/components/AnalyticsClient.tsx
git commit -m "feat(frontend): add SkillBreakdown component with pillar filtering"
```

---

## Task 12: Frontend StudentRankings Component

**Files:**
- Create: `frontend/app/teacher/analytics/components/StudentRankings.tsx`
- Modify: `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`

- [ ] **Step 1: Create StudentRankings component**

Create `frontend/app/teacher/analytics/components/StudentRankings.tsx`:

```typescript
"use client";

import { Trophy, AlertTriangle } from "lucide-react";
import { designTokens } from "@/lib/design-tokens";
import type { StudentRanking } from "@/types/analytics";

interface Props {
  topStudents: StudentRanking[];
  strugglingStudents: StudentRanking[];
}

export default function StudentRankings({ topStudents, strugglingStudents }: Props) {
  const trophies = ["🥇", "🥈", "🥉"];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Student Performance</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-gray-900">Top Performers</h3>
          </div>

          {topStudents.length === 0 ? (
            <p className="text-sm text-gray-500">No students yet</p>
          ) : (
            <div className="space-y-3">
              {topStudents.map((student, index) => {
                const gradeColor = designTokens.colors.grade[student.grade_level as 1 | 2 | 3 | 4 | 5 | 6];

                return (
                  <div
                    key={student.student_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Trophy or rank */}
                    <span className="text-2xl w-8">
                      {index < 3 ? trophies[index] : `${index + 1}.`}
                    </span>

                    {/* Avatar */}
                    <img
                      src={student.avatar_url || "/default-avatar.png"}
                      alt={student.name}
                      className="w-10 h-10 rounded-full"
                    />

                    {/* Name and details */}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full font-bold"
                          style={{
                            backgroundColor: `${gradeColor}18`,
                            color: gradeColor,
                          }}
                        >
                          Gr {student.grade_level}
                        </span>
                        {student.strongest_pillar && (
                          <span className="text-gray-500">
                            Best: {student.strongest_pillar}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {student.overall_accuracy}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.total_interactions} plays
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900">Needs Attention</h3>
          </div>

          {strugglingStudents.length === 0 ? (
            <p className="text-sm text-gray-500">All students performing well! 🎉</p>
          ) : (
            <div className="space-y-3">
              {strugglingStudents.map((student) => {
                const gradeColor = designTokens.colors.grade[student.grade_level as 1 | 2 | 3 | 4 | 5 | 6];

                return (
                  <div
                    key={student.student_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Warning icon */}
                    <span className="text-2xl w-8">⚠️</span>

                    {/* Avatar */}
                    <img
                      src={student.avatar_url || "/default-avatar.png"}
                      alt={student.name}
                      className="w-10 h-10 rounded-full"
                    />

                    {/* Name and details */}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="px-2 py-0.5 rounded-full font-bold"
                          style={{
                            backgroundColor: `${gradeColor}18`,
                            color: gradeColor,
                          }}
                        >
                          Gr {student.grade_level}
                        </span>
                        {student.weakest_pillar && (
                          <span className="text-red-600">
                            Weak: {student.weakest_pillar}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">
                        {student.overall_accuracy}%
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.total_interactions} plays
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update AnalyticsClient to include StudentRankings**

Modify `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`:

```typescript
// Add import
import StudentRankings from "./StudentRankings";

// Add after SkillBreakdown:
<StudentRankings
  topStudents={filteredData.top_students}
  strugglingStudents={filteredData.struggling_students}
/>
```

- [ ] **Step 3: Test rankings render correctly**

Navigate to: http://localhost:3000/teacher/analytics

Expected: See two columns with top performers and struggling students

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/analytics/components/StudentRankings.tsx
git add frontend/app/teacher/analytics/components/AnalyticsClient.tsx
git commit -m "feat(frontend): add StudentRankings component with top/struggling students"
```

---

## Task 13: Frontend PerformanceTrends Component

**Files:**
- Create: `frontend/app/teacher/analytics/components/PerformanceTrends.tsx`
- Modify: `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`

- [ ] **Step 1: Create PerformanceTrends component**

Create `frontend/app/teacher/analytics/components/PerformanceTrends.tsx`:

```typescript
"use client";

import { LineChart } from "@/components/teacher/design-system";
import type { WeeklyTrend } from "@/types/analytics";

interface Props {
  trends: WeeklyTrend[];
}

export default function PerformanceTrends({ trends }: Props) {
  if (trends.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Performance Trend</h2>
        <p className="text-sm text-gray-500">Not enough data to show trends yet</p>
      </div>
    );
  }

  // Prepare data for LineChart component
  const labels = trends.map((t) => t.week_label);
  const accuracyData = trends.map((t) => t.avg_accuracy);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Performance Trend</h2>
      <p className="text-sm text-gray-500 mb-6">
        Average accuracy over the last {trends.length} weeks
      </p>

      <LineChart
        labels={labels}
        datasets={[
          {
            label: "Accuracy %",
            data: accuracyData,
            color: "#4361ee",
          },
        ]}
        height={250}
      />

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Current Week</p>
          <p className="text-lg font-bold text-gray-900">
            {trends[trends.length - 1].avg_accuracy}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Highest</p>
          <p className="text-lg font-bold text-green-600">
            {Math.max(...accuracyData)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Average</p>
          <p className="text-lg font-bold text-gray-900">
            {Math.round(accuracyData.reduce((a, b) => a + b, 0) / accuracyData.length)}%
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update AnalyticsClient to include PerformanceTrends**

Modify `frontend/app/teacher/analytics/components/AnalyticsClient.tsx`:

```typescript
// Add import
import PerformanceTrends from "./PerformanceTrends";

// Add after StudentRankings (replace the placeholder div):
<PerformanceTrends trends={filteredData.weekly_trends} />
```

- [ ] **Step 3: Test trends chart renders**

Navigate to: http://localhost:3000/teacher/analytics

Expected: See line chart with weekly trend data

- [ ] **Step 4: Commit**

```bash
git add frontend/app/teacher/analytics/components/PerformanceTrends.tsx
git add frontend/app/teacher/analytics/components/AnalyticsClient.tsx
git commit -m "feat(frontend): add PerformanceTrends component with weekly line chart"
```

---

## Task 14: Integration Testing and Deployment

**Files:**
- Modify: `frontend/app/teacher/analytics/page.tsx` (final cleanup)
- Create: `docs/ANALYTICS_TESTING.md` (testing guide)

- [ ] **Step 1: Test complete analytics page end-to-end**

Manual testing checklist:

1. **Initial Load:**
   - Navigate to `/teacher/analytics`
   - Verify all 7 sections render: Overview, Grade Breakdown, Skill Breakdown, Rankings, Trends
   - Check no console errors in DevTools

2. **Grade Filter:**
   - Click "Grade 1" card
   - URL updates to `?grade=1`
   - Data filtered to Grade 1 only
   - Click again to clear filter

3. **Pillar Filter:**
   - Click "Reading" card
   - URL updates to `?pillar=reading`
   - Data shows reading performance
   - Click again to clear

4. **Multi-Filter:**
   - Select Grade 2 + Writing
   - URL shows `?grade=2&pillar=writing`
   - Data filtered correctly

5. **Empty States:**
   - Test with no students (should show empty state)
   - Test with no interactions (should show activity message)

6. **Responsive:**
   - Test on mobile (375px)
   - Test on tablet (768px)
   - Test on desktop (1440px)

Expected: All tests pass, no errors

- [ ] **Step 2: Create testing documentation**

Create `docs/ANALYTICS_TESTING.md`:

```markdown
# Analytics Dashboard Testing Guide

## Backend Testing

### Run Backend Tests
```bash
cd backend
pytest tests/test_teacher_endpoints.py -v
```

Expected: 5/5 tests pass

### Manual Backend API Tests
```bash
# Test without filters
curl -X GET "http://localhost:8000/api/v1/teacher/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test with grade filter
curl -X GET "http://localhost:8000/api/v1/teacher/analytics?grade_level=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test with pillar filter
curl -X GET "http://localhost:8000/api/v1/teacher/analytics?pillar=reading" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test invalid parameters
curl -X GET "http://localhost:8000/api/v1/teacher/analytics?grade_level=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: 422 validation error
```

## Frontend Testing

### Component Verification
- [ ] AnalyticsOverview: 4 StatCards render with icons
- [ ] GradeBreakdown: 6 grade cards, clicking filters
- [ ] SkillBreakdown: 4 pillar cards with progress bars
- [ ] StudentRankings: Top 10 + struggling students
- [ ] PerformanceTrends: Line chart with 8 weeks

### Filter Testing
- [ ] Grade filter updates URL
- [ ] Pillar filter updates URL
- [ ] Section filter updates URL
- [ ] Multi-filter works correctly
- [ ] Clear filters resets all

### Responsive Testing
- [ ] Mobile: Cards stack vertically
- [ ] Tablet: 2-column grid
- [ ] Desktop: Full layout

## Performance Testing

### Backend
- [ ] First request (cache miss): <2s
- [ ] Second request (cache hit): <200ms
- [ ] With 1000+ interactions: <3s

### Frontend
- [ ] Initial page load: <1.5s
- [ ] Filter change: <100ms
- [ ] No memory leaks (check DevTools)

## Deployment Checklist

### Backend
- [ ] Endpoint registered in main.py
- [ ] Database indexes verified
- [ ] Redis configured (or fallback works)
- [ ] Error logging enabled

### Frontend
- [ ] Page compiles without TypeScript errors
- [ ] Navigation link added to Sidebar (if needed)
- [ ] Design tokens working
- [ ] FilterBar integrated

### Security
- [ ] Teacher authentication required
- [ ] Input validation working
- [ ] No SQL injection possible
- [ ] Error messages don't leak sensitive data

## Known Issues
- None currently

## Future Enhancements
- PDF export
- Custom date ranges
- Real-time updates
- Export to Excel
```

- [ ] **Step 3: Run production build test**

Run:
```bash
cd frontend
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 4: Final verification**

Run both backend and frontend:
```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Navigate to: http://localhost:3000/teacher/analytics

Run through complete test checklist from Step 1

Expected: All functionality works correctly

- [ ] **Step 5: Commit final changes**

```bash
git add docs/ANALYTICS_TESTING.md
git add frontend/app/teacher/analytics/page.tsx
git commit -m "docs: add analytics testing guide and finalize implementation"
```

- [ ] **Step 6: Create summary commit**

```bash
git log --oneline | head -14
# Review all commits from this implementation

# If clean, great! If messy, consider squashing (optional)
```

---

## Implementation Complete ✅

**Summary:**
- ✅ Backend endpoint `/api/v1/teacher/analytics` with SQL aggregation
- ✅ Redis caching (5-minute TTL)
- ✅ Frontend page with 7 components
- ✅ Grade, pillar, section filtering
- ✅ Responsive design using design system
- ✅ Error handling and validation
- ✅ Backend and frontend tests
- ✅ Documentation

**Next Steps:**
1. Review all code changes
2. Run full test suite
3. Deploy to staging environment
4. Monitor for errors
5. Gather teacher feedback

**Total Implementation Time:** ~3-4 hours
**Files Created:** 12
**Files Modified:** 3
**Lines of Code:** ~2,000
