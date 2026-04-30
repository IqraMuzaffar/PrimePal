"""Per-topic performance tracking for adaptive difficulty."""
import logging
from datetime import datetime, timedelta, timezone
from app.core.supabase_client import get_supabase_admin
from app.core.cache import cache_get, cache_set, cache_delete, make_cache_key

logger = logging.getLogger(__name__)


class TopicPerformance:
    def __init__(self, topic: str, pillar: str, total_attempts: int, correct_count: int):
        self.topic = topic
        self.pillar = pillar
        self.total_attempts = total_attempts
        self.correct_count = correct_count
        self.accuracy_pct = round((correct_count / total_attempts * 100) if total_attempts > 0 else 0)

    @property
    def suggested_difficulty(self) -> str:
        if self.accuracy_pct < 40:
            return "easy"
        elif self.accuracy_pct <= 70:
            return "medium"
        else:
            return "hard"

    @property
    def is_mastered(self) -> bool:
        return self.accuracy_pct > 90 and self.total_attempts >= 5


async def get_student_performance_profile(student_id: str) -> dict:
    """
    Compute per-topic accuracy map for a student from student_interactions.

    Returns:
    {
        "overall_accuracy": float,
        "pillar_accuracy": {"reading": float, "writing": float, ...},
        "weak_topics": [{"topic": str, "accuracy": float, "suggested_difficulty": str}],
        "strong_topics": [{"topic": str, "accuracy": float}],
        "difficulty_recommendation": str,  # overall: "easy", "medium", "hard"
    }

    Cached for 1 hour (refreshed on mission completion).
    """
    cache_key = make_cache_key("performance_profile", student_id)
    cached = await cache_get(cache_key)
    if cached:
        return cached

    supabase = get_supabase_admin()

    # Fetch last 2 weeks of interactions
    two_weeks_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

    resp = supabase.table("student_interactions").select(
        "interaction_type, pillar, correct, original_message"
    ).eq("student_id", student_id).gte("created_at", two_weeks_ago).execute()

    rows = resp.data or []

    if not rows:
        profile = {
            "overall_accuracy": 0.0,
            "pillar_accuracy": {"reading": 0.0, "writing": 0.0, "listening": 0.0, "speaking": 0.0},
            "weak_topics": [],
            "strong_topics": [],
            "difficulty_recommendation": "medium",
        }
        await cache_set(cache_key, profile, ttl=3600)
        return profile

    # Compute per-pillar accuracy
    pillar_stats: dict[str, float] = {}
    for pillar in ["reading", "writing", "listening", "speaking"]:
        pillar_rows = [r for r in rows if r.get("pillar") == pillar]
        total = len(pillar_rows)
        correct = sum(1 for r in pillar_rows if r.get("correct"))
        pillar_stats[pillar] = round((correct / total * 100) if total > 0 else 0, 1)

    # Overall accuracy
    total_all = len(rows)
    correct_all = sum(1 for r in rows if r.get("correct"))
    overall = round((correct_all / total_all * 100) if total_all > 0 else 0, 1)

    # Determine weak and strong pillars
    weak_topics: list[dict] = []
    strong_topics: list[dict] = []
    for pillar, acc in pillar_stats.items():
        pillar_rows = [r for r in rows if r.get("pillar") == pillar]
        if len(pillar_rows) < 3:
            continue  # Not enough data
        if acc < 50:
            weak_topics.append({"topic": pillar, "accuracy": acc, "suggested_difficulty": "easy"})
        elif acc < 70:
            weak_topics.append({"topic": pillar, "accuracy": acc, "suggested_difficulty": "medium"})
        elif acc > 85:
            strong_topics.append({"topic": pillar, "accuracy": acc})

    # Overall difficulty recommendation
    if overall < 40:
        difficulty_rec = "easy"
    elif overall <= 70:
        difficulty_rec = "medium"
    else:
        difficulty_rec = "hard"

    profile = {
        "overall_accuracy": overall,
        "pillar_accuracy": pillar_stats,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        "difficulty_recommendation": difficulty_rec,
    }

    await cache_set(cache_key, profile, ttl=3600)
    return profile


async def invalidate_performance_cache(student_id: str):
    """Invalidate cached performance profile (call after mission completion)."""
    cache_key = make_cache_key("performance_profile", student_id)
    await cache_delete(cache_key)
