"""
Pre-generation utility for pillar missions.

When a teacher updates active topics, this module pre-generates mission
questions for all four pillars so students get instant responses instead
of waiting for LLM calls.
"""
import asyncio
import hashlib
import logging

from app.agents.tutor_agent.mission_generator import generate_pillar_missions
from app.api.v1.endpoints.classroom import get_active_topics
from app.core.cache import cache_get, cache_set
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

PILLARS = ["reading", "writing", "listening", "speaking"]
_INTER_CALL_DELAY_S = 1


def _build_generic_cache_key(
    classroom_id: str, pillar: str, topics_hash: str
) -> str:
    """Build cache key for pre-generated generic pillar missions."""
    return f"pillar_missions_generic:{classroom_id}:{pillar}:{topics_hash}"


async def pregenerate_pillar_missions(classroom_id: str) -> None:
    """
    Pre-generate missions for all four pillars in a classroom.

    Steps:
      1. Fetch grade_level from classrooms table
      2. Resolve active topics for the classroom
      3. If no active topics, return early
      4. For each pillar, check cache and generate if missing
      5. Log summary of results
    """
    supabase = get_supabase_admin()

    # Step 1: Fetch classroom grade_level
    classroom = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    if not classroom.data:
        logger.warning("pregenerate: classroom %s not found", classroom_id)
        return

    grade_level = classroom.data["grade_level"]

    # Step 2: Resolve active topics
    active_topics = await get_active_topics(classroom_id, grade_level, supabase)

    if not active_topics:
        logger.info("pregenerate: no active topics for classroom %s — skipping", classroom_id)
        return

    active_topic_names = [t["topic_name"] for t in active_topics]

    # Step 3: Compute topics hash
    topics_hash = hashlib.md5(
        ",".join(sorted(active_topic_names)).encode()
    ).hexdigest()[:12]

    # Step 4: Generate for each pillar
    generated = []
    skipped = []
    failed = []
    attempts = 0

    for idx, pillar in enumerate(PILLARS):
        cache_key = _build_generic_cache_key(classroom_id, pillar, topics_hash)

        # Check if already cached
        existing = await cache_get(cache_key)
        if existing is not None:
            skipped.append(pillar)
            continue

        # Sleep between LLM call attempts (skip first)
        if attempts > 0:
            await asyncio.sleep(_INTER_CALL_DELAY_S)
        attempts += 1

        try:
            missions = await generate_pillar_missions(
                pillar=pillar,
                grade_level=grade_level,
                active_topics=active_topic_names,
                student_id="generic",
                student_weaknesses=[],
                is_frustrated=False,
                performance_profile=None,
            )

            # Build response dict matching PillarMissionsResponse shape
            questions_out = []
            for q in missions:
                q_out = {k: v for k, v in q.items() if k != "is_weakness_focused"}
                if "type" in q_out and "task_type" not in q_out:
                    q_out["task_type"] = q_out.pop("type")
                questions_out.append(q_out)
            weakness_count = sum(
                1 for q in missions if q.get("is_weakness_focused")
            )

            response_dict = {
                "pillar": pillar,
                "active_topics_summary": ", ".join(active_topic_names),
                "questions": questions_out,
                "weakness_focus_questions": weakness_count,
            }

            await cache_set(cache_key, response_dict, ttl=3600)
            generated.append(pillar)

        except Exception:
            logger.exception(
                "pregenerate: failed to generate %s for classroom %s",
                pillar,
                classroom_id,
            )
            failed.append(pillar)

    # Step 5: Log summary
    logger.info(
        "pregenerate summary for classroom %s: generated=%s skipped=%s failed=%s",
        classroom_id,
        generated,
        skipped,
        failed,
    )
