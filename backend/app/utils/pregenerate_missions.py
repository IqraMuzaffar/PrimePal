"""
Pre-generation utility for pillar missions.

When a teacher updates active topics, this module:
  1. Pre-generates generic mission cache entries (existing behavior).
  2. **NEW**: Populates the question_bank table so students get instant
     hybrid responses (5 bank + 5 LLM).

The question bank is the durable backing store; the cache is an ephemeral
acceleration layer on top.
"""
import asyncio
import hashlib
import logging

from app.agents.tutor_agent.mission_generator import generate_pillar_missions
from app.api.v1.endpoints.classroom import get_active_topics
from app.core.cache import cache_get, cache_set
from app.core.supabase_client import get_supabase_admin
from app.utils.question_bank import populate_question_bank

logger = logging.getLogger(__name__)

PILLARS = ["reading", "writing", "listening", "speaking"]


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
      4. Populate question_bank (NEW — durable store for instant delivery)
      5. For each pillar, populate generic cache if missing
      6. Log summary of results
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

    # ------------------------------------------------------------------
    # Step 4: NEW — Populate question_bank (durable store)
    # This runs first so the bank is ready even if cache generation fails.
    # ------------------------------------------------------------------
    try:
        bank_summary = await populate_question_bank(classroom_id)
        logger.info(
            "pregenerate: question_bank populated for classroom %s: %s",
            classroom_id, bank_summary,
        )
    except Exception as exc:
        logger.error(
            "pregenerate: question_bank population failed for classroom %s: %s",
            classroom_id, exc, exc_info=True,
        )
        # Continue with cache generation even if bank population fails

    # ------------------------------------------------------------------
    # Step 5: Generate generic cache entries for each pillar IN PARALLEL
    # ------------------------------------------------------------------
    async def _generate_one(pillar: str) -> tuple[str, str]:
        """Generate one pillar and return (pillar, status)."""
        cache_key = _build_generic_cache_key(classroom_id, pillar, topics_hash)

        # Check if already cached
        existing = await cache_get(cache_key)
        if existing is not None:
            return (pillar, "skipped")

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
                q_out = {k: v for k, v in q.items() if k not in ("is_weakness_focused", "source")}
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
            return (pillar, "generated")

        except Exception:
            logger.exception(
                "pregenerate: failed to generate %s for classroom %s",
                pillar,
                classroom_id,
            )
            return (pillar, "failed")

    # Launch all 4 pillars concurrently
    results = await asyncio.gather(*[_generate_one(p) for p in PILLARS])

    generated = [p for p, s in results if s == "generated"]
    skipped = [p for p, s in results if s == "skipped"]
    failed = [p for p, s in results if s == "failed"]

    # Step 6: Log summary
    logger.info(
        "pregenerate summary for classroom %s: generated=%s skipped=%s failed=%s",
        classroom_id,
        generated,
        skipped,
        failed,
    )
