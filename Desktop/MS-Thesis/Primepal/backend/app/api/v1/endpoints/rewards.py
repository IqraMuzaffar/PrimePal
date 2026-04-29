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
from datetime import datetime, timedelta
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


class RewardStatusResponse(BaseModel):
    has_claimed_today: bool
    last_claimed_at: str | None  # ISO format timestamp


# ---------------------------------------------------------------------------
# Helper: Determine if timestamp is "today" (UTC midnight boundary)
# ---------------------------------------------------------------------------

def is_today(timestamp: datetime | None) -> bool:
    """
    Check if a given timestamp is from today (same UTC calendar day).
    None timestamps are treated as never claimed (returns False).
    """
    if timestamp is None:
        return False

    now_utc = datetime.utcnow().replace(tzinfo=None)
    return timestamp.replace(tzinfo=None).date() == now_utc.date()


# ---------------------------------------------------------------------------
# Helper: Generate random reward
# ---------------------------------------------------------------------------

def generate_daily_reward() -> tuple[str, int]:
    """
    Generate a random daily reward.

    Returns:
      (reward_type, amount)
      - "stars_25": +25 points (70% chance)
      - "stars_50": +50 points (20% chance)
      - "multiplier_2x": 2x points multiplier (10% chance, amount=0)
    """
    rand = random()

    if rand < 0.7:
        return ("stars_25", 25)
    elif rand < 0.9:
        return ("stars_50", 50)
    else:
        return ("multiplier_2x", 0)


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
    - Generates random reward: 70% +25 stars, 20% +50 stars, 10% 2x multiplier.
    - Updates student points and last_daily_reward_at timestamp.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Fetch current student data
    # ------------------------------------------------------------------
    student_resp = (
        supabase.table("students")
        .select("points, last_daily_reward_at")
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
    current_points: int = data.get("points") or 0
    last_claimed_timestamp = data.get("last_daily_reward_at")

    # ------------------------------------------------------------------
    # Step 2: Anti-cheat validation (server-side time check)
    # ------------------------------------------------------------------
    if is_today(last_claimed_timestamp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already claimed your daily reward today. Come back tomorrow!",
        )

    # ------------------------------------------------------------------
    # Step 3: Generate random reward
    # ------------------------------------------------------------------
    reward_type, reward_amount = generate_daily_reward()
    new_total = current_points + reward_amount

    # ------------------------------------------------------------------
    # Step 4: Update student record with new points and timestamp
    # ------------------------------------------------------------------
    now_utc = datetime.utcnow()
    update_data = {
        "points": new_total,
        "last_daily_reward_at": now_utc.isoformat() + "Z",  # ISO format with Z for UTC
    }

    result = (
        supabase.table("students")
        .update(update_data)
        .eq("id", student_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to claim daily reward",
        )

    # ------------------------------------------------------------------
    # Step 5: Build response message
    # ------------------------------------------------------------------
    if reward_type == "stars_25":
        message = "You earned +25 Stars! ⭐"
    elif reward_type == "stars_50":
        message = "You earned +50 Stars! 🌟"
    else:  # multiplier_2x
        message = "You unlocked a 2x Points Multiplier! 🚀"

    logger.info(
        "Daily reward claimed: student=%s, reward_type=%s, amount=%d, new_total=%d",
        student_id, reward_type, reward_amount, new_total,
    )

    return DailyRewardResponse(
        reward_type=reward_type,
        amount=reward_amount,
        new_total=new_total,
        message=message,
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
