"""
Feature 6: Gamified Missions — /api/v1/missions

Endpoints:
  GET  /api/v1/missions/daily    — Generate 3 daily questions (student auth required)
  POST /api/v1/missions/complete — Record answer result, award points (student auth required)
  GET  /api/v1/missions/me       — Fetch student profile + points (student auth required)

Grade level is always resolved from the classroom DB record — the client cannot supply or
override it. correct_answer is stripped from the /daily response; the client sends back
question_correct (bool) to /complete, which the server trusts (thesis prototype).
"""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks
from app.agents.evaluator_agent.interaction_logger import log_interaction
from app.agents.tutor_agent.mission_generator import (
    DailyMissions,
    MissionQuestion,
    QuestionOption,
    generate_daily_missions,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Points awarded per correct answer
_POINTS_PER_CORRECT = 10

# Fixed seed phrase used to retrieve representative grade-level SNC vocabulary chunks.
# This is intentionally generic so the vector search returns a broad mix of grade content.
_SEED_PHRASE = "vocabulary words lesson"


# ---------------------------------------------------------------------------
# Response schemas (correct_answer intentionally omitted from client-facing models)
# ---------------------------------------------------------------------------

class QuestionOptionOut(BaseModel):
    id: str
    text: str


class MissionQuestionOut(BaseModel):
    id: int
    type: str
    question: str
    options: list[QuestionOptionOut] | None
    emoji_hint: str
    # NOTE: correct_answer is deliberately absent from this model


class DailyMissionsResponse(BaseModel):
    grade_level: int
    topic: str
    questions: list[MissionQuestionOut]


class CompleteRequest(BaseModel):
    question_correct: bool


class CompleteResponse(BaseModel):
    points_awarded: int
    new_total: int


class StudentProfileResponse(BaseModel):
    student_id: str
    student_name: str
    avatar_url: str | None
    points: int


# ---------------------------------------------------------------------------
# Helper — strip correct_answer before sending to client
# ---------------------------------------------------------------------------

def _strip_answer(q: MissionQuestion) -> MissionQuestionOut:
    return MissionQuestionOut(
        id=q.id,
        type=q.type,
        question=q.question,
        options=(
            [QuestionOptionOut(id=opt.id, text=opt.text) for opt in q.options]
            if q.options is not None
            else None
        ),
        emoji_hint=q.emoji_hint,
    )


# ---------------------------------------------------------------------------
# GET /daily
# ---------------------------------------------------------------------------

@router.get("/daily", response_model=DailyMissionsResponse, summary="Get daily missions")
async def get_daily_missions(
    student: dict = Depends(get_current_student),
):
    """
    Generate 3 daily English questions tailored to the student's grade level.

    - Grade level is resolved from the classroom DB record (cannot be overridden by client).
    - SNC chunks are retrieved via pgvector RPC filtered by grade_level.
    - correct_answer is NEVER included in the response.

    Authentication: student JWT (Bearer token).
    """
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Resolve grade_level — server-side guardrail
    # ------------------------------------------------------------------
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found for this student",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    # ------------------------------------------------------------------
    # Step 2: Retrieve grade-filtered SNC context chunks
    # ------------------------------------------------------------------
    try:
        context_chunks = await retrieve_grade_filtered_chunks(
            query=_SEED_PHRASE,
            grade_level=grade_level,
            supabase_admin_client=supabase,
            match_count=5,
        )
        logger.info("RAG retrieval succeeded: %d chunks for grade %d", len(context_chunks), grade_level)
    except Exception as exc:
        logger.error(
            "RAG retrieval failed for classroom %s grade %d: %s",
            classroom_id, grade_level, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not retrieve curriculum content. Please try again shortly.",
        )

    # ------------------------------------------------------------------
    # Step 3: Generate missions via LLM
    # ------------------------------------------------------------------
    try:
        missions: DailyMissions = await generate_daily_missions(
            grade_level=grade_level,
            context_chunks=context_chunks,
        )
        if missions is None:
            raise ValueError("generate_daily_missions returned None (structured output parse failure)")
        logger.info("Mission generation succeeded for grade %d, topic: %s", grade_level, missions.topic)
    except HTTPException:
        raise  # re-raise any HTTP exceptions unchanged
    except Exception as exc:
        logger.error(
            "LLM mission generation failed for classroom %s grade %d: %s",
            classroom_id, grade_level, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not generate missions right now. Please try again shortly.",
        )

    # ------------------------------------------------------------------
    # Step 4: Strip correct_answer before returning
    # ------------------------------------------------------------------
    return DailyMissionsResponse(
        grade_level=grade_level,
        topic=missions.topic,
        questions=[_strip_answer(q) for q in missions.questions],
    )


# ---------------------------------------------------------------------------
# POST /complete
# ---------------------------------------------------------------------------

@router.post("/complete", response_model=CompleteResponse, summary="Complete a mission question")
async def complete_mission(
    body: CompleteRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Record whether a student answered a question correctly and award points.

    - Awards 10 points if question_correct is True, 0 otherwise.
    - Points are persisted to the students table.
    - Returns points_awarded and the student's new cumulative total.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Fetch current points
    # ------------------------------------------------------------------
    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    classroom_id: str = student["classroom_id"]

    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    grade_level: int = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    current_points: int = student_resp.data.get("points") or 0
    points_awarded = _POINTS_PER_CORRECT if body.question_correct else 0
    new_total = current_points + points_awarded

    # ------------------------------------------------------------------
    # Step 2: Persist updated points (only if something changed)
    # ------------------------------------------------------------------
    if points_awarded > 0:
        supabase.table("students").update({"points": new_total}).eq(
            "id", student_id
        ).execute()

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type="mission_mc",   # missions are always MC or fill; use mc as default
        original_message=None,
        translated_message=None,
        correct=body.question_correct,
        context_used=False,
    )

    return CompleteResponse(
        points_awarded=points_awarded,
        new_total=new_total,
    )


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=StudentProfileResponse, summary="Get student profile and points")
async def get_student_profile(
    student: dict = Depends(get_current_student),
):
    """
    Fetch the authenticated student's name, avatar, and cumulative points.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    student_resp = (
        supabase.table("students")
        .select("student_name, avatar_url, points")
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
    return StudentProfileResponse(
        student_id=student_id,
        student_name=data["student_name"],
        avatar_url=data.get("avatar_url"),
        points=data.get("points") or 0,
    )
