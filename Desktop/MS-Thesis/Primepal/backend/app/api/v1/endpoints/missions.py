"""
Feature 6: Gamified Missions — /api/v1/missions

Endpoints:
  GET  /api/v1/missions/daily            — Generate 3 daily questions (student auth required)
  POST /api/v1/missions/complete         — Record answer result, award points (student auth required)
  GET  /api/v1/missions/me               — Fetch student profile + points (student auth required)
  GET  /api/v1/missions/pillar           — Generate 10 questions for specific pillar (student auth required)
  GET  /api/v1/missions/weekly-progress  — Weekly 4-pillar progress tracking (student auth required)

Grade level is always resolved from the classroom DB record — the client cannot supply or
override it. correct_answer is stripped from responses; the client sends back
question_correct (bool) to /complete, which the server trusts (thesis prototype).

The pillar endpoint (Feature 3) generates missions weighted by student weaknesses and
the teacher-configured current_week_topic.
"""
import asyncio
import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.api.v1.endpoints.classroom import get_active_topics
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key, debounced_invalidate
from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks
from app.agents.evaluator_agent.interaction_logger import log_interaction
from app.core.config import settings
from app.utils.streak import update_streak
from app.agents.tutor_agent.mission_generator import (
    BANK_QUESTIONS_COUNT,
    DAILY_MISSIONS_COUNT,
    DailyMissions,
    LLM_QUESTIONS_COUNT,
    MissionQuestion,
    PILLAR_QUESTIONS_COUNT,
    QuestionOption,
    generate_daily_missions,
    generate_pillar_missions,
    validate_topic_alignment,
)
from app.utils.performance_profile import get_student_performance_profile, invalidate_performance_cache
from app.utils.pregenerate_missions import _build_generic_cache_key
from app.utils.question_bank import pull_from_bank
from app.api.v1.endpoints.rewards import invalidate_rewards_cache
from app.api.v1.endpoints.student_scores import invalidate_scores_cache

logger = logging.getLogger(__name__)

router = APIRouter()

# Points awarded per correct answer
_POINTS_PER_CORRECT = 10

# Fixed seed phrase used to retrieve representative grade-level SNC vocabulary chunks.
# This is intentionally generic so the vector search returns a broad mix of grade content.
_SEED_PHRASE = "vocabulary words lesson"


async def invalidate_profile_cache(student_id: str) -> None:
    """Invalidate student profile cache (call after points/profile changes)."""
    cache_key = make_cache_key("student_profile", student_id)
    await cache_delete(cache_key)


# ---------------------------------------------------------------------------
# Response schemas (correct_answer intentionally omitted from client-facing models)
# ---------------------------------------------------------------------------

class QuestionOptionOut(BaseModel):
    id: str
    text: str
    emoji: str | None = None


class MissionQuestionOut(BaseModel):
    id: int
    task_type: str
    pillar: str
    question: str
    difficulty: str
    points_value: int
    emoji_hint: str
    options: list[QuestionOptionOut] | None = None
    passage: str | None = None
    audio_text: str | None = None
    image_context: str | None = None
    image_options: list[QuestionOptionOut] | None = None
    word_bank: list[str] | None = None
    word_with_blanks: str | None = None
    letter_options: list[str] | None = None
    sentence_start: str | None = None
    urdu_hint: str = ""
    correct_order: list[str] | None = None  # Needed for frontend validation (sentence_scramble, guided_translation)
    correct_answer: str | None = None  # Included for frontend validation (primary students, learning-focused)


class DailyMissionsResponse(BaseModel):
    grade_level: int
    topic: str
    questions: list[MissionQuestionOut]


class CompleteRequest(BaseModel):
    question_correct: bool
    question_type: str = "multiple_choice"
    task_type: str | None = None
    pillar: str | None = None
    points_value: int = 10
    answer_data: dict | None = None
    submitted_at: str | None = None  # ISO timestamp for idempotency checks


class CompleteResponse(BaseModel):
    points_awarded: int
    new_total: int
    current_streak: int = 0


class StudentProfileResponse(BaseModel):
    student_id: str
    student_name: str
    roll_number: str | None
    avatar_url: str | None
    points: int
    missions_completed: int
    avatar_style: str
    theme_color: str


class PillarMissionsResponse(BaseModel):
    pillar: str
    active_topics_summary: str | None  # comma-joined active topic names
    questions: list[MissionQuestionOut]
    weakness_focus_questions: int  # count of questions focused on student weaknesses


# ---------------------------------------------------------------------------
# Helper — strip correct_answer before sending to client
# ---------------------------------------------------------------------------

def _strip_answer(q) -> MissionQuestionOut:
    """Include correct_answer and correct_order for frontend validation."""
    if isinstance(q, dict):
        return MissionQuestionOut(
            id=q.get("id", 0),
            task_type=q.get("task_type", q.get("type", "multiple_choice")),
            pillar=q.get("pillar", ""),
            question=q.get("question", ""),
            difficulty=q.get("difficulty", "medium"),
            points_value=q.get("points_value", 10),
            emoji_hint=q.get("emoji_hint", ""),
            options=[QuestionOptionOut(**o) for o in q["options"]] if q.get("options") else None,
            passage=q.get("passage"),
            audio_text=q.get("audio_text"),
            image_context=q.get("image_context"),
            image_options=[QuestionOptionOut(**o) for o in q["image_options"]] if q.get("image_options") else None,
            word_bank=q.get("word_bank"),
            word_with_blanks=q.get("word_with_blanks"),
            letter_options=q.get("letter_options"),
            sentence_start=q.get("sentence_start"),
            urdu_hint=q.get("urdu_hint", ""),
            correct_order=q.get("correct_order"),  # Include for frontend validation!
            correct_answer=q.get("correct_answer"),  # Include for frontend validation!
        )
    return MissionQuestionOut(
        id=q.id,
        task_type=q.task_type if hasattr(q, 'task_type') else getattr(q, 'type', 'multiple_choice'),
        pillar=getattr(q, 'pillar', ''),
        question=q.question,
        difficulty=getattr(q, 'difficulty', 'medium'),
        points_value=getattr(q, 'points_value', 10),
        emoji_hint=q.emoji_hint,
        options=[QuestionOptionOut(id=o.id, text=o.text, emoji=getattr(o, 'emoji', None)) for o in q.options] if q.options else None,
        passage=getattr(q, 'passage', None),
        audio_text=getattr(q, 'audio_text', None),
        image_context=getattr(q, 'image_context', None),
        correct_order=getattr(q, 'correct_order', None),  # Include for frontend validation!
        correct_answer=getattr(q, 'correct_answer', None),  # Include for frontend validation!
        image_options=[QuestionOptionOut(id=o.id, text=o.text, emoji=getattr(o, 'emoji', None)) for o in q.image_options] if getattr(q, 'image_options', None) else None,
        word_bank=getattr(q, 'word_bank', None),
        word_with_blanks=getattr(q, 'word_with_blanks', None),
        letter_options=getattr(q, 'letter_options', None),
        sentence_start=getattr(q, 'sentence_start', None),
        urdu_hint=getattr(q, 'urdu_hint', ''),
    )


# ---------------------------------------------------------------------------
# GET /daily
# ---------------------------------------------------------------------------

@router.get("/daily", response_model=DailyMissionsResponse, summary="Get daily missions")
async def get_daily_missions(
    is_frustrated: bool = Query(False, description="If True, generate 'Confidence Builder' questions to recover affective state"),
    student: dict = Depends(get_current_student),
):
    """
    Generate 3 daily English questions tailored to the student's grade level.

    - Grade level is resolved from the classroom DB record (cannot be overridden by client).
    - SNC chunks are retrieved via pgvector RPC filtered by grade_level.
    - correct_answer is NEVER included in the response.
    - If is_frustrated=true, generates "Confidence Builder" questions with reduced complexity
      to help student recover from cognitive overload (Affective Filter management)
    - Caches results for 1 hour to reduce LLM calls

    Authentication: student JWT (Bearer token).
    """
    classroom_id: str = student["classroom_id"]
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Fetch classroom grade (needed for active topics)
    # ------------------------------------------------------------------
    async def fetch_classroom_grade():
        """Fetch classroom grade level."""
        resp = (
            supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classroom not found for this student",
            )
        return resp.data["grade_level"]

    # Fetch grade level first (needed for active topics)
    grade_level = await asyncio.to_thread(fetch_classroom_grade)

    # ------------------------------------------------------------------
    # Step 2: Resolve active topics for topic-aware cache key + seed phrase
    # ------------------------------------------------------------------
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]

    # ------------------------------------------------------------------
    # Step 0: Check cache (only if not frustrated — frustrated students need fresh questions)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("daily_missions", classroom_id, str(is_frustrated), topics_hash)
    if not is_frustrated:
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"Cache hit for daily missions: {cache_key}")
            return DailyMissionsResponse(**cached)

    # ------------------------------------------------------------------
    # Step 3: Retrieve grade-filtered SNC context chunks
    # ------------------------------------------------------------------
    seed_phrase = f"English topics: {', '.join(active_topic_names)}" if active_topic_names else "vocabulary words lesson"
    try:
        context_chunks = await retrieve_grade_filtered_chunks(
            query=seed_phrase,
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
    # Step 4: Generate missions via LLM
    # If is_frustrated=true, generates Confidence Builder questions
    # ------------------------------------------------------------------
    try:
        missions: DailyMissions = await generate_daily_missions(
            grade_level=grade_level,
            context_chunks=context_chunks,
            active_topics=active_topic_names,
            is_frustrated=is_frustrated,
        )
        if missions is None:
            raise ValueError("generate_daily_missions returned None (structured output parse failure)")

        log_suffix = " (Confidence Builder)" if is_frustrated else ""
        logger.info("Mission generation succeeded for grade %d, topic: %s%s", grade_level, missions.topic, log_suffix)
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
    # Step 4: C1 — Validate daily mission count is exactly 3
    # ------------------------------------------------------------------
    daily_questions = missions.questions[:DAILY_MISSIONS_COUNT]
    if len(daily_questions) != DAILY_MISSIONS_COUNT:
        logger.error(
            "C1: Daily missions count mismatch: got %d, expected %d for grade %d",
            len(daily_questions), DAILY_MISSIONS_COUNT, grade_level,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Generated {len(daily_questions)} questions instead of {DAILY_MISSIONS_COUNT}. Please try again.",
        )

    # ------------------------------------------------------------------
    # Step 5: Strip correct_answer before returning
    # ------------------------------------------------------------------
    response = DailyMissionsResponse(
        grade_level=grade_level,
        topic=missions.topic,
        questions=[_strip_answer(q) for q in daily_questions],
    )

    # Cache the response for future requests
    if not is_frustrated:
        await cache_set(cache_key, response.model_dump(), ttl=3600)

    return response


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

    # ------------------------------------------------------------------
    # Idempotency check: look for a duplicate interaction within 60s
    # ------------------------------------------------------------------
    interaction_type = f"mission_{body.task_type}" if body.task_type else (
        "mission_fill" if body.question_type == "fill_blank" else "mission_mc"
    )

    if body.submitted_at:
        try:
            submitted_dt = datetime.fromisoformat(body.submitted_at.replace("Z", "+00:00"))
            window_start = (submitted_dt - timedelta(seconds=60)).isoformat()
            window_end = (submitted_dt + timedelta(seconds=60)).isoformat()

            dup_resp = (
                supabase.table("student_interactions")
                .select("id")
                .eq("student_id", student_id)
                .eq("interaction_type", interaction_type)
                .gte("created_at", window_start)
                .lte("created_at", window_end)
                .limit(1)
                .execute()
            )
            if dup_resp.data:
                logger.info("Duplicate submission detected for student %s, skipping points", student_id)
                return CompleteResponse(points_awarded=0, new_total=current_points)
        except (ValueError, TypeError):
            pass  # If submitted_at is malformed, skip idempotency check

    points_awarded = (body.points_value or _POINTS_PER_CORRECT) if body.question_correct else 0

    # ------------------------------------------------------------------
    # Step 2: Atomically increment points via RPC
    # ------------------------------------------------------------------
    if points_awarded > 0:
        rpc_result = supabase.rpc("increment_student_points", {
            "p_student_id": student_id,
            "p_points": points_awarded,
        }).execute()
        result_data = rpc_result.data[0] if rpc_result.data else {}
        new_total = result_data.get("new_points", current_points + points_awarded)
    else:
        new_total = current_points

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type=f"mission_{body.task_type}" if body.task_type else (
            "mission_fill" if body.question_type == "fill_blank" else "mission_mc"
        ),
        original_message=None,
        translated_message=None,
        correct=body.question_correct,
        context_used=False,
        pillar=body.pillar,
        score=points_awarded,
    )

    # Update daily streak (any completed mission counts as activity)
    streak_data = await update_streak(student_id)

    # Always invalidate profile + daily pillar status (must update immediately)
    background_tasks.add_task(invalidate_profile_cache, student_id)
    background_tasks.add_task(
        cache_delete, make_cache_key("daily_pillar_status", student_id)
    )
    background_tasks.add_task(
        debounced_invalidate,
        student_id,
        [invalidate_performance_cache, invalidate_rewards_cache, invalidate_scores_cache],
    )

    # Check and unlock any newly earned achievements
    from app.api.v1.endpoints.achievements import check_and_unlock_achievements
    background_tasks.add_task(check_and_unlock_achievements, student_id)

    return CompleteResponse(
        points_awarded=points_awarded,
        new_total=new_total,
        current_streak=streak_data.get("current_streak", 0),
    )


# ---------------------------------------------------------------------------
# POST /submit-batch (Offline queue batch submission)
# ---------------------------------------------------------------------------

class BatchSubmitRequest(BaseModel):
    answers: list[CompleteRequest]


class BatchSubmitResponse(BaseModel):
    processed: int
    skipped: int
    new_total: int


@router.post("/submit-batch", response_model=BatchSubmitResponse, summary="Batch-submit queued answers")
async def submit_batch(
    body: BatchSubmitRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Submit multiple answers at once (for offline queue flush).
    Applies the same idempotency logic as /complete — duplicates are skipped.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # Fetch student data once
    try:
        student_resp = (
            supabase.table("students")
            .select("points")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        if "Missing response" not in str(e) and "204" not in str(e):
            raise
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

    if not student_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")

    try:
        classroom_resp = (
            supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        if "Missing response" not in str(e) and "204" not in str(e):
            raise
        classroom_resp = type('obj', (object,), {'data': None})()

    grade_level: int = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    current_points: int = student_resp.data.get("points") or 0
    processed = 0
    skipped = 0

    for answer in body.answers:
        itype = f"mission_{answer.task_type}" if answer.task_type else (
            "mission_fill" if answer.question_type == "fill_blank" else "mission_mc"
        )

        # Idempotency check
        is_dup = False
        if answer.submitted_at:
            try:
                submitted_dt = datetime.fromisoformat(answer.submitted_at.replace("Z", "+00:00"))
                window_start = (submitted_dt - timedelta(seconds=60)).isoformat()
                window_end = (submitted_dt + timedelta(seconds=60)).isoformat()

                dup_resp = (
                    supabase.table("student_interactions")
                    .select("id")
                    .eq("student_id", student_id)
                    .eq("interaction_type", itype)
                    .gte("created_at", window_start)
                    .lte("created_at", window_end)
                    .limit(1)
                    .execute()
                )
                if dup_resp.data:
                    is_dup = True
            except (ValueError, TypeError):
                pass

        if is_dup:
            skipped += 1
            continue

        pts = (answer.points_value or _POINTS_PER_CORRECT) if answer.question_correct else 0
        current_points += pts
        processed += 1

        background_tasks.add_task(
            log_interaction,
            student_id=student_id,
            classroom_id=classroom_id,
            grade_level=grade_level,
            interaction_type=itype,
            original_message=None,
            translated_message=None,
            correct=answer.question_correct,
            context_used=False,
            pillar=answer.pillar,
            score=pts,
        )

    # Persist updated totals atomically via RPC once
    final_total = student_resp.data.get("points") or 0
    if processed > 0:
        total_points_earned = current_points - (student_resp.data.get("points") or 0)
        rpc_result = supabase.rpc("increment_student_points", {
            "p_student_id": student_id,
            "p_points": total_points_earned,
        }).execute()
        result_data = rpc_result.data[0] if rpc_result.data else {}
        final_total = result_data.get("new_points", current_points)

        # Update daily streak after batch processing
        await update_streak(student_id)

        # Always invalidate profile cache (points changed), debounce the rest
        background_tasks.add_task(invalidate_profile_cache, student_id)
        background_tasks.add_task(
            debounced_invalidate,
            student_id,
            [invalidate_performance_cache, invalidate_rewards_cache, invalidate_scores_cache],
        )

    return BatchSubmitResponse(
        processed=processed,
        skipped=skipped,
        new_total=final_total,
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
    Cached for 5 minutes to reduce database queries.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    supabase = get_supabase_admin()

    # Check cache first (5 min TTL for profile data)
    cache_key = make_cache_key("student_profile", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return StudentProfileResponse(**cached)

    try:
        student_resp = (
            supabase.table("students")
            .select("student_name, roll_number, avatar_url, avatar_style, theme_color, points")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        if "Missing response" not in str(e) and "204" not in str(e):
            raise
        # If 204, treat as not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found",
        )

    data = student_resp.data

    missions_count_resp = (
        supabase.table("student_interactions")
        .select("id", count="exact")
        .eq("student_id", student_id)
        .like("interaction_type", "mission%")
        .execute()
    )
    missions_done = missions_count_resp.count or 0

    response = StudentProfileResponse(
        student_id=student_id,
        student_name=data["student_name"],
        roll_number=data.get("roll_number"),
        avatar_url=data.get("avatar_url"),
        points=data.get("points") or 0,
        missions_completed=missions_done,
        avatar_style=data.get("avatar_style") or "adventurer",
        theme_color=data.get("theme_color") or "#6366f1",
    )

    # Cache for 5 minutes
    await cache_set(cache_key, response.model_dump(), ttl=300)
    return response


# ---------------------------------------------------------------------------
# GET /pillar (Feature 3: Pillar-based Missions)
# ---------------------------------------------------------------------------

async def _generate_personalized_missions(
    student_id: str,
    classroom_id: str,
    pillar: str,
    grade_level: int,
    active_topic_names: list[str],
    student_weaknesses: list[str],
    performance_profile: dict | None,
    cache_key: str,
) -> None:
    """Background task: generate personalized pillar missions via hybrid bank+LLM and cache them."""
    try:
        # Retrieve SNC curriculum context (with caching)
        supabase = get_supabase_admin()
        seed_phrase = f"Topics: {', '.join(active_topic_names)}" if active_topic_names else "vocabulary words lesson"

        topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]
        rag_cache_key = make_cache_key("rag_context", str(grade_level), topics_hash)
        context_chunks = await cache_get(rag_cache_key)

        if context_chunks is None:
            try:
                context_chunks = await retrieve_grade_filtered_chunks(
                    query=seed_phrase,
                    grade_level=grade_level,
                    supabase_admin_client=supabase,
                    match_count=5,
                )
                logger.info(f"Background task RAG retrieval: {len(context_chunks)} chunks for {pillar} grade {grade_level}")
                await cache_set(rag_cache_key, context_chunks, ttl=3600)
            except Exception as exc:
                logger.warning(f"Background task RAG retrieval failed, continuing without curriculum context: {exc}")
                context_chunks = []
        else:
            logger.info(f"Background task RAG cache hit for grade {grade_level}, topics {topics_hash}")

        # Hybrid: parallel bank pull + LLM generation
        async def _bg_bank():
            try:
                return await pull_from_bank(
                    grade_level=grade_level, pillar=pillar,
                    topics=active_topic_names, count=BANK_QUESTIONS_COUNT,
                    classroom_id=classroom_id,
                )
            except Exception:
                return []

        async def _bg_llm():
            try:
                return await generate_pillar_missions(
                    pillar=pillar, grade_level=grade_level,
                    active_topics=active_topic_names, student_id=student_id,
                    student_weaknesses=student_weaknesses, is_frustrated=False,
                    performance_profile=performance_profile, context_chunks=context_chunks,
                )
            except Exception:
                return None

        bank_qs, llm_qs = await asyncio.gather(_bg_bank(), _bg_llm())

        # Merge: bank first, then LLM, then fallback
        merged: list[dict] = []
        for q in (bank_qs or []):
            if len(merged) < PILLAR_QUESTIONS_COUNT:
                merged.append(q)
        for q in (llm_qs or []):
            if len(merged) < PILLAR_QUESTIONS_COUNT:
                merged.append(q)

        # H2: Fill remaining from bank if needed
        if len(merged) < PILLAR_QUESTIONS_COUNT:
            fallback = await pull_from_bank(
                grade_level=grade_level, pillar=pillar,
                topics=active_topic_names,
                count=PILLAR_QUESTIONS_COUNT - len(merged),
                classroom_id=classroom_id,
            )
            for q in (fallback or []):
                if len(merged) < PILLAR_QUESTIONS_COUNT:
                    merged.append(q)

        if not merged:
            return

        # Re-number
        for i, q in enumerate(merged):
            q["id"] = i + 1

        weakness_focus_count = sum(
            1 for q in merged if q.get("is_weakness_focused", False)
        )

        mission_questions = []
        for q in merged:
            if isinstance(q, dict):
                q_filtered = {k: v for k, v in q.items() if k not in ("is_weakness_focused", "source")}
                if "type" in q_filtered and "task_type" not in q_filtered:
                    q_filtered["task_type"] = q_filtered.pop("type")
                mission_questions.append(MissionQuestion(**q_filtered))
            else:
                mission_questions.append(q)

        response = PillarMissionsResponse(
            pillar=pillar,
            active_topics_summary=", ".join(active_topic_names) if active_topic_names else None,
            questions=[_strip_answer(q) for q in mission_questions],
            weakness_focus_questions=weakness_focus_count,
        )
        await cache_set(cache_key, response.model_dump(), ttl=3600)
        logger.info(
            "Background personalization cached for student %s pillar %s (%d questions)",
            student_id, pillar, len(merged),
        )
    except Exception as exc:
        logger.error("Background personalization failed for student %s pillar %s: %s", student_id, pillar, exc)


@router.get("/pillar", response_model=PillarMissionsResponse, summary="Get missions for specific pillar")
async def get_pillar_missions(
    background_tasks: BackgroundTasks,
    pillar: str = Query(..., description="Pillar type: reading, writing, listening, speaking"),
    is_frustrated: bool = Query(False, description="If True, generate 'Confidence Builder' questions to recover affective state"),
    student: dict = Depends(get_current_student),
):
    """
    Generate 10 questions for a specific pillar, weighted by student weaknesses.

    - Pillar parameter must be one of: reading, writing, listening, speaking
    - Questions are tailored to the current_week_topic set by the teacher
    - Questions are weighted by the student's recent incorrect answers (weaknesses)
    - correct_answer is NEVER included in the response
    - Returns exactly 10 questions with a count of weakness-focused questions
    - If is_frustrated=true, generates "Confidence Builder" questions with reduced complexity
      to help student recover from cognitive overload (Affective Filter management)
    - Caches results for 1 hour to reduce LLM calls

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
    # Step 2: Fetch classroom grade + resolve active topics (parallelize initial queries)
    # ------------------------------------------------------------------
    async def fetch_classroom_grade():
        """Fetch classroom grade level."""
        resp = (
            supabase.table("classrooms")
            .select("grade_level")
            .eq("id", classroom_id)
            .maybe_single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classroom not found for this student",
            )
        return resp.data["grade_level"]

    async def fetch_weaknesses():
        """
        Fetch student's weak pillars based on recent performance.

        H3: Returns structured dicts instead of formatted strings so that
        downstream consumers (LLM prompt builder, bank selector) can access
        individual fields without parsing.

        Analyzes last 30 interactions per student to identify pillars with <60% accuracy.
        Only returns pillars with minimum 3 attempts to ensure statistical validity.

        Returns:
            List of structured dicts like:
            [{"pillar": "reading", "accuracy": 40, "correct": 4, "total": 10}, ...]
        """
        # Cache weakness detection for 5 minutes
        weakness_cache_key = make_cache_key("weaknesses", student_id)
        cached_weaknesses = await cache_get(weakness_cache_key)

        if cached_weaknesses is not None:
            logger.info(f"Weakness cache hit for student {student_id}")
            return cached_weaknesses

        try:
            # Get last 30 interactions across all pillars
            resp = (
                supabase.table("student_interactions")
                .select("pillar, correct, interaction_type")
                .eq("student_id", student_id)
                .not_.is_("pillar", "null")
                .order("created_at", desc=True)
                .limit(30)
                .execute()
            )

            # Calculate accuracy per pillar
            pillar_stats: dict[str, dict] = {}
            for r in resp.data or []:
                p = r.get("pillar")
                if p and p in ["reading", "writing", "listening", "speaking"]:
                    if p not in pillar_stats:
                        pillar_stats[p] = {"correct": 0, "total": 0}
                    pillar_stats[p]["total"] += 1
                    if r.get("correct"):
                        pillar_stats[p]["correct"] += 1

            # H3: Return structured dicts for pillars with <60% accuracy (minimum 3 attempts)
            weaknesses: list[dict] = []
            for pillar_name, stats in pillar_stats.items():
                if stats["total"] >= 3:
                    acc = stats["correct"] / stats["total"]
                    if acc < 0.6:
                        weaknesses.append({
                            "pillar": pillar_name,
                            "accuracy": round(acc * 100),
                            "correct": stats["correct"],
                            "total": stats["total"],
                        })

            if weaknesses:
                logger.info(
                    "Student %s weaknesses detected: %s",
                    student_id,
                    ", ".join(f"{w['pillar']}({w['accuracy']}%)" for w in weaknesses),
                )

            # Cache for 5 minutes
            await cache_set(weakness_cache_key, weaknesses, ttl=300)

            return weaknesses
        except Exception as exc:
            logger.warning("Could not fetch student weaknesses: %s", exc)
            return []

    # Run all independent queries in parallel
    grade_level, student_weaknesses, performance_profile = await asyncio.gather(
        fetch_classroom_grade(),
        fetch_weaknesses(),
        get_student_performance_profile(student_id)
    )

    # Log performance profile if available
    if performance_profile:
        logger.info("Performance profile loaded for student %s: overall=%.1f%%", student_id, performance_profile.get("overall_accuracy", 0))

    # Fetch active topics (depends on grade_level from fetch_classroom_grade)
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]

    # ------------------------------------------------------------------
    # Step 0: Check cache (only if not frustrated — frustrated students need fresh questions)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
    if not is_frustrated:
        # Check student-specific cache first
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"Cache hit for pillar missions (student): {cache_key}")
            return PillarMissionsResponse(**cached)

        # Fallback: check generic classroom-level cache (pre-generated)
        generic_key = _build_generic_cache_key(classroom_id, pillar, topics_hash)
        generic_cached = await cache_get(generic_key)
        if generic_cached:
            logger.info(f"Cache hit for pillar missions (generic): {generic_key}")
            background_tasks.add_task(
                _generate_personalized_missions,
                student_id, classroom_id, pillar, grade_level,
                active_topic_names, student_weaknesses, performance_profile,
                cache_key,
            )
            return PillarMissionsResponse(**generic_cached)

    # ------------------------------------------------------------------
    # Step 3: Pull 5 questions from question_bank (instant) + start LLM (parallel)
    # ------------------------------------------------------------------
    seed_phrase = f"Topics: {', '.join(active_topic_names)}" if active_topic_names else "vocabulary words lesson"

    # Cache RAG context by grade_level and topics (1 hour TTL)
    rag_cache_key = make_cache_key("rag_context", str(grade_level), topics_hash)
    context_chunks = await cache_get(rag_cache_key)

    if context_chunks is None:
        try:
            context_chunks = await retrieve_grade_filtered_chunks(
                query=seed_phrase,
                grade_level=grade_level,
                supabase_admin_client=supabase,
                match_count=5,
            )
            logger.info(f"RAG retrieval for pillar missions: {len(context_chunks)} chunks for {pillar} grade {grade_level}")
            await cache_set(rag_cache_key, context_chunks, ttl=3600)
        except Exception as exc:
            logger.warning(f"RAG retrieval failed for pillar missions, continuing without curriculum context: {exc}")
            context_chunks = []
    else:
        logger.info(f"RAG cache hit for grade {grade_level}, topics {topics_hash}: {len(context_chunks)} chunks")

    # ------------------------------------------------------------------
    # Step 4a: Pull from bank first (instant) to know how many LLM needs
    # ------------------------------------------------------------------
    try:
        bank_questions = await pull_from_bank(
            grade_level=grade_level,
            pillar=pillar,
            topics=active_topic_names,
            count=BANK_QUESTIONS_COUNT,
            classroom_id=classroom_id,
        )
    except Exception as exc:
        logger.warning("Bank pull failed, LLM will generate all %d: %s", PILLAR_QUESTIONS_COUNT, exc)
        bank_questions = []

    # How many does LLM need to generate? (10 - bank_count)
    llm_needed = PILLAR_QUESTIONS_COUNT - len(bank_questions)
    logger.info(
        "Bank provided %d questions for %s. LLM will generate %d.",
        len(bank_questions), pillar, llm_needed,
    )

    # ------------------------------------------------------------------
    # Step 4b: Generate remaining questions via LLM
    # ------------------------------------------------------------------
    llm_questions = None
    if llm_needed > 0:
        try:
            llm_questions = await generate_pillar_missions(
                pillar=pillar,
                grade_level=grade_level,
                active_topics=active_topic_names,
                student_id=student_id,
                student_weaknesses=student_weaknesses,
                is_frustrated=is_frustrated,
                performance_profile=performance_profile,
                context_chunks=context_chunks,
                count=llm_needed,
            )
        except Exception as exc:
            logger.error(
                "LLM pillar generation failed for student %s pillar %s: %s",
                student_id, pillar, exc, exc_info=True,
            )
            llm_questions = None

    log_suffix = " (Confidence Builder)" if is_frustrated else ""

    # ------------------------------------------------------------------
    # Step 5: Validator checks LLM output, repairs if needed
    # ------------------------------------------------------------------
    validated_llm: list[dict] = []
    if llm_questions:
        # LLM questions already went through validate_topic_alignment in
        # generate_pillar_missions; do a final sanity check here
        for q in llm_questions:
            if isinstance(q, dict) and q.get("question"):
                validated_llm.append(q)
        logger.info(
            "LLM produced %d validated questions for %s%s",
            len(validated_llm), pillar, log_suffix,
        )
    else:
        logger.warning(
            "LLM returned no questions for %s — bank will fill all %d%s",
            pillar, PILLAR_QUESTIONS_COUNT, log_suffix,
        )

    # ------------------------------------------------------------------
    # Step 6: Merge bank(5) + LLM(5) = 10 questions
    # ------------------------------------------------------------------
    merged: list[dict] = []

    # Add bank questions first (instant, already topic-validated at insert time)
    for q in bank_questions:
        if len(merged) < PILLAR_QUESTIONS_COUNT:
            merged.append(q)

    # Add LLM questions
    for q in validated_llm:
        if len(merged) < PILLAR_QUESTIONS_COUNT:
            merged.append(q)

    # ------------------------------------------------------------------
    # Step 7: H2 — If LLM fails/times out, fill remaining from bank
    # Final fallback uses bank instead of bypassing topic validation
    # ------------------------------------------------------------------
    if len(merged) < PILLAR_QUESTIONS_COUNT:
        deficit = PILLAR_QUESTIONS_COUNT - len(merged)
        logger.warning(
            "H2: Only %d/%d questions after merge for %s. "
            "Pulling %d more from bank as fallback.",
            len(merged), PILLAR_QUESTIONS_COUNT, pillar, deficit,
        )
        fallback_questions = await pull_from_bank(
            grade_level=grade_level,
            pillar=pillar,
            topics=active_topic_names,
            count=deficit,
            classroom_id=classroom_id,
        )

        # Validate fallback questions against active topics too
        if fallback_questions and active_topic_names:
            fallback_questions = validate_topic_alignment(
                fallback_questions, active_topic_names, pillar
            )

        for q in fallback_questions:
            if len(merged) < PILLAR_QUESTIONS_COUNT:
                merged.append(q)

    # If we have 0 questions after all attempts, try one last emergency LLM call
    if len(merged) == 0:
        logger.warning("EMERGENCY: 0 questions after bank+LLM for %s. Attempting emergency generation.", pillar)
        try:
            emergency = await generate_pillar_missions(
                pillar=pillar,
                grade_level=grade_level,
                active_topics=active_topic_names,
                student_id=student_id,
                student_weaknesses=[],
                is_frustrated=False,
                performance_profile=None,
                context_chunks=None,
                count=PILLAR_QUESTIONS_COUNT,
            )
            if emergency:
                for q in emergency:
                    if isinstance(q, dict) and q.get("question"):
                        merged.append(q)
                logger.info("Emergency generation produced %d questions for %s", len(merged), pillar)
        except Exception as exc:
            logger.error("Emergency generation also failed for %s: %s", pillar, exc)

    if len(merged) == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not generate missions right now. Please try again shortly.",
        )

    if len(merged) < PILLAR_QUESTIONS_COUNT:
        logger.warning(
            "Returning %d/%d questions for %s (bank under-populated). "
            "Pre-generation should be triggered.",
            len(merged), PILLAR_QUESTIONS_COUNT, pillar,
        )

    # Re-number all questions and normalize answers/audio_text
    from app.agents.tutor_agent.question_validator import normalize_all_questions
    normalize_all_questions(merged)
    for i, q in enumerate(merged):
        q["id"] = i + 1

    # ------------------------------------------------------------------
    # Step 8: Count weakness-focused questions and build response
    # ------------------------------------------------------------------
    weakness_focus_count = sum(
        1 for q in merged if q.get("is_weakness_focused", False)
    )

    # Convert dicts to MissionQuestion objects if needed
    mission_questions = []
    for q in merged:
        if isinstance(q, dict):
            q_filtered = {k: v for k, v in q.items() if k not in ("is_weakness_focused", "source")}
            if "type" in q_filtered and "task_type" not in q_filtered:
                q_filtered["task_type"] = q_filtered.pop("type")
            mq = MissionQuestion(**q_filtered)
            mission_questions.append(mq)
        else:
            mission_questions.append(q)

    response = PillarMissionsResponse(
        pillar=pillar,
        active_topics_summary=", ".join(active_topic_names) if active_topic_names else None,
        questions=[_strip_answer(q) for q in mission_questions],
        weakness_focus_questions=weakness_focus_count,
    )

    # Cache the response for future requests
    if not is_frustrated:
        await cache_set(cache_key, response.model_dump(), ttl=3600)

    logger.info(
        "Pillar missions returned for student %s pillar %s: "
        "%d total (bank=%d, llm=%d)%s",
        student_id, pillar, len(merged),
        len(bank_questions), len(validated_llm), log_suffix,
    )

    return response


# ---------------------------------------------------------------------------
# POST /submit-speaking (Speaking mission answer via Whisper transcription)
# ---------------------------------------------------------------------------

class SpeakingSubmissionResponse(BaseModel):
    is_correct: bool
    similarity_score: float
    transcription: str
    points_awarded: int
    new_total: int
    status: str = "final"  # "final" | "retry" | "give_up"


_GARBLED_SIMILARITY_THRESHOLD = 0.30
_GARBLED_MAX_ATTEMPTS = 3
_WHISPER_ACCENT_PROMPT = (
    "Pakistani English accent. Common words: hello, thank you, please, "
    "excuse me, water, school, teacher, mother, father."
)


@router.post("/submit-speaking", response_model=SpeakingSubmissionResponse, summary="Submit speaking answer for mission")
async def submit_speaking_answer(
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = File(...),
    expected_text: str = Form(...),
    pillar: str = Form(default="speaking"),
    attempt_number: int = Form(default=1),
    student: dict = Depends(get_current_student),
):
    from openai import AsyncOpenAI
    from io import BytesIO
    from difflib import SequenceMatcher

    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    audio_bytes = await audio_file.read()
    if len(audio_bytes) < 100:
        return SpeakingSubmissionResponse(
            is_correct=False, similarity_score=0.0, transcription="",
            points_awarded=0, new_total=0,
            status="give_up" if attempt_number >= _GARBLED_MAX_ATTEMPTS else "retry",
        )

    openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    audio_buffer = BytesIO(audio_bytes)
    audio_buffer.name = "recording.webm"

    try:
        whisper_response = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_buffer,
            language="en",
            prompt=_WHISPER_ACCENT_PROMPT,
        )
        transcription = whisper_response.text.strip()
    except Exception as exc:
        logger.error(f"Whisper transcription failed: {exc}")
        transcription = ""

    expected_lower = expected_text.lower().strip()
    transcription_lower = transcription.lower().strip()
    similarity = SequenceMatcher(None, expected_lower, transcription_lower).ratio()

    # Garbled input detection: if similarity is very low, offer retry
    is_garbled = (
        not transcription_lower
        or len(transcription_lower) < 3
        or similarity < _GARBLED_SIMILARITY_THRESHOLD
    )

    if is_garbled:
        student_resp = (
            supabase.table("students")
            .select("points")
            .eq("id", student_id)
            .maybe_single()
            .execute()
        )
        current_points = (student_resp.data.get("points") or 0) if student_resp.data else 0

        if attempt_number >= _GARBLED_MAX_ATTEMPTS:
            return SpeakingSubmissionResponse(
                is_correct=False,
                similarity_score=round(similarity, 2),
                transcription=transcription,
                points_awarded=0,
                new_total=current_points,
                status="give_up",
            )
        return SpeakingSubmissionResponse(
            is_correct=False,
            similarity_score=round(similarity, 2),
            transcription=transcription,
            points_awarded=0,
            new_total=current_points,
            status="retry",
        )

    is_correct = similarity >= 0.6
    points_awarded = _POINTS_PER_CORRECT if is_correct else 0

    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    current_points = (student_resp.data.get("points") or 0) if student_resp.data else 0

    if points_awarded > 0:
        rpc_result = supabase.rpc("increment_student_points", {
            "p_student_id": student_id,
            "p_points": points_awarded,
        }).execute()
        result_data = rpc_result.data[0] if rpc_result.data else {}
        new_total = result_data.get("new_points", current_points + points_awarded)
    else:
        new_total = current_points

    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type="mission_speaking",
        original_message=transcription,
        translated_message=expected_text,
        correct=is_correct,
        context_used=False,
        pillar="speaking",
        score=points_awarded,
    )

    # Update daily streak
    await update_streak(student_id)

    # Always invalidate profile cache (points changed), debounce the rest
    background_tasks.add_task(invalidate_profile_cache, student_id)
    background_tasks.add_task(
        debounced_invalidate,
        student_id,
        [invalidate_rewards_cache, invalidate_scores_cache],
    )

    return SpeakingSubmissionResponse(
        is_correct=is_correct,
        similarity_score=round(similarity, 2),
        transcription=transcription,
        points_awarded=points_awarded,
        new_total=new_total,
        status="final",
    )


# ---------------------------------------------------------------------------
# GET /performance (S09: Student Performance Profile)
# ---------------------------------------------------------------------------

class PerformanceResponse(BaseModel):
    overall_accuracy: float
    pillar_accuracy: dict[str, float]
    weak_topics: list[dict]
    strong_topics: list[dict]
    difficulty_recommendation: str


@router.get("/performance", response_model=PerformanceResponse, summary="Student performance profile")
async def get_performance(student: dict = Depends(get_current_student)):
    """
    Return the student's per-topic performance profile for UI display.

    Shows overall accuracy, per-pillar accuracy, weak/strong areas,
    and the recommended difficulty level for adaptive missions.

    Authentication: student JWT (Bearer token).
    """
    student_id = student["sub"]
    profile = await get_student_performance_profile(student_id)
    return PerformanceResponse(**profile)


# ---------------------------------------------------------------------------
# GET /weekly-progress (Feature 18: Quests Page)
# ---------------------------------------------------------------------------

class PillarProgress(BaseModel):
    pillar: str
    done: int   # questions answered this week
    target: int  # always 10
    pct: int     # 0-100


class WeeklyProgressResponse(BaseModel):
    week_topic: str | None
    pillars: list[PillarProgress]


@router.get("/weekly-progress", response_model=WeeklyProgressResponse, summary="Weekly 4-pillar progress")
async def get_weekly_progress(student: dict = Depends(get_current_student)):
    """
    Return how many pillar mission questions the student has answered this week.
    'This week' = rolling 7-day window from now.

    Returns progress for all 4 LSRW pillars (reading, writing, listening, speaking).
    Each pillar has a target of 10 questions per week.
    Cached for 5 minutes to reduce database queries.
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # Check cache first (5 min TTL for progress data)
    cache_key = make_cache_key("weekly_progress", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return WeeklyProgressResponse(**cached)

    # ------------------------------------------------------------------
    # Step 1: Fetch active week topic
    # ------------------------------------------------------------------
    syllabus_resp = (
        supabase.table("classroom_syllabus")
        .select("topic_title")
        .eq("classroom_id", classroom_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    week_topic = syllabus_resp.data["topic_title"] if syllabus_resp.data else None

    # ------------------------------------------------------------------
    # Step 2: Fetch this week's pillar interactions (rolling 7-day window)
    # ------------------------------------------------------------------
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    interactions_resp = (
        supabase.table("student_interactions")
        .select("pillar")
        .eq("student_id", student_id)
        .not_.is_("pillar", "null")
        .gte("created_at", seven_days_ago)
        .execute()
    )
    rows = interactions_resp.data or []

    # ------------------------------------------------------------------
    # Step 3: Count interactions per pillar
    # ------------------------------------------------------------------
    counts: dict[str, int] = {"reading": 0, "writing": 0, "listening": 0, "speaking": 0}
    for row in rows:
        p = row.get("pillar")
        if p in counts:
            counts[p] += 1

    # ------------------------------------------------------------------
    # Step 4: Build response
    # ------------------------------------------------------------------
    TARGET = 10
    pillars = [
        PillarProgress(
            pillar=p,
            done=min(counts[p], TARGET),
            target=TARGET,
            pct=min(round(counts[p] / TARGET * 100), 100),
        )
        for p in ["reading", "writing", "listening", "speaking"]
    ]

    response = WeeklyProgressResponse(week_topic=week_topic, pillars=pillars)

    # Cache for 5 minutes
    await cache_set(cache_key, response.model_dump(), ttl=300)
    return response


# ---------------------------------------------------------------------------
# GET /daily-pillar-status (How many questions done per pillar TODAY)
# ---------------------------------------------------------------------------

class DailyPillarStatus(BaseModel):
    pillar: str
    done: int
    limit: int
    completed: bool

class DailyPillarStatusResponse(BaseModel):
    pillars: list[DailyPillarStatus]


@router.get("/daily-pillar-status", response_model=DailyPillarStatusResponse, summary="Today's per-pillar completion status")
async def get_daily_pillar_status(student: dict = Depends(get_current_student)):
    """Return how many mission questions the student answered TODAY per pillar."""
    supabase = get_supabase_admin()
    student_id: str = student["sub"]

    cache_key = make_cache_key("daily_pillar_status", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return DailyPillarStatusResponse(**cached)

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    interactions_resp = (
        supabase.table("student_interactions")
        .select("pillar")
        .eq("student_id", student_id)
        .not_.is_("pillar", "null")
        .like("interaction_type", "mission_%")
        .gte("created_at", today_start)
        .execute()
    )
    rows = interactions_resp.data or []

    counts: dict[str, int] = {"reading": 0, "writing": 0, "listening": 0, "speaking": 0}
    for row in rows:
        p = row.get("pillar")
        if p in counts:
            counts[p] += 1

    DAILY_LIMIT = 10
    pillars = [
        DailyPillarStatus(
            pillar=p,
            done=min(counts[p], DAILY_LIMIT),
            limit=DAILY_LIMIT,
            completed=counts[p] >= DAILY_LIMIT,
        )
        for p in ["reading", "writing", "listening", "speaking"]
    ]

    response = DailyPillarStatusResponse(pillars=pillars)
    await cache_set(cache_key, response.model_dump(), ttl=60)
    return response
