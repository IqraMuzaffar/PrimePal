"""
Feature S06: Achievements & Badge System

Endpoints:
  GET  /api/v1/achievements/all   — List all achievement definitions
  GET  /api/v1/achievements/me    — Student's achievements with progress
  POST /api/v1/achievements/check — Check and unlock new achievements (internal)

Also exports:
  check_and_unlock_achievements(student_id) — callable from other modules
"""
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class AchievementProgress(BaseModel):
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


class AchievementListResponse(BaseModel):
    achievements: list[AchievementProgress]


class NewAchievement(BaseModel):
    name: str
    icon: str
    tier: str


class CheckResponse(BaseModel):
    new_achievements: list[NewAchievement]


class AchievementDef(BaseModel):
    id: str
    name: str
    description: str
    description_ur: str
    icon: str
    tier: str
    threshold_type: str
    threshold_value: int


class AllAchievementsResponse(BaseModel):
    achievements: list[AchievementDef]


# ---------------------------------------------------------------------------
# Pillar mapping: threshold_type -> student_interactions.pillar value
# ---------------------------------------------------------------------------

PILLAR_MAP = {
    "missions_reading": "reading",
    "missions_writing": "writing",
    "missions_listening": "listening",
    "missions_speaking": "speaking",
}


# ---------------------------------------------------------------------------
# Helper: gather student stats for achievement evaluation
# ---------------------------------------------------------------------------

def _get_student_stats(student_id: str) -> dict[str, int]:
    """
    Gather all stats needed for achievement evaluation.
    Returns dict with keys: points, missions_total, streak,
    missions_reading, missions_writing, missions_listening, missions_speaking
    """
    supabase = get_supabase_admin()

    # Fetch student record
    student_resp = (
        supabase.table("students")
        .select("points, missions_completed, current_streak")
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
    missions_total = data.get("missions_completed") or 0

    # current_streak may not exist yet (added by S07) — default to 0
    try:
        streak = data.get("current_streak") or 0
    except Exception:
        streak = 0

    # Count per-pillar correct interactions
    stats: dict[str, int] = {
        "points": points,
        "missions_total": missions_total,
        "streak": streak,
    }

    for threshold_type, pillar_value in PILLAR_MAP.items():
        count_resp = (
            supabase.table("student_interactions")
            .select("id", count="exact")
            .eq("student_id", student_id)
            .eq("pillar", pillar_value)
            .eq("correct", True)
            .execute()
        )
        stats[threshold_type] = count_resp.count if count_resp.count is not None else 0

    return stats


# ---------------------------------------------------------------------------
# Standalone utility: check_and_unlock_achievements
# ---------------------------------------------------------------------------

async def check_and_unlock_achievements(student_id: str) -> list[dict]:
    """
    Check all achievements for a student and unlock any newly earned ones.
    Returns list of newly unlocked achievements: [{ name, icon, tier }]
    """
    supabase = get_supabase_admin()

    # Fetch all achievements
    all_resp = supabase.table("achievements").select("*").execute()
    all_achievements = all_resp.data or []

    # Fetch already-unlocked achievement IDs
    unlocked_resp = (
        supabase.table("student_achievements")
        .select("achievement_id")
        .eq("student_id", student_id)
        .execute()
    )
    unlocked_ids = {row["achievement_id"] for row in (unlocked_resp.data or [])}

    # Gather student stats
    try:
        stats = _get_student_stats(student_id)
    except HTTPException:
        return []

    new_achievements: list[dict] = []

    for ach in all_achievements:
        if ach["id"] in unlocked_ids:
            continue

        threshold_type = ach["threshold_type"]
        threshold_value = ach["threshold_value"]
        current = stats.get(threshold_type, 0)

        if current >= threshold_value:
            # Unlock this achievement
            try:
                supabase.table("student_achievements").insert({
                    "student_id": student_id,
                    "achievement_id": ach["id"],
                }).execute()

                new_achievements.append({
                    "name": ach["name"],
                    "icon": ach["icon"],
                    "tier": ach["tier"],
                })

                logger.info(
                    "Achievement unlocked: student=%s, achievement=%s (%s)",
                    student_id, ach["name"], ach["tier"],
                )
            except Exception as e:
                # Likely duplicate — skip silently
                logger.debug("Could not insert achievement %s for %s: %s", ach["id"], student_id, e)

    return new_achievements


# ---------------------------------------------------------------------------
# GET /all — list all achievement definitions
# ---------------------------------------------------------------------------

@router.get("/all", response_model=AllAchievementsResponse, summary="List all achievements")
async def list_all_achievements():
    """
    Return all achievement definitions (no auth required).
    """
    supabase = get_supabase_admin()
    resp = supabase.table("achievements").select("*").order("threshold_value").execute()
    achievements = resp.data or []

    return AllAchievementsResponse(
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


# ---------------------------------------------------------------------------
# GET /me — student's achievements with progress
# ---------------------------------------------------------------------------

@router.get("/me", response_model=AchievementListResponse, summary="Student achievements with progress")
async def get_my_achievements(
    student: dict = Depends(get_current_student),
):
    """
    Return all achievements with the student's current progress and unlock status.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    # Fetch all achievements
    all_resp = supabase.table("achievements").select("*").order("threshold_value").execute()
    all_achievements = all_resp.data or []

    # Fetch student's unlocked achievements
    unlocked_resp = (
        supabase.table("student_achievements")
        .select("achievement_id, unlocked_at")
        .eq("student_id", student_id)
        .execute()
    )
    unlocked_map: dict[str, str] = {}
    for row in (unlocked_resp.data or []):
        unlocked_map[row["achievement_id"]] = row["unlocked_at"]

    # Gather student stats
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

    return AchievementListResponse(achievements=results)


# ---------------------------------------------------------------------------
# POST /check — check and unlock new achievements
# ---------------------------------------------------------------------------

class CheckRequest(BaseModel):
    student_id: str


@router.post("/check", response_model=CheckResponse, summary="Check and unlock achievements")
async def check_achievements(
    body: CheckRequest,
    student: dict = Depends(get_current_student),
):
    """
    Check and unlock any newly earned achievements for the student.

    Authentication: student JWT (Bearer token).
    """
    # Ensure student can only check their own achievements
    if body.student_id != student["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot check achievements for another student",
        )

    new_achievements = await check_and_unlock_achievements(body.student_id)
    return CheckResponse(
        new_achievements=[NewAchievement(**a) for a in new_achievements]
    )
