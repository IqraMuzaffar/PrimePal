"""
Question Bank: bounded pre-generated question pool for instant mission delivery.

Design:
  - Fixed ceiling: 30 questions per (grade_level, pillar, topic) slot.
  - Bank populated when teacher updates active topics (background task).
  - Old topic rows deleted when topics change; new ones generated via LLM.
  - First student request: 5 from bank + 5 LLM-generated (parallel).
  - Subsequent requests: cached personalized set.
  - No background growth: bank only populated on teacher action.

Public API:
  - populate_question_bank(classroom_id)      -- called from topic-update endpoint
  - query_question_bank(...)                   -- called from pillar missions endpoint
  - pull_from_bank(...)                        -- simplified pull (backward compat)
  - insert_into_bank(...)                      -- insert LLM results into bank
  - get_bank_stats(classroom_id)               -- admin/debug stats
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import random
from typing import Any, Optional

from app.agents.tutor_agent.mission_generator import (
    PILLAR_TASK_CONFIGS,
    generate_pillar_missions,
    validate_topic_alignment,
)
from app.api.v1.endpoints.classroom import get_active_topics
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BANK_SLOT_CEILING = 30   # Max questions per (grade, pillar, topic) slot
BANK_QUERY_COUNT = 5     # Default questions to pull per request
PILLARS = ["reading", "writing", "listening", "speaking"]
LLM_BATCH_SIZE = 10      # generate_pillar_missions returns 10 at a time
MAX_LLM_CONCURRENCY = 4  # Limit parallel LLM calls during population


# ═══════════════════════════════════════════════════════════════════════════════
# 1. BANK POPULATION (called on teacher topic update)
# ═══════════════════════════════════════════════════════════════════════════════

async def populate_question_bank(classroom_id: str) -> dict[str, Any]:
    """
    Populate the question bank for all active (grade, pillar, topic) slots.

    Called as a background task when teacher updates topics via
    PUT /{classroom_id}/active-topics.

    Steps:
      1. Fetch classroom grade_level.
      2. Resolve current active topics.
      3. Delete stale bank rows (topics no longer active).
      4. For each active topic x pillar: fill up to BANK_SLOT_CEILING via LLM.
      5. Return summary dict.

    LLM failures are handled gracefully -- partial population is acceptable.
    """
    supabase = get_supabase_admin()

    # Step 1: Fetch classroom grade
    classroom_resp = await asyncio.to_thread(
        lambda: supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom_resp.data:
        logger.warning("question_bank: classroom %s not found", classroom_id)
        return {"status": "error", "reason": "classroom_not_found"}

    grade_level: int = classroom_resp.data["grade_level"]

    # Step 2: Resolve active topics
    active_topic_objs = await get_active_topics(classroom_id, grade_level, supabase)
    if not active_topic_objs:
        logger.info("question_bank: no active topics for classroom %s — clearing bank", classroom_id)
        await _delete_classroom_bank(classroom_id)
        return {"status": "skipped", "reason": "no_active_topics"}

    active_topic_names = [t["topic_name"] for t in active_topic_objs]

    # Step 3: Delete stale rows for topics no longer active
    stale_deleted = await _delete_stale_topics(classroom_id, grade_level, active_topic_names)
    if stale_deleted:
        logger.info("question_bank: removed %d stale rows for classroom %s", stale_deleted, classroom_id)

    # Step 4: Fill each (topic, pillar) slot concurrently with bounded parallelism
    semaphore = asyncio.Semaphore(MAX_LLM_CONCURRENCY)

    async def _bounded_fill(topic: str, pillar: str) -> str:
        async with semaphore:
            return await _fill_slot(classroom_id, grade_level, pillar, topic)

    tasks = [
        _bounded_fill(topic, pillar)
        for topic in active_topic_names
        for pillar in PILLARS
    ]
    slot_results = await asyncio.gather(*tasks, return_exceptions=True)

    generated = sum(1 for r in slot_results if r == "generated")
    skipped = sum(1 for r in slot_results if r == "skipped")
    failed = sum(1 for r in slot_results if isinstance(r, Exception) or r == "failed")

    summary = {
        "status": "completed",
        "classroom_id": classroom_id,
        "grade_level": grade_level,
        "topics": active_topic_names,
        "slots_generated": generated,
        "slots_skipped": skipped,
        "slots_failed": failed,
    }
    logger.info("question_bank population: %s", summary)
    return summary


async def _fill_slot(
    classroom_id: str,
    grade_level: int,
    pillar: str,
    topic: str,
) -> str:
    """
    Fill a single (grade, pillar, topic) slot up to BANK_SLOT_CEILING.

    Generates questions in batches of 10 via generate_pillar_missions().
    Validates topic alignment before storing. Respects ceiling strictly.

    Returns: 'generated', 'skipped', or 'failed'.
    """
    supabase = get_supabase_admin()

    # Count existing questions for this slot
    existing_resp = await asyncio.to_thread(
        lambda: supabase.table("question_bank")
        .select("id", count="exact")
        .eq("grade_level", grade_level)
        .eq("pillar", pillar)
        .eq("topic", topic)
        .eq("classroom_id", classroom_id)
        .execute()
    )
    existing_count = existing_resp.count or 0

    if existing_count >= BANK_SLOT_CEILING:
        logger.debug(
            "question_bank: slot (%d, %s, %s) already full (%d/%d)",
            grade_level, pillar, topic, existing_count, BANK_SLOT_CEILING,
        )
        return "skipped"

    needed = BANK_SLOT_CEILING - existing_count
    logger.info(
        "question_bank: filling slot (%d, %s, %s) — need %d questions",
        grade_level, pillar, topic, needed,
    )

    # Generate in batches of 10 until we have enough or fail
    all_generated: list[dict] = []
    batches_needed = math.ceil(needed / LLM_BATCH_SIZE)

    for batch_idx in range(batches_needed):
        try:
            questions = await generate_pillar_missions(
                pillar=pillar,
                grade_level=grade_level,
                active_topics=[topic],
                student_id="bank_population",
                student_weaknesses=[],
                is_frustrated=False,
                performance_profile=None,
                count=LLM_BATCH_SIZE,  # Generate 10 per batch for efficiency
            )
            if questions:
                # Skip topic validation for bank population — the LLM was
                # already prompted with the specific topic, and questions are
                # stored BY topic in the bank. Re-validating rejects valid
                # questions for topics not in TOPIC_KEYWORDS (e.g. "Verbs",
                # "Sight Words", "Punctuation").
                valid_questions = [q for q in questions if isinstance(q, dict) and q.get("question")]
                all_generated.extend(valid_questions)
                logger.info(
                    "question_bank: batch %d/%d — %d generated, %d valid for (%d, %s, %s)",
                    batch_idx + 1, batches_needed, len(questions), len(valid_questions),
                    grade_level, pillar, topic,
                )

                # Stop early if we have enough
                if len(all_generated) >= needed:
                    break
        except Exception as exc:
            logger.error(
                "question_bank: LLM batch %d failed for (%d, %s, %s): %s",
                batch_idx + 1, grade_level, pillar, topic, exc,
            )
            # Partial population is OK — continue with what we have
            break

    if not all_generated:
        logger.warning(
            "question_bank: no questions generated for slot (%d, %s, %s)",
            grade_level, pillar, topic,
        )
        return "failed"

    # Trim to exactly what we need (never exceed ceiling)
    to_insert = all_generated[:needed]

    # Insert into DB
    inserted = await _bulk_insert(
        grade_level, pillar, topic, classroom_id, to_insert
    )
    logger.info(
        "question_bank: inserted %d/%d into slot (%d, %s, %s)",
        inserted, len(to_insert), grade_level, pillar, topic,
    )
    return "generated"


async def _bulk_insert(
    grade_level: int,
    pillar: str,
    topic: str,
    classroom_id: str,
    questions: list[dict],
) -> int:
    """
    Insert questions into question_bank table.

    Builds rows with proper task_type distribution. Uses upsert with
    ignore_duplicates to skip content-identical rows via the unique index.
    Falls back to individual inserts if upsert fails.

    Returns count of successfully inserted rows.
    """
    supabase = get_supabase_admin()

    rows = []
    for q in questions:
        # Strip transient fields not suitable for storage
        qdata = {k: v for k, v in q.items() if k not in ("source", "is_weakness_focused")}
        rows.append({
            "grade_level": grade_level,
            "pillar": pillar,
            "topic": topic,
            "task_type": q.get("task_type", q.get("type", "multiple_choice")),
            "difficulty": q.get("difficulty", "medium"),
            "question_data": qdata,
            "classroom_id": classroom_id,
            "times_served": 0,
        })

    if not rows:
        return 0

    # Try batch insert first (fastest path)
    try:
        await asyncio.to_thread(
            lambda: supabase.table("question_bank")
            .insert(rows)
            .execute()
        )
        return len(rows)
    except Exception as batch_exc:
        logger.debug("question_bank: batch insert failed (likely duplicates): %s", batch_exc)

    # Fall back to individual inserts for duplicate tolerance
    inserted = 0
    for row in rows:
        try:
            await asyncio.to_thread(
                lambda r=row: supabase.table("question_bank")
                .insert(r)
                .execute()
            )
            inserted += 1
        except Exception:
            pass  # Duplicate or constraint violation — skip silently
    return inserted


# ---------------------------------------------------------------------------
# Stale topic cleanup
# ---------------------------------------------------------------------------

async def _delete_stale_topics(
    classroom_id: str, grade_level: int, active_topics: list[str]
) -> int:
    """Delete bank rows for topics no longer active. Returns deleted count."""
    supabase = get_supabase_admin()

    # Fetch distinct topics in bank for this classroom
    existing_resp = await asyncio.to_thread(
        lambda: supabase.table("question_bank")
        .select("topic")
        .eq("classroom_id", classroom_id)
        .eq("grade_level", grade_level)
        .execute()
    )
    existing_topics = set(row["topic"] for row in (existing_resp.data or []))
    stale_topics = existing_topics - set(active_topics)

    if not stale_topics:
        return 0

    deleted = 0
    for stale_topic in stale_topics:
        try:
            resp = await asyncio.to_thread(
                lambda t=stale_topic: supabase.table("question_bank")
                .delete()
                .eq("classroom_id", classroom_id)
                .eq("grade_level", grade_level)
                .eq("topic", t)
                .execute()
            )
            count = len(resp.data) if resp.data else 0
            deleted += count
            logger.info(
                "question_bank: deleted %d stale rows for topic '%s' in classroom %s",
                count, stale_topic, classroom_id,
            )
        except Exception as exc:
            logger.error("question_bank: failed to delete stale topic '%s': %s", stale_topic, exc)

    return deleted


async def _delete_classroom_bank(classroom_id: str) -> int:
    """Delete all bank rows for a classroom."""
    supabase = get_supabase_admin()
    try:
        resp = await asyncio.to_thread(
            lambda: supabase.table("question_bank")
            .delete()
            .eq("classroom_id", classroom_id)
            .execute()
        )
        count = len(resp.data) if resp.data else 0
        logger.info("question_bank: cleared %d rows for classroom %s", count, classroom_id)
        return count
    except Exception as exc:
        logger.error("question_bank: failed to clear classroom %s: %s", classroom_id, exc)
        return 0


# ═══════════════════════════════════════════════════════════════════════════════
# 2. BANK QUERY (called from pillar missions endpoint)
# ═══════════════════════════════════════════════════════════════════════════════

async def query_question_bank(
    grade_level: int,
    pillar: str,
    topics: list[str],
    classroom_id: str,
    student_weaknesses: list[str] | None = None,
    count: int = BANK_QUERY_COUNT,
) -> list[dict]:
    """
    Select `count` questions from the bank for given grade/pillar/topics.

    Selection strategy:
      1. Respect task_type distribution (proportional to PILLAR_TASK_CONFIGS, halved).
      2. Weight difficulty based on student weaknesses:
         - Weak in this pillar: bias toward easy/medium.
         - Strong in this pillar: bias toward medium/hard.
         - No data: use all difficulties.
      3. Prefer least-served questions (times_served ASC) to reduce repetition.
      4. Increment times_served on selected questions.

    Returns list of question_data dicts, or empty list if bank is empty.
    """
    supabase = get_supabase_admin()

    if not topics:
        return []

    config = PILLAR_TASK_CONFIGS.get(pillar)
    if not config:
        logger.error("question_bank: unknown pillar '%s'", pillar)
        return []

    # Step 1: Build proportional task_type targets for `count` questions
    task_targets = _compute_task_targets(config["task_types"], count)

    # Step 2: Determine difficulty preference
    difficulty_pref = _get_difficulty_preference(pillar, student_weaknesses)

    # Step 3: Select questions per task_type, least-served first
    selected: list[dict] = []
    selected_ids: list[str] = []

    for task_type, target in task_targets.items():
        if target <= 0:
            continue
        rows = await _query_slot(
            supabase, grade_level, pillar, topics, classroom_id,
            task_type, difficulty_pref, target,
        )
        for row in rows:
            if row["id"] not in selected_ids:
                selected.append(row["question_data"])
                selected_ids.append(row["id"])

    # Step 4: Backfill if we have fewer than `count`
    if len(selected) < count:
        shortfall = count - len(selected)
        backfill = await _query_slot(
            supabase, grade_level, pillar, topics, classroom_id,
            task_type=None, difficulty_pref=None,
            limit=shortfall + len(selected_ids),
        )
        for row in backfill:
            if row["id"] not in selected_ids and len(selected) < count:
                selected.append(row["question_data"])
                selected_ids.append(row["id"])

    # Step 5: Increment times_served atomically
    if selected_ids:
        await _increment_times_served(selected_ids)

    logger.info(
        "question_bank: queried %d/%d for grade=%d pillar=%s topics=%s",
        len(selected), count, grade_level, pillar, topics,
    )
    return selected


async def _query_slot(
    supabase,
    grade_level: int,
    pillar: str,
    topics: list[str],
    classroom_id: str,
    task_type: str | None,
    difficulty_pref: list[str] | None,
    limit: int,
) -> list[dict]:
    """Execute a single bank query with optional task_type and difficulty filters."""
    try:
        query = (
            supabase.table("question_bank")
            .select("id, question_data, difficulty, times_served")
            .eq("grade_level", grade_level)
            .eq("pillar", pillar)
            .in_("topic", topics)
            .eq("classroom_id", classroom_id)
        )
        if task_type:
            query = query.eq("task_type", task_type)
        if difficulty_pref:
            query = query.in_("difficulty", difficulty_pref)

        resp = await asyncio.to_thread(
            lambda q=query: q.order("times_served").limit(limit).execute()
        )
        rows = resp.data or []

        # If difficulty filter was too restrictive, retry without it
        if len(rows) < limit and difficulty_pref:
            fallback = (
                supabase.table("question_bank")
                .select("id, question_data, difficulty, times_served")
                .eq("grade_level", grade_level)
                .eq("pillar", pillar)
                .in_("topic", topics)
                .eq("classroom_id", classroom_id)
            )
            if task_type:
                fallback = fallback.eq("task_type", task_type)
            resp = await asyncio.to_thread(
                lambda q=fallback: q.order("times_served").limit(limit).execute()
            )
            rows = resp.data or []

        return rows
    except Exception as exc:
        logger.error("question_bank: query failed: %s", exc)
        return []


def _compute_task_targets(
    task_types: list[tuple[str, int]], count: int
) -> dict[str, int]:
    """
    Compute proportional task_type counts for `count` questions.
    E.g., reading config [(spm, 3), (ooo, 3), (fbwb, 2), (ptf, 2)] for count=5
    yields roughly {spm:2, ooo:1, fbwb:1, ptf:1}.
    """
    full_total = sum(c for _, c in task_types)
    targets: dict[str, int] = {}
    allocated = 0

    for tt, full_count in task_types:
        target = max(1, round(full_count / full_total * count))
        targets[tt] = target
        allocated += target

    # Correct rounding over/under
    if allocated > count:
        sorted_types = sorted(targets.items(), key=lambda x: -x[1])
        excess = allocated - count
        for tt, tc in sorted_types:
            if excess <= 0:
                break
            reduce = min(tc - 1, excess)
            if reduce > 0:
                targets[tt] -= reduce
                excess -= reduce
    elif allocated < count:
        sorted_types = sorted(targets.items(), key=lambda x: x[1])
        deficit = count - allocated
        for tt, _ in sorted_types:
            if deficit <= 0:
                break
            targets[tt] += 1
            deficit -= 1

    return targets


def _get_difficulty_preference(
    pillar: str, student_weaknesses: list[str] | None
) -> list[str] | None:
    """
    Determine difficulty levels to prefer based on student weaknesses.

    Returns:
      - ["easy", "medium"] if student is weak in this pillar
      - ["medium", "hard"] if student is strong
      - None if no weakness data (all difficulties)
    """
    if not student_weaknesses:
        return None

    # H3: weaknesses can be structured dicts or legacy strings
    pillar_is_weak = False
    for w in student_weaknesses:
        if isinstance(w, dict):
            if w.get("pillar") == pillar:
                pillar_is_weak = True
                break
        elif isinstance(w, str) and w.lower().startswith(pillar):
            pillar_is_weak = True
            break

    if pillar_is_weak:
        return ["easy", "medium"]
    return ["medium", "hard"]


async def _increment_times_served(question_ids: list[str]) -> None:
    """Atomically increment times_served for selected bank rows via RPC."""
    supabase = get_supabase_admin()
    try:
        await asyncio.to_thread(
            lambda: supabase.rpc(
                "increment_bank_times_served",
                {"p_ids": question_ids},
            ).execute()
        )
    except Exception:
        # RPC may not exist yet — fall back to individual updates
        logger.debug("increment_bank_times_served RPC unavailable, using fallback")
        for qid in question_ids:
            try:
                resp = await asyncio.to_thread(
                    lambda id=qid: supabase.table("question_bank")
                    .select("times_served")
                    .eq("id", id)
                    .maybe_single()
                    .execute()
                )
                if resp.data:
                    new_val = (resp.data.get("times_served") or 0) + 1
                    await asyncio.to_thread(
                        lambda id=qid, v=new_val: supabase.table("question_bank")
                        .update({"times_served": v})
                        .eq("id", id)
                        .execute()
                    )
            except Exception as exc:
                logger.warning("question_bank: times_served increment failed for %s: %s", qid, exc)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. SIMPLIFIED PULL / INSERT (backward-compatible with existing callers)
# ═══════════════════════════════════════════════════════════════════════════════

async def pull_from_bank(
    grade_level: int,
    pillar: str,
    topics: list[str],
    count: int = 5,
    classroom_id: Optional[str] = None,
) -> list[dict]:
    """
    Pull *count* questions from the question_bank table.

    Selection strategy:
      1. Query rows matching (grade_level, pillar, topic IN topics).
      2. Sort by times_served ASC so least-used questions come first.
      3. Pick *count* questions, preferring diversity across task_types.
      4. Increment times_served for the selected rows.

    Returns:
        List of question dicts (MissionQuestion-shaped) ready for use.
        May return fewer than *count* if the bank is under-populated.
    """
    supabase = get_supabase_admin()

    if not topics:
        logger.warning("pull_from_bank called with empty topics list")
        return []

    try:
        # Query matching questions, least-served first
        query = (
            supabase.table("question_bank")
            .select("id, question_data, task_type, times_served")
            .eq("grade_level", grade_level)
            .eq("pillar", pillar)
            .in_("topic", topics)
            .order("times_served", desc=False)
            .limit(count * 3)  # Over-fetch for diversity selection
        )
        if classroom_id:
            query = query.eq("classroom_id", classroom_id)

        resp = await asyncio.to_thread(lambda q=query: q.execute())
        rows = resp.data or []

        if not rows:
            logger.info(
                "Question bank empty for grade=%d pillar=%s topics=%s",
                grade_level, pillar, topics,
            )
            return []

        # Diversify by task_type: round-robin across types
        by_type: dict[str, list] = {}
        for row in rows:
            tt = row["task_type"]
            by_type.setdefault(tt, []).append(row)

        selected: list[dict] = []
        type_keys = list(by_type.keys())
        random.shuffle(type_keys)
        idx = 0
        while len(selected) < count and any(by_type.values()):
            key = type_keys[idx % len(type_keys)]
            if by_type.get(key):
                selected.append(by_type[key].pop(0))
            else:
                type_keys = [k for k in type_keys if by_type.get(k)]
                if not type_keys:
                    break
            idx += 1

        if not selected:
            return []

        # Increment times_served for selected rows
        selected_ids = [r["id"] for r in selected]
        await _increment_times_served(selected_ids)

        # Extract question_data and re-number
        questions = []
        for i, row in enumerate(selected):
            qdata = row["question_data"]
            if isinstance(qdata, str):
                qdata = json.loads(qdata)
            qdata["id"] = i + 1  # Will be renumbered by caller
            qdata["pillar"] = pillar
            qdata["source"] = "bank"
            questions.append(qdata)

        logger.info(
            "Pulled %d/%d questions from bank for grade=%d pillar=%s",
            len(questions), count, grade_level, pillar,
        )
        return questions

    except Exception as exc:
        logger.error("Failed to pull from question bank: %s", exc, exc_info=True)
        return []


async def insert_into_bank(
    grade_level: int,
    pillar: str,
    topic: str,
    classroom_id: str,
    questions: list[dict],
) -> int:
    """
    Insert validated questions into the question_bank table.

    Respects the BANK_SLOT_CEILING (30) per (grade, pillar, topic) slot.
    Duplicate questions (same content hash) are silently skipped via the
    unique index on the table.

    Returns number of questions successfully inserted.
    """
    supabase = get_supabase_admin()

    if not questions:
        return 0

    # Check current slot count
    try:
        count_resp = await asyncio.to_thread(
            lambda: supabase.table("question_bank")
            .select("id", count="exact")
            .eq("grade_level", grade_level)
            .eq("pillar", pillar)
            .eq("topic", topic)
            .eq("classroom_id", classroom_id)
            .execute()
        )
        current_count = count_resp.count or 0
        available_slots = max(0, BANK_SLOT_CEILING - current_count)

        if available_slots == 0:
            logger.info(
                "Bank slot full (%d/%d) for grade=%d pillar=%s topic=%s",
                current_count, BANK_SLOT_CEILING, grade_level, pillar, topic,
            )
            return 0

        to_insert = questions[:available_slots]
    except Exception as exc:
        logger.warning("Could not check bank slot count: %s", exc)
        to_insert = questions[:BANK_SLOT_CEILING]

    # Strip transient fields and build rows
    rows = []
    for q in to_insert:
        qdata = {k: v for k, v in q.items() if k not in ("source", "is_weakness_focused")}
        rows.append({
            "grade_level": grade_level,
            "pillar": pillar,
            "topic": topic,
            "classroom_id": classroom_id,
            "task_type": q.get("task_type", q.get("type", "multiple_choice")),
            "difficulty": q.get("difficulty", "medium"),
            "question_data": qdata,
        })

    return await _bulk_insert(grade_level, pillar, topic, classroom_id, [
        # Re-derive from rows to match _bulk_insert input format (question dicts)
        r["question_data"] for r in rows
    ])


# ═══════════════════════════════════════════════════════════════════════════════
# 4. BANK SIZE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

async def get_bank_stats(classroom_id: str) -> dict[str, Any]:
    """Return bank statistics for a classroom (admin/debugging)."""
    supabase = get_supabase_admin()

    resp = await asyncio.to_thread(
        lambda: supabase.table("question_bank")
        .select("grade_level, pillar, topic, times_served")
        .eq("classroom_id", classroom_id)
        .execute()
    )
    rows = resp.data or []

    if not rows:
        return {"classroom_id": classroom_id, "total_questions": 0, "slots": {}}

    slots: dict[str, dict] = {}
    for row in rows:
        key = f"{row['grade_level']}:{row['pillar']}:{row['topic']}"
        if key not in slots:
            slots[key] = {"count": 0, "total_served": 0, "ceiling": BANK_SLOT_CEILING}
        slots[key]["count"] += 1
        slots[key]["total_served"] += row.get("times_served", 0)

    return {
        "classroom_id": classroom_id,
        "total_questions": len(rows),
        "slots": slots,
    }


async def enforce_bank_ceiling(
    classroom_id: str, grade_level: int, pillar: str, topic: str
) -> int:
    """
    Ensure a slot does not exceed BANK_SLOT_CEILING.
    Deletes oldest excess rows (by created_at ASC).
    Called defensively after insertion to handle race conditions.

    Returns number of rows deleted.
    """
    supabase = get_supabase_admin()

    count_resp = await asyncio.to_thread(
        lambda: supabase.table("question_bank")
        .select("id", count="exact")
        .eq("grade_level", grade_level)
        .eq("pillar", pillar)
        .eq("topic", topic)
        .eq("classroom_id", classroom_id)
        .execute()
    )
    current = count_resp.count or 0

    if current <= BANK_SLOT_CEILING:
        return 0

    excess = current - BANK_SLOT_CEILING
    oldest_resp = await asyncio.to_thread(
        lambda: supabase.table("question_bank")
        .select("id")
        .eq("grade_level", grade_level)
        .eq("pillar", pillar)
        .eq("topic", topic)
        .eq("classroom_id", classroom_id)
        .order("created_at")
        .limit(excess)
        .execute()
    )
    ids_to_delete = [row["id"] for row in (oldest_resp.data or [])]

    if ids_to_delete:
        await asyncio.to_thread(
            lambda: supabase.table("question_bank")
            .delete()
            .in_("id", ids_to_delete)
            .execute()
        )
        logger.info(
            "question_bank: trimmed %d excess rows from (%d, %s, %s)",
            len(ids_to_delete), grade_level, pillar, topic,
        )

    return len(ids_to_delete)
