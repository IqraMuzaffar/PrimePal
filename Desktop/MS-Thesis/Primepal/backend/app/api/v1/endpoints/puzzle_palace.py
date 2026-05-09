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
from starlette.requests import Request

from app.core.rate_limit import limiter

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
@limiter.limit("20/minute")
async def get_puzzle_palace_rooms(
    request: Request,
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
    cache_key = make_cache_key("puzzle_palace", classroom_id, topics_hash)
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
        # retrieve_grade_filtered_chunks returns list[str], but
        # generate_pillar_missions expects list[dict] with "content" key
        context_chunks = [{"content": c} for c in context_chunks]
    except Exception as exc:
        logger.warning(
            "Puzzle Palace RAG retrieval failed, continuing without context: %s", exc
        )
        context_chunks = []

    # ------------------------------------------------------------------
    # Step 5: Generate reading and writing questions in parallel
    # ------------------------------------------------------------------
    # Request extra questions so LLM task-type variety is more likely to cover all rooms.
    # Reading rooms need 6 (3 types x 2), writing rooms need 4 (2 types x 2).
    # Over-request to ensure coverage.
    reading_count = 9   # need 6, request 9 for task-type variety
    writing_count = 6   # need 4, request 6 for task-type variety

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
    # Two-pass allocation: exact task_type matches first, then fill gaps.
    # ------------------------------------------------------------------
    used_ids: set[int] = set()
    room_assignments: list[list[dict]] = [[] for _ in ROOMS]

    def _get_tt(q: dict) -> str:
        return q.get("task_type", q.get("type", ""))

    # Pass 1: assign exact task_type matches (up to 2 per room)
    for idx, (_, task_type, pillar) in enumerate(ROOMS):
        pool = reading_qs if pillar == "reading" else writing_qs
        for q in pool:
            if id(q) in used_ids:
                continue
            if _get_tt(q) == task_type and len(room_assignments[idx]) < 2:
                room_assignments[idx].append(q)
                used_ids.add(id(q))

    # Pass 2: fill any rooms that still have < 2 questions from same-pillar pool
    for idx, (_, task_type, pillar) in enumerate(ROOMS):
        if len(room_assignments[idx]) >= 2:
            continue
        pool = reading_qs if pillar == "reading" else writing_qs
        for q in pool:
            if id(q) in used_ids:
                continue
            if len(room_assignments[idx]) >= 2:
                break
            room_assignments[idx].append(q)
            used_ids.add(id(q))

    # Build room output
    rooms: list[RoomOut] = []
    global_id = 1

    for idx, (room_name, task_type, pillar) in enumerate(ROOMS):
        for q in room_assignments[idx]:
            q["id"] = global_id
            q["pillar"] = pillar
            q["task_type"] = task_type
            global_id += 1

        rooms.append(RoomOut(
            room_number=idx + 1,
            room_name=room_name,
            task_type=task_type,
            pillar=pillar,
            questions=[_strip_answer(q) for q in room_assignments[idx]],
        ))

    response = PuzzlePalaceResponse(rooms=rooms, topic=topic_label)

    # Cache for 1 hour
    await cache_set(cache_key, response.model_dump(), ttl=86400)  # 24 hours

    total_qs = sum(len(r.questions) for r in rooms)
    logger.info(
        "Puzzle Palace returned %d questions across %d rooms for student %s",
        total_qs,
        len(rooms),
        student_id,
    )

    return response
