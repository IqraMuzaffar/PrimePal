"""
Student Scores Endpoint
GET /api/v1/student/my-scores - View own performance stats
"""
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.cache import cache_get, cache_set, cache_delete_pattern, make_cache_key
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


async def invalidate_scores_cache(student_id: str) -> None:
    """Invalidate all scores caches for a student (call after mission completion)."""
    await cache_delete_pattern(f"student_scores:{student_id}:*")


# ── Schemas ──────────────────────────────────────────────────────────────────


class PillarScore(BaseModel):
    pillar: str
    total: int
    correct: int
    accuracy_pct: int


class MyScoresResponse(BaseModel):
    total_questions: int
    total_correct: int
    overall_accuracy_pct: int
    total_points: int
    pillar_scores: list[PillarScore]
    time_range_label: str


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get(
    "/my-scores",
    response_model=MyScoresResponse,
    summary="Get student's own performance scores",
)
async def get_my_scores(
    student: dict = Depends(get_current_student),
    time_range: Literal["everything", "week", "month"] = Query("everything"),
) -> MyScoresResponse:
    """
    Returns student's performance stats filtered by time range.

    Time ranges:
    - everything: All time
    - week: Last 7 days
    - month: Last 30 days

    Returns overall stats (questions, accuracy, points) and per-pillar breakdown.
    """
    from collections import defaultdict

    student_id: str = student["sub"]

    cache_key = make_cache_key("student_scores", student_id, time_range)
    cached = await cache_get(cache_key)
    if cached:
        return MyScoresResponse(**cached)

    supabase = get_supabase_admin()

    # 1. Calculate date range
    date_from = None
    time_range_label = "Everything"

    if time_range == "week":
        date_from = (datetime.now() - timedelta(days=7)).date().isoformat()
        time_range_label = "This Week"
    elif time_range == "month":
        date_from = (datetime.now() - timedelta(days=30)).date().isoformat()
        time_range_label = "This Month"

    # 2. Query interactions with date filter
    #    Include score and interaction_type to filter out skipped questions
    query = (
        supabase.table("student_interactions")
        .select("pillar, correct, score, interaction_type")
        .eq("student_id", student_id)
        .not_.is_("correct", "null")
    )

    if date_from:
        query = query.gte("created_at", date_from)

    interactions_resp = query.execute()
    raw_interactions = interactions_resp.data or []

    # Filter out skipped/timed-out questions: these have correct=false AND score=0
    # Only count interactions where the student actually attempted the question
    interactions = [
        i for i in raw_interactions
        if i.get("correct") is True or (i.get("score") or 0) > 0
    ]

    # 3. Aggregate overall stats
    total_questions = len(interactions)
    total_correct = sum(1 for i in interactions if i.get("correct"))
    overall_accuracy_pct = round((total_correct / total_questions * 100)) if total_questions > 0 else 0

    # 4. Aggregate by pillar
    pillar_data = defaultdict(lambda: {"total": 0, "correct": 0})
    for interaction in interactions:
        pillar = interaction.get("pillar")
        if pillar:
            pillar_data[pillar]["total"] += 1
            if interaction.get("correct"):
                pillar_data[pillar]["correct"] += 1

    # 5. Build pillar scores (always return all 4 pillars)
    all_pillars = ["reading", "writing", "listening", "speaking"]
    pillar_scores = []

    for pillar in all_pillars:
        data = pillar_data[pillar]
        total = data["total"]
        correct = data["correct"]
        accuracy_pct = round((correct / total * 100)) if total > 0 else 0

        pillar_scores.append(
            PillarScore(
                pillar=pillar,
                total=total,
                correct=correct,
                accuracy_pct=accuracy_pct,
            )
        )

    # 6. Get total points from students table
    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )

    total_points = student_resp.data.get("points", 0) if student_resp.data else 0

    result = MyScoresResponse(
        total_questions=total_questions,
        total_correct=total_correct,
        overall_accuracy_pct=overall_accuracy_pct,
        total_points=total_points,
        pillar_scores=pillar_scores,
        time_range_label=time_range_label,
    )
    await cache_set(cache_key, result.model_dump(), ttl=300)
    return result
