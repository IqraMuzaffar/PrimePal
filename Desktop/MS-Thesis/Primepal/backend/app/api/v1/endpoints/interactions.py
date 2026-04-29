"""
Feature 8: Student Interaction Logging — /api/v1/interactions

Endpoint:
  POST /api/v1/interactions — Log game results (mission answers) to student_interactions table

The gameplay route sends game results here. Each result is stored as an interaction record
with interaction_type='mission_mc' or 'mission_fill' depending on question type.
Calculation: time_spent = 15 - time_remaining (converts from "time left" to "time spent").
"""
import logging
from datetime import datetime
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request/Response schemas
# ---------------------------------------------------------------------------

class GameResult(BaseModel):
    """A single game result: one question answered."""
    question_id: str
    is_correct: bool
    time_remaining: int


class LogInteractionsRequest(BaseModel):
    """Request to log a batch of game results."""
    pillar: str
    results: list[GameResult]


class LogInteractionsResponse(BaseModel):
    """Summary statistics for the logged interactions."""
    logged_interactions: int
    correct_count: int
    accuracy: float
    pillar: str
    is_frustrated: bool
    frustration_reason: str | None


# ---------------------------------------------------------------------------
# POST /interactions
# ---------------------------------------------------------------------------

@router.post("", response_model=LogInteractionsResponse, status_code=201)
async def log_mission_results(
    request: LogInteractionsRequest,
    student: dict = Depends(get_current_student),
):
    """
    Log game results to student_interactions table.

    - Accepts a list of GameResult objects (question_id, is_correct, time_remaining).
    - For each result, creates a student_interactions record with:
      - interaction_type: 'mission_mc' (hardcoded for now; can be enhanced later)
      - correct: True/False based on is_correct
      - time_spent: 15 - time_remaining
      - pillar: from the request
    - After logging, evaluates frustration based on rolling window of last 3 interactions:
      - All 3 consecutive questions answered incorrectly (100% error rate)
      - Average time_spent for last 3 questions > 12 seconds (high cognitive load)
    - Returns summary stats + is_frustrated flag for adaptive question generation.

    Authentication: student JWT (Bearer token).
    """
    if not request.results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No results provided"
        )

    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    supabase = get_supabase_admin()

    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    # Insert each result as a student_interactions record
    for result in request.results:
        time_spent = 15 - result.time_remaining

        # Use service role client to bypass RLS (backend write)
        response = supabase.table("student_interactions").insert({
            "student_id": student_id,
            "classroom_id": classroom_id,
            "grade_level": grade_level,
            "interaction_type": "mission_mc",  # Assuming multiple choice; can be enhanced
            "original_message": None,
            "translated_message": None,
            "correct": result.is_correct,
            "time_spent": time_spent,  # Store time_spent for frustration analysis
            "pillar": request.pillar,  # Store pillar for contextual tracking
            "context_used": False,
            # created_at is set by the database default
        }).execute()

        if response.data is None:
            logger.error(f"Failed to log interaction for question {result.question_id}: {response}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to log interaction"
            )

    # Calculate summary stats
    correct_count = sum(1 for r in request.results if r.is_correct)
    total_count = len(request.results)
    accuracy = correct_count / total_count if total_count > 0 else 0.0

    # ─────────────────────────────────────────────────────────────────────────────
    # Frustration Detection Algorithm: Check rolling window of last 3 interactions
    # ─────────────────────────────────────────────────────────────────────────────

    is_frustrated = False
    frustration_reason = None

    try:
        # Query last 3 mission interactions for this student (ordered by recency)
        last_interactions = supabase.table("student_interactions").select(
            "correct, time_spent"
        ).eq("student_id", student_id).in_(
            "interaction_type", ["mission_mc", "mission_fill"]
        ).order("created_at", desc=True).limit(3).execute()

        if last_interactions.data and len(last_interactions.data) >= 3:
            interactions = last_interactions.data[:3]

            # Condition 1: Check if all 3 consecutive questions are incorrect
            all_incorrect = all(not interaction.get("correct", False) for interaction in interactions)

            # Condition 2: Check if average time_spent > 12 seconds (high cognitive load)
            time_values = [interaction.get("time_spent", 0) for interaction in interactions]
            avg_time = sum(time_values) / len(time_values) if time_values else 0

            if all_incorrect:
                is_frustrated = True
                frustration_reason = "All 3 consecutive questions answered incorrectly (100% error rate)"
                logger.warning(f"Frustration detected for student {student_id}: {frustration_reason}")

            elif avg_time > 12:
                is_frustrated = True
                frustration_reason = f"High cognitive load: average time spent is {avg_time:.1f}s > 12s threshold"
                logger.warning(f"Frustration detected for student {student_id}: {frustration_reason}")

    except Exception as e:
        logger.error(f"Error during frustration detection for student {student_id}: {e}")
        # Don't raise; silently continue without frustration flag
        # (graceful degradation if query fails)

    return LogInteractionsResponse(
        logged_interactions=total_count,
        correct_count=correct_count,
        accuracy=accuracy,
        pillar=request.pillar,
        is_frustrated=is_frustrated,
        frustration_reason=frustration_reason,
    )
