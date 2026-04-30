# S02 — Expanded Mission Task Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PrimePal's 2 mission question types (multiple_choice, fill_blank) with 13 distinct interaction patterns across LSRW pillars, making missions engaging and pedagogically varied.

**Architecture:** Backend Pydantic schema expanded with optional fields per task type. Mission generator LLM prompts rewritten with task-type-specific instructions. Frontend gains a TaskRouter component that delegates to 13 specialized task components organized by pillar. Shared primitives (AudioPlayButton, EmojiCard, WordChip, LetterGrid, MissionRecorder) power the task UIs.

**Tech Stack:** FastAPI + Pydantic (backend schema), ChatOpenAI with structured output (LLM), Next.js 14 + React 18 (frontend), @dnd-kit/core + @dnd-kit/sortable (drag-and-drop), Browser SpeechSynthesis API (TTS), MediaRecorder + OpenAI Whisper (speaking tasks), Framer Motion (animations), Tailwind CSS (styling).

**Spec:** `docs/superpowers/specs/2026-04-30-S02-mission-task-variety-design.md`

---

## File Map

### New Files — Backend
| File | Responsibility |
|------|---------------|
| (none — all changes are modifications to existing files) | |

### New Files — Frontend
| File | Responsibility |
|------|---------------|
| `frontend/types/missions.ts` | TypeScript types for all task data + timer constants |
| `frontend/components/student/tasks/TaskRouter.tsx` | Switch on task_type, render correct component |
| `frontend/components/student/tasks/shared/AudioPlayButton.tsx` | SpeechSynthesis TTS wrapper |
| `frontend/components/student/tasks/shared/EmojiCard.tsx` | Tappable emoji card for image grids |
| `frontend/components/student/tasks/shared/WordChip.tsx` | Draggable/tappable word token |
| `frontend/components/student/tasks/shared/LetterGrid.tsx` | Tappable letter option grid |
| `frontend/components/student/tasks/shared/MissionRecorder.tsx` | Audio record + Whisper submit |
| `frontend/components/student/tasks/reading/SentencePictureMatch.tsx` | Sentence + emoji grid |
| `frontend/components/student/tasks/reading/OddOneOut.tsx` | 4 word cards, tap outlier |
| `frontend/components/student/tasks/reading/FillBlankWordBank.tsx` | Sentence gap + word options |
| `frontend/components/student/tasks/reading/PassageTrueFalse.tsx` | Passage + True/False buttons |
| `frontend/components/student/tasks/writing/SentenceScramble.tsx` | Draggable word reordering |
| `frontend/components/student/tasks/writing/MissingLetter.tsx` | Word blanks + letter grid |
| `frontend/components/student/tasks/writing/GuidedTranslation.tsx` | Urdu→English word bank construction |
| `frontend/components/student/tasks/listening/ListenAndChoose.tsx` | TTS + emoji grid |
| `frontend/components/student/tasks/listening/SimonSays.tsx` | TTS + action buttons |
| `frontend/components/student/tasks/listening/ListenAndSpell.tsx` | TTS + text input |
| `frontend/components/student/tasks/speaking/RepeatAfterMe.tsx` | TTS + record |
| `frontend/components/student/tasks/speaking/WhatIsThis.tsx` | Emoji + record |
| `frontend/components/student/tasks/speaking/FinishTheSentence.tsx` | Partial sentence + record |

### Modified Files
| File | Changes |
|------|---------|
| `backend/app/agents/tutor_agent/mission_generator.py` | New expanded schema, new pillar prompt configs with task_type distributions |
| `backend/app/api/v1/endpoints/missions.py` | Updated response schemas, `_strip_answer` handles new fields, new `/submit-speaking` endpoint, updated `CompleteRequest` |
| `backend/app/agents/evaluator_agent/interaction_logger.py` | Accept new `interaction_type` values (no code change needed, already accepts any string) |
| `frontend/components/student/MissionGameplay.tsx` | Delegate to TaskRouter, pass timer seconds by task_type, update Question interface |
| `frontend/app/student/missions/[pillar]/page.tsx` | Updated Question interface import, pass pillar to MissionGameplay |
| `frontend/package.json` | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| `backend/tests/test_missions.py` | Update MOCK_MISSIONS to use new schema, add tests for new task types |

---

## Task 1: Backend Schema Expansion

**Files:**
- Modify: `backend/app/agents/tutor_agent/mission_generator.py:46-64`
- Test: `backend/tests/test_missions.py`

- [ ] **Step 1: Update the Pydantic schemas in mission_generator.py**

Replace the existing `QuestionOption`, `MissionQuestion`, and `DailyMissions` classes (lines 46-64) with:

```python
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


class DailyMissions(BaseModel):
    topic: str
    questions: list[MissionQuestion]
```

- [ ] **Step 2: Update MOCK_MISSIONS in test file to use new schema**

In `backend/tests/test_missions.py`, update the `MOCK_MISSIONS` constant to use `task_type` instead of `type`:

```python
MOCK_MISSIONS = DailyMissions(
    topic="Animals",
    questions=[
        MissionQuestion(
            id=1,
            task_type="multiple_choice",
            pillar="reading",
            question="Which is an animal?",
            difficulty="easy",
            points_value=5,
            options=[
                QuestionOption(id="a", text="Cat"),
                QuestionOption(id="b", text="Book"),
                QuestionOption(id="c", text="Chair"),
                QuestionOption(id="d", text="Door"),
            ],
            correct_answer="a",
            emoji_hint="🐱",
        ),
        MissionQuestion(
            id=2,
            task_type="multiple_choice",
            pillar="reading",
            question="What does 'big' mean?",
            difficulty="medium",
            points_value=10,
            options=[
                QuestionOption(id="a", text="Small"),
                QuestionOption(id="b", text="Large"),
                QuestionOption(id="c", text="Fast"),
                QuestionOption(id="d", text="Slow"),
            ],
            correct_answer="b",
            emoji_hint="🐘",
        ),
        MissionQuestion(
            id=3,
            task_type="fill_blank",
            pillar="writing",
            question="The ___ is sleeping.",
            difficulty="easy",
            points_value=5,
            options=None,
            correct_answer="cat",
            emoji_hint="😴",
        ),
    ],
)
```

- [ ] **Step 3: Run existing tests to verify backward compatibility**

Run: `cd backend && python -m pytest tests/test_missions.py -v`

Expected: All existing tests pass. The new schema fields have defaults, so existing code that creates `MissionQuestion` with `type=` will still work via the `type` field.

- [ ] **Step 4: Commit**

```bash
git add backend/app/agents/tutor_agent/mission_generator.py backend/tests/test_missions.py
git commit -m "feat(backend): expand MissionQuestion schema with task_type and optional fields for 13 task types"
```

---

## Task 2: Backend Response Schema and Strip Logic

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py:51-118`

- [ ] **Step 1: Update response schemas in missions.py**

Replace `QuestionOptionOut`, `MissionQuestionOut`, `CompleteRequest` (lines 55-78):

```python
class QuestionOptionOut(BaseModel):
    id: str
    text: str
    emoji: str | None = None


class MissionQuestionOut(BaseModel):
    id: int
    task_type: str
    pillar: str
    question: str
    difficulty: str
    points_value: int
    emoji_hint: str
    options: list[QuestionOptionOut] | None = None
    passage: str | None = None
    audio_text: str | None = None
    image_context: str | None = None
    image_options: list[QuestionOptionOut] | None = None
    word_bank: list[str] | None = None
    word_with_blanks: str | None = None
    letter_options: list[str] | None = None
    sentence_start: str | None = None
    # correct_answer, correct_order deliberately ABSENT


class CompleteRequest(BaseModel):
    question_correct: bool
    question_type: str = "multiple_choice"
    task_type: str | None = None
    pillar: str | None = None
    answer_data: dict | None = None
```

- [ ] **Step 2: Update the `_strip_answer` helper to handle new fields**

Replace the `_strip_answer` function:

```python
def _strip_answer(q) -> MissionQuestionOut:
    """Strip correct_answer and correct_order before sending to client."""
    if isinstance(q, dict):
        return MissionQuestionOut(
            id=q.get("id", 0),
            task_type=q.get("task_type", q.get("type", "multiple_choice")),
            pillar=q.get("pillar", ""),
            question=q.get("question", ""),
            difficulty=q.get("difficulty", "medium"),
            points_value=q.get("points_value", 10),
            emoji_hint=q.get("emoji_hint", ""),
            options=[QuestionOptionOut(**o) for o in q["options"]] if q.get("options") else None,
            passage=q.get("passage"),
            audio_text=q.get("audio_text"),
            image_context=q.get("image_context"),
            image_options=[QuestionOptionOut(**o) for o in q["image_options"]] if q.get("image_options") else None,
            word_bank=q.get("word_bank"),
            word_with_blanks=q.get("word_with_blanks"),
            letter_options=q.get("letter_options"),
            sentence_start=q.get("sentence_start"),
        )
    return MissionQuestionOut(
        id=q.id,
        task_type=q.task_type if hasattr(q, 'task_type') else getattr(q, 'type', 'multiple_choice'),
        pillar=getattr(q, 'pillar', ''),
        question=q.question,
        difficulty=getattr(q, 'difficulty', 'medium'),
        points_value=getattr(q, 'points_value', 10),
        emoji_hint=q.emoji_hint,
        options=[QuestionOptionOut(id=o.id, text=o.text, emoji=getattr(o, 'emoji', None)) for o in q.options] if q.options else None,
        passage=getattr(q, 'passage', None),
        audio_text=getattr(q, 'audio_text', None),
        image_context=getattr(q, 'image_context', None),
        image_options=[QuestionOptionOut(id=o.id, text=o.text, emoji=getattr(o, 'emoji', None)) for o in q.image_options] if getattr(q, 'image_options', None) else None,
        word_bank=getattr(q, 'word_bank', None),
        word_with_blanks=getattr(q, 'word_with_blanks', None),
        letter_options=getattr(q, 'letter_options', None),
        sentence_start=getattr(q, 'sentence_start', None),
    )
```

- [ ] **Step 3: Update the interaction logging in `complete_mission` to use task_type**

In the `complete_mission` endpoint, update the `log_interaction` call to use `task_type`:

```python
    interaction_type_str = f"mission_{body.task_type}" if body.task_type else (
        "mission_fill" if body.question_type == "fill_blank" else "mission_mc"
    )

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type=interaction_type_str,
        original_message=None,
        translated_message=None,
        correct=body.question_correct,
        context_used=False,
        pillar=body.pillar,
    )
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/test_missions.py -v`

Expected: All tests pass. The response now includes `task_type`, `pillar`, `difficulty`, `points_value` fields.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "feat(backend): update mission response schemas and strip logic for expanded task types"
```

---

## Task 3: Backend — Pillar Mission Generator Prompts

**Files:**
- Modify: `backend/app/agents/tutor_agent/mission_generator.py:225-491`

- [ ] **Step 1: Rewrite the `generate_pillar_missions` function**

Replace the entire `generate_pillar_missions` function with a version that:
1. Uses structured output via `ChatOpenAI.with_structured_output` instead of raw JSON parsing
2. Has pillar-specific task type distributions
3. Includes field requirements per task type in the prompt

```python
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
- sentence_picture_match: Set question (the sentence), image_options (4 items with id, text, emoji), correct_answer (id of correct option). Example image_options: [{"id":"a","text":"cat","emoji":"🐱"},{"id":"b","text":"dog","emoji":"🐶"},{"id":"c","text":"car","emoji":"🚗"},{"id":"d","text":"book","emoji":"📖"}]
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


async def generate_pillar_missions(
    pillar: str,
    grade_level: int,
    active_topics: list[str],
    student_id: str,
    student_weaknesses: list[str],
    is_frustrated: bool = False,
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

    confidence_override = ""
    if is_frustrated:
        confidence_override = f"""
CRITICAL OVERRIDE — CONFIDENCE BUILDER MODE:
- Reduce vocabulary complexity by 1-2 grade levels below grade {grade_level}.
- Make correct answers obvious. Use simple sentences.
- Frame with encouragement ("Great job!", "You can do it!").
- Ensure 7/10 questions are easy (difficulty: "easy", points_value: 5)."""

    system_prompt = f"""\
You are an ESL mission designer for Pakistani primary school Grade {grade_level} students.

Generate EXACTLY 10 questions for the {pillar} pillar using ONLY vocabulary appropriate for Grade {grade_level}.

ACTIVE TOPICS: {topic_text}

TASK TYPE DISTRIBUTION (you MUST follow this exactly):
{task_distribution_str}

DIFFICULTY DISTRIBUTION across all 10 questions:
  - 3 questions with difficulty "easy" (points_value: 5)
  - 4 questions with difficulty "medium" (points_value: 10)
  - 3 questions with difficulty "hard" (points_value: 20)

Total points across all 10 questions MUST equal 100.

{config["field_instructions"]}

EVERY question MUST have these fields:
- id (1-10), task_type, pillar ("{pillar}"), question, difficulty, points_value, correct_answer, emoji_hint

RULES:
1. Use age-appropriate vocabulary for Grade {grade_level} Pakistani students.
2. Keep questions short, clear, and encouraging.
3. Avoid religious, political, or sensitive content.
4. Use Pakistani cultural context where relevant.
5. For multiple choice fields (options, image_options): always provide exactly 4 items with ids "a","b","c","d".
6. correct_answer for option-based questions must be one of "a","b","c","d".
{weakness_context}{confidence_override}"""

    user_message = f"Generate 10 {pillar} questions for Grade {grade_level} on topics: {topic_text}."

    try:
        llm = ChatOpenAI(
            model=settings.CHAT_MODEL,
            temperature=0.7,
            openai_api_key=settings.OPENAI_API_KEY,
            max_retries=3,
            timeout=15.0,
        ).with_structured_output(PillarMissions)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_message),
        ])

        chain = prompt | llm
        result: PillarMissions = await asyncio.wait_for(
            chain.ainvoke({}),
            timeout=20.0,
        )

        if result is None or not result.questions:
            raise ValueError("LLM returned empty result")

        # Normalize and validate
        validated = []
        for i, q in enumerate(result.questions[:PILLAR_QUESTIONS_COUNT]):
            d = q.model_dump()
            d["id"] = i + 1
            d["pillar"] = pillar
            if not d.get("task_type"):
                d["task_type"] = "multiple_choice"
            if not d.get("difficulty"):
                d["difficulty"] = "medium"
            if not d.get("points_value"):
                d["points_value"] = POINTS_BY_DIFFICULTY.get(d["difficulty"], 10)
            d["is_weakness_focused"] = False
            validated.append(d)

        logger.info(f"Generated {len(validated)} {pillar} questions for grade {grade_level}")
        return validated

    except asyncio.TimeoutError:
        logger.error(f"Pillar mission generation timeout for {pillar} grade {grade_level}")
        raise RuntimeError("Mission generation timed out. Please try again.")
    except Exception as e:
        logger.error(f"Pillar mission generation failed: {e}", exc_info=True)
        raise RuntimeError(f"Mission generation failed: {e}")
```

- [ ] **Step 2: Update the daily missions prompt to use varied task types**

Update the `_SYSTEM_PROMPT_WITH_CONTEXT` and `_SYSTEM_PROMPT_FALLBACK` strings. Change the FORMAT rule from "Question 1 and 2 must be multiple_choice, Question 3 must be fill_blank" to:

```
1. FORMAT: Question 1 must be task_type "sentence_picture_match" or "odd_one_out" (reading task — include image_options with 4 emoji items for sentence_picture_match, or options for odd_one_out).
   Question 2 must be task_type "fill_blank_word_bank" or "missing_letter" (writing task — include options for fill_blank_word_bank, or word_with_blanks and letter_options for missing_letter).
   Question 3 must be task_type "listen_and_choose" or "simon_says" (listening task — include audio_text and image_options for listen_and_choose, or audio_text and options for simon_says).
   Every question needs: id, task_type, pillar, question, difficulty, points_value, correct_answer, emoji_hint.
```

Also update the `DailyMissions` structured output — add `pillar` field instructions.

- [ ] **Step 3: Run tests**

Run: `cd backend && python -m pytest tests/test_missions.py -v`

Expected: Tests pass. The generate functions now produce the new schema.

- [ ] **Step 4: Commit**

```bash
git add backend/app/agents/tutor_agent/mission_generator.py
git commit -m "feat(backend): rewrite pillar mission generator with 13 task types and structured output"
```

---

## Task 4: Backend — Speaking Submission Endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/missions.py`

- [ ] **Step 1: Add the `/submit-speaking` endpoint**

Add this at the end of `missions.py`, before the leaderboard endpoint:

```python
from fastapi import UploadFile, File, Form
from app.utils.pronunciation import compare_phrases, calculate_pronunciation_score


class SpeakingSubmissionResponse(BaseModel):
    is_correct: bool
    similarity_score: float
    transcription: str
    points_awarded: int
    new_total: int


@router.post("/submit-speaking", response_model=SpeakingSubmissionResponse, summary="Submit speaking answer for mission")
async def submit_speaking_answer(
    audio_file: UploadFile = File(...),
    expected_text: str = Form(...),
    pillar: str = Form(default="speaking"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    student: dict = Depends(get_current_student),
):
    """
    Evaluate a speaking task answer within a mission.
    Accepts audio file, transcribes via Whisper, compares to expected text.
    """
    from openai import AsyncOpenAI

    student_id: str = student["sub"]
    classroom_id: str = student["classroom_id"]
    supabase = get_supabase_admin()

    # Read audio
    audio_bytes = await audio_file.read()
    if len(audio_bytes) < 100:
        return SpeakingSubmissionResponse(
            is_correct=False, similarity_score=0.0, transcription="",
            points_awarded=0, new_total=0,
        )

    # Transcribe via Whisper
    from io import BytesIO
    openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    audio_buffer = BytesIO(audio_bytes)
    audio_buffer.name = "recording.webm"

    try:
        whisper_response = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_buffer,
            language="en",
        )
        transcription = whisper_response.text.strip()
    except Exception as exc:
        logger.error(f"Whisper transcription failed: {exc}")
        transcription = ""

    # Compare
    from difflib import SequenceMatcher
    expected_lower = expected_text.lower().strip()
    transcription_lower = transcription.lower().strip()
    similarity = SequenceMatcher(None, expected_lower, transcription_lower).ratio()

    is_correct = similarity >= 0.6
    points_awarded = _POINTS_PER_CORRECT if is_correct else 0

    # Fetch and update points
    student_resp = (
        supabase.table("students")
        .select("points, missions_completed")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )
    current_points = (student_resp.data.get("points") or 0) if student_resp.data else 0
    new_total = current_points + points_awarded

    if points_awarded > 0 and student_resp.data:
        current_missions = student_resp.data.get("missions_completed") or 0
        supabase.table("students").update(
            {"points": new_total, "missions_completed": current_missions + 1}
        ).eq("id", student_id).execute()

    # Resolve grade level for logging
    classroom_resp = (
        supabase.table("classrooms")
        .select("grade_level")
        .eq("id", classroom_id)
        .maybe_single()
        .execute()
    )
    grade_level = classroom_resp.data["grade_level"] if classroom_resp.data else 0

    background_tasks.add_task(
        log_interaction,
        student_id=student_id,
        classroom_id=classroom_id,
        grade_level=grade_level,
        interaction_type=f"mission_speaking",
        original_message=transcription,
        translated_message=expected_text,
        correct=is_correct,
        context_used=False,
        pillar="speaking",
    )

    return SpeakingSubmissionResponse(
        is_correct=is_correct,
        similarity_score=round(similarity, 2),
        transcription=transcription,
        points_awarded=points_awarded,
        new_total=new_total,
    )
```

- [ ] **Step 2: Run tests**

Run: `cd backend && python -m pytest tests/test_missions.py -v`

Expected: All existing tests still pass. The new endpoint doesn't break anything.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/missions.py
git commit -m "feat(backend): add /missions/submit-speaking endpoint for speaking tasks in missions"
```

---

## Task 5: Install Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install @dnd-kit packages**

Run: `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Verify installation**

Run: `cd frontend && npm ls @dnd-kit/core`

Expected: Shows @dnd-kit/core version in the dependency tree.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): install @dnd-kit for drag-and-drop task types"
```

---

## Task 6: Frontend Types and Shared Primitives

**Files:**
- Create: `frontend/types/missions.ts`
- Create: `frontend/components/student/tasks/shared/AudioPlayButton.tsx`
- Create: `frontend/components/student/tasks/shared/EmojiCard.tsx`
- Create: `frontend/components/student/tasks/shared/WordChip.tsx`
- Create: `frontend/components/student/tasks/shared/LetterGrid.tsx`
- Create: `frontend/components/student/tasks/shared/MissionRecorder.tsx`

- [ ] **Step 1: Create the missions types file**

Create `frontend/types/missions.ts`:

```typescript
export interface QuestionOption {
  id: string;
  text: string;
  emoji?: string;
}

export interface MissionQuestion {
  id: number;
  task_type: string;
  pillar: string;
  question: string;
  difficulty: string;
  points_value: number;
  emoji_hint: string;
  correct_answer?: string;
  options?: QuestionOption[];
  passage?: string;
  audio_text?: string;
  image_context?: string;
  image_options?: QuestionOption[];
  word_bank?: string[];
  correct_order?: string[];
  word_with_blanks?: string;
  letter_options?: string[];
  sentence_start?: string;
  // Legacy compat
  type?: string;
  question_text?: string;
}

export interface TaskProps {
  question: MissionQuestion;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  disabled: boolean;
}

export type TaskType =
  | 'sentence_picture_match' | 'odd_one_out' | 'fill_blank_word_bank' | 'passage_true_false'
  | 'sentence_scramble' | 'missing_letter' | 'guided_translation'
  | 'listen_and_choose' | 'simon_says' | 'listen_and_spell'
  | 'repeat_after_me' | 'what_is_this' | 'finish_the_sentence'
  | 'multiple_choice' | 'fill_blank';

export const TIMER_SECONDS: Record<string, number> = {
  passage_true_false: 30,
  sentence_scramble: 30,
  guided_translation: 30,
  listen_and_spell: 20,
  finish_the_sentence: 20,
  repeat_after_me: 20,
};

export const DEFAULT_TIMER = 15;

export function getTimerSeconds(taskType: string): number {
  return TIMER_SECONDS[taskType] ?? DEFAULT_TIMER;
}
```

- [ ] **Step 2: Create AudioPlayButton**

Create `frontend/components/student/tasks/shared/AudioPlayButton.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPlayButtonProps {
  text: string;
  rate?: number;
  autoPlay?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AudioPlayButton({ text, rate = 0.85, autoPlay = false, size = 'md' }: AudioPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(speak, 500);
      return () => clearTimeout(timer);
    }
  }, [text, autoPlay]);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = { sm: 18, md: 24, lg: 32 };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={speak}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors ${
        isPlaying
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
      }`}
    >
      <Volume2 size={iconSizes[size]} />
    </motion.button>
  );
}
```

- [ ] **Step 3: Create EmojiCard**

Create `frontend/components/student/tasks/shared/EmojiCard.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface EmojiCardProps {
  id: string;
  emoji: string;
  label: string;
  selected: boolean;
  isCorrect?: boolean;
  showFeedback: boolean;
  disabled: boolean;
  onTap: (id: string) => void;
}

export default function EmojiCard({ id, emoji, label, selected, isCorrect, showFeedback, disabled, onTap }: EmojiCardProps) {
  let borderColor = 'border-gray-200';
  let bgColor = 'bg-white';

  if (showFeedback) {
    if (isCorrect) {
      borderColor = 'border-green-500';
      bgColor = 'bg-green-50';
    } else if (selected && !isCorrect) {
      borderColor = 'border-red-500';
      bgColor = 'bg-red-50';
    }
  } else if (selected) {
    borderColor = 'border-indigo-500';
    bgColor = 'bg-indigo-50';
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && onTap(id)}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 ${borderColor} ${bgColor} transition-all min-h-[100px] disabled:cursor-not-allowed`}
    >
      <span className="text-4xl mb-2">{emoji}</span>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {showFeedback && isCorrect && <Check className="absolute top-2 right-2 text-green-600" size={16} />}
      {showFeedback && selected && !isCorrect && <X className="absolute top-2 right-2 text-red-600" size={16} />}
    </motion.button>
  );
}
```

- [ ] **Step 4: Create WordChip**

Create `frontend/components/student/tasks/shared/WordChip.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';

interface WordChipProps {
  word: string;
  selected?: boolean;
  correct?: boolean | null;
  showFeedback?: boolean;
  disabled?: boolean;
  onTap?: () => void;
}

export default function WordChip({ word, selected, correct, showFeedback, disabled, onTap }: WordChipProps) {
  let classes = 'bg-white border-gray-300 text-gray-800';

  if (showFeedback && correct === true) {
    classes = 'bg-green-100 border-green-500 text-green-800';
  } else if (showFeedback && correct === false) {
    classes = 'bg-red-100 border-red-500 text-red-800';
  } else if (selected) {
    classes = 'bg-indigo-100 border-indigo-500 text-indigo-800';
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && onTap?.()}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${classes} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {word}
    </motion.button>
  );
}
```

- [ ] **Step 5: Create LetterGrid**

Create `frontend/components/student/tasks/shared/LetterGrid.tsx`:

```tsx
'use client';

import { motion } from 'framer-motion';

interface LetterGridProps {
  letters: string[];
  selectedLetters: string[];
  disabled: boolean;
  onSelect: (letter: string) => void;
}

export default function LetterGrid({ letters, selectedLetters, disabled, onSelect }: LetterGridProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {letters.map((letter, i) => {
        const isSelected = selectedLetters.includes(letter + '_' + i);
        return (
          <motion.button
            key={`${letter}_${i}`}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
            onClick={() => !disabled && !isSelected && onSelect(letter + '_' + i)}
            disabled={disabled || isSelected}
            className={`w-12 h-12 rounded-lg border-2 font-bold text-lg flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-indigo-100 border-indigo-500 text-indigo-800 opacity-50'
                : 'bg-white border-gray-300 text-gray-800 hover:border-indigo-400'
            } disabled:cursor-not-allowed`}
          >
            {letter}
          </motion.button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create MissionRecorder**

Create `frontend/components/student/tasks/shared/MissionRecorder.tsx`:

```tsx
'use client';

import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MissionRecorderProps {
  expectedText: string;
  pillar?: string;
  onResult: (isCorrect: boolean, transcription: string, similarity: number) => void;
  disabled: boolean;
}

export default function MissionRecorder({ expectedText, pillar = 'speaking', onResult, disabled }: MissionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstart = () => setIsRecording(true);
      recorder.start();
    } catch {
      onResult(false, '', 0);
    }
  }

  function stopAndSubmit() {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

    mediaRecorderRef.current.onstop = async () => {
      setIsRecording(false);
      setIsEvaluating(true);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        const token = localStorage.getItem('primepal_student_token');
        const formData = new FormData();
        formData.append('audio_file', blob, 'recording.webm');
        formData.append('expected_text', expectedText);
        formData.append('pillar', pillar);

        const res = await fetch(`${API_BASE}/missions/submit-speaking`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          onResult(data.is_correct, data.transcription, data.similarity_score);
        } else {
          onResult(false, '', 0);
        }
      } catch {
        onResult(false, '', 0);
      } finally {
        setIsEvaluating(false);
        mediaRecorderRef.current = null;
      }
    };
  }

  if (isEvaluating) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm text-gray-600 font-medium">Listening to you...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {isRecording ? (
        <motion.button
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          onClick={stopAndSubmit}
          disabled={disabled}
          className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
        >
          <MicOff size={32} />
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={startRecording}
          disabled={disabled}
          className="w-20 h-20 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:bg-indigo-600 disabled:opacity-50"
        >
          <Mic size={32} />
        </motion.button>
      )}
      <p className="text-xs text-gray-500">
        {isRecording ? 'Tap to stop' : 'Tap to speak'}
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

Expected: No type errors related to the new files.

- [ ] **Step 8: Commit**

```bash
git add frontend/types/missions.ts frontend/components/student/tasks/shared/
git commit -m "feat(frontend): add mission types and shared task primitives (AudioPlayButton, EmojiCard, WordChip, LetterGrid, MissionRecorder)"
```

---

## Task 7: Frontend — Reading Pillar Task Components

**Files:**
- Create: `frontend/components/student/tasks/reading/SentencePictureMatch.tsx`
- Create: `frontend/components/student/tasks/reading/OddOneOut.tsx`
- Create: `frontend/components/student/tasks/reading/FillBlankWordBank.tsx`
- Create: `frontend/components/student/tasks/reading/PassageTrueFalse.tsx`

- [ ] **Step 1: Create SentencePictureMatch**

Create `frontend/components/student/tasks/reading/SentencePictureMatch.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import EmojiCard from '../shared/EmojiCard';

export default function SentencePictureMatch({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.image_options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">{question.question}</h2>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <EmojiCard
            key={opt.id}
            id={opt.id}
            emoji={opt.emoji ?? '❓'}
            label={opt.text}
            selected={selected === opt.id}
            isCorrect={opt.id === question.correct_answer}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OddOneOut**

Create `frontend/components/student/tasks/reading/OddOneOut.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import WordChip from '../shared/WordChip';

export default function OddOneOut({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <p className="text-sm text-gray-500 mb-4">Tap the word that does NOT belong.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {options.map((opt) => (
          <WordChip
            key={opt.id}
            word={opt.text}
            selected={selected === opt.id}
            correct={showFeedback ? opt.id === question.correct_answer : null}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={() => handleTap(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create FillBlankWordBank**

Create `frontend/components/student/tasks/reading/FillBlankWordBank.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import WordChip from '../shared/WordChip';

export default function FillBlankWordBank({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-6 leading-tight">{question.question}</h2>
      <div className="flex flex-wrap gap-3 justify-center">
        {options.map((opt) => (
          <WordChip
            key={opt.id}
            word={opt.text}
            selected={selected === opt.id}
            correct={showFeedback ? opt.id === question.correct_answer : null}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={() => handleTap(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create PassageTrueFalse**

Create `frontend/components/student/tasks/reading/PassageTrueFalse.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function PassageTrueFalse({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleTap = (value: string) => {
    if (disabled || showFeedback) return;
    setSelected(value);
    onAnswer(value, value === question.correct_answer);
  };

  const getButtonClass = (value: string) => {
    if (showFeedback) {
      if (value === question.correct_answer) return 'bg-green-100 border-green-500 text-green-800';
      if (value === selected) return 'bg-red-100 border-red-500 text-red-800';
    }
    if (value === selected) return 'bg-indigo-100 border-indigo-500 text-indigo-800';
    return 'bg-white border-gray-300 text-gray-800 hover:border-indigo-400';
  };

  return (
    <div>
      {question.passage && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
          <p className="text-sm text-gray-700 leading-relaxed">{question.passage}</p>
        </div>
      )}
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">{question.question}</h2>
      <div className="flex gap-4 justify-center">
        {['true', 'false'].map((value) => (
          <motion.button
            key={value}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={() => handleTap(value)}
            disabled={disabled}
            className={`flex-1 max-w-[150px] py-4 rounded-xl border-2 font-bold text-lg transition-all ${getButtonClass(value)} disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center gap-2">
              {value === 'true' ? <Check size={20} /> : <X size={20} />}
              {value === 'true' ? 'True' : 'False'}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/student/tasks/reading/
git commit -m "feat(frontend): add 4 reading pillar task components (SentencePictureMatch, OddOneOut, FillBlankWordBank, PassageTrueFalse)"
```

---

## Task 8: Frontend — Writing Pillar Task Components

**Files:**
- Create: `frontend/components/student/tasks/writing/SentenceScramble.tsx`
- Create: `frontend/components/student/tasks/writing/MissingLetter.tsx`
- Create: `frontend/components/student/tasks/writing/GuidedTranslation.tsx`

- [ ] **Step 1: Create SentenceScramble (drag-and-drop)**

Create `frontend/components/student/tasks/writing/SentenceScramble.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';

function SortableWord({ id, word, disabled }: { id: string; word: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="px-4 py-2 bg-white border-2 border-indigo-200 rounded-lg font-semibold text-sm text-gray-800 cursor-grab active:cursor-grabbing touch-manipulation select-none"
    >
      {word}
    </div>
  );
}

export default function SentenceScramble({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [words, setWords] = useState<string[]>(question.word_bank ?? []);
  const [submitted, setSubmitted] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = words.indexOf(active.id as string);
    const newIndex = words.indexOf(over.id as string);
    setWords(arrayMove(words, oldIndex, newIndex));
  };

  const handleSubmit = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    const correctOrder = question.correct_order ?? [];
    const isCorrect = words.length === correctOrder.length && words.every((w, i) => w === correctOrder[i]);
    onAnswer(words.join(' '), isCorrect);
  };

  const correctOrder = question.correct_order ?? [];

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <p className="text-sm text-gray-500 mb-4">Drag the words into the correct order.</p>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={words} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2 justify-center mb-6 min-h-[48px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            {words.map((word) => (
              <SortableWord key={word} id={word} word={word} disabled={disabled || showFeedback} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showFeedback && (
        <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${
          words.every((w, i) => w === correctOrder[i]) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          Correct order: {correctOrder.join(' ')}
        </div>
      )}

      {!showFeedback && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={disabled || submitted}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Answer
        </motion.button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create MissingLetter**

Create `frontend/components/student/tasks/writing/MissingLetter.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import LetterGrid from '../shared/LetterGrid';

export default function MissingLetter({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);

  const blanks = (question.word_with_blanks ?? '').split('');
  const blankCount = blanks.filter(c => c === '_').length;

  const handleSelect = (letterKey: string) => {
    if (disabled || showFeedback) return;
    const newSelected = [...selectedLetters, letterKey];
    setSelectedLetters(newSelected);

    if (newSelected.length >= blankCount) {
      const filledLetters = newSelected.map(k => k.split('_')[0]);
      let result = question.word_with_blanks ?? '';
      for (const letter of filledLetters) {
        result = result.replace('_', letter);
      }
      const isCorrect = result.toLowerCase() === (question.correct_answer ?? '').toLowerCase();
      onAnswer(result, isCorrect);
    }
  };

  const displayWord = () => {
    let blankIdx = 0;
    const filledLetters = selectedLetters.map(k => k.split('_')[0]);
    return blanks.map((char, i) => {
      if (char === '_') {
        const filled = filledLetters[blankIdx];
        blankIdx++;
        return (
          <span key={i} className={`inline-block w-8 h-10 mx-1 border-b-2 text-center text-xl font-bold ${
            filled ? 'text-indigo-600 border-indigo-500' : 'border-gray-400'
          }`}>
            {filled ?? ''}
          </span>
        );
      }
      return <span key={i} className="text-xl font-bold text-gray-800">{char}</span>;
    });
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">{question.question}</h2>
      <div className="flex items-center justify-center gap-0 mb-6 py-4">
        {displayWord()}
      </div>
      {showFeedback && (
        <p className={`text-center text-sm font-medium mb-4 ${
          selectedLetters.length >= blankCount ? 'text-green-700' : 'text-gray-500'
        }`}>
          Answer: {question.correct_answer}
        </p>
      )}
      <LetterGrid
        letters={question.letter_options ?? []}
        selectedLetters={selectedLetters}
        disabled={disabled || showFeedback}
        onSelect={handleSelect}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create GuidedTranslation**

Create `frontend/components/student/tasks/writing/GuidedTranslation.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import WordChip from '../shared/WordChip';
import { motion } from 'framer-motion';

export default function GuidedTranslation({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const wordBank = question.word_bank ?? [];

  const handleTapWord = (word: string) => {
    if (disabled || showFeedback || submitted) return;
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleSubmit = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    const correctOrder = question.correct_order ?? [];
    const isCorrect = selectedWords.length === correctOrder.length &&
      selectedWords.every((w, i) => w === correctOrder[i]);
    onAnswer(selectedWords.join(' '), isCorrect);
  };

  const correctOrder = question.correct_order ?? [];

  return (
    <div>
      <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
        <p className="text-xs font-semibold text-amber-700 mb-1">Translate this:</p>
        <p className="text-lg font-bold text-gray-800">{question.question}</p>
      </div>

      <div className="min-h-[48px] p-3 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 mb-4 flex flex-wrap gap-2">
        {selectedWords.length === 0 && (
          <span className="text-sm text-gray-400 italic">Tap words below to build your sentence...</span>
        )}
        {selectedWords.map((word, i) => (
          <WordChip
            key={`selected-${i}`}
            word={word}
            selected
            disabled={disabled || showFeedback}
            onTap={() => handleTapWord(word)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {wordBank.map((word, i) => (
          <WordChip
            key={`bank-${i}`}
            word={word}
            selected={selectedWords.includes(word)}
            disabled={disabled || showFeedback || selectedWords.includes(word)}
            onTap={() => handleTapWord(word)}
          />
        ))}
      </div>

      {showFeedback && (
        <div className={`p-3 rounded-lg text-sm font-medium mb-4 ${
          selectedWords.every((w, i) => w === correctOrder[i]) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          Correct: {correctOrder.join(' ')}
        </div>
      )}

      {!showFeedback && selectedWords.length > 0 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={disabled || submitted}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Answer
        </motion.button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/student/tasks/writing/
git commit -m "feat(frontend): add 3 writing pillar task components (SentenceScramble, MissingLetter, GuidedTranslation)"
```

---

## Task 9: Frontend — Listening Pillar Task Components

**Files:**
- Create: `frontend/components/student/tasks/listening/ListenAndChoose.tsx`
- Create: `frontend/components/student/tasks/listening/SimonSays.tsx`
- Create: `frontend/components/student/tasks/listening/ListenAndSpell.tsx`

- [ ] **Step 1: Create ListenAndChoose**

Create `frontend/components/student/tasks/listening/ListenAndChoose.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import EmojiCard from '../shared/EmojiCard';

export default function ListenAndChoose({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.image_options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">Listen and choose the right picture</h2>
      <div className="flex justify-center mb-6">
        <AudioPlayButton text={question.audio_text ?? ''} autoPlay size="lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <EmojiCard
            key={opt.id}
            id={opt.id}
            emoji={opt.emoji ?? '❓'}
            label={opt.text}
            selected={selected === opt.id}
            isCorrect={opt.id === question.correct_answer}
            showFeedback={showFeedback}
            disabled={disabled}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SimonSays**

Create `frontend/components/student/tasks/listening/SimonSays.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function SimonSays({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.options ?? [];

  const handleTap = (id: string) => {
    if (disabled || showFeedback) return;
    setSelected(id);
    onAnswer(id, id === question.correct_answer);
  };

  const getButtonClass = (id: string) => {
    if (showFeedback) {
      if (id === question.correct_answer) return 'bg-green-100 border-green-500 text-green-800';
      if (id === selected) return 'bg-red-100 border-red-500 text-red-800';
    }
    if (id === selected) return 'bg-indigo-100 border-indigo-500 text-indigo-800';
    return 'bg-white border-gray-300 text-gray-800 hover:border-indigo-400';
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">Listen and do what it says!</h2>
      <div className="flex justify-center mb-6">
        <AudioPlayButton text={question.audio_text ?? ''} autoPlay size="lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={!disabled ? { scale: 1.03 } : {}}
            whileTap={!disabled ? { scale: 0.97 } : {}}
            onClick={() => handleTap(opt.id)}
            disabled={disabled}
            className={`p-4 rounded-xl border-2 font-semibold text-sm transition-all ${getButtonClass(opt.id)} disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {opt.text}
            {showFeedback && opt.id === question.correct_answer && <Check size={16} className="text-green-600" />}
            {showFeedback && opt.id === selected && opt.id !== question.correct_answer && <X size={16} className="text-red-600" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ListenAndSpell**

Create `frontend/components/student/tasks/listening/ListenAndSpell.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import { motion } from 'framer-motion';

export default function ListenAndSpell({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (disabled || submitted || !input.trim()) return;
    setSubmitted(true);
    const isCorrect = input.trim().toLowerCase() === (question.correct_answer ?? '').toLowerCase();
    onAnswer(input.trim(), isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">Listen and spell the word</h2>
      <div className="flex justify-center mb-6">
        <AudioPlayButton text={question.audio_text ?? ''} autoPlay size="lg" />
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={disabled || showFeedback}
        placeholder="Type the word..."
        autoComplete="off"
        className="w-full p-4 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 mb-4"
      />
      {showFeedback && (
        <p className={`text-center text-sm font-medium mb-4 ${
          input.trim().toLowerCase() === (question.correct_answer ?? '').toLowerCase()
            ? 'text-green-700' : 'text-red-700'
        }`}>
          Correct spelling: {question.correct_answer}
        </p>
      )}
      {!showFeedback && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={disabled || submitted || !input.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          Check Spelling
        </motion.button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/student/tasks/listening/
git commit -m "feat(frontend): add 3 listening pillar task components (ListenAndChoose, SimonSays, ListenAndSpell)"
```

---

## Task 10: Frontend — Speaking Pillar Task Components

**Files:**
- Create: `frontend/components/student/tasks/speaking/RepeatAfterMe.tsx`
- Create: `frontend/components/student/tasks/speaking/WhatIsThis.tsx`
- Create: `frontend/components/student/tasks/speaking/FinishTheSentence.tsx`

- [ ] **Step 1: Create RepeatAfterMe**

Create `frontend/components/student/tasks/speaking/RepeatAfterMe.tsx`:

```tsx
'use client';

import { TaskProps } from '@/types/missions';
import AudioPlayButton from '../shared/AudioPlayButton';
import MissionRecorder from '../shared/MissionRecorder';

export default function RepeatAfterMe({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const handleResult = (isCorrect: boolean, transcription: string) => {
    onAnswer(transcription, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">Listen, then repeat!</h2>
      <div className="flex justify-center mb-4">
        <AudioPlayButton text={question.audio_text ?? question.correct_answer ?? ''} autoPlay size="lg" />
      </div>
      <p className="text-center text-gray-500 text-sm mb-4">Tap the play button to hear, then record yourself</p>
      {!showFeedback && (
        <MissionRecorder
          expectedText={question.correct_answer ?? ''}
          disabled={disabled}
          onResult={handleResult}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create WhatIsThis**

Create `frontend/components/student/tasks/speaking/WhatIsThis.tsx`:

```tsx
'use client';

import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';

export default function WhatIsThis({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const handleResult = (isCorrect: boolean, transcription: string) => {
    onAnswer(transcription, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 leading-tight">What is this? Say it!</h2>
      <div className="flex justify-center mb-6">
        <span className="text-8xl">{question.image_context ?? '❓'}</span>
      </div>
      {!showFeedback && (
        <MissionRecorder
          expectedText={question.correct_answer ?? ''}
          disabled={disabled}
          onResult={handleResult}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create FinishTheSentence**

Create `frontend/components/student/tasks/speaking/FinishTheSentence.tsx`:

```tsx
'use client';

import { TaskProps } from '@/types/missions';
import MissionRecorder from '../shared/MissionRecorder';

export default function FinishTheSentence({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const handleResult = (isCorrect: boolean, transcription: string) => {
    onAnswer(transcription, isCorrect);
  };

  return (
    <div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 leading-tight">Finish this sentence!</h2>
      <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
        <p className="text-xl font-bold text-gray-800">
          {question.sentence_start ?? question.question}
          <span className="text-indigo-500"> ...</span>
        </p>
      </div>
      <p className="text-center text-gray-500 text-sm mb-4">Say the complete sentence out loud</p>
      {!showFeedback && (
        <MissionRecorder
          expectedText={question.correct_answer ?? ''}
          disabled={disabled}
          onResult={handleResult}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/student/tasks/speaking/
git commit -m "feat(frontend): add 3 speaking pillar task components (RepeatAfterMe, WhatIsThis, FinishTheSentence)"
```

---

## Task 11: Frontend — TaskRouter and MissionGameplay Integration

**Files:**
- Create: `frontend/components/student/tasks/TaskRouter.tsx`
- Modify: `frontend/components/student/MissionGameplay.tsx`
- Modify: `frontend/app/student/missions/[pillar]/page.tsx`

- [ ] **Step 1: Create TaskRouter**

Create `frontend/components/student/tasks/TaskRouter.tsx`:

```tsx
'use client';

import { TaskProps } from '@/types/missions';
import SentencePictureMatch from './reading/SentencePictureMatch';
import OddOneOut from './reading/OddOneOut';
import FillBlankWordBank from './reading/FillBlankWordBank';
import PassageTrueFalse from './reading/PassageTrueFalse';
import SentenceScramble from './writing/SentenceScramble';
import MissingLetter from './writing/MissingLetter';
import GuidedTranslation from './writing/GuidedTranslation';
import ListenAndChoose from './listening/ListenAndChoose';
import SimonSays from './listening/SimonSays';
import ListenAndSpell from './listening/ListenAndSpell';
import RepeatAfterMe from './speaking/RepeatAfterMe';
import WhatIsThis from './speaking/WhatIsThis';
import FinishTheSentence from './speaking/FinishTheSentence';
import LegacyMultipleChoice from './LegacyMultipleChoice';

const TASK_COMPONENTS: Record<string, React.ComponentType<TaskProps>> = {
  sentence_picture_match: SentencePictureMatch,
  odd_one_out: OddOneOut,
  fill_blank_word_bank: FillBlankWordBank,
  passage_true_false: PassageTrueFalse,
  sentence_scramble: SentenceScramble,
  missing_letter: MissingLetter,
  guided_translation: GuidedTranslation,
  listen_and_choose: ListenAndChoose,
  simon_says: SimonSays,
  listen_and_spell: ListenAndSpell,
  repeat_after_me: RepeatAfterMe,
  what_is_this: WhatIsThis,
  finish_the_sentence: FinishTheSentence,
  multiple_choice: LegacyMultipleChoice,
  fill_blank: LegacyMultipleChoice,
};

export default function TaskRouter(props: TaskProps) {
  const taskType = props.question.task_type ?? props.question.type ?? 'multiple_choice';
  const Component = TASK_COMPONENTS[taskType] ?? LegacyMultipleChoice;
  return <Component {...props} />;
}
```

- [ ] **Step 2: Create LegacyMultipleChoice (extracted from current MissionGameplay)**

Create `frontend/components/student/tasks/LegacyMultipleChoice.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { TaskProps } from '@/types/missions';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function LegacyMultipleChoice({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    if (disabled || showFeedback) return;
    setSelected(answer);
    const isCorrect = answer === question.correct_answer;
    onAnswer(answer, isCorrect);
  };

  // Support both old format (string[] options) and new format (QuestionOption[])
  const options: { id: string; text: string }[] = (question.options ?? []).map((opt, idx) => {
    if (typeof opt === 'string') return { id: opt, text: opt };
    return { id: opt.id ?? String(idx), text: opt.text ?? String(opt) };
  });

  // For fill_blank without options, show text input
  if (!options.length) {
    return <FillBlankInput question={question} onAnswer={onAnswer} showFeedback={showFeedback} disabled={disabled} />;
  }

  return (
    <div>
      <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 leading-tight">
        {question.question ?? question.question_text}
      </h2>
      <div className="space-y-2 sm:space-y-3">
        {options.map((opt) => {
          const isCorrect = opt.id === question.correct_answer || opt.text === question.correct_answer;
          const isSelected = opt.id === selected || opt.text === selected;

          let buttonClass = 'bg-white border-2 border-gray-300 text-gray-800';
          if (showFeedback) {
            if (isCorrect) buttonClass = 'bg-green-100 border-2 border-green-500 text-green-800';
            else if (isSelected) buttonClass = 'bg-red-100 border-2 border-red-500 text-red-800';
          }

          return (
            <motion.button
              key={opt.id}
              whileHover={!showFeedback ? { scale: 1.02 } : {}}
              whileTap={!showFeedback ? { scale: 0.98 } : {}}
              onClick={() => handleAnswer(opt.id)}
              disabled={disabled}
              className={`w-full p-3 sm:p-4 rounded-lg font-semibold text-sm sm:text-lg transition-all ${buttonClass} disabled:cursor-not-allowed min-h-[52px] flex items-center justify-center`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span>{opt.text}</span>
                {showFeedback && isCorrect && <Check className="text-green-600" size={20} />}
                {showFeedback && isSelected && !isCorrect && <X className="text-red-600" size={20} />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function FillBlankInput({ question, onAnswer, showFeedback, disabled }: TaskProps) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (disabled || submitted || !input.trim()) return;
    setSubmitted(true);
    const isCorrect = input.trim().toLowerCase() === (question.correct_answer ?? '').toLowerCase();
    onAnswer(input.trim(), isCorrect);
  };

  return (
    <div>
      <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-4">{question.question ?? question.question_text}</h2>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        disabled={disabled || showFeedback}
        placeholder="Type your answer..."
        className="w-full p-3 text-center text-lg border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-gray-100 mb-4"
      />
      {showFeedback && (
        <p className="text-center text-sm text-gray-600">Answer: {question.correct_answer}</p>
      )}
      {!showFeedback && (
        <button
          onClick={handleSubmit}
          disabled={disabled || submitted || !input.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50"
        >
          Submit
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite MissionGameplay to use TaskRouter**

Replace the entire content of `frontend/components/student/MissionGameplay.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import QuestionTimer from './QuestionTimer';
import TaskRouter from './tasks/TaskRouter';
import { motion } from 'framer-motion';
import { MissionQuestion, getTimerSeconds } from '@/types/missions';

interface MissionGameplayProps {
  questions: MissionQuestion[];
  pillar?: string;
  onComplete: (results: GameResult[]) => void;
}

interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
}

export default function MissionGameplay({ questions, pillar, onComplete }: MissionGameplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const taskType = currentQuestion?.task_type ?? currentQuestion?.type ?? 'multiple_choice';
  const timerSeconds = getTimerSeconds(taskType);

  const advance = useCallback((newResults: GameResult[]) => {
    if (isLastQuestion) {
      onComplete(newResults);
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
      setTimerKey(k => k + 1);
    }
  }, [currentIndex, isLastQuestion, onComplete]);

  const handleAnswer = useCallback((answer: string, isCorrect: boolean) => {
    const result: GameResult = {
      question_id: currentQuestion.id,
      is_correct: isCorrect,
      time_remaining: timeRemaining,
      task_type: taskType,
    };

    const newResults = [...results, result];
    setResults(newResults);
    setShowFeedback(true);

    setTimeout(() => advance(newResults), 2000);
  }, [currentQuestion, timeRemaining, taskType, results, advance]);

  const handleTimeUp = useCallback(() => {
    handleAnswer('', false);
  }, [handleAnswer]);

  if (!currentQuestion) return null;

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-6 flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Progress */}
        <div className="mb-3 sm:mb-6 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs sm:text-sm text-gray-600">
              {Math.round(((currentIndex + 1) / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <QuestionTimer
          key={timerKey}
          initialSeconds={timerSeconds}
          onTimeUp={handleTimeUp}
        />

        {/* Task */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg sm:rounded-2xl p-3 sm:p-8 shadow-lg mb-3 sm:mb-6 flex-shrink-0"
        >
          <TaskRouter
            question={currentQuestion}
            onAnswer={handleAnswer}
            showFeedback={showFeedback}
            disabled={showFeedback}
          />
        </motion.div>

        {/* Skip Button */}
        {!showFeedback && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer('', false)}
            className="mx-auto px-4 sm:px-6 py-2 bg-gray-400 text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-gray-500 transition flex-shrink-0"
          >
            Skip Question
          </motion.button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update the pillar page to use new types**

Replace `frontend/app/student/missions/[pillar]/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MissionGameplay from '@/components/student/MissionGameplay';
import { apiFetch } from '@/lib/api';
import { MissionQuestion } from '@/types/missions';

interface GameResult {
  question_id: number;
  is_correct: boolean;
  time_remaining: number;
  task_type: string;
}

export default function PillarMissionPage() {
  const params = useParams();
  const router = useRouter();
  const pillar = params.pillar as string;

  const [questions, setQuestions] = useState<MissionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('primepal_student_token');
      if (!token) { setError('User not logged in'); return; }

      try {
        const response = await apiFetch<{ questions: MissionQuestion[] }>(
          `/missions/pillar?pillar=${pillar}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setQuestions(response.questions);
      } catch (err) {
        setError('Failed to load questions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [pillar]);

  const handleComplete = async (results: GameResult[]) => {
    try {
      const token = localStorage.getItem('primepal_student_token');
      if (!token) { router.push('/student/missions'); return; }

      for (const result of results) {
        await apiFetch('/missions/complete', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            question_correct: result.is_correct,
            task_type: result.task_type,
            pillar: pillar,
          }),
        });
      }

      router.push('/student/missions');
    } catch (err) {
      console.error('Failed to save results', err);
      router.push('/student/missions');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 text-lg">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'No questions available'}</p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <MissionGameplay questions={questions} pillar={pillar} onComplete={handleComplete} />;
}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors or only pre-existing warnings.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/student/tasks/TaskRouter.tsx frontend/components/student/tasks/LegacyMultipleChoice.tsx frontend/components/student/MissionGameplay.tsx frontend/app/student/missions/\[pillar\]/page.tsx
git commit -m "feat(frontend): add TaskRouter, rewrite MissionGameplay to support 13 task types with backward compat"
```

---

## Task 12: Backend Tests Update

**Files:**
- Modify: `backend/tests/test_missions.py`

- [ ] **Step 1: Add a test for the new pillar response schema**

Add to the `TestEndToEndMissionFlow` class:

```python
    def make_new_format_pillar_missions(self, pillar="reading"):
        """Return missions in the new expanded format with task_type."""
        return [
            {
                "id": 1,
                "task_type": "sentence_picture_match",
                "pillar": pillar,
                "question": "Which picture shows a cat?",
                "difficulty": "easy",
                "points_value": 5,
                "correct_answer": "a",
                "emoji_hint": "🐱",
                "image_options": [
                    {"id": "a", "text": "cat", "emoji": "🐱"},
                    {"id": "b", "text": "dog", "emoji": "🐶"},
                    {"id": "c", "text": "car", "emoji": "🚗"},
                    {"id": "d", "text": "book", "emoji": "📖"},
                ],
                "is_weakness_focused": False,
            },
            *[
                {
                    "id": i,
                    "task_type": "odd_one_out",
                    "pillar": pillar,
                    "question": f"Which word does not belong? Q{i}",
                    "difficulty": "medium",
                    "points_value": 10,
                    "correct_answer": "c",
                    "emoji_hint": "🤔",
                    "options": [
                        {"id": "a", "text": "cat"},
                        {"id": "b", "text": "dog"},
                        {"id": "c", "text": "table"},
                        {"id": "d", "text": "bird"},
                    ],
                    "is_weakness_focused": False,
                }
                for i in range(2, 11)
            ],
        ]

    async def test_new_format_pillar_missions(self, client: AsyncClient):
        """New format with task_type returns all fields correctly."""
        mock_missions = self.make_new_format_pillar_missions()
        mock_client = MagicMock()

        def table_side_effect(table_name):
            table_mock = MagicMock()
            if table_name == "classrooms":
                cr = MagicMock()
                cr.data = {"grade_level": 3}
                (table_mock.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value) = cr
            elif table_name == "student_interactions":
                ir = MagicMock()
                ir.data = []
                (table_mock.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value) = ir
            return table_mock

        mock_client.table.side_effect = table_side_effect

        with (
            patch("app.api.v1.endpoints.missions.get_supabase_admin", return_value=mock_client),
            patch("app.api.v1.endpoints.missions.generate_pillar_missions", new=AsyncMock(return_value=mock_missions)),
        ):
            resp = await client.get(
                "/api/v1/missions/pillar",
                params={"pillar": "reading"},
                headers={"Authorization": "Bearer fake-student-token"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["questions"]) == 10

        q1 = data["questions"][0]
        assert q1["task_type"] == "sentence_picture_match"
        assert q1["pillar"] == "reading"
        assert q1["difficulty"] == "easy"
        assert q1["points_value"] == 5
        assert q1["image_options"] is not None
        assert len(q1["image_options"]) == 4
        assert "correct_answer" not in q1
        assert "correct_order" not in q1
```

- [ ] **Step 2: Run all tests**

Run: `cd backend && python -m pytest tests/test_missions.py -v`

Expected: All tests pass including the new one.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_missions.py
git commit -m "test(backend): add tests for expanded mission task type schema"
```

---

## Task 13: Verify End-to-End

- [ ] **Step 1: Start the backend**

Run: `cd backend && uvicorn app.main:app --reload` (in background)

- [ ] **Step 2: Start the frontend**

Run: `cd frontend && npm run dev` (in background)

- [ ] **Step 3: Verify frontend builds without errors**

Run: `cd frontend && npm run build`

Expected: Build completes successfully.

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && python -m pytest tests/ -v --timeout=30`

Expected: All tests pass.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any build/test issues from S02 integration"
```
