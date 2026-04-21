"""
Feature 6: Mission Generator — generates daily gamified English questions (RAG-grounded).

Pipeline:
  1. Receive grade_level and pre-retrieved SNC context chunks from the endpoint.
  2. Build a structured-output LLM chain (ChatOpenAI.with_structured_output).
  3. Return a DailyMissions object with exactly 3 questions:
       - 2 multiple_choice
       - 1 fill_blank
  4. The endpoint strips correct_answer before sending to the client.
"""
from __future__ import annotations

from typing import Literal

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.core.config import settings


# ---------------------------------------------------------------------------
# Pydantic schemas — also serve as the structured-output target for the LLM
# ---------------------------------------------------------------------------

class QuestionOption(BaseModel):
    id: str   # "a", "b", "c", or "d"
    text: str


class MissionQuestion(BaseModel):
    id: int                              # 1, 2, or 3
    type: Literal["multiple_choice", "fill_blank"]
    question: str
    options: list[QuestionOption] | None  # only for multiple_choice; None for fill_blank
    correct_answer: str                  # letter "a"/"b"/"c"/"d" for MC; missing word for fill_blank
    emoji_hint: str                      # single emoji relevant to the question topic


class DailyMissions(BaseModel):
    topic: str                           # short topic label, e.g. "Animals" or "Action Verbs"
    questions: list[MissionQuestion]     # exactly 3


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT_WITH_CONTEXT = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

Generate exactly 3 interactive English language questions using ONLY the vocabulary \
in the SNC context provided below.

RULES — follow every rule strictly:
1. FORMAT: Question 1 and Question 2 must be multiple_choice (4 options: a, b, c, d). \
   Question 3 must be fill_blank (correct_answer is the missing word, no options needed).
2. VOCABULARY: Use only Grade {grade_level} vocabulary found in the context. Never \
   introduce words above this grade level.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone (e.g. "Can you find…?", \
   "Which word means…?").
5. GROUNDING: Every question must naturally reference words or concepts from the context below.
6. EMOJI: Add a single relevant emoji as emoji_hint for each question (e.g. "🐱" for a cat question).
7. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.

SNC CURRICULUM CONTEXT (Grade {grade_level}):
{context}
"""

_SYSTEM_PROMPT_FALLBACK = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

No curriculum context is available right now. Generate exactly 3 basic English language \
questions suitable for Grade {grade_level} students.

RULES — follow every rule strictly:
1. FORMAT: Question 1 and Question 2 must be multiple_choice (4 options: a, b, c, d). \
   Question 3 must be fill_blank (correct_answer is the missing word, no options needed).
2. VOCABULARY: Use only simple, common Grade {grade_level} English vocabulary \
   (colours, animals, numbers, family, daily objects).
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone.
5. EMOJI: Add a single relevant emoji as emoji_hint for each question.
6. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.
"""

_USER_TURN = "Generate the 3 daily mission questions now."

_PROMPT_WITH_CONTEXT = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM_PROMPT_WITH_CONTEXT),
        ("user", _USER_TURN),
    ]
)

_PROMPT_FALLBACK = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM_PROMPT_FALLBACK),
        ("user", _USER_TURN),
    ]
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_daily_missions(
    grade_level: int,
    context_chunks: list[str],
) -> DailyMissions:
    """
    Generate 3 grade-appropriate English questions grounded in SNC context chunks.

    Args:
        grade_level:    The student's classroom grade (1-8). Used in the prompt as a
                        hard vocabulary guardrail.
        context_chunks: SNC passages retrieved via match_snc_documents RPC.
                        An empty list is handled gracefully via the fallback prompt.

    Returns:
        A DailyMissions object with exactly 3 MissionQuestion items.
        The caller (endpoint) is responsible for stripping correct_answer before
        sending the response to the client.
    """
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.7,          # slight creativity for varied questions each day
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,            # auto-retry on rate limit (429) errors
    ).with_structured_output(DailyMissions)

    if context_chunks:
        context = "\n\n---\n\n".join(context_chunks)
        chain = _PROMPT_WITH_CONTEXT | llm
        result = await chain.ainvoke(
            {
                "grade_level": grade_level,
                "context": context,
            }
        )
    else:
        chain = _PROMPT_FALLBACK | llm
        result = await chain.ainvoke({"grade_level": grade_level})

    return result


# ---------------------------------------------------------------------------
# Feature 3: Pillar-based Missions (stub for Task 4 implementation)
# ---------------------------------------------------------------------------

async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    current_week_topic: str | None,
    student_id: str,
    student_weaknesses: list[str],
) -> list[MissionQuestion]:
    """
    STUB: Generate 10 questions for a specific pillar.

    This is a stub implementation for Task 3. Task 4 will implement the full
    LLM-based mission generation with pillar-specific prompts, weakness weighting,
    and current_week_topic integration.

    Args:
        pillar:             One of: reading, writing, listening, speaking
        grade_level:        The student's classroom grade (1-8)
        current_week_topic: Teacher-configured topic for this week (e.g., "Animals", "Weather")
        student_id:         UUID of the student
        student_weaknesses: List of recent incorrect answers or weak areas

    Returns:
        A list of exactly 10 MissionQuestion objects (dicts with is_weakness_focused flag).
        The caller (endpoint) is responsible for stripping correct_answer before
        sending the response to the client.
    """
    # STUB: Generate 10 mock questions
    # - First 3 questions are marked as weakness-focused
    # - All questions include the pillar and are grade-appropriate
    questions: list[dict] = []
    for i in range(10):
        is_weakness_focused = i < 3
        questions.append({
            "id": i + 1,
            "type": "multiple_choice" if i < 7 else "fill_blank",
            "question": f"Sample {pillar} question {i + 1} for grade {grade_level}"
                        + (f" (topic: {current_week_topic})" if current_week_topic else ""),
            "options": (
                [
                    QuestionOption(id="a", text="Option A"),
                    QuestionOption(id="b", text="Option B"),
                    QuestionOption(id="c", text="Option C"),
                    QuestionOption(id="d", text="Option D"),
                ]
                if i < 7
                else None
            ),
            "correct_answer": "a" if i < 7 else "answer",
            "emoji_hint": "📖" if pillar == "reading" else "✍️" if pillar == "writing" else "👂" if pillar == "listening" else "🗣️",
            "is_weakness_focused": is_weakness_focused,
        })

    return questions
