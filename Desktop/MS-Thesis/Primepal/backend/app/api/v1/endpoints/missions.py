"""
Feature 6: Gamified Missions — /api/v1/missions

Endpoints:
  GET  /api/v1/missions/daily            — Generate 3 daily questions (student auth required)
  POST /api/v1/missions/complete         — Record answer result, award points (student auth required)
  GET  /api/v1/missions/me               — Fetch student profile + points (student auth required)
  GET  /api/v1/missions/pillar           — Generate 10 questions for specific pillar (student auth required)
  GET  /api/v1/missions/leaderboard      — Class leaderboard ranked by points (student auth required)
  GET  /api/v1/missions/weekly-progress  — Weekly 4-pillar progress tracking (student auth required)

Grade level is always resolved from the classroom DB record — the client cannot supply or
override it. correct_answer is stripped from responses; the client sends back
question_correct (bool) to /complete, which the server trusts (thesis prototype).

The pillar endpoint (Feature 3) generates missions weighted by student weaknesses and
the teacher-configured current_week_topic.
"""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.api.v1.endpoints.classroom import get_active_topics
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, make_cache_key
from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks
from app.agents.evaluator_agent.interaction_logger import log_interaction
from app.core.config import settings
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
    # correct_answer, correct_order deliberately ABSENT


class DailyMissionsResponse(BaseModel):
    grade_level: int
    topic: str
    questions: list[MissionQuestionOut]


class CompleteRequest(BaseModel):
    question_correct: bool
    question_type: str = "multiple_choice"
    task_type: str | None = None
    pillar: str | None = None
    answer_data: dict | None = None


class CompleteResponse(BaseModel):
    points_awarded: int
    new_total: int


class StudentProfileResponse(BaseModel):
    student_id: str
    student_name: str
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
    """Strip correct_answer and correct_order before sending to client."""
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
        image_options=[QuestionOptionOut(id=o.id, text=o.text, emoji=getattr(o, 'emoji', None)) for o in q.image_options] if getattr(q, 'image_options', None) else None,
        word_bank=getattr(q, 'word_bank', None),
        word_with_blanks=getattr(q, 'word_with_blanks', None),
        letter_options=getattr(q, 'letter_options', None),
        sentence_start=getattr(q, 'sentence_start', None),
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
    # Step 2: Resolve active topics for topic-aware cache key + seed phrase
    # ------------------------------------------------------------------
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = str(hash(tuple(sorted(active_topic_names))))

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
    # Step 4: Strip correct_answer before returning
    # ------------------------------------------------------------------
    response = DailyMissionsResponse(
        grade_level=grade_level,
        topic=missions.topic,
        questions=[_strip_answer(q) for q in missions.questions],
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
    # Step 1: Fetch current points and missions_completed
    # ------------------------------------------------------------------
    student_resp = (
        supabase.table("students")
        .select("points, missions_completed")
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
    current_missions_completed: int = student_resp.data.get("missions_completed") or 0

    # ------------------------------------------------------------------
    # Step 2: Persist updated points and missions_completed (only if correct)
    # ------------------------------------------------------------------
    if points_awarded > 0:
        update_data = {"points": new_total, "missions_completed": current_missions_completed + 1}
        supabase.table("students").update(update_data).eq(
            "id", student_id
        ).execute()

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

    student_resp = (
        supabase.table("students")
        .select("student_name, avatar_url, avatar_style, theme_color, points, missions_completed")
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
    response = StudentProfileResponse(
        student_id=student_id,
        student_name=data["student_name"],
        avatar_url=data.get("avatar_url"),
        points=data.get("points") or 0,
        missions_completed=data.get("missions_completed") or 0,
        avatar_style=data.get("avatar_style") or "adventurer",
        theme_color=data.get("theme_color") or "#6366f1",
    )

    # Cache for 5 minutes
    await cache_set(cache_key, response.model_dump(), ttl=300)
    return response


# ---------------------------------------------------------------------------
# GET /pillar (Feature 3: Pillar-based Missions)
# ---------------------------------------------------------------------------

@router.get("/pillar", response_model=PillarMissionsResponse, summary="Get missions for specific pillar")
async def get_pillar_missions(
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
    # Step 2: Fetch classroom grade + resolve active topics
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

    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = str(hash(tuple(sorted(active_topic_names))))

    # ------------------------------------------------------------------
    # Step 0: Check cache (only if not frustrated — frustrated students need fresh questions)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
    if not is_frustrated:
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"Cache hit for pillar missions: {cache_key}")
            return PillarMissionsResponse(**cached)

    # ------------------------------------------------------------------
    # Step 3: Fetch student's recent incorrect answers (weaknesses)
    # Query student_interactions table for failed interactions
    # ------------------------------------------------------------------
    try:
        interactions_resp = (
            supabase.table("student_interactions")
            .select("original_message, interaction_type")
            .eq("student_id", student_id)
            .eq("correct", False)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        student_weaknesses = [
            r["original_message"]
            for r in (interactions_resp.data or [])
            if r.get("original_message")
        ]
    except Exception as exc:
        logger.warning(
            "Could not fetch student weaknesses: %s", exc
        )
        student_weaknesses = []

    # ------------------------------------------------------------------
    # Step 4: Generate pillar missions via mission generator
    # If is_frustrated=true, generates Confidence Builder questions
    # ------------------------------------------------------------------
    try:
        missions = await generate_pillar_missions(
            pillar=pillar,
            grade_level=grade_level,
            active_topics=active_topic_names,
            student_id=student_id,
            student_weaknesses=student_weaknesses,
            is_frustrated=is_frustrated,
        )
        if missions is None:
            raise ValueError("generate_pillar_missions returned None")

        log_suffix = " (Confidence Builder)" if is_frustrated else ""
        logger.info(
            "Pillar mission generation succeeded for student %s pillar %s, count: %d%s",
            student_id, pillar, len(missions), log_suffix,
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
            q_filtered = {k: v for k, v in q.items() if k != "is_weakness_focused"}
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


@router.post("/submit-speaking", response_model=SpeakingSubmissionResponse, summary="Submit speaking answer for mission")
async def submit_speaking_answer(
    audio_file: UploadFile = File(...),
    expected_text: str = Form(...),
    pillar: str = Form(default="speaking"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
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
        )

    openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    audio_buffer = BytesIO(audio_bytes)
    audio_buffer.name = "recording.webm"

    try:
        whisper_response = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_buffer,
            language="en",
        )
        transcription = whisper_response.text.strip()
    except Exception as exc:
        logger.error(f"Whisper transcription failed: {exc}")
        transcription = ""

    expected_lower = expected_text.lower().strip()
    transcription_lower = transcription.lower().strip()
    similarity = SequenceMatcher(None, expected_lower, transcription_lower).ratio()

    is_correct = similarity >= 0.6
    points_awarded = _POINTS_PER_CORRECT if is_correct else 0

    student_resp = (
        supabase.table("students")
        .select("points, missions_completed")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    current_points = (student_resp.data.get("points") or 0) if student_resp.data else 0
    new_total = current_points + points_awarded

    if points_awarded > 0 and student_resp.data:
        current_missions = student_resp.data.get("missions_completed") or 0
        supabase.table("students").update(
            {"points": new_total, "missions_completed": current_missions + 1}
        ).eq("id", student_id).execute()

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
    )

    return SpeakingSubmissionResponse(
        is_correct=is_correct,
        similarity_score=round(similarity, 2),
        transcription=transcription,
        points_awarded=points_awarded,
        new_total=new_total,
    )


# ---------------------------------------------------------------------------
# GET /leaderboard (Feature 17: Class Leaderboard)
# ---------------------------------------------------------------------------

class LeaderboardEntry(BaseModel):
    rank: int
    student_id: str
    student_name: str
    avatar_url: str | None
    points: int
    is_current_student: bool


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    current_student_rank: int
    total_students: int


@router.get("/leaderboard", response_model=LeaderboardResponse, summary="Class leaderboard by points")
async def get_leaderboard(student: dict = Depends(get_current_student)):
    """
    Return the class leaderboard sorted by points (highest first).

    - Scoped to the student's own classroom (from JWT classroom_id)
    - Marks which row is the requesting student for UI highlighting
    - Returns all students in the classroom, ranked by points descending
    - Cached for 10 minutes to reduce database queries

    Returns:
      - entries: ranked list of all students in the class
      - current_student_rank: rank position of the requesting student
      - total_students: total count of students in the classroom
    """
    supabase = get_supabase_admin()
    classroom_id: str = student["classroom_id"]
    student_id: str = student["sub"]

    # Check cache first (10 min TTL for leaderboard)
    cache_key = make_cache_key("leaderboard", classroom_id)
    cached = await cache_get(cache_key)
    if cached:
        response_data = cached
        # Update is_current_student flag for this student
        for entry in response_data["entries"]:
            entry["is_current_student"] = entry["student_id"] == student_id
        return LeaderboardResponse(**response_data)

    # Fetch all students in the classroom, ordered by points descending
    result = (
        supabase.table("students")
        .select("id, student_name, avatar_url, points")
        .eq("classroom_id", classroom_id)
        .order("points", desc=True)
        .execute()
    )
    rows = result.data or []

    # Build ranked entries
    entries: list[LeaderboardEntry] = []
    current_rank = len(rows)  # default if not found

    for i, row in enumerate(rows):
        is_current = row["id"] == student_id
        entry = LeaderboardEntry(
            rank=i + 1,
            student_id=row["id"],
            student_name=row["student_name"],
            avatar_url=row.get("avatar_url"),
            points=row.get("points") or 0,
            is_current_student=is_current,
        )
        entries.append(entry)
        if is_current:
            current_rank = i + 1

    response = LeaderboardResponse(
        entries=entries,
        current_student_rank=current_rank,
        total_students=len(rows),
    )

    # Cache for 10 minutes
    await cache_set(cache_key, response.model_dump(), ttl=600)
    return response


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
