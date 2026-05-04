"""
Feature 6: Mission Generator — generates daily gamified English questions (RAG-grounded).

Pipeline:
  1. Receive grade_level and pre-retrieved SNC context chunks from the endpoint.
  2. Build a structured-output LLM chain (ChatOpenAI.with_structured_output).
  3. Return a DailyMissions object with exactly 3 questions using diverse task types
     (e.g. sentence_picture_match, fill_blank_word_bank, listen_and_choose).
  4. The endpoint strips correct_answer before sending to the client.

Feature 3: Pillar-based Missions (LLM-based generation with structured output)
  1. Receive pillar, grade_level, active_topics, and student weaknesses.
  2. Call OpenAI LLM with pillar-specific prompts and structured output.
  3. Return exactly 10 questions across 13 task types:
       Reading:   sentence_picture_match, odd_one_out, fill_blank_word_bank, passage_true_false
       Writing:   sentence_scramble, missing_letter, guided_translation
       Listening: listen_and_choose, simon_says, listen_and_spell
       Speaking:  repeat_after_me, what_is_this, finish_the_sentence
"""
from __future__ import annotations

import asyncio
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
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
    id: str   # "a", "b", "c", "d"
    text: str
    emoji: str | None = None  # for image_options in picture-match tasks


class MissionQuestion(BaseModel):
    id: int
    task_type: str                              # e.g. "sentence_picture_match", "odd_one_out", etc.
    pillar: str = ""                            # reading, writing, listening, speaking
    question: str
    difficulty: str = "medium"                  # easy, medium, hard
    points_value: int = 10                      # 5, 10, 15, or 20
    correct_answer: str
    emoji_hint: str = ""

    # Legacy compat — old questions used "type" instead of "task_type"
    type: str | None = None

    # Optional fields used by specific task types
    options: list[QuestionOption] | None = None
    passage: str | None = None
    audio_text: str | None = None
    image_context: str | None = None
    image_options: list[QuestionOption] | None = None
    word_bank: list[str] | None = None
    correct_order: list[str] | None = None
    word_with_blanks: str | None = None
    letter_options: list[str] | None = None
    sentence_start: str | None = None
    urdu_hint: str = ""                         # Urdu translation hint for bilingual scaffolding


class DailyMissions(BaseModel):
    topic: str
    questions: list[MissionQuestion]


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
1. FORMAT: Question 1 must be task_type "sentence_picture_match" or "odd_one_out" (reading task — set pillar to "reading", include image_options with 4 emoji items for sentence_picture_match, or options for odd_one_out). \
   Question 2 must be task_type "fill_blank_word_bank" or "missing_letter" (writing task — set pillar to "writing", include options for fill_blank_word_bank, or word_with_blanks and letter_options for missing_letter). \
   Question 3 must be task_type "listen_and_choose" or "simon_says" (listening task — set pillar to "listening", include audio_text and image_options for listen_and_choose, or audio_text and options for simon_says). \
   Every question needs: id, task_type, pillar, question, difficulty, points_value, correct_answer, emoji_hint.
2. VOCABULARY: Use only Grade {grade_level} vocabulary found in the context. Never \
   introduce words above this grade level.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone (e.g. "Can you find…?", \
   "Which word means…?").
5. GROUNDING: Every question must naturally reference words or concepts from the context below.
6. EMOJI: Add a single relevant emoji as emoji_hint for each question (e.g. "🐱" for a cat question).
7. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.
8. URDU_HINT: Add an `urdu_hint` field with the Urdu translation of the key vocabulary in each question. Use simple Urdu appropriate for Grade {grade_level}. Example: for "The cat is on the table", urdu_hint could be "بلی میز پر ہے".

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
1. FORMAT: Question 1 must be task_type "sentence_picture_match" or "odd_one_out" (reading task — set pillar to "reading", include image_options with 4 emoji items for sentence_picture_match, or options for odd_one_out). \
   Question 2 must be task_type "fill_blank_word_bank" or "missing_letter" (writing task — set pillar to "writing", include options for fill_blank_word_bank, or word_with_blanks and letter_options for missing_letter). \
   Question 3 must be task_type "listen_and_choose" or "simon_says" (listening task — set pillar to "listening", include audio_text and image_options for listen_and_choose, or audio_text and options for simon_says). \
   Every question needs: id, task_type, pillar, question, difficulty, points_value, correct_answer, emoji_hint.
2. VOCABULARY: Use only simple, common Grade {grade_level} English vocabulary.
3. SIMPLICITY: Keep questions short and easy to read. These are young children (ages 6-12).
4. ENCOURAGEMENT: Frame questions in a positive, game-like tone.
5. EMOJI: Add a single relevant emoji as emoji_hint for each question.
6. TOPIC: Set the topic field to a short 1-3 word label that describes all 3 questions.
7. URDU_HINT: Add an `urdu_hint` field with the Urdu translation of the key vocabulary in each question. Use simple Urdu appropriate for Grade {grade_level}. Example: for "The cat is on the table", urdu_hint could be "بلی میز پر ہے".

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
# Pydantic schema for pillar missions (structured output target)
# ---------------------------------------------------------------------------

class PillarMissions(BaseModel):
    questions: list[MissionQuestion]


# ---------------------------------------------------------------------------
# Pillar task type configurations
# ---------------------------------------------------------------------------

PILLAR_TASK_CONFIGS = {
    "reading": {
        "task_types": [
            ("sentence_picture_match", 3),
            ("odd_one_out", 3),
            ("fill_blank_word_bank", 2),
            ("passage_true_false", 2),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- sentence_picture_match: Set question (the sentence), image_options (4 items with id, text, emoji), correct_answer (id of correct option). Example image_options: [{{"id":"a","text":"cat","emoji":"🐱"}},{{"id":"b","text":"dog","emoji":"🐶"}},{{"id":"c","text":"car","emoji":"🚗"}},{{"id":"d","text":"book","emoji":"📖"}}]
- odd_one_out: Set question ("Which word does NOT belong?"), options (4 items with id and text), correct_answer (id of the outlier).
- fill_blank_word_bank: Set question (sentence with ___ for blank), options (4 word choices with id and text), correct_answer (id of correct word).
- passage_true_false: Set passage (3-5 sentences), question (a statement about the passage), correct_answer ("true" or "false").""",
    },
    "writing": {
        "task_types": [
            ("sentence_scramble", 4),
            ("missing_letter", 3),
            ("guided_translation", 3),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- sentence_scramble: Set question ("Put the words in the correct order"), word_bank (list of scrambled words), correct_order (list of words in correct order), correct_answer (the full correct sentence as string).
- missing_letter: Set question ("Fill in the missing letter(s)"), word_with_blanks (e.g. "c_t"), letter_options (6-8 single letters including correct ones), correct_answer (the complete word, e.g. "cat").
- guided_translation: Set question (an Urdu sentence to translate), word_bank (English words to choose from, scrambled), correct_order (English words in correct order), correct_answer (the full English sentence as string).""",
    },
    "listening": {
        "task_types": [
            ("listen_and_choose", 4),
            ("simon_says", 3),
            ("listen_and_spell", 3),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- listen_and_choose: Set audio_text (sentence to be spoken aloud), image_options (4 items with id, text, emoji), correct_answer (id of correct option).
- simon_says: Set audio_text (an instruction like "Touch your nose" or "Clap your hands"), options (4 action choices with id and text), correct_answer (id of correct action).
- listen_and_spell: Set audio_text (a single word to be spoken aloud), correct_answer (the correct spelling of the word).""",
    },
    "speaking": {
        "task_types": [
            ("repeat_after_me", 4),
            ("what_is_this", 3),
            ("finish_the_sentence", 3),
        ],
        "field_instructions": """
TASK TYPE FIELD REQUIREMENTS:
- repeat_after_me: Set audio_text (sentence for TTS to read), correct_answer (the same sentence — student must repeat it).
- what_is_this: Set question ("What is this?"), image_context (a single emoji representing the object, e.g. "🐱"), correct_answer (the word, e.g. "cat").
- finish_the_sentence: Set question ("Finish this sentence:"), sentence_start (partial sentence like "The cat is..."), correct_answer (expected completion like "sleeping").""",
    },
}

DIFFICULTY_DISTRIBUTION = {
    "easy": 3,
    "medium": 4,
    "hard": 3,
}

POINTS_BY_DIFFICULTY = {
    "easy": 5,
    "medium": 10,
    "hard": 20,
}


# ---------------------------------------------------------------------------
# Public API - Pillar-based Missions (LLM-based with structured output)
# ---------------------------------------------------------------------------

async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    active_topics: list[str],
    student_id: str,
    student_weaknesses: list[str],
    is_frustrated: bool = False,
    performance_profile: dict | None = None,
) -> list[dict]:
    valid_pillars = ["reading", "writing", "listening", "speaking"]
    if pillar not in valid_pillars:
        raise ValueError(f"Invalid pillar: {pillar}. Must be one of {valid_pillars}")

    config = PILLAR_TASK_CONFIGS[pillar]
    topic_text = ", ".join(active_topics) if active_topics else "General English skills"

    # Build task distribution string
    task_distribution_lines = []
    for task_type, count in config["task_types"]:
        task_distribution_lines.append(f"  - {count} questions of type '{task_type}'")
    task_distribution_str = "\n".join(task_distribution_lines)

    # Build weakness context
    weakness_context = ""
    if student_weaknesses and not is_frustrated:
        limited = student_weaknesses[:MAX_WEAKNESS_ITEMS]
        weakness_context = (
            "\n\nSTUDENT'S RECENT WEAK AREAS (create 3-4 questions targeting these):\n"
            + "\n".join([f"- {w}" for w in limited])
        )

    # Build adaptive difficulty section from performance profile
    adaptive_section = ""
    # ALL questions worth 10 points each for consistent scoring
    difficulty_dist_str = """  - 10 questions with difficulty "medium" (points_value: 10)"""

    if performance_profile and not is_frustrated:
        overall_acc = performance_profile.get("overall_accuracy", 0)
        pillar_accuracy = performance_profile.get("pillar_accuracy", {})
        weak_topics = performance_profile.get("weak_topics", [])
        strong_topics = performance_profile.get("strong_topics", [])
        diff_rec = performance_profile.get("difficulty_recommendation", "medium")

        pillar_acc_lines = "\n".join(
            f"- {p} accuracy: {acc}%" for p, acc in pillar_accuracy.items()
        )
        weak_lines = "\n".join(
            f"- {t['topic']} (accuracy: {t['accuracy']}%, suggested: {t['suggested_difficulty']})"
            for t in weak_topics
        ) if weak_topics else "None identified"
        strong_lines = "\n".join(
            f"- {t['topic']} (accuracy: {t['accuracy']}%)"
            for t in strong_topics
        ) if strong_topics else "None identified"

        adaptive_section = f"""

STUDENT PERFORMANCE PROFILE (adapt difficulty accordingly):
- Overall accuracy: {overall_acc}%
{pillar_acc_lines}
- Weak areas (bias toward easier questions): {weak_lines}
- Strong areas (increase difficulty): {strong_lines}

ADAPTIVE DIFFICULTY RULES:
- ALL questions must have points_value: 10 (consistent scoring)
- For weak topics (accuracy < 40%): use simpler vocabulary and sentence structure, include urdu_hint
- For medium topics (accuracy 40-70%): use grade-appropriate complexity
- For strong topics (accuracy > 70%): use more challenging vocabulary and complex structures
- For mastered topics (accuracy > 90%, 5+ attempts): minimal repetition, introduce new related concepts
- Mix: ~40% weak topic reinforcement, ~40% current topics, ~20% strong topics at higher complexity"""

        # Keep all questions at 10 points - adaptive difficulty no longer changes point values
        # (Difficulty can still vary in question complexity, but all worth 10 points)

    confidence_override = ""
    if is_frustrated:
        confidence_override = f"""
CRITICAL OVERRIDE — CONFIDENCE BUILDER MODE:
- Reduce vocabulary complexity by 1-2 grade levels below grade {grade_level}.
- Make correct answers obvious. Use simple sentences.
- Frame with encouragement ("Great job!", "You can do it!").
- All questions still worth points_value: 10, but use simpler content."""

    system_prompt = f"""\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

Generate EXACTLY 10 questions for the {pillar} pillar using ONLY vocabulary appropriate for Grade {grade_level}.

ACTIVE TOPICS: {topic_text}

TASK TYPE DISTRIBUTION (you MUST follow this exactly):
{task_distribution_str}

DIFFICULTY DISTRIBUTION across all 10 questions:
{difficulty_dist_str}

{config["field_instructions"]}

EVERY question MUST have these fields:
- id (1-10), task_type, pillar ("{pillar}"), question, difficulty, points_value, correct_answer, emoji_hint, urdu_hint

RULES:
1. Use age-appropriate vocabulary for Grade {grade_level} Pakistani students.
2. Keep questions short, clear, and encouraging.
3. Avoid religious, political, or sensitive content.
4. Use Pakistani cultural context where relevant.
5. For multiple choice fields (options, image_options): always provide exactly 4 items with ids "a","b","c","d".
6. correct_answer for option-based questions must be one of "a","b","c","d".
7. URDU_HINT: Add an urdu_hint field with the Urdu translation of the key vocabulary or sentence. Use simple Urdu appropriate for Grade {grade_level}. For example: "The cat is sleeping" → "بلی سو رہی ہے".
{weakness_context}{confidence_override}{adaptive_section}"""

    user_message = f"Generate 10 {pillar} questions for Grade {grade_level} on topics: {topic_text}."

    try:
        llm = ChatOpenAI(
            model=settings.CHAT_MODEL,
            temperature=0.7,
            openai_api_key=settings.OPENAI_API_KEY,
            max_retries=2,
            timeout=10.0,  # Reduced from 15s - gpt-4o-mini is fast
        ).with_structured_output(PillarMissions)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_message),
        ])

        chain = prompt | llm

        # Single attempt with 12s timeout - fail fast if LLM has issues
        result: PillarMissions | None = await asyncio.wait_for(
            chain.ainvoke({}),
            timeout=12.0,  # Reduced from 60s - consistent with daily missions
        )

        if result is None or not result.questions:
            raise ValueError("LLM returned empty result")

        # If LLM returned fewer than 10 questions, pad with simpler questions rather than retry
        if len(result.questions) < PILLAR_QUESTIONS_COUNT:
            logger.warning(
                f"LLM generated {len(result.questions)} questions (expected {PILLAR_QUESTIONS_COUNT}), "
                f"using available questions"
            )
            # Use what we got rather than waiting another 60s for retry
            if len(result.questions) == 0:
                raise ValueError("LLM returned no questions")

        # Normalize and validate - use whatever questions we got (prefer partial success over total failure)
        validated = []
        questions_to_use = result.questions[:PILLAR_QUESTIONS_COUNT] if len(result.questions) >= PILLAR_QUESTIONS_COUNT else result.questions

        for i, q in enumerate(questions_to_use):
            d = q.model_dump()
            d["id"] = i + 1
            d["pillar"] = pillar
            if not d.get("task_type"):
                d["task_type"] = "multiple_choice"
            if not d.get("difficulty"):
                d["difficulty"] = "medium"
            # Always set to 10 points - consistent scoring across all questions
            d["points_value"] = 10
            d["is_weakness_focused"] = False
            validated.append(d)

        logger.info(f"Generated {len(validated)} {pillar} questions for grade {grade_level}")

        # Log warning if we didn't get full set, but still return what we have
        if len(validated) < PILLAR_QUESTIONS_COUNT:
            logger.warning(f"Returning {len(validated)}/{PILLAR_QUESTIONS_COUNT} questions - better than failing completely")

        return validated

    except asyncio.TimeoutError:
        logger.error(f"Pillar mission generation timeout (12s) for {pillar} grade {grade_level}")
        raise RuntimeError("Mission generation timed out after 12 seconds. Please try again.")
    except Exception as e:
        logger.error(f"Pillar mission generation failed: {e}", exc_info=True)
        raise RuntimeError(f"Mission generation failed: {e}")
