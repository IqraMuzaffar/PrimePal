"""
Feature: Story Time (Student-side reading comprehension)

Endpoints (all require student JWT):
  GET  /api/v1/story-time/story   — Generate story + 3 comprehension questions
  POST /api/v1/story-time/answer  — Record answer, award points
"""

import asyncio
import json
import logging
from openai import AsyncOpenAI
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, make_cache_key
from app.agents.evaluator_agent.interaction_logger import log_interaction
from app.api.v1.endpoints.rewards import invalidate_rewards_cache
from app.api.v1.endpoints.student_scores import invalidate_scores_cache
from app.utils.streak import update_streak

logger = logging.getLogger(__name__)
router = APIRouter()

client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=10.0,  # 10-second timeout for all OpenAI calls
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
# GET /story
# ---------------------------------------------------------------------------

@router.get("/story", response_model=StoryResponse)
async def get_story(student: dict = Depends(get_current_student)):
    """
    Generate a short story and 3 comprehension questions based on the active week's topic.
    """
    supabase = get_supabase_admin()
    classroom_id: str = student["classroom_id"]

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

    if not classroom_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found",
        )
    grade_level: int = classroom_resp.data["grade_level"]

    if not syllabus_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active week found in pacing calendar",
        )

    topic_title: str = syllabus_resp.data["topic_title"]
    week_number: int = syllabus_resp.data["week_number"]

    # ------------------------------------------------------------------
    # Check cache first (1 hour TTL)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("story_time", classroom_id, topic_title, str(grade_level))
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for story time: {cache_key}")
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
        # 12-second timeout for LLM call (consistent with missions endpoints)
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=800,
            ),
            timeout=12.0,
        )

        response_text = response.choices[0].message.content.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        data = json.loads(response_text)

        if not isinstance(data, dict):
            raise ValueError("Expected JSON object")
        if "questions" not in data or not isinstance(data["questions"], list):
            raise ValueError("Missing or invalid questions array")
        if len(data["questions"]) != 3:
            raise ValueError(f"Expected exactly 3 questions, got {len(data['questions'])}")

        questions: list[ComprehensionQuestion] = []
        for i, q in enumerate(data["questions"]):
            if not isinstance(q, dict) or "options" not in q or "correct_index" not in q:
                raise ValueError(f"Question {i} missing required fields")
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

    except asyncio.TimeoutError:
        logger.error(f"Story generation timeout (12s) for topic: {topic_title}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Story generation timed out. Please try again.",
        )
    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse LLM response for story: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate story",
        )
    except Exception as exc:
        logger.error(f"Failed to generate story: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate story",
        )

    response = StoryResponse(
        story_title=data.get("story_title", "Untitled Story"),
        story_text=data.get("story_text", ""),
        topic=topic_title,
        week_number=week_number,
        questions=questions,
    )

    # Cache for 1 hour (same topic/grade will get same story)
    await cache_set(cache_key, response.model_dump(), ttl=3600)

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
        rpc_result = supabase.rpc("increment_student_points", {
            "p_student_id": student_id,
            "p_points": points,
        }).execute()
        result_data = rpc_result.data[0] if rpc_result.data else {}
        new_total = result_data.get("new_points", current_points + points)
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

    background_tasks.add_task(invalidate_rewards_cache, student_id)
    background_tasks.add_task(invalidate_scores_cache, student_id)

    return AnswerResponse(
        points_awarded=points,
        new_total=new_total,
    )
