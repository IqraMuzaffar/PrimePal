"""
Feature: Surprise Daily Chest (Loot Box)

Endpoints:
  POST /api/v1/rewards/claim-daily — Claim daily reward (student auth required, anti-cheat)
  GET  /api/v1/rewards/status      — Check if student has claimed today (student auth required)

Anti-Cheat:
- Server-side timestamp validation ensures students can only claim once per calendar day (UTC).
- Compares last_daily_reward_at against server's current time, not client time.
"""
import logging
from datetime import datetime, timedelta, timezone
from random import random

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DailyRewardResponse(BaseModel):
    reward_type: str  # "stars_25", "stars_50", "multiplier_2x"
    amount: int       # Points/stars awarded (0 for multiplier)
    new_total: int    # Student's new total points
    message: str      # Human-readable reward message
    new_achievements: list[dict] = []  # Newly unlocked achievements


class RewardStatusResponse(BaseModel):
    has_claimed_today: bool
    last_claimed_at: str | None  # ISO format timestamp


# ---------------------------------------------------------------------------
# Helper: Determine if timestamp is "today" (UTC midnight boundary)
# ---------------------------------------------------------------------------

def is_today(timestamp) -> bool:
    """
    Check if a given timestamp is from today (same UTC calendar day).
    None timestamps are treated as never claimed (returns False).
    Handles both datetime objects and ISO-format strings from Supabase.
    """
    if timestamp is None:
        return False
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    now_utc = datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    return timestamp.date() == now_utc.date()


# ---------------------------------------------------------------------------
# Helper: Generate random reward
# ---------------------------------------------------------------------------

def generate_daily_reward() -> tuple[str, int]:
    """
    Generate a random daily reward.

    Returns:
      (reward_type, amount)
      - "stars_5": +5 points (33.33% chance)
      - "stars_10": +10 points (33.33% chance)
      - "stars_15": +15 points (33.33% chance)
    """
    rand = random()

    if rand < 0.333:
        return ("stars_5", 5)
    elif rand < 0.666:
        return ("stars_10", 10)
    else:
        return ("stars_15", 15)


# ---------------------------------------------------------------------------
# POST /claim-daily
# ---------------------------------------------------------------------------

@router.post("/claim-daily", response_model=DailyRewardResponse, summary="Claim daily reward")
async def claim_daily_reward(
    student: dict = Depends(get_current_student),
):
    """
    Claim the daily reward (Surprise Daily Chest).

    - Anti-cheat validation: checks server-side UTC timestamp.
    - Returns 400 if already claimed today.
    - Generates random reward: 33% chance for each of 5, 10, or 15 points.
    - Updates student points and last_daily_reward_at timestamp.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Generate reward upfront (cheap, no DB needed)
    # ------------------------------------------------------------------
    reward_type, reward_amount = generate_daily_reward()

    # ------------------------------------------------------------------
    # Step 2: Atomically claim — stamp the timestamp only if not yet
    # claimed today. This prevents double-claim race conditions.
    # ------------------------------------------------------------------
    now_utc = datetime.now(timezone.utc)
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    claim_resp = (
        supabase.table("students")
        .update({"last_daily_reward_at": now_utc.isoformat() + "Z"})
        .eq("id", student_id)
        .or_(
            "last_daily_reward_at.is.null,"
            f"last_daily_reward_at.lt.{today_start.isoformat()}Z"
        )
        .execute()
    )

    if not claim_resp.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already claimed your daily reward today. Come back tomorrow!",
        )

    # ------------------------------------------------------------------
    # Step 3: Atomically increment points (safe — claim gate passed)
    # ------------------------------------------------------------------
    rpc_result = supabase.rpc("increment_student_points", {
        "p_student_id": student_id,
        "p_points": reward_amount,
    }).execute()
    result_data = rpc_result.data[0] if rpc_result.data else {}
    new_total = result_data.get("new_points", reward_amount)

    # ------------------------------------------------------------------
    # Step 5: Build response message
    # ------------------------------------------------------------------
    if reward_type == "stars_5":
        message = "You earned +5 Stars! ⭐"
    elif reward_type == "stars_10":
        message = "You earned +10 Stars! 🌟"
    else:
        message = "You earned +15 Stars! 🌟🌟"

    logger.info(
        "Daily reward claimed: student=%s, reward_type=%s, amount=%d, new_total=%d",
        student_id, reward_type, reward_amount, new_total,
    )

    # ------------------------------------------------------------------
    # Step 6: Check for newly unlocked achievements
    # ------------------------------------------------------------------
    new_badges: list[dict] = []
    try:
        from app.api.v1.endpoints.achievements import check_and_unlock_achievements
        new_badges = await check_and_unlock_achievements(student_id)
    except Exception as e:
        logger.warning("Achievement check failed after daily reward: %s", e)

    return DailyRewardResponse(
        reward_type=reward_type,
        amount=reward_amount,
        new_total=new_total,
        message=message,
        new_achievements=new_badges,
    )


# ---------------------------------------------------------------------------
# GET /status
# ---------------------------------------------------------------------------

@router.get("/status", response_model=RewardStatusResponse, summary="Check daily reward status")
async def get_reward_status(
    student: dict = Depends(get_current_student),
):
    """
    Check if the student has already claimed their daily reward today.

    - Returns has_claimed_today boolean.
    - Returns last_claimed_at timestamp if applicable.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    student_resp = (
        supabase.table("students")
        .select("last_daily_reward_at")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    last_claimed_timestamp = student_resp.data.get("last_daily_reward_at")
    has_claimed = is_today(last_claimed_timestamp)

    # Convert to ISO string for response
    last_claimed_str = None
    if last_claimed_timestamp:
        if isinstance(last_claimed_timestamp, str):
            last_claimed_str = last_claimed_timestamp
        else:
            last_claimed_str = last_claimed_timestamp.isoformat()

    return RewardStatusResponse(
        has_claimed_today=has_claimed,
        last_claimed_at=last_claimed_str,
    )


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
