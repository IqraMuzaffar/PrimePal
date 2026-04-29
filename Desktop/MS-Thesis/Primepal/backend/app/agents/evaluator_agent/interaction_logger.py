"""
Feature 8: Interaction Logger — background-safe helper for recording student interactions.

Called as a FastAPI BackgroundTask from the chat and missions endpoints so it
never adds latency to the student-facing response.

Table: public.student_interactions
Columns: student_id, classroom_id, grade_level, interaction_type,
         original_message, translated_message, correct, context_used, pillar, created_at
"""
from app.core.supabase_client import get_supabase_admin


def log_interaction(
    *,
    student_id: str,
    classroom_id: str,
    grade_level: int,
    interaction_type: str,          # 'chat' | 'mission_mc' | 'mission_fill' | 'spelling_bee'
    original_message: str | None = None,
    translated_message: str | None = None,
    correct: bool | None = None,    # None for chat interactions
    context_used: bool = False,
    pillar: str | None = None,      # 'reading' | 'writing' | 'listening' | 'speaking' (None for non-pillar interactions)
) -> None:
    """
    Insert one interaction record into student_interactions.

    This function is intentionally synchronous — it is designed to run inside
    FastAPI BackgroundTasks (which execute in a thread pool, not the async event
    loop) using the synchronous Supabase client.

    Errors are caught and silently swallowed so a logging failure never crashes
    the student-facing response.
    """
    try:
        supabase = get_supabase_admin()
        supabase.table("student_interactions").insert(
            {
                "student_id": student_id,
                "classroom_id": classroom_id,
                "grade_level": grade_level,
                "interaction_type": interaction_type,
                "original_message": original_message,
                "translated_message": translated_message,
                "correct": correct,
                "context_used": context_used,
                "pillar": pillar,
            }
        ).execute()
    except Exception:
        # Logging is best-effort; never raise to the caller
        pass
