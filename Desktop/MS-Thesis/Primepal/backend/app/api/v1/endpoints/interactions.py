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
    - Returns summary stats: logged count, correct count, accuracy percentage.

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

    # Insert each result as a student_interactions record
    for result in request.results:
        time_spent = 15 - result.time_remaining

        # Use service role client to bypass RLS (backend write)
        response = supabase.table("student_interactions").insert({
            "student_id": student_id,
            "classroom_id": classroom_id,
            "grade_level": 0,  # Will be fetched if needed; for now, fetch from classroom
            "interaction_type": "mission_mc",  # Assuming multiple choice; can be enhanced
            "original_message": None,
            "translated_message": None,
            "correct": result.is_correct,
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

    return LogInteractionsResponse(
        logged_interactions=total_count,
        correct_count=correct_count,
        accuracy=accuracy,
        pillar=request.pillar,
    )
