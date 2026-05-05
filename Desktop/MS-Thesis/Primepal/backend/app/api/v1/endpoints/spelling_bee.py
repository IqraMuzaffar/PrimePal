"""
Feature: Spelling Bee (Student-side word practice)

Endpoints (all require student JWT):
  GET  /api/v1/spelling-bee/words   — Generate 10 words from active week topic
  POST /api/v1/spelling-bee/submit  — Record spelling attempt, award points
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
from app.api.v1.endpoints.rewards import invalidate_rewards_cache
from app.api.v1.endpoints.student_scores import invalidate_scores_cache
from app.utils.streak import update_streak
from app.agents.evaluator_agent.interaction_logger import log_interaction

logger = logging.getLogger(__name__)
router = APIRouter()

client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY,
    timeout=10.0,  # 10-second timeout for all OpenAI calls
)

# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class SpellingWord(BaseModel):
    word: str
    emoji: str


class SpellingWordsResponse(BaseModel):
    words: list[SpellingWord]
    topic: str
    week_number: int


class SpellingSubmitRequest(BaseModel):
    word: str
    student_spelling: str
    correct: bool
    attempt_number: int  # 1 or 2


class SpellingSubmitResponse(BaseModel):
    points_awarded: int
    new_total: int


# ---------------------------------------------------------------------------
# GET /words
# ---------------------------------------------------------------------------

@router.get("/words", response_model=SpellingWordsResponse)
async def get_spelling_words(student: dict = Depends(get_current_student)):
    """
    Generate 10 spelling words from the active week's syllabus topic.

    - Fetches the classroom's active week topic
    - Calls LLM to generate 10 grade-appropriate words with emoji hints
    - Returns topic name and week number for UI display
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    # ------------------------------------------------------------------
    # Step 1: Fetch grade level and active week topic in parallel
    # ------------------------------------------------------------------
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

    # Fallback: if no active week, use a random active topic from snc_topics
    if not syllabus_resp.data:
        topics_resp = (
            supabase.table("classroom_active_topics")
            .select("topic_id")
            .eq("classroom_id", classroom_id)
            .limit(1)
            .execute()
        )

        if topics_resp.data and len(topics_resp.data) > 0:
            topic_id = topics_resp.data[0]["topic_id"]
            topic_resp = (
                supabase.table("snc_topics")
                .select("topic_name")
                .eq("id", topic_id)
                .maybe_single()
                .execute()
            )
            topic_title = topic_resp.data["topic_name"] if topic_resp.data else "General English Vocabulary"
            week_number = 1
        else:
            # Final fallback: use grade-appropriate general topic
            topic_title = f"Grade {grade_level} English Vocabulary"
            week_number = 1

    else:
        topic_title: str = syllabus_resp.data["topic_title"]
        week_number: int = syllabus_resp.data["week_number"]

    # ------------------------------------------------------------------
    # Step 1.5: Check cache first (1 hour TTL)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("spelling_words", classroom_id, topic_title, str(grade_level))
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit for spelling words: {cache_key}")
        return SpellingWordsResponse(**cached)

    # ------------------------------------------------------------------
    # Step 2: Generate spelling words via LLM (with 12s timeout)
    # ------------------------------------------------------------------
    prompt = f"""You are generating spelling practice words for Grade {grade_level} Pakistani primary school students studying English.

Topic: {topic_title}

Generate exactly 10 English words appropriate for this grade level and topic.
For each word, choose an emoji that visually represents it.

Return ONLY a valid JSON array with exactly 10 objects. No explanation, no markdown code blocks.
Format: [
  {{"word": "example", "emoji": "🎓"}},
  ...
]
"""

    try:
        # 12-second timeout for LLM call (consistent with missions endpoints)
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            ),
            timeout=12.0,
        )

        response_text = response.choices[0].message.content.strip()

        # Extract JSON if it's wrapped in markdown code block
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        words_data = json.loads(response_text)

        # Validate structure: should be list of dicts with 'word' and 'emoji'
        if not isinstance(words_data, list) or len(words_data) != 10:
            raise ValueError("Expected exactly 10 words")

        words: list[SpellingWord] = []
        for item in words_data:
            if not isinstance(item, dict) or "word" not in item or "emoji" not in item:
                raise ValueError("Each word must have 'word' and 'emoji' fields")
            words.append(SpellingWord(
                word=item["word"].lower().strip(),
                emoji=item["emoji"].strip()
            ))

    except asyncio.TimeoutError:
        logger.error(f"Spelling word generation timeout (12s) for topic: {topic_title}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Spelling word generation timed out. Please try again.",
        )
    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse LLM response for spelling words: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate spelling words",
        )
    except Exception as exc:
        logger.error(f"Failed to generate spelling words: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate spelling words",
        )

    response = SpellingWordsResponse(
        words=words,
        topic=topic_title,
        week_number=week_number,
    )

    # Cache for 1 hour (same topic/grade will get same words)
    await cache_set(cache_key, response.model_dump(), ttl=3600)

    return response


# ---------------------------------------------------------------------------
# POST /submit
# ---------------------------------------------------------------------------

@router.post("/submit", response_model=SpellingSubmitResponse)
async def submit_spelling(
    request: SpellingSubmitRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """
    Record a spelling attempt and award points.

    Points:
    - 10 points if correct on first attempt
    - 5 points if correct on second attempt (retry)
    - 0 points if incorrect on both attempts

    Logs the interaction to student_interactions for analytics.
    """
    supabase = get_supabase_admin()
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]

    if request.correct:
        points = 10 if request.attempt_number == 1 else 5
    else:
        points = 0

    # Fetch student points + grade level in parallel
    student_resp, classroom_resp = await asyncio.gather(
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
        interaction_type="spelling_bee",
        original_message=request.word,
        correct=request.correct,
        context_used=False,
        pillar="writing",
        score=points,
    )

    await update_streak(student_id)

    background_tasks.add_task(invalidate_rewards_cache, student_id)
    background_tasks.add_task(invalidate_scores_cache, student_id)

    return SpellingSubmitResponse(
        points_awarded=points,
        new_total=new_total,
    )
