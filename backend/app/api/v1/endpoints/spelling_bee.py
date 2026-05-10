"""
Spelling Bee — daily spelling challenge for bonus points.

Rules:
  - One attempt per day per student.
  - LLM generates a grade-appropriate difficult word.
  - Student has 20 seconds to spell it correctly.
  - Correct answer awards 30 points.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.cache import cache_get, cache_set, make_cache_key, debounced_invalidate
from app.core.config import settings
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SPELLING_BEE_POINTS = 30
DAILY_LIMIT = 1
TIME_LIMIT_SECONDS = 20


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class DailyWordResponse(BaseModel):
    word: str
    hint: str
    urdu_hint: str
    difficulty: str
    grade_level: int
    time_limit: int = TIME_LIMIT_SECONDS


class SpellingBeeSubmitRequest(BaseModel):
    word: str  # the original word (from daily-word)
    answer: str  # student's spelling attempt


class SpellingBeeSubmitResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    points_awarded: int
    new_total: int
    meaning: str = ""
    sentence1: str = ""
    sentence2: str = ""
    urdu_hint: str = ""


class DailyActivityStatus(BaseModel):
    attempts_used: int
    attempts_limit: int
    can_play: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _count_today_attempts(student_id: str) -> int:
    """Count how many spelling bee attempts the student has made today."""
    supabase = get_supabase_admin()
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    resp = await asyncio.to_thread(
        lambda: supabase.table("student_interactions")
        .select("id", count="exact")
        .eq("student_id", student_id)
        .eq("interaction_type", "spelling_bee")
        .gte("created_at", today_start)
        .execute()
    )
    return resp.count or 0


async def _get_grade_level(classroom_id: str) -> int:
    """Fetch the grade level for the student's classroom."""
    supabase = get_supabase_admin()
    resp = await asyncio.to_thread(
        lambda: supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if resp.data and resp.data.get("grade_level"):
        return resp.data["grade_level"]
    return 3  # safe default


FALLBACK_WORDS = {
    1: [
        {"word": "said", "hint": "Past tense of say", "urdu_hint": "کہا", "meaning": "To have spoken words to someone.", "sentence1": "She said hello to her friend.", "sentence2": "The teacher said we could go outside.", "difficulty": "hard"},
        {"word": "come", "hint": "Move towards someone", "urdu_hint": "آنا", "meaning": "To move toward or arrive at a place.", "sentence1": "Please come to my house.", "sentence2": "The cat will come when you call it.", "difficulty": "hard"},
    ],
    2: [
        {"word": "friend", "hint": "Someone you like and trust", "urdu_hint": "دوست", "meaning": "A person you enjoy spending time with.", "sentence1": "My best friend lives next door.", "sentence2": "She made a new friend at school.", "difficulty": "hard"},
        {"word": "would", "hint": "Used for polite requests", "urdu_hint": "گا/گی", "meaning": "Used to talk about something that might happen.", "sentence1": "Would you like some water?", "sentence2": "I would love to visit the park.", "difficulty": "hard"},
    ],
    3: [
        {"word": "knight", "hint": "A soldier in shining armor", "urdu_hint": "شہسوار", "meaning": "A warrior from old times who wore armor and rode horses.", "sentence1": "The brave knight saved the village.", "sentence2": "A knight must be honest and kind.", "difficulty": "hard"},
        {"word": "island", "hint": "Land surrounded by water", "urdu_hint": "جزیرہ", "meaning": "A piece of land that is completely surrounded by water.", "sentence1": "They took a boat to the small island.", "sentence2": "The island had beautiful palm trees.", "difficulty": "hard"},
    ],
    4: [
        {"word": "beautiful", "hint": "Very pretty to look at", "urdu_hint": "خوبصورت", "meaning": "Something that is very pleasing to look at or experience.", "sentence1": "The garden was filled with beautiful flowers.", "sentence2": "She wore a beautiful dress to the party.", "difficulty": "hard"},
        {"word": "knowledge", "hint": "What you learn and know", "urdu_hint": "علم", "meaning": "Facts and information you learn through study or experience.", "sentence1": "Reading books increases your knowledge.", "sentence2": "She has great knowledge about animals.", "difficulty": "hard"},
    ],
    5: [
        {"word": "Wednesday", "hint": "The third day of the week", "urdu_hint": "بدھ", "meaning": "The day of the week that comes after Tuesday.", "sentence1": "We have a science test on Wednesday.", "sentence2": "Wednesday is my favorite day of the week.", "difficulty": "hard"},
        {"word": "daughter", "hint": "A female child", "urdu_hint": "بیٹی", "meaning": "A girl or woman in relation to her parents.", "sentence1": "Their daughter loves reading books.", "sentence2": "She is the eldest daughter in the family.", "difficulty": "hard"},
    ],
}


async def _generate_word(grade_level: int) -> dict:
    """Generate a challenging spelling word via LLM appropriate for the grade."""
    import json
    import random

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate

        grade_vocab = {
            1: "simple 3-4 letter CVC words (cat, dog, sun, red, big). Difficulty should be slightly challenging for Grade 1.",
            2: "4-5 letter words with blends and digraphs (ship, tree, black, green, sleep). Slightly above typical Grade 2 level.",
            3: "5-6 letter words with silent letters or double consonants (knight, rabbit, butter, island, bridge). Challenging for Grade 3.",
            4: "6-7 letter words with prefixes/suffixes (unhappy, careful, quickly, beautiful, trouble). Challenging for Grade 4.",
            5: "7-9 letter words with complex patterns (knowledge, shoulder, daughter, elephant, chocolate, Wednesday). Challenging for Grade 5.",
        }
        vocab_desc = grade_vocab.get(grade_level, grade_vocab[3])

        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are a spelling bee word generator for Pakistani primary school Grade {grade_level} students.

Generate exactly ONE challenging English spelling word.

Word requirements:
- {vocab_desc}
- Must be a real, common English word that a Grade {grade_level} student would know the meaning of
- Should be tricky to spell (silent letters, double letters, unusual patterns)
- Appropriate for Pakistani ESL learners

Respond in EXACTLY this JSON format, nothing else:
{{"word": "the word in lowercase", "hint": "a short 5-8 word English clue/definition", "urdu_hint": "Urdu translation of the word", "meaning": "a clear 1-sentence definition suitable for Grade {grade_level}", "sentence1": "a simple example sentence using the word", "sentence2": "another example sentence using the word in a different context", "difficulty": "hard"}}"""),
            ("user", "Generate one spelling bee word now."),
        ])

        llm = ChatOpenAI(
            model=settings.CHAT_MODEL,
            temperature=0.9,
            openai_api_key=settings.OPENAI_API_KEY,
            max_retries=2,
            timeout=20.0,
        )

        chain = prompt | llm

        result = await asyncio.wait_for(
            chain.ainvoke({}),
            timeout=25.0,
        )

        content = result.content.strip()
        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        data = json.loads(content)
        return {
            "word": data["word"].strip().lower(),
            "hint": data["hint"].strip(),
            "urdu_hint": data.get("urdu_hint", "").strip(),
            "meaning": data.get("meaning", "").strip(),
            "sentence1": data.get("sentence1", "").strip(),
            "sentence2": data.get("sentence2", "").strip(),
            "difficulty": data.get("difficulty", "hard"),
        }
    except Exception as exc:
        logger.warning("LLM word generation failed, using fallback: %s", exc)
        words = FALLBACK_WORDS.get(grade_level, FALLBACK_WORDS[3])
        return random.choice(words)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/daily-status", response_model=DailyActivityStatus)
async def spelling_bee_daily_status(
    student: dict = Depends(get_current_student),
):
    """Check if the student can play today's Spelling Bee."""
    student_id = student["sub"]
    attempts = await _count_today_attempts(student_id)
    return DailyActivityStatus(
        attempts_used=attempts,
        attempts_limit=DAILY_LIMIT,
        can_play=attempts < DAILY_LIMIT,
    )


@router.get("/daily-word", response_model=DailyWordResponse)
async def get_daily_word(
    student: dict = Depends(get_current_student),
):
    """
    Get today's Spelling Bee word. Cached per classroom per day so all
    students in the same class get the same word.
    """
    student_id = student["sub"]
    classroom_id = student["classroom_id"]

    # Check daily limit
    attempts = await _count_today_attempts(student_id)
    if attempts >= DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You've already attempted today's Spelling Bee! Come back tomorrow.",
        )

    grade_level = await _get_grade_level(classroom_id)

    # Cache word per classroom per day (all students get same word)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = make_cache_key("spelling_bee", classroom_id, today_str)

    cached = await cache_get(cache_key)
    if cached:
        logger.info("Spelling Bee cache hit for classroom %s", classroom_id)
        return DailyWordResponse(**cached, grade_level=grade_level, time_limit=TIME_LIMIT_SECONDS)

    # Generate new word (has built-in fallback, never raises)
    word_data = await _generate_word(grade_level)

    # Cache until end of day (max 24 hours)
    await cache_set(cache_key, word_data, ttl=86400)

    return DailyWordResponse(
        word=word_data["word"],
        hint=word_data["hint"],
        urdu_hint=word_data["urdu_hint"],
        difficulty=word_data["difficulty"],
        grade_level=grade_level,
        time_limit=TIME_LIMIT_SECONDS,
    )


@router.post("/submit", response_model=SpellingBeeSubmitResponse)
async def submit_spelling_bee(
    body: SpellingBeeSubmitRequest,
    background_tasks: BackgroundTasks,
    student: dict = Depends(get_current_student),
):
    """Submit the student's spelling attempt. Awards 30 points if correct."""
    student_id = student["sub"]
    classroom_id = student["classroom_id"]

    # Check daily limit (prevent double submission)
    attempts = await _count_today_attempts(student_id)
    if attempts >= DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Already attempted today's Spelling Bee.",
        )

    supabase = get_supabase_admin()
    correct_word = body.word.strip().lower()
    student_answer = body.answer.strip().lower()
    is_correct = student_answer == correct_word

    points_awarded = SPELLING_BEE_POINTS if is_correct else 0

    # Fetch current points
    student_resp = await asyncio.to_thread(
        lambda: supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    current_points = (student_resp.data or {}).get("points", 0)

    # Award points atomically
    new_total = current_points
    if points_awarded > 0:
        try:
            rpc_result = await asyncio.to_thread(
                lambda: supabase.rpc("increment_student_points", {
                    "p_student_id": student_id,
                    "p_points": points_awarded,
                }).execute()
            )
            result_data = rpc_result.data if rpc_result.data else {}
            new_total = result_data.get("new_points", current_points + points_awarded)
        except Exception as exc:
            logger.warning("RPC increment failed for spelling bee, falling back: %s", exc)
            new_total = current_points + points_awarded
            try:
                await asyncio.to_thread(
                    lambda: supabase.table("students")
                    .update({"points": new_total})
                    .eq("id", student_id)
                    .execute()
                )
            except Exception:
                pass

    # Get grade level for logging
    grade_level = await _get_grade_level(classroom_id)

    # Log interaction
    from app.agents.evaluator_agent.interaction_logger import log_interaction
    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type="spelling_bee",
        original_message=f"word={correct_word}, answer={student_answer}",
        correct=is_correct,
        context_used=False,
        pillar="writing",
        score=points_awarded,
    )

    # Update streak
    from app.utils.streak import update_streak
    background_tasks.add_task(update_streak, student_id)

    # Invalidate caches
    from app.api.v1.endpoints.missions import invalidate_profile_cache
    from app.utils.performance_profile import invalidate_performance_cache
    from app.api.v1.endpoints.rewards import invalidate_rewards_cache
    from app.api.v1.endpoints.student_scores import invalidate_scores_cache

    background_tasks.add_task(invalidate_profile_cache, student_id)
    background_tasks.add_task(
        debounced_invalidate,
        student_id,
        [invalidate_rewards_cache, invalidate_scores_cache],
    )

    # Fetch learning data from cache (generated with the word)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    word_cache_key = make_cache_key("spelling_bee", classroom_id, today_str)
    word_data = await cache_get(word_cache_key) or {}

    logger.info(
        "Spelling Bee: student %s answered '%s' for word '%s' — %s (%d pts)",
        student_id, student_answer, correct_word,
        "CORRECT" if is_correct else "WRONG", points_awarded,
    )

    return SpellingBeeSubmitResponse(
        is_correct=is_correct,
        correct_answer=correct_word,
        points_awarded=points_awarded,
        new_total=new_total,
        meaning=word_data.get("meaning", ""),
        sentence1=word_data.get("sentence1", ""),
        sentence2=word_data.get("sentence2", ""),
        urdu_hint=word_data.get("urdu_hint", ""),
    )
