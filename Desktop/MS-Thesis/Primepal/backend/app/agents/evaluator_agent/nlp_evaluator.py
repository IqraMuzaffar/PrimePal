"""
Feature 9: NLP Insight Generator — Agent C

Pipeline per request:
  1. Fetch the student's recent interactions from student_interactions (last 30).
  2. Compute basic stats locally (total count, mission accuracy, chat count).
  3. Bundle interaction summaries into an LLM prompt.
  4. Call gpt-4o with structured output → StudentInsightReport.
  5. Return the report.
"""
from __future__ import annotations
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings


class StudentInsightReport(BaseModel):
    engagement_level: str        # "High" | "Medium" | "Low"
    mission_accuracy_pct: int    # 0-100 (integer percent)
    total_interactions: int
    strengths: list[str]         # 2-3 bullet points
    areas_for_improvement: list[str]  # 2-3 bullet points
    recommended_topics: list[str]     # 2-3 SNC topic suggestions
    teacher_note: str            # 1-2 sentence plain-English summary for the teacher


_SYSTEM_PROMPT = """\
You are an AI educational analyst reviewing a Pakistani primary school student's \
English learning interactions with the PrimePal AI tutor (Grade {grade_level}).

INTERACTION SUMMARY:
- Total interactions: {total_interactions}
- Mission questions attempted: {mission_count}
- Mission correct answers: {correct_count}
- Chat messages sent: {chat_count}
- Context (SNC curriculum) was used in {context_used_count} chat responses.

RECENT CHAT MESSAGES (student's original words, may include Roman Urdu):
{chat_samples}

RULES:
1. engagement_level: "High" if total_interactions >= 10, "Medium" if 4-9, "Low" if < 4.
2. mission_accuracy_pct: integer 0-100 computed from correct_count/mission_count (0 if no missions).
3. strengths: 2-3 specific observations about what the student does well (e.g., asks questions, uses Roman Urdu correctly, answers MCQ well).
4. areas_for_improvement: 2-3 specific, actionable suggestions tied to their Grade {grade_level} SNC curriculum.
5. recommended_topics: 2-3 SNC topic names suitable for Grade {grade_level} that this student should practice next.
6. teacher_note: 1-2 sentence human-readable summary a teacher can read in under 10 seconds.
7. Be warm and constructive — these are primary school children (ages 6-12).
"""

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM_PROMPT),
    ("user", "Please generate the insight report for this student now."),
])


async def evaluate_interactions(
    student_id: str,
    grade_level: int,
    supabase_admin_client,
    limit: int = 30,
) -> StudentInsightReport:
    """
    Fetch the student's recent interactions, compute stats, and generate a
    structured NLP insight report using gpt-4o.

    Args:
        student_id:           UUID string of the student.
        grade_level:          The student's classroom grade level (for prompt context).
        supabase_admin_client: Supabase admin client for DB reads.
        limit:                How many recent interactions to analyse (default 30).

    Returns:
        A StudentInsightReport with engagement level, accuracy, strengths, etc.
    """
    # ------------------------------------------------------------------
    # Step 1: Fetch recent interactions
    # ------------------------------------------------------------------
    resp = (
        supabase_admin_client.table("student_interactions")
        .select("interaction_type, correct, context_used, original_message")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = resp.data or []

    # ------------------------------------------------------------------
    # Step 2: Compute basic stats locally
    # ------------------------------------------------------------------
    total_interactions = len(rows)
    mission_rows = [r for r in rows if r.get("interaction_type", "").startswith("mission_")]
    chat_rows = [r for r in rows if r["interaction_type"] == "chat"]

    mission_count = len(mission_rows)
    correct_count = sum(1 for r in mission_rows if r.get("correct") is True)
    chat_count = len(chat_rows)
    context_used_count = sum(1 for r in chat_rows if r.get("context_used") is True)

    # Sample up to 10 most recent chat messages for qualitative analysis
    chat_samples = "\n".join(
        f"- {r['original_message']}"
        for r in chat_rows[:10]
        if r.get("original_message")
    ) or "(no chat messages yet)"

    # ------------------------------------------------------------------
    # Step 3: LLM structured report
    # ------------------------------------------------------------------
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.3,
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,  # auto-retry on rate limit (429) errors
    ).with_structured_output(StudentInsightReport)

    chain = _PROMPT | llm
    result = await chain.ainvoke(
        {
            "grade_level": grade_level,
            "total_interactions": total_interactions,
            "mission_count": mission_count,
            "correct_count": correct_count,
            "chat_count": chat_count,
            "context_used_count": context_used_count,
            "chat_samples": chat_samples,
        }
    )
    return result
