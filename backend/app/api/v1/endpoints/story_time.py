"""
Feature: Story Time (Student-side reading comprehension)

Endpoints (all require student JWT):
  GET  /api/v1/story-time/story        — Generate story + 3 comprehension questions
  GET  /api/v1/story-time/daily-status — Check today's usage (attempts used / limit)
  POST /api/v1/story-time/answer       — Record answer, award points
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from openai import AsyncOpenAI, APITimeoutError, APIConnectionError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from starlette.requests import Request

from app.core.rate_limit import limiter

from app.core.config import settings
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key, debounced_invalidate
from app.core.llm_tracker import track_llm, log_cache_hit
from app.agents.evaluator_agent.interaction_logger import log_interaction
from app.api.v1.endpoints.rewards import invalidate_rewards_cache
from app.api.v1.endpoints.student_scores import invalidate_scores_cache
from app.utils.streak import update_streak

logger = logging.getLogger(__name__)
router = APIRouter()

DAILY_LIMIT = 2  # Max story time sessions per day

client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=30.0,  # Let asyncio.wait_for handle the real timeout
)

# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class ComprehensionQuestion(BaseModel):
    id: int
    question: str
    options: list[str]
    correct_index: int


class StoryResponse(BaseModel):
    story_title: str
    story_text: str
    topic: str
    week_number: int
    questions: list[ComprehensionQuestion]


class AnswerRequest(BaseModel):
    question_id: int
    selected_index: int
    correct: bool


class AnswerResponse(BaseModel):
    points_awarded: int
    new_total: int


# ---------------------------------------------------------------------------
# Daily limit helpers
# ---------------------------------------------------------------------------

class DailyActivityStatus(BaseModel):
    attempts_used: int
    attempts_limit: int
    can_play: bool


async def _count_today_sessions(student_id: str) -> int:
    supabase = get_supabase_admin()
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    try:
        resp = await asyncio.to_thread(
            lambda: supabase.table("student_interactions")
            .select("id", count="exact")
            .eq("student_id", student_id)
            .eq("interaction_type", "story_time_session")
            .gte("created_at", today_start)
            .execute()
        )
        return resp.count or 0
    except Exception as exc:
        logger.warning("Could not count story time sessions: %s", exc)
        return 0


async def _log_session_start(student_id: str, classroom_id: str, grade_level: int):
    supabase = get_supabase_admin()
    try:
        await asyncio.to_thread(
            lambda: supabase.table("student_interactions")
            .insert({
                "student_id": student_id,
                "classroom_id": classroom_id,
                "grade_level": grade_level,
                "interaction_type": "story_time_session",
                "correct": True,
            })
            .execute()
        )
    except Exception as exc:
        logger.warning("Could not log story time session start: %s", exc)


# ---------------------------------------------------------------------------
# GET /daily-status
# ---------------------------------------------------------------------------

@router.get("/daily-status", response_model=DailyActivityStatus, summary="Story Time daily usage")
async def get_daily_status(student: dict = Depends(get_current_student)):
    """Return how many Story Time sessions the student has used today."""
    student_id: str = student["sub"]
    used = await _count_today_sessions(student_id)
    return DailyActivityStatus(
        attempts_used=used,
        attempts_limit=DAILY_LIMIT,
        can_play=used < DAILY_LIMIT,
    )


# ---------------------------------------------------------------------------
# GET /story
# ---------------------------------------------------------------------------

@router.get("/story", response_model=StoryResponse)
@limiter.limit("20/minute")
async def get_story(request: Request, student: dict = Depends(get_current_student)):
    """
    Generate a short story and 3 comprehension questions based on the active week's topic.
    """
    supabase = get_supabase_admin()
    classroom_id: str = student["classroom_id"]

    try:
        classroom_resp, syllabus_resp = await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("classrooms")
                .select("grade_level")
                .eq("id", classroom_id)
                .maybe_single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("classroom_syllabus")
                .select("topic_title, week_number")
                .eq("classroom_id", classroom_id)
                .eq("status", "active")
                .order("week_number")
                .limit(1)
                .maybe_single()
                .execute()
            ),
        )
    except Exception:
        classroom_resp = None
        syllabus_resp = None

    if not classroom_resp or not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    # ------------------------------------------------------------------
    # Check daily limit
    # ------------------------------------------------------------------
    student_id = student["sub"]
    sessions_used = await _count_today_sessions(student_id)
    if sessions_used >= DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily limit reached ({DAILY_LIMIT} sessions per day). Come back tomorrow!",
        )

    # Fallback: if no active syllabus week, use active topics from teacher selection
    if not syllabus_resp or not syllabus_resp.data:
        topics_resp = await asyncio.to_thread(
            lambda: supabase.table("classroom_active_topics")
            .select("topic_id")
            .eq("classroom_id", classroom_id)
            .limit(1)
            .execute()
        )

        if topics_resp.data and len(topics_resp.data) > 0:
            topic_id = topics_resp.data[0]["topic_id"]
            topic_resp = await asyncio.to_thread(
                lambda: supabase.table("snc_topics")
                .select("topic_name")
                .eq("id", topic_id)
                .maybe_single()
                .execute()
            )
            topic_title = topic_resp.data["topic_name"] if topic_resp.data else "General English"
            week_number = 1
        else:
            topic_title = f"Grade {grade_level} English"
            week_number = 1
    else:
        topic_title: str = syllabus_resp.data["topic_title"]
        week_number: int = syllabus_resp.data["week_number"]

    # ------------------------------------------------------------------
    # Check cache first (1 hour TTL)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("story_time", classroom_id, topic_title, str(grade_level))
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for story time: {cache_key}")
        await log_cache_hit("story_time/story", student_id=student_id, classroom_id=classroom_id)
        # Log session start even on cache hit (counts toward daily limit)
        await _log_session_start(student_id, classroom_id, grade_level)
        return StoryResponse(**cached)

    # ------------------------------------------------------------------
    # Generate story via LLM (with 12s timeout)
    # ------------------------------------------------------------------
    prompt = f"""You are generating a reading comprehension activity for Grade {grade_level} Pakistani primary school students studying English.

Topic: {topic_title}

Write a short story (4–6 sentences) appropriate for this grade level and topic, using simple vocabulary.
Then write exactly 3 multiple-choice comprehension questions about the story.

Return ONLY valid JSON (no markdown code blocks).
{{
  "story_title": "...",
  "story_text": "...",
  "questions": [
    {{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0}},
    {{"id": 2, "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 1}},
    {{"id": 3, "question": "...", "options": ["A", "B", "C", "D"], "correct_index": 2}}
  ]
}}
"""

    try:
        # 25-second timeout for LLM call (gpt-4o-mini can be slow on cold starts)
        async with track_llm("story_time/story", model="gpt-4o-mini", student_id=student_id, classroom_id=classroom_id) as tracker:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=800,
                ),
                timeout=25.0,
            )
            tracker.set_usage(response.usage)

        response_text = response.choices[0].message.content.strip()

        # C2: Line-based markdown stripping (replaces fragile split("```"))
        from app.utils.markdown_parser import strip_markdown_code_block
        response_text = strip_markdown_code_block(response_text)

        data = json.loads(response_text)

        if not isinstance(data, dict):
            raise ValueError("Expected JSON object")
        if "questions" not in data or not isinstance(data["questions"], list):
            raise ValueError("Missing or invalid questions array")
        if len(data["questions"]) != 3:
            raise ValueError(f"Expected exactly 3 questions, got {len(data['questions'])}")

        questions: list[ComprehensionQuestion] = []
        for i, q in enumerate(data["questions"]):
            if not isinstance(q, dict) or "question" not in q or "options" not in q or "correct_index" not in q:
                raise ValueError(f"Question {i} missing required fields (need question, options, correct_index)")
            if len(q["options"]) != 4:
                raise ValueError(f"Question {i} must have exactly 4 options")
            if not isinstance(q["correct_index"], int) or q["correct_index"] < 0 or q["correct_index"] > 3:
                raise ValueError(f"Question {i} has invalid correct_index")

            questions.append(ComprehensionQuestion(
                id=i + 1,
                question=q["question"],
                options=q["options"],
                correct_index=q["correct_index"],
            ))

    except (asyncio.TimeoutError, APITimeoutError):
        logger.error(f"Story generation timeout for topic: {topic_title}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Story generation timed out. Please try again.",
        )
    except APIConnectionError as exc:
        logger.error(f"OpenAI connection error for story: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service temporarily unavailable. Please try again.",
        )
    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse LLM response for story: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate story. Please try again.",
        )
    except Exception as exc:
        logger.error(f"Failed to generate story: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate story. Please try again.",
        )

    response = StoryResponse(
        story_title=data.get("story_title", "Untitled Story"),
        story_text=data.get("story_text", ""),
        topic=topic_title,
        week_number=week_number,
        questions=questions,
    )

    # Cache for 24 hours (same topic/grade will get same story)
    await cache_set(cache_key, response.model_dump(), ttl=86400)

    # Log session start (counts toward daily limit)
    await _log_session_start(student_id, classroom_id, grade_level)

    return response


# ---------------------------------------------------------------------------
# POST /answer
# ---------------------------------------------------------------------------

@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(
    request: AnswerRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Record a comprehension answer and award points (10 per correct, 0 per incorrect).
    Logs with pillar='reading' for Quests progress tracking.
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    points = 10 if request.correct else 0

    async def fetch_student_and_grade():
        return await asyncio.gather(
            asyncio.to_thread(
                lambda: supabase.table("students")
                .select("points")
                .eq("id", student_id)
                .maybe_single()
                .execute()
            ),
            asyncio.to_thread(
                lambda: supabase.table("classrooms")
                .select("grade_level")
                .eq("id", classroom_id)
                .maybe_single()
                .execute()
            ),
        )

    student_resp, classroom_resp = await fetch_student_and_grade()

    if not student_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    current_points = student_resp.data.get("points") or 0
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    if points > 0:
        try:
            rpc_result = supabase.rpc("increment_student_points", {
                "p_student_id": student_id,
                "p_points": points,
            }).execute()
            result_data = rpc_result.data[0] if rpc_result.data else {}
            new_total = result_data.get("new_points", current_points + points)
        except Exception as exc:
            logger.warning("increment_student_points RPC failed, using direct UPDATE: %s", exc)
            try:
                supabase.table("students").update(
                    {"points": current_points + points}
                ).eq("id", student_id).execute()
            except Exception:
                pass
            new_total = current_points + points
    else:
        new_total = current_points

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type="story_time",
        original_message=f"Q{request.question_id}",
        correct=request.correct,
        context_used=False,
        pillar="reading",
        score=points,
    )

    await update_streak(student_id)

    background_tasks.add_task(
        debounced_invalidate,
        student_id,
        [invalidate_rewards_cache, invalidate_scores_cache],
    )

    return AnswerResponse(
        points_awarded=points,
        new_total=new_total,
    )
