"""
Feature 6: Gamified Missions — /api/v1/missions

Endpoints:
  GET  /api/v1/missions/daily    — Generate 3 daily questions (student auth required)
  POST /api/v1/missions/complete — Record answer result, award points (student auth required)
  GET  /api/v1/missions/me       — Fetch student profile + points (student auth required)
  GET  /api/v1/missions/pillar   — Generate 10 questions for specific pillar (student auth required)

Grade level is always resolved from the classroom DB record — the client cannot supply or
override it. correct_answer is stripped from responses; the client sends back
question_correct (bool) to /complete, which the server trusts (thesis prototype).

The pillar endpoint (Feature 3) generates missions weighted by student weaknesses and
the teacher-configured current_week_topic.
"""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
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
    generate_pillar_missions,
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
    avatar_style: str
    theme_color: str


class PillarMissionsResponse(BaseModel):
    pillar: str
    current_week_topic: str | None
    questions: list[MissionQuestionOut]
    weakness_focus_questions: int  # count of questions focused on student weaknesses


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
        .select("student_name, avatar_url, avatar_style, theme_color, points")
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
        avatar_style=data.get("avatar_style") or "adventurer",
        theme_color=data.get("theme_color") or "#6366f1",
    )


# ---------------------------------------------------------------------------
# GET /pillar (Feature 3: Pillar-based Missions)
# ---------------------------------------------------------------------------

@router.get("/pillar", response_model=PillarMissionsResponse, summary="Get missions for specific pillar")
async def get_pillar_missions(
    pillar: str = Query(..., description="Pillar type: reading, writing, listening, speaking"),
    student: dict = Depends(get_current_student),
):
    """
    Generate 10 questions for a specific pillar, weighted by student weaknesses.

    - Pillar parameter must be one of: reading, writing, listening, speaking
    - Questions are tailored to the current_week_topic set by the teacher
    - Questions are weighted by the student's recent incorrect answers (weaknesses)
    - correct_answer is NEVER included in the response
    - Returns exactly 10 questions with a count of weakness-focused questions

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Validate pillar parameter
    # ------------------------------------------------------------------
    valid_pillars = ["reading", "writing", "listening", "speaking"]
    if pillar not in valid_pillars:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pillar. Must be one of {valid_pillars}",
        )

    # ------------------------------------------------------------------
    # Step 2: Fetch classroom and current_week_topic
    # ------------------------------------------------------------------
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level, current_week_topic")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found for this student",
        )
    classroom_data = classroom_resp.data
    grade_level: int = classroom_data["grade_level"]
    current_week_topic: str | None = classroom_data.get("current_week_topic")

    # ------------------------------------------------------------------
    # Step 3: Fetch student's recent incorrect answers (weaknesses)
    # For now, we query the interactions table for failed interactions
    # (This will be replaced with SQLAlchemy async when the interactions
    # table is fully integrated)
    # ------------------------------------------------------------------
    try:
        interactions_resp = (
            supabase.table("interactions")
            .select("*")
            .eq("student_id", student_id)
            .eq("pillar", pillar)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        student_weaknesses = [
            interaction.get("input_text") or interaction.get("audio_transcript")
            for interaction in (interactions_resp.data or [])
            if interaction.get("score", 1.0) < 0.6  # Failed attempts (score < 60%)
        ]
    except Exception as exc:
        logger.warning(
            "Could not fetch student weaknesses for %s pillar %s: %s",
            student_id, pillar, exc,
        )
        student_weaknesses = []

    # ------------------------------------------------------------------
    # Step 4: Generate pillar missions via mission generator stub
    # (Task 4 will implement the full MissionGenerator.generate_pillar_missions)
    # ------------------------------------------------------------------
    try:
        missions = await generate_pillar_missions(
            pillar=pillar,
            grade_level=grade_level,
            current_week_topic=current_week_topic,
            student_id=student_id,
            student_weaknesses=student_weaknesses,
        )
        if missions is None:
            raise ValueError("generate_pillar_missions returned None")
        logger.info(
            "Pillar mission generation succeeded for student %s pillar %s, count: %d",
            student_id, pillar, len(missions),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Pillar mission generation failed for student %s classroom %s pillar %s: %s",
            student_id, classroom_id, pillar, exc, exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not generate missions right now. Please try again shortly.",
        )

    # ------------------------------------------------------------------
    # Step 5: Count weakness-focused questions and strip correct_answer
    # ------------------------------------------------------------------
    weakness_focus_count = sum(
        1 for q in missions if q.get("is_weakness_focused", False)
    )

    # Convert dicts to MissionQuestion objects if needed
    mission_questions = []
    for q in missions:
        if isinstance(q, dict):
            # Create a MissionQuestion from dict, removing is_weakness_focused flag
            mq = MissionQuestion(
                id=q["id"],
                type=q["type"],
                question=q["question"],
                options=q.get("options"),
                correct_answer=q["correct_answer"],
                emoji_hint=q["emoji_hint"],
            )
            mission_questions.append(mq)
        else:
            mission_questions.append(q)

    return PillarMissionsResponse(
        pillar=pillar,
        current_week_topic=current_week_topic,
        questions=[_strip_answer(q) for q in mission_questions],
        weakness_focus_questions=weakness_focus_count,
    )
