"""
Feature 6: Mission Generator — generates daily gamified English questions (RAG-grounded).

Pipeline:
  1. Receive grade_level and pre-retrieved SNC context chunks from the endpoint.
  2. Build a structured-output LLM chain (ChatOpenAI.with_structured_output).
  3. Return a DailyMissions object with exactly 3 questions:
       - 2 multiple_choice
       - 1 fill_blank
  4. The endpoint strips correct_answer before sending to the client.

Feature 3: Pillar-based Missions (LLM-based generation with weakness focus)
  1. Receive pillar, grade_level, current_week_topic, and student weaknesses.
  2. Call OpenAI LLM with pillar-specific prompts.
  3. Return exactly 10 questions with weakness focus metadata.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Literal

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mission generation constraints
# ---------------------------------------------------------------------------
MAX_WEAKNESS_ITEMS = 5
PILLAR_QUESTIONS_COUNT = 10
MULTIPLE_CHOICE_OPTIONS = 4
DAILY_QUESTIONS_COUNT = 3


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

ACTIVE TOPICS: Generate questions STRICTLY based on these topics only: {active_topics}
Do NOT generate questions about any topic not in this list.

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

{confidence_builder_override}
"""

_SYSTEM_PROMPT_FALLBACK = """\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

No curriculum context is available right now. Generate exactly 3 basic English language \
questions suitable for Grade {grade_level} students.

ACTIVE TOPICS: Generate questions STRICTLY based on these topics only: {active_topics}
Do NOT generate questions about any topic not in this list.

RULES — follow every rule strictly:
1. FORMAT: Question 1 and Question 2 must be multiple_choice (4 options: a, b, c, d). \
   Question 3 must be fill_blank (correct_answer is the missing word, no options needed).
2. VOCABULARY: Use only simple, common Grade {grade_level} English vocabulary.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone.
5. EMOJI: Add a single relevant emoji as emoji_hint for each question.
6. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.

{confidence_builder_override}
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
# Public API - Daily Missions
# ---------------------------------------------------------------------------

async def generate_daily_missions(
    grade_level: int,
    context_chunks: list[str],
    active_topics: list[str],
    is_frustrated: bool = False,
) -> DailyMissions:
    """
    Generate 3 grade-appropriate English questions grounded in SNC context chunks.

    Supports Affective Filter management: if is_frustrated is True, the LLM is instructed
    to create a "Confidence Builder" question that boosts student morale.

    Args:
        grade_level:    The student's classroom grade (1-8). Used in the prompt as a
                        hard vocabulary guardrail.
        context_chunks: SNC passages retrieved via match_snc_documents RPC.
                        An empty list is handled gracefully via the fallback prompt.
        is_frustrated:  If True, override question generation to create a "Confidence Builder"
                        with reduced vocabulary complexity and obvious distractors. Default False.

    Returns:
        A DailyMissions object with exactly 3 MissionQuestion items.
        The caller (endpoint) is responsible for stripping correct_answer before
        sending the response to the client.
    """
    # Confidence Builder override for students experiencing cognitive load
    confidence_builder_override = ""
    if is_frustrated:
        confidence_builder_override = """\
CRITICAL OVERRIDE — STUDENT IS EXPERIENCING HIGH COGNITIVE LOAD:
The student is currently frustrated (3 consecutive incorrect answers or high time pressure).
The next set of questions MUST be "Confidence Builders" to recover their affective state.

CONFIDENCE BUILDER RULES:
- Reduce vocabulary complexity by 1-2 grade levels BELOW the student's current grade.
- Make the correct answer OBVIOUS (eliminate ambiguous distractors).
- Focus on concepts the student has demonstrated understanding of in past correct answers.
- Frame all questions with extra encouragement ("You're doing great!", "Nice work!", etc.).
- Use simpler sentence structures and shorter questions.
- Ensure at least 2 of the 3 questions are easy wins (>90% success probability).
"""

    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        temperature=0.7,          # slight creativity for varied questions each day
        openai_api_key=settings.OPENAI_API_KEY,
        max_retries=3,            # auto-retry on rate limit (429) errors
        timeout=10.0,             # 10 second timeout for LLM calls
    ).with_structured_output(DailyMissions)

    try:
        active_topics_str = ", ".join(active_topics) if active_topics else "General English"
        if context_chunks:
            context = "\n\n---\n\n".join(context_chunks)
            chain = _PROMPT_WITH_CONTEXT | llm
            result = await asyncio.wait_for(
                chain.ainvoke(
                    {
                        "grade_level": grade_level,
                        "context": context,
                        "active_topics": active_topics_str,
                        "confidence_builder_override": confidence_builder_override,
                    }
                ),
                timeout=12.0  # 12 second timeout for entire chain
            )
        else:
            chain = _PROMPT_FALLBACK | llm
            result = await asyncio.wait_for(
                chain.ainvoke({
                    "grade_level": grade_level,
                    "active_topics": active_topics_str,
                    "confidence_builder_override": confidence_builder_override,
                }),
                timeout=12.0
            )
        return result
    except asyncio.TimeoutError:
        logger.error(f"LLM generation timeout for grade_level={grade_level}")
        raise RuntimeError("Mission generation timed out. Please try again.")


# ---------------------------------------------------------------------------
# Public API - Pillar-based Missions (LLM-based with weakness focus)
# ---------------------------------------------------------------------------

async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    active_topics: list[str],
    student_id: str,
    student_weaknesses: list[str],
    is_frustrated: bool = False,
) -> list[dict]:
    """
    Generate 10 curriculum-aligned questions for a specific pillar using LLM.

    Weaves in student weakness remediation and creates a diverse mix of
    multiple_choice and fill_blank questions tailored to the pillar.

    Supports Affective Filter management: if is_frustrated is True, the LLM is instructed
    to create "Confidence Builder" questions with reduced complexity.

    Args:
        pillar:             One of: reading, writing, listening, speaking
        grade_level:        The student's classroom grade (1-8)
        active_topics:      List of active SNC topic names for this classroom (e.g., ["Animals", "Weather"])
        student_id:         UUID of the student
        student_weaknesses: List of recent incorrect answers or weak areas
        is_frustrated:      If True, override to generate "Confidence Builder" questions
                            with reduced vocabulary complexity and obvious distractors. Default False.

    Returns:
        A list of exactly 10 question dicts, each with:
          - id, type, question, options, correct_answer, emoji_hint, is_weakness_focused
        The caller (endpoint) is responsible for stripping correct_answer before
        sending the response to the client.

    Raises:
        ValueError:   If pillar is invalid or LLM returns wrong number of questions
        RuntimeError: If LLM response cannot be parsed or API fails
    """
    # Validate pillar
    valid_pillars = ["reading", "writing", "listening", "speaking"]
    if pillar not in valid_pillars:
        raise ValueError(f"Invalid pillar: {pillar}. Must be one of {valid_pillars}")

    # Define pillar-specific configurations
    pillar_configs = {
        "reading": {
            "emoji": "📖",
            "instruction": (
                "Create reading comprehension questions that test vocabulary understanding "
                "and text interpretation. Mix multiple_choice (questions 1-7) and fill_blank (questions 8-10)."
            ),
            "types_distribution": ["multiple_choice"] * 7 + ["fill_blank"] * 3,
        },
        "writing": {
            "emoji": "✍️",
            "instruction": (
                "Create writing exercises: fill-in-the-blank with correct grammar/spelling, "
                "sentence correction tasks, or composition prompts. Mix multiple_choice (questions 1-7) and fill_blank (questions 8-10)."
            ),
            "types_distribution": ["multiple_choice"] * 7 + ["fill_blank"] * 3,
        },
        "listening": {
            "emoji": "👂",
            "instruction": (
                "Create listening comprehension questions. Provide a passage or scenario that would be "
                "spoken aloud, then ask multiple_choice questions. All 10 should be multiple_choice format."
            ),
            "types_distribution": ["multiple_choice"] * 10,
        },
        "speaking": {
            "emoji": "🗣️",
            "instruction": (
                "Create speaking prompts that encourage oral response. Include a prompt phrase "
                "and a brief example answer. All 10 should be fill_blank (prompt-based) format."
            ),
            "types_distribution": ["fill_blank"] * 10,
        },
    }

    config = pillar_configs[pillar]

    # Build weakness context
    weakness_context = ""
    if student_weaknesses:
        # Limit to first MAX_WEAKNESS_ITEMS weaknesses
        limited_weaknesses = student_weaknesses[:MAX_WEAKNESS_ITEMS]
        weakness_context = (
            "\n\nSTUDENT'S RECENT WEAK AREAS (create 3-4 questions targeting these):\n"
            + "\n".join([f"- {w}" for w in limited_weaknesses])
        )

    # Build curriculum context
    topic_text = ", ".join(active_topics) if active_topics else "General English skills"

    # Confidence Builder override for students experiencing cognitive load
    confidence_builder_section = ""
    if is_frustrated:
        confidence_builder_section = f"""\

CRITICAL OVERRIDE — STUDENT IS EXPERIENCING HIGH COGNITIVE LOAD:
The student is currently frustrated (3 consecutive incorrect answers or high time pressure).
The next set of questions MUST be "Confidence Builders" to recover their affective state.

CONFIDENCE BUILDER RULES:
- Reduce vocabulary complexity by 1-2 grade levels BELOW the student's current grade (effective grade: {max(1, grade_level - 2)}).
- Make the correct answer OBVIOUS (eliminate ambiguous or tricky distractors).
- Focus on concepts and topics the student has demonstrated understanding of in past correct answers.
- Frame all questions with extra encouragement ("You're doing great!", "Nice work!", etc.).
- Use simpler sentence structures and shorter questions (max 10 words per question).
- Ensure at least 7 of the 10 questions are easy wins (>90% success probability).
- Ignore the weakness focus constraint — ALL 10 questions should be confidence builders this round."""

    # Construct the LLM system prompt
    system_prompt = f"""\
You are an expert ESL tutor for Pakistani primary school students (grades 1-8).
You specialize in the SNC (Single National Curriculum) and create engaging, age-appropriate questions.

STUDENT PROFILE:
- Grade level: {grade_level}
- Current curriculum topic: {topic_text}
- Pillar (skill focus): {pillar}

TASK:
{config["instruction"]}

STRICT CONSTRAINTS:
1. Generate EXACTLY {PILLAR_QUESTIONS_COUNT} questions (no more, no less)
2. Use age and SNC-appropriate vocabulary for grade {grade_level}
3. Mix difficulty levels: aim for 4 easy, 4 medium, 2 hard
4. Exactly 7 questions (70%) must be based on the current weekly topic.
   Exactly 3 questions (30%) must target the student's weakness areas listed above
   (mark those as is_weakness_focused: true). If no weaknesses are provided, all 10 questions target the current topic.
5. Keep language simple, clear, and encouraging
6. Avoid religious, political, or sensitive content
7. Use cultural context relevant to Pakistan
8. For multiple_choice questions: always provide exactly 4 options (a, b, c, d)
9. For fill_blank questions: correct_answer should be a single word or short phrase
10. Each question must have an emoji_hint that relates to the topic

{weakness_context}{confidence_builder_section}

RESPONSE FORMAT:
Return ONLY a valid JSON array with exactly 10 question objects. No explanation, no markdown.
Each question must have this exact structure:
{{
  "id": <number 1-10>,
  "type": "multiple_choice" | "fill_blank",
  "question": "<question text>",
  "options": [<only for multiple_choice> {{"id": "a", "text": "..."}}],
  "correct_answer": "<answer>",
  "emoji_hint": "<single emoji>",
  "is_weakness_focused": true|false
}}"""

    user_message = (
        f"Generate {pillar} questions for grade {grade_level} on topic '{topic_text}'. "
        f"Return ONLY the JSON array, no other text."
    )

    content = ""
    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, max_retries=3)
        response = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,
            top_p=0.9,
        )

        # Extract and parse JSON response
        content = response.choices[0].message.content.strip()
        logger.debug(f"LLM response (first 200 chars): {content[:200]}")

        # Try to extract JSON if it's wrapped in markdown code blocks
        if content.startswith("```json"):
            content = content[7:]  # remove ```json
        if content.startswith("```"):
            content = content[3:]  # remove ```
        if content.endswith("```"):
            content = content[:-3]  # remove trailing ```

        questions_data = json.loads(content)

        if not isinstance(questions_data, list):
            raise ValueError(
                f"LLM response is not a JSON array. Got type: {type(questions_data)}"
            )

        # Validate exactly PILLAR_QUESTIONS_COUNT questions
        if len(questions_data) != PILLAR_QUESTIONS_COUNT:
            raise ValueError(
                f"Expected exactly {PILLAR_QUESTIONS_COUNT} questions, got {len(questions_data)}"
            )

        # Validate and normalize each question
        validated_questions = []
        for i, q in enumerate(questions_data):
            if not isinstance(q, dict):
                raise ValueError(f"Question {i} is not a dict: {type(q)}")

            # Ensure all required fields are present
            validated_q = {
                "id": q.get("id", i + 1),
                "type": q.get("type", config["types_distribution"][i]),
                "question": q.get("question", ""),
                "correct_answer": str(q.get("correct_answer", "")),
                "emoji_hint": q.get("emoji_hint", config["emoji"]),
                "is_weakness_focused": bool(q.get("is_weakness_focused", False)),
            }

            # Validate required fields
            if not validated_q["question"]:
                raise ValueError(f"Question {i} has empty question text")
            if not validated_q["correct_answer"]:
                raise ValueError(f"Question {i} has empty correct_answer")

            # Add type-specific fields
            if validated_q["type"] == "multiple_choice":
                # Ensure options array with exactly 4 options
                options = q.get("options", [])
                if not isinstance(options, list):
                    raise ValueError(
                        f"Question {i} options is not a list: {type(options)}"
                    )
                if len(options) < MULTIPLE_CHOICE_OPTIONS:
                    # Pad with dummy options if needed
                    logger.warning(
                        f"Question {i} has only {len(options)} options, padding to {MULTIPLE_CHOICE_OPTIONS}"
                    )
                    while len(options) < MULTIPLE_CHOICE_OPTIONS:
                        options.append({"id": chr(97 + len(options)), "text": "Option"})
                elif len(options) > MULTIPLE_CHOICE_OPTIONS:
                    # Truncate to MULTIPLE_CHOICE_OPTIONS
                    logger.warning(
                        f"Question {i} has {len(options)} options, truncating to {MULTIPLE_CHOICE_OPTIONS}"
                    )
                    options = options[:MULTIPLE_CHOICE_OPTIONS]

                validated_q["options"] = [
                    {
                        "id": opt.get("id", chr(97 + j)) if isinstance(opt, dict) else chr(97 + j),
                        "text": opt.get("text", str(opt)) if isinstance(opt, dict) else str(opt),
                    }
                    for j, opt in enumerate(options[:MULTIPLE_CHOICE_OPTIONS])
                ]
            else:
                # fill_blank type doesn't have options
                validated_q["options"] = None

            validated_questions.append(validated_q)

        logger.info(
            f"Generated {len(validated_questions)} {pillar} questions for grade {grade_level}. "
            f"Weakness-focused: {sum(1 for q in validated_questions if q['is_weakness_focused'])}"
        )
        return validated_questions

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}. Response was: {content[:100]}")
        raise RuntimeError(f"Failed to parse LLM response as JSON: {e}. Response was: {content[:100]}")
    except ValueError as e:
        logger.error(f"Validation error in LLM response: {e}")
        raise RuntimeError(f"LLM response validation failed: {e}")
    except Exception as e:
        logger.error(f"Mission generation failed: {e}", exc_info=True)
        raise RuntimeError(f"Mission generation failed: {e}")
