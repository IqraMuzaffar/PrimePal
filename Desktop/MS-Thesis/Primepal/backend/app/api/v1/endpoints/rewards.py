"""
Rewards endpoints: daily summary, streak, and points breakdown.
"""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /daily-summary (S08: Scoring Visibility)
# ---------------------------------------------------------------------------

class DailySummaryResponse(BaseModel):
    today_points: int
    total_points: int
    missions_today: int


@router.get("/daily-summary", response_model=DailySummaryResponse, summary="Daily score summary")
async def get_daily_summary(
    student: dict = Depends(get_current_student),
):
    """
    Return the student's score summary for today.

    - today_points: sum of scores from correct interactions today
    - total_points: cumulative points from student record
    - missions_today: count of correct interactions today

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
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

    return DailySummaryResponse(
        today_points=today_points,
        total_points=total_points,
        missions_today=missions_today,
    )


# ---------------------------------------------------------------------------
# GET /streak (S07: Daily Streak Engine)
# ---------------------------------------------------------------------------

class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: str | None


@router.get("/streak", response_model=StreakResponse, summary="Get student streak")
async def get_streak(student: dict = Depends(get_current_student)):
    """
    Get the student's current and longest streak.

    - current_streak: consecutive days with at least one completed task
    - longest_streak: all-time best streak
    - last_activity_date: ISO date of last activity (YYYY-MM-DD) or null

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    resp = supabase.table("students").select(
        "current_streak, longest_streak, last_activity_date"
    ).eq("id", student_id).maybe_single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Student not found")

    data = resp.data
    return StreakResponse(
        current_streak=data.get("current_streak") or 0,
        longest_streak=data.get("longest_streak") or 0,
        last_activity_date=data.get("last_activity_date"),
    )


# ---------------------------------------------------------------------------
# GET /points-breakdown (Points Breakdown by Activity)
# ---------------------------------------------------------------------------

_ACTIVITY_MAP = {
    "mission_mc": "Missions",
    "mission_fill": "Missions",
    "mission_speaking": "Missions",
    "spelling_bee": "Spelling Bee",
    "story_time": "Story Time",
    "speaking_practice": "Speaking",
    "speaking_pro": "Speaking",
}


class ActivityPoints(BaseModel):
    activity: str
    points: int
    count: int


class PointsBreakdownResponse(BaseModel):
    today: list[ActivityPoints]
    this_week: list[ActivityPoints]
    total_points: int


@router.get("/points-breakdown", response_model=PointsBreakdownResponse, summary="Points breakdown by activity")
async def get_points_breakdown(
    student: dict = Depends(get_current_student),
):
    """
    Return today's and this week's points grouped by activity type.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
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

    return PointsBreakdownResponse(
        today=aggregate(today_rows),
        this_week=aggregate(rows),
        total_points=total_points,
    )
