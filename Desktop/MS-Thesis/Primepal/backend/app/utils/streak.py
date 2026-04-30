"""Streak tracking utility — updates daily streak after any educational task completion."""
import logging
from datetime import date, timedelta
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)


async def update_streak(student_id: str) -> dict:
    """
    Update the student's daily streak.

    A "streak day" = student completed at least one educational task.

    Logic:
    - If last_activity_date = today -> no change (already counted today)
    - If last_activity_date = yesterday -> current_streak += 1
    - If last_activity_date < yesterday -> current_streak = 1 (reset)
    - If null -> current_streak = 1 (first ever)

    Updates last_activity_date = today.
    Updates longest_streak if current_streak exceeds it.

    Returns: { current_streak: int, longest_streak: int, streak_updated: bool }
    """
    supabase = get_supabase_admin()
    today = date.today()  # UTC date
    yesterday = today - timedelta(days=1)

    # Fetch current streak data
    resp = supabase.table("students").select(
        "current_streak, longest_streak, last_activity_date"
    ).eq("id", student_id).maybe_single().execute()

    if not resp.data:
        return {"current_streak": 0, "longest_streak": 0, "streak_updated": False}

    data = resp.data
    current_streak = data.get("current_streak") or 0
    longest_streak = data.get("longest_streak") or 0
    last_activity = data.get("last_activity_date")  # could be string "YYYY-MM-DD" or None

    # Parse last_activity_date
    if isinstance(last_activity, str):
        last_activity = date.fromisoformat(last_activity)

    # Check if already counted today
    if last_activity == today:
        return {"current_streak": current_streak, "longest_streak": longest_streak, "streak_updated": False}

    # Calculate new streak
    if last_activity == yesterday:
        current_streak += 1
    else:
        current_streak = 1  # Reset (includes null case)

    if current_streak > longest_streak:
        longest_streak = current_streak

    # Update DB
    supabase.table("students").update({
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_activity_date": today.isoformat(),
    }).eq("id", student_id).execute()

    logger.info(f"Streak updated for student {student_id}: {current_streak} days (longest: {longest_streak})")

    return {"current_streak": current_streak, "longest_streak": longest_streak, "streak_updated": True}
