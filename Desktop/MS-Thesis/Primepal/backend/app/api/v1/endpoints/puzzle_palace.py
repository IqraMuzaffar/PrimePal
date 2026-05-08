"""
Feature: Puzzle Palace — /api/v1/puzzle-palace

Endpoints (student JWT required):
  GET /api/v1/puzzle-palace/rooms — Generate 10 questions across 5 rooms (2 per room)

Each room maps to a specific task_type and pillar. Questions are generated
via the existing generate_pillar_missions() LLM pipeline with RAG grounding.
Answer completion is handled by the existing /missions/complete endpoint.
"""

import asyncio
import hashlib
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.v1.endpoints.classroom import get_active_topics
from app.api.v1.endpoints.missions import MissionQuestionOut, _strip_answer
from app.agents.tutor_agent.mission_generator import generate_pillar_missions
from app.agents.tutor_agent.chatbot import retrieve_grade_filtered_chunks
from app.core.cache import cache_get, cache_set, make_cache_key
from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Room definitions — fixed order
# ---------------------------------------------------------------------------

ROOMS = [
    ("Fill the Gap", "fill_blank_word_bank", "reading"),
    ("Scramble Fix", "sentence_scramble", "writing"),
    ("Odd One Out", "odd_one_out", "reading"),
    ("Missing Letter", "missing_letter", "writing"),
    ("True or False", "passage_true_false", "reading"),
]

# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class RoomOut(BaseModel):
    room_number: int
    room_name: str
    task_type: str
    pillar: str
    questions: list[MissionQuestionOut]


class PuzzlePalaceResponse(BaseModel):
    rooms: list[RoomOut]
    topic: str


# ---------------------------------------------------------------------------
# GET /rooms
# ---------------------------------------------------------------------------


@router.get("/rooms", response_model=PuzzlePalaceResponse, summary="Get Puzzle Palace rooms")
async def get_puzzle_palace_rooms(
    student: dict = Depends(get_current_student),
):
    """
    Generate 10 questions across 5 rooms (2 per room) for Puzzle Palace.

    Rooms in fixed order:
      1. Fill the Gap   (fill_blank_word_bank, reading)
      2. Scramble Fix   (sentence_scramble, writing)
      3. Odd One Out    (odd_one_out, reading)
      4. Missing Letter  (missing_letter, writing)
      5. True or False  (passage_true_false, reading)

    Questions are generated via the existing pillar mission generator with RAG
    grounding. Results are cached for 1 hour. Reading and writing questions are
    generated in parallel.

    Authentication: student JWT (Bearer token).
    """
    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # ------------------------------------------------------------------
    # Step 1: Fetch classroom grade level
    # ------------------------------------------------------------------
    resp = await asyncio.to_thread(
        lambda: supabase.table("classrooms")
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
    grade_level: int = resp.data["grade_level"]

    # ------------------------------------------------------------------
    # Step 2: Resolve active topics
    # ------------------------------------------------------------------
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    active_topic_names = [t["topic_name"] for t in active_topic_objs]
    topics_hash = hashlib.md5(
        ",".join(sorted(active_topic_names)).encode()
    ).hexdigest()[:12]

    topic_label = ", ".join(active_topic_names) if active_topic_names else "General English"

    # ------------------------------------------------------------------
    # Step 3: Check cache (1 hour TTL)
    # ------------------------------------------------------------------
    cache_key = make_cache_key("puzzle_palace", student_id, topics_hash)
    cached = await cache_get(cache_key)
    if cached:
        logger.info("Cache hit for puzzle palace: %s", cache_key)
        return PuzzlePalaceResponse(**cached)

    # ------------------------------------------------------------------
    # Step 4: Retrieve RAG context chunks
    # ------------------------------------------------------------------
    seed_phrase = (
        f"English topics: {', '.join(active_topic_names)}"
        if active_topic_names
        else "vocabulary words lesson"
    )
    try:
        context_chunks = await retrieve_grade_filtered_chunks(
            query=seed_phrase,
            grade_level=grade_level,
            supabase_admin_client=supabase,
            match_count=5,
        )
        logger.info(
            "Puzzle Palace RAG retrieval: %d chunks for grade %d",
            len(context_chunks),
            grade_level,
        )
    except Exception as exc:
        logger.warning(
            "Puzzle Palace RAG retrieval failed, continuing without context: %s", exc
        )
        context_chunks = []

    # ------------------------------------------------------------------
    # Step 5: Generate reading and writing questions in parallel
    # ------------------------------------------------------------------
    # Reading rooms need: fill_blank_word_bank (2), odd_one_out (2), passage_true_false (2) = 6
    # Writing rooms need: sentence_scramble (2), missing_letter (2) = 4
    reading_count = 6  # rooms 1, 3, 5
    writing_count = 4  # rooms 2, 4

    async def gen_reading():
        try:
            return await generate_pillar_missions(
                pillar="reading",
                grade_level=grade_level,
                active_topics=active_topic_names,
                student_id=student_id,
                student_weaknesses=[],
                context_chunks=context_chunks,
                count=reading_count,
            )
        except Exception as exc:
            logger.error("Puzzle Palace reading generation failed: %s", exc)
            return []

    async def gen_writing():
        try:
            return await generate_pillar_missions(
                pillar="writing",
                grade_level=grade_level,
                active_topics=active_topic_names,
                student_id=student_id,
                student_weaknesses=[],
                context_chunks=context_chunks,
                count=writing_count,
            )
        except Exception as exc:
            logger.error("Puzzle Palace writing generation failed: %s", exc)
            return []

    reading_qs, writing_qs = await asyncio.gather(gen_reading(), gen_writing())

    # Ensure we have lists of dicts
    reading_qs = [q for q in (reading_qs or []) if isinstance(q, dict)]
    writing_qs = [q for q in (writing_qs or []) if isinstance(q, dict)]

    logger.info(
        "Puzzle Palace generated: %d reading, %d writing questions",
        len(reading_qs),
        len(writing_qs),
    )

    # ------------------------------------------------------------------
    # Step 6: Distribute questions into rooms (2 per room)
    # ------------------------------------------------------------------
    rooms: list[RoomOut] = []
    global_id = 1

    for room_idx, (room_name, task_type, pillar) in enumerate(ROOMS, start=1):
        # Pick from the appropriate pool
        pool = reading_qs if pillar == "reading" else writing_qs

        # Try to find questions matching the exact task_type first
        exact_match = [q for q in pool if q.get("task_type", q.get("type")) == task_type]
        others = [q for q in pool if q.get("task_type", q.get("type")) != task_type]

        room_questions_raw: list[dict] = []

        # Take up to 2 exact-match questions
        for q in exact_match[:2]:
            room_questions_raw.append(q)
            pool.remove(q)

        # Fall back to any remaining questions from the pool if not enough
        if len(room_questions_raw) < 2:
            needed = 2 - len(room_questions_raw)
            for q in others[:needed]:
                # Override task_type to match the room
                q["task_type"] = task_type
                room_questions_raw.append(q)
                pool.remove(q)

        # If still short, take whatever is left in the pool
        if len(room_questions_raw) < 2:
            needed = 2 - len(room_questions_raw)
            remaining = pool[:needed]
            for q in remaining:
                q["task_type"] = task_type
                room_questions_raw.append(q)
                pool.remove(q)

        # Assign sequential IDs and ensure pillar/task_type are set
        for q in room_questions_raw:
            q["id"] = global_id
            q["pillar"] = pillar
            q["task_type"] = task_type
            global_id += 1

        room_out = RoomOut(
            room_number=room_idx,
            room_name=room_name,
            task_type=task_type,
            pillar=pillar,
            questions=[_strip_answer(q) for q in room_questions_raw],
        )
        rooms.append(room_out)

    response = PuzzlePalaceResponse(rooms=rooms, topic=topic_label)

    # Cache for 1 hour
    await cache_set(cache_key, response.model_dump(), ttl=3600)

    total_qs = sum(len(r.questions) for r in rooms)
    logger.info(
        "Puzzle Palace returned %d questions across %d rooms for student %s",
        total_qs,
        len(rooms),
        student_id,
    )

    return response
