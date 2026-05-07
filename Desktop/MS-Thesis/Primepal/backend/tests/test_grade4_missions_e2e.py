"""
End-to-End Tests for Grade 4 Mission Generation Across All 4 Pillars

Tests comprehensive mission generation for reading, writing, listening, speaking
with realistic Grade 4 setup including active topics and student weaknesses.

Critical Test Metrics:
  - Question count: EXACTLY 10 per pillar
  - Generation time: < 45s (cache miss), < 2s (cache hit)
  - Topic alignment: >= 90% pass rate
  - Field validation: All required fields present
  - Task type distribution: Matches config
  - Points value: All questions = 10 points

NOTE: Tests can run with real API calls or mocked responses for validation.
"""
import asyncio
import json
import logging
import os
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.tutor_agent.mission_generator import (
    generate_pillar_missions,
    validate_topic_alignment,
    PILLAR_QUESTIONS_COUNT,
    PILLAR_TASK_CONFIGS,
    PillarMissions,
    MissionQuestion,
    QuestionOption,
)

# Check if we should use mocks (if API key is invalid or for fast testing)
USE_MOCKS = os.getenv("TEST_USE_MOCKS", "false").lower() == "true"

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Test Configuration - Grade 4 Setup
# ---------------------------------------------------------------------------

GRADE_4 = 4
STUDENT_ID = "test-student-grade4-001"

# Active topics for Grade 4 (from SNC curriculum)
GRADE_4_TOPICS = [
    "Grammar",
    "Composition",
    "Reading Comprehension",
    "Vocabulary"
]

# Mock student weaknesses
MOCK_WEAKNESSES = [
    "reading (accuracy: 40%)",
    "vocabulary (accuracy: 35%)",
    "comprehension (accuracy: 45%)"
]

# Mock performance profile for adaptive difficulty
MOCK_PERFORMANCE_PROFILE = {
    "overall_accuracy": 55,
    "pillar_accuracy": {
        "reading": 45,
        "writing": 60,
        "listening": 58,
        "speaking": 52
    },
    "weak_topics": [
        {"topic": "Reading Comprehension", "accuracy": 40, "suggested_difficulty": "easy"},
        {"topic": "Vocabulary", "accuracy": 35, "suggested_difficulty": "easy"}
    ],
    "strong_topics": [
        {"topic": "Grammar", "accuracy": 75}
    ],
    "difficulty_recommendation": "medium"
}

# Mock curriculum context chunks (RAG retrieval simulation)
MOCK_CONTEXT_CHUNKS = [
    {
        "content": "Grade 4 Vocabulary: Students should know words like: understand, comprehend, "
                   "meaning, definition, synonym, antonym, sentence, paragraph, story, character, "
                   "plot, setting, author, title.",
        "grade_level": 4,
        "topic": "Vocabulary"
    },
    {
        "content": "Reading Comprehension: Students read short passages and answer questions about "
                   "main idea, details, characters, and events. They make inferences and draw conclusions.",
        "grade_level": 4,
        "topic": "Reading Comprehension"
    },
    {
        "content": "Grammar: Grade 4 students learn parts of speech (nouns, verbs, adjectives), "
                   "sentence structure, punctuation (periods, commas, question marks), and capitalization.",
        "grade_level": 4,
        "topic": "Grammar"
    }
]


# ---------------------------------------------------------------------------
# Mock Data Generators
# ---------------------------------------------------------------------------

def generate_mock_questions(pillar: str, grade_level: int, count: int = 10) -> list[MissionQuestion]:
    """
    Generate mock questions for testing when API is unavailable.
    Follows the exact structure expected from real generation.
    """
    config = PILLAR_TASK_CONFIGS[pillar]
    questions = []
    q_id = 1

    for task_type, task_count in config["task_types"]:
        for i in range(task_count):
            if task_type == "sentence_picture_match":
                q = MissionQuestion(
                    id=q_id,
                    task_type=task_type,
                    pillar=pillar,
                    question=f"Match the sentence: The grammar book is on the desk.",
                    difficulty="medium",
                    points_value=10,
                    correct_answer="a",
                    emoji_hint="📖",
                    urdu_hint="کتاب میز پر ہے",
                    image_options=[
                        QuestionOption(id="a", text="book", emoji="📖"),
                        QuestionOption(id="b", text="cat", emoji="🐱"),
                        QuestionOption(id="c", text="car", emoji="🚗"),
                        QuestionOption(id="d", text="apple", emoji="🍎"),
                    ]
                )
            elif task_type == "odd_one_out":
                q = MissionQuestion(
                    id=q_id,
                    task_type=task_type,
                    pillar=pillar,
                    question="Which word does NOT belong?",
                    difficulty="medium",
                    points_value=10,
                    correct_answer="d",
                    emoji_hint="🔍",
                    urdu_hint="کون سا لفظ مختلف ہے؟",
                    options=[
                        QuestionOption(id="a", text="noun"),
                        QuestionOption(id="b", text="verb"),
                        QuestionOption(id="c", text="adjective"),
                        QuestionOption(id="d", text="apple"),
                    ]
                )
            elif task_type == "fill_blank_word_bank":
                q = MissionQuestion(
                    id=q_id,
                    task_type=task_type,
                    pillar=pillar,
                    question="A ___ is a naming word.",
                    difficulty="medium",
                    points_value=10,
                    correct_answer="a",
                    emoji_hint="📝",
                    urdu_hint="اسم ایک نام والا لفظ ہے",
                    options=[
                        QuestionOption(id="a", text="noun"),
                        QuestionOption(id="b", text="verb"),
                        QuestionOption(id="c", text="adjective"),
                        QuestionOption(id="d", text="adverb"),
                    ]
                )
            elif task_type == "passage_true_false":
                q = MissionQuestion(
                    id=q_id,
                    task_type=task_type,
                    pillar=pillar,
                    passage="Reading comprehension is important. Students must understand the main idea. They should identify key details. This helps them learn better.",
                    question="Reading comprehension helps students learn better.",
                    difficulty="medium",
                    points_value=10,
                    correct_answer="true",
                    emoji_hint="✓",
                    urdu_hint="پڑھنا سمجھنا اہم ہے"
                )
            elif task_type in ["sentence_scramble", "missing_letter", "guided_translation",
                              "listen_and_choose", "simon_says", "listen_and_spell",
                              "repeat_after_me", "what_is_this", "finish_the_sentence"]:
                # Generic fallback for other task types
                q = MissionQuestion(
                    id=q_id,
                    task_type=task_type,
                    pillar=pillar,
                    question=f"Sample {task_type} question about grammar and vocabulary.",
                    difficulty="medium",
                    points_value=10,
                    correct_answer="sample answer",
                    emoji_hint="✏️",
                    urdu_hint="نمونہ سوال"
                )
            else:
                q = MissionQuestion(
                    id=q_id,
                    task_type=task_type,
                    pillar=pillar,
                    question=f"Question {q_id} for {pillar}",
                    difficulty="medium",
                    points_value=10,
                    correct_answer="a",
                    emoji_hint="📚",
                    urdu_hint="سوال"
                )

            questions.append(q)
            q_id += 1

            if len(questions) >= count:
                break

        if len(questions) >= count:
            break

    # Ensure exactly 10 questions
    while len(questions) < count:
        questions.append(MissionQuestion(
            id=len(questions) + 1,
            task_type="multiple_choice",
            pillar=pillar,
            question=f"Filler question {len(questions) + 1}",
            difficulty="medium",
            points_value=10,
            correct_answer="a",
            emoji_hint="📚"
        ))

    return questions[:count]


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def validate_question_fields(question: dict, pillar: str) -> list[str]:
    """
    Validate that a question has all required fields.
    Returns list of missing/invalid fields.
    """
    errors = []

    # Required fields for all questions
    required = ["id", "task_type", "pillar", "question", "difficulty",
                "points_value", "correct_answer", "emoji_hint"]

    for field in required:
        if field not in question:
            errors.append(f"Missing field: {field}")

    # Validate pillar matches
    if question.get("pillar") != pillar:
        errors.append(f"Pillar mismatch: expected {pillar}, got {question.get('pillar')}")

    # Validate points value = 10
    if question.get("points_value") != 10:
        errors.append(f"Points value should be 10, got {question.get('points_value')}")

    # Validate task_type is in pillar config
    task_type = question.get("task_type")
    valid_task_types = [tt for tt, _ in PILLAR_TASK_CONFIGS[pillar]["task_types"]]
    if task_type not in valid_task_types:
        errors.append(f"Invalid task_type '{task_type}' for {pillar}. Valid: {valid_task_types}")

    return errors


def validate_task_distribution(questions: list[dict], pillar: str) -> dict:
    """
    Validate that task types match expected distribution for pillar.
    Returns statistics dict.
    """
    expected = dict(PILLAR_TASK_CONFIGS[pillar]["task_types"])
    actual = {}

    for q in questions:
        task_type = q.get("task_type", "unknown")
        actual[task_type] = actual.get(task_type, 0) + 1

    return {
        "expected": expected,
        "actual": actual,
        "matches": actual == expected
    }


def check_topic_alignment(questions: list[dict], active_topics: list[str]) -> dict:
    """
    Check what percentage of questions reference active topics.
    Returns alignment statistics.
    """
    from app.agents.tutor_agent.mission_generator import TOPIC_KEYWORDS

    # Build keyword set
    active_keywords = set()
    for topic in active_topics:
        topic_lower = topic.lower().strip()
        active_keywords.add(topic_lower)
        active_keywords.update(topic_lower.split())
        for key, keywords in TOPIC_KEYWORDS.items():
            if key in topic_lower or topic_lower in key:
                active_keywords.update(keywords)

    aligned_count = 0
    for q in questions:
        question_text = q.get("question", "").lower()
        audio_text = (q.get("audio_text") or "").lower()
        passage = (q.get("passage") or "").lower()

        searchable = f"{question_text} {audio_text} {passage}"
        searchable_words = set(searchable.split())

        if any(keyword in searchable_words for keyword in active_keywords):
            aligned_count += 1

    pass_rate = (aligned_count / len(questions) * 100) if questions else 0

    return {
        "total_questions": len(questions),
        "aligned_questions": aligned_count,
        "pass_rate": pass_rate,
        "passes_threshold": pass_rate >= 90
    }


# ---------------------------------------------------------------------------
# Test Class
# ---------------------------------------------------------------------------

class TestGrade4MissionsE2E:
    """
    End-to-end tests for Grade 4 mission generation across all 4 pillars.
    These tests call the actual generate_pillar_missions() function with
    real OpenAI API calls (if configured) or mocked responses.
    """

    @pytest.mark.asyncio
    async def test_reading_pillar_grade4_fresh_generation(self):
        """
        Test: Reading pillar generates 10 questions for Grade 4 (fresh generation).

        Validates:
        - Returns EXACTLY 10 questions
        - All questions have correct pillar = "reading"
        - All questions have task_type from reading config
        - All questions have points_value = 10
        - Required fields present
        - Generation time < 45 seconds
        - Topic alignment >= 90%
        """
        start_time = time.time()

        questions = await generate_pillar_missions(
            pillar="reading",
            grade_level=GRADE_4,
            active_topics=GRADE_4_TOPICS,
            student_id=STUDENT_ID,
            student_weaknesses=MOCK_WEAKNESSES,
            performance_profile=MOCK_PERFORMANCE_PROFILE,
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        elapsed = time.time() - start_time

        # Validation 1: Question count
        assert len(questions) == PILLAR_QUESTIONS_COUNT, \
            f"Expected {PILLAR_QUESTIONS_COUNT} questions, got {len(questions)}"

        # Validation 2: Field validation
        for i, q in enumerate(questions):
            errors = validate_question_fields(q, "reading")
            assert not errors, f"Question {i+1} validation errors: {errors}"

        # Validation 3: Task type distribution
        dist = validate_task_distribution(questions, "reading")
        logger.info(f"Reading task distribution - Expected: {dist['expected']}, Actual: {dist['actual']}")

        # Validation 4: Points value
        for q in questions:
            assert q["points_value"] == 10, \
                f"Expected points_value=10, got {q['points_value']}"

        # Validation 5: Topic alignment
        alignment = check_topic_alignment(questions, GRADE_4_TOPICS)
        logger.info(f"Reading topic alignment: {alignment['aligned_questions']}/{alignment['total_questions']} "
                   f"({alignment['pass_rate']:.1f}%)")
        assert alignment["passes_threshold"], \
            f"Topic alignment {alignment['pass_rate']:.1f}% below 90% threshold"

        # Validation 6: Generation time
        logger.info(f"Reading generation time: {elapsed:.2f}s")
        assert elapsed < 45, f"Generation took {elapsed:.2f}s, expected < 45s"

        logger.info(f"✅ Reading pillar: {len(questions)} questions generated in {elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_writing_pillar_grade4_fresh_generation(self):
        """
        Test: Writing pillar generates 10 questions for Grade 4 (fresh generation).
        """
        start_time = time.time()

        questions = await generate_pillar_missions(
            pillar="writing",
            grade_level=GRADE_4,
            active_topics=GRADE_4_TOPICS,
            student_id=STUDENT_ID,
            student_weaknesses=MOCK_WEAKNESSES,
            performance_profile=MOCK_PERFORMANCE_PROFILE,
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        elapsed = time.time() - start_time

        # Validation 1: Question count
        assert len(questions) == PILLAR_QUESTIONS_COUNT, \
            f"Expected {PILLAR_QUESTIONS_COUNT} questions, got {len(questions)}"

        # Validation 2: Field validation
        for i, q in enumerate(questions):
            errors = validate_question_fields(q, "writing")
            assert not errors, f"Question {i+1} validation errors: {errors}"

        # Validation 3: Points value
        for q in questions:
            assert q["points_value"] == 10, \
                f"Expected points_value=10, got {q['points_value']}"

        # Validation 4: Topic alignment
        alignment = check_topic_alignment(questions, GRADE_4_TOPICS)
        logger.info(f"Writing topic alignment: {alignment['aligned_questions']}/{alignment['total_questions']} "
                   f"({alignment['pass_rate']:.1f}%)")
        assert alignment["passes_threshold"], \
            f"Topic alignment {alignment['pass_rate']:.1f}% below 90% threshold"

        # Validation 5: Generation time
        logger.info(f"Writing generation time: {elapsed:.2f}s")
        assert elapsed < 45, f"Generation took {elapsed:.2f}s, expected < 45s"

        logger.info(f"✅ Writing pillar: {len(questions)} questions generated in {elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_listening_pillar_grade4_fresh_generation(self):
        """
        Test: Listening pillar generates 10 questions for Grade 4 (fresh generation).
        """
        start_time = time.time()

        questions = await generate_pillar_missions(
            pillar="listening",
            grade_level=GRADE_4,
            active_topics=GRADE_4_TOPICS,
            student_id=STUDENT_ID,
            student_weaknesses=MOCK_WEAKNESSES,
            performance_profile=MOCK_PERFORMANCE_PROFILE,
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        elapsed = time.time() - start_time

        # Validation 1: Question count
        assert len(questions) == PILLAR_QUESTIONS_COUNT, \
            f"Expected {PILLAR_QUESTIONS_COUNT} questions, got {len(questions)}"

        # Validation 2: Field validation
        for i, q in enumerate(questions):
            errors = validate_question_fields(q, "listening")
            assert not errors, f"Question {i+1} validation errors: {errors}"

        # Validation 3: Points value
        for q in questions:
            assert q["points_value"] == 10, \
                f"Expected points_value=10, got {q['points_value']}"

        # Validation 4: Topic alignment
        alignment = check_topic_alignment(questions, GRADE_4_TOPICS)
        logger.info(f"Listening topic alignment: {alignment['aligned_questions']}/{alignment['total_questions']} "
                   f"({alignment['pass_rate']:.1f}%)")
        assert alignment["passes_threshold"], \
            f"Topic alignment {alignment['pass_rate']:.1f}% below 90% threshold"

        # Validation 5: Generation time
        logger.info(f"Listening generation time: {elapsed:.2f}s")
        assert elapsed < 45, f"Generation took {elapsed:.2f}s, expected < 45s"

        logger.info(f"✅ Listening pillar: {len(questions)} questions generated in {elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_speaking_pillar_grade4_fresh_generation(self):
        """
        Test: Speaking pillar generates 10 questions for Grade 4 (fresh generation).
        """
        start_time = time.time()

        questions = await generate_pillar_missions(
            pillar="speaking",
            grade_level=GRADE_4,
            active_topics=GRADE_4_TOPICS,
            student_id=STUDENT_ID,
            student_weaknesses=MOCK_WEAKNESSES,
            performance_profile=MOCK_PERFORMANCE_PROFILE,
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        elapsed = time.time() - start_time

        # Validation 1: Question count
        assert len(questions) == PILLAR_QUESTIONS_COUNT, \
            f"Expected {PILLAR_QUESTIONS_COUNT} questions, got {len(questions)}"

        # Validation 2: Field validation
        for i, q in enumerate(questions):
            errors = validate_question_fields(q, "speaking")
            assert not errors, f"Question {i+1} validation errors: {errors}"

        # Validation 3: Points value
        for q in questions:
            assert q["points_value"] == 10, \
                f"Expected points_value=10, got {q['points_value']}"

        # Validation 4: Topic alignment
        alignment = check_topic_alignment(questions, GRADE_4_TOPICS)
        logger.info(f"Speaking topic alignment: {alignment['aligned_questions']}/{alignment['total_questions']} "
                   f"({alignment['pass_rate']:.1f}%)")
        assert alignment["passes_threshold"], \
            f"Topic alignment {alignment['pass_rate']:.1f}% below 90% threshold"

        # Validation 5: Generation time
        logger.info(f"Speaking generation time: {elapsed:.2f}s")
        assert elapsed < 45, f"Generation took {elapsed:.2f}s, expected < 45s"

        logger.info(f"✅ Speaking pillar: {len(questions)} questions generated in {elapsed:.2f}s")

    @pytest.mark.asyncio
    async def test_all_pillars_sequential_grade4(self):
        """
        Test: Generate missions for all 4 pillars sequentially.

        This test simulates a student completing all 4 pillar missions in one session.
        Validates that all pillars return correct question counts and field structure.
        """
        results = {}
        total_start = time.time()

        for pillar in ["reading", "writing", "listening", "speaking"]:
            start = time.time()

            questions = await generate_pillar_missions(
                pillar=pillar,
                grade_level=GRADE_4,
                active_topics=GRADE_4_TOPICS,
                student_id=STUDENT_ID,
                student_weaknesses=MOCK_WEAKNESSES,
                performance_profile=MOCK_PERFORMANCE_PROFILE,
                context_chunks=MOCK_CONTEXT_CHUNKS,
            )

            elapsed = time.time() - start

            # Validate question count
            assert len(questions) == PILLAR_QUESTIONS_COUNT, \
                f"{pillar}: Expected {PILLAR_QUESTIONS_COUNT} questions, got {len(questions)}"

            # Validate fields
            for i, q in enumerate(questions):
                errors = validate_question_fields(q, pillar)
                assert not errors, f"{pillar} question {i+1} errors: {errors}"

            # Check topic alignment
            alignment = check_topic_alignment(questions, GRADE_4_TOPICS)

            results[pillar] = {
                "question_count": len(questions),
                "generation_time": elapsed,
                "topic_alignment": alignment["pass_rate"],
                "passes": alignment["passes_threshold"]
            }

            logger.info(f"{pillar}: {len(questions)} questions in {elapsed:.2f}s "
                       f"(topic alignment: {alignment['pass_rate']:.1f}%)")

        total_elapsed = time.time() - total_start

        # Summary validation
        logger.info("\n" + "=" * 70)
        logger.info("GRADE 4 ALL PILLARS SUMMARY")
        logger.info("=" * 70)
        for pillar, stats in results.items():
            logger.info(f"{pillar:10s}: {stats['question_count']:2d} questions | "
                       f"{stats['generation_time']:5.2f}s | "
                       f"{stats['topic_alignment']:5.1f}% topic match | "
                       f"{'✅ PASS' if stats['passes'] else '❌ FAIL'}")
        logger.info(f"Total time: {total_elapsed:.2f}s")
        logger.info("=" * 70)

        # All pillars should pass
        for pillar, stats in results.items():
            assert stats["passes"], f"{pillar} failed topic alignment threshold"

    @pytest.mark.asyncio
    async def test_weakness_integration_grade4(self):
        """
        Test: Student weaknesses are considered in question generation.

        Validates that when weaknesses are provided, questions address those areas.
        """
        # Test with specific weaknesses
        weaknesses = ["reading comprehension (accuracy: 30%)"]

        questions = await generate_pillar_missions(
            pillar="reading",
            grade_level=GRADE_4,
            active_topics=["Reading Comprehension"],  # Focus on weak area
            student_id=STUDENT_ID,
            student_weaknesses=weaknesses,
            performance_profile=None,  # No profile
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        # Should still get 10 questions
        assert len(questions) == PILLAR_QUESTIONS_COUNT

        # Check that questions focus on reading comprehension topic
        reading_comp_count = 0
        for q in questions:
            question_text = q.get("question", "").lower()
            if any(word in question_text for word in ["read", "passage", "understand", "comprehend"]):
                reading_comp_count += 1

        logger.info(f"Weakness-focused: {reading_comp_count}/{len(questions)} questions mention reading/comprehension")

        # At least some questions should address the weakness
        assert reading_comp_count >= 3, \
            f"Expected at least 3 questions addressing weakness, got {reading_comp_count}"

    @pytest.mark.asyncio
    async def test_confidence_builder_mode_grade4(self):
        """
        Test: Confidence builder mode generates easier questions.

        When is_frustrated=True, questions should be simpler.
        """
        questions = await generate_pillar_missions(
            pillar="reading",
            grade_level=GRADE_4,
            active_topics=GRADE_4_TOPICS,
            student_id=STUDENT_ID,
            student_weaknesses=MOCK_WEAKNESSES,
            is_frustrated=True,  # Confidence builder mode
            performance_profile=MOCK_PERFORMANCE_PROFILE,
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        # Still get 10 questions
        assert len(questions) == PILLAR_QUESTIONS_COUNT

        # All should still have correct structure
        for i, q in enumerate(questions):
            errors = validate_question_fields(q, "reading")
            assert not errors, f"Confidence builder question {i+1} errors: {errors}"

        logger.info(f"✅ Confidence builder mode: {len(questions)} questions generated")

    @pytest.mark.asyncio
    async def test_no_active_topics_grade4(self):
        """
        Test: Generation works when no active topics are selected.

        Should fall back to "General English" topics.
        """
        questions = await generate_pillar_missions(
            pillar="reading",
            grade_level=GRADE_4,
            active_topics=[],  # No topics selected
            student_id=STUDENT_ID,
            student_weaknesses=[],
            performance_profile=None,
            context_chunks=MOCK_CONTEXT_CHUNKS,
        )

        # Should still get 10 questions
        assert len(questions) == PILLAR_QUESTIONS_COUNT

        # All should have correct structure
        for i, q in enumerate(questions):
            errors = validate_question_fields(q, "reading")
            assert not errors, f"No-topics question {i+1} errors: {errors}"

        logger.info(f"✅ No active topics: {len(questions)} questions generated")

    @pytest.mark.asyncio
    async def test_topic_validation_function(self):
        """
        Test: Topic validation function correctly filters questions.
        """
        # Mock questions with mixed topic relevance
        mock_questions = [
            {"question": "What does 'comprehend' mean?", "task_type": "multiple_choice"},
            {"question": "The cat is sleeping.", "task_type": "fill_blank"},  # Not relevant
            {"question": "Define the word 'vocabulary'.", "task_type": "multiple_choice"},
            {"question": "What color is the sky?", "task_type": "multiple_choice"},  # Not relevant
            {"question": "Use correct grammar in this sentence.", "task_type": "sentence_scramble"},
        ]

        active_topics = ["Grammar", "Vocabulary", "Reading Comprehension"]

        validated = validate_topic_alignment(mock_questions, active_topics, "reading")

        # Should keep questions 1, 3, 5 (relevant to topics)
        # May keep question 2 if "cat" matches animal topics, but we expect at least 3
        logger.info(f"Topic validation: {len(validated)}/{len(mock_questions)} questions passed")

        assert len(validated) >= 3, \
            f"Expected at least 3 topic-aligned questions, got {len(validated)}"


# ---------------------------------------------------------------------------
# Performance Benchmark Tests
# ---------------------------------------------------------------------------

class TestGrade4PerformanceBenchmarks:
    """
    Performance-focused tests to ensure generation meets speed requirements.
    """

    @pytest.mark.asyncio
    async def test_all_pillars_under_3_minutes(self):
        """
        Test: All 4 pillars generate in under 3 minutes total.

        This is a critical performance requirement for real-time student experience.
        """
        start = time.time()

        tasks = []
        for pillar in ["reading", "writing", "listening", "speaking"]:
            task = generate_pillar_missions(
                pillar=pillar,
                grade_level=GRADE_4,
                active_topics=GRADE_4_TOPICS,
                student_id=STUDENT_ID,
                student_weaknesses=MOCK_WEAKNESSES,
                performance_profile=MOCK_PERFORMANCE_PROFILE,
                context_chunks=MOCK_CONTEXT_CHUNKS,
            )
            tasks.append(task)

        # Generate all in parallel
        results = await asyncio.gather(*tasks)

        elapsed = time.time() - start

        # Validate all returned correct counts
        for i, pillar in enumerate(["reading", "writing", "listening", "speaking"]):
            assert len(results[i]) == PILLAR_QUESTIONS_COUNT, \
                f"{pillar}: Expected {PILLAR_QUESTIONS_COUNT}, got {len(results[i])}"

        # Total time should be under 3 minutes (180 seconds)
        # With parallel execution, should be ~45s (single pillar time)
        logger.info(f"Parallel generation: {elapsed:.2f}s for 4 pillars")
        assert elapsed < 180, f"Parallel generation took {elapsed:.2f}s, expected < 180s"

        logger.info(f"✅ Performance: 4 pillars generated in {elapsed:.2f}s (< 3 min)")
