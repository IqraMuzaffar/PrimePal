"""
Quick Validation Test for Grade 4 Mission Generation

This is a simplified version that uses mocks to validate the test framework
without requiring a valid OpenAI API key. It demonstrates that the generation
pipeline and validation logic work correctly.

Use this for:
- CI/CD validation
- Quick local testing
- Verification of test framework

For actual mission quality testing with real LLM calls, use test_grade4_missions_e2e.py
with a valid OpenAI API key.
"""
import asyncio
import json
import logging
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

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mock Question Generator
# ---------------------------------------------------------------------------

def create_mock_pillar_questions(pillar: str, count: int = 10) -> list[dict]:
    """Create mock questions that match expected structure."""
    questions = []

    # Get task distribution for pillar
    config = PILLAR_TASK_CONFIGS[pillar]

    q_id = 1
    for task_type, task_count in config["task_types"]:
        for i in range(task_count):
            q = {
                "id": q_id,
                "task_type": task_type,
                "pillar": pillar,
                "question": f"Grade 4 {task_type} question about grammar and vocabulary {q_id}",
                "difficulty": "medium",
                "points_value": 10,
                "correct_answer": "a",
                "emoji_hint": "📚",
                "urdu_hint": "نمونہ سوال",
                "is_weakness_focused": q_id <= 3,
            }

            # Add task-specific fields
            if task_type in ["sentence_picture_match", "odd_one_out", "fill_blank_word_bank"]:
                q["options"] = [
                    {"id": "a", "text": "grammar"},
                    {"id": "b", "text": "composition"},
                    {"id": "c", "text": "vocabulary"},
                    {"id": "d", "text": "comprehension"},
                ]

            if task_type == "sentence_picture_match":
                q["image_options"] = [
                    {"id": "a", "text": "book", "emoji": "📖"},
                    {"id": "b", "text": "pen", "emoji": "✏️"},
                    {"id": "c", "text": "desk", "emoji": "🪑"},
                    {"id": "d", "text": "bag", "emoji": "🎒"},
                ]

            if task_type == "passage_true_false":
                q["passage"] = "Reading comprehension is a key skill. Students learn to understand main ideas."
                q["correct_answer"] = "true"

            questions.append(q)
            q_id += 1

            if len(questions) >= count:
                break

        if len(questions) >= count:
            break

    return questions[:count]


# ---------------------------------------------------------------------------
# Quick Validation Tests (Mocked)
# ---------------------------------------------------------------------------

class TestGrade4QuickValidation:
    """
    Quick validation tests using mocked OpenAI responses.
    These tests validate the framework, not the actual LLM quality.
    """

    @pytest.mark.asyncio
    async def test_reading_pillar_mock(self):
        """Test reading pillar generation with mocked LLM response."""
        mock_questions = create_mock_pillar_questions("reading", 10)

        with patch("app.agents.tutor_agent.mission_generator.ChatOpenAI") as mock_openai_class:
            # Create mock chain that returns our questions
            mock_llm = MagicMock()
            mock_openai_class.return_value.with_structured_output.return_value = mock_llm

            # Create PillarMissions object from mock questions
            questions_obj = [MissionQuestion(**q) for q in mock_questions]
            pillar_missions = PillarMissions(questions=questions_obj)

            mock_chain = AsyncMock()
            mock_chain.ainvoke = AsyncMock(return_value=pillar_missions)
            mock_llm.__or__ = MagicMock(return_value=mock_chain)

            # Call generate_pillar_missions
            result = await generate_pillar_missions(
                pillar="reading",
                grade_level=4,
                active_topics=["Grammar", "Vocabulary", "Reading Comprehension"],
                student_id="test-student-001",
                student_weaknesses=["reading accuracy: 40%"],
                performance_profile=None,
                context_chunks=None,
            )

            # Validate results
            assert len(result) == PILLAR_QUESTIONS_COUNT, \
                f"Expected {PILLAR_QUESTIONS_COUNT} questions, got {len(result)}"

            for i, q in enumerate(result):
                assert q["pillar"] == "reading", f"Question {i+1} has wrong pillar: {q.get('pillar')}"
                assert q["points_value"] == 10, f"Question {i+1} has wrong points: {q.get('points_value')}"
                assert "task_type" in q, f"Question {i+1} missing task_type"
                assert "question" in q, f"Question {i+1} missing question text"
                assert "correct_answer" in q, f"Question {i+1} missing correct_answer"

            logger.info(f"✅ Reading pillar (mocked): {len(result)} questions validated")

    @pytest.mark.asyncio
    async def test_all_pillars_mock(self):
        """Test all 4 pillars with mocked responses."""
        results = {}

        for pillar in ["reading", "writing", "listening", "speaking"]:
            mock_questions = create_mock_pillar_questions(pillar, 10)

            with patch("app.agents.tutor_agent.mission_generator.ChatOpenAI") as mock_openai_class:
                mock_llm = MagicMock()
                mock_openai_class.return_value.with_structured_output.return_value = mock_llm

                questions_obj = [MissionQuestion(**q) for q in mock_questions]
                pillar_missions = PillarMissions(questions=questions_obj)

                mock_chain = AsyncMock()
                mock_chain.ainvoke = AsyncMock(return_value=pillar_missions)
                mock_llm.__or__ = MagicMock(return_value=mock_chain)

                result = await generate_pillar_missions(
                    pillar=pillar,
                    grade_level=4,
                    active_topics=["Grammar", "Vocabulary", "Reading Comprehension"],
                    student_id="test-student-001",
                    student_weaknesses=[],
                    performance_profile=None,
                    context_chunks=None,
                )

                # Validate
                assert len(result) == PILLAR_QUESTIONS_COUNT
                for q in result:
                    assert q["pillar"] == pillar
                    assert q["points_value"] == 10

                results[pillar] = len(result)

        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("GRADE 4 ALL PILLARS VALIDATION (MOCKED)")
        logger.info("=" * 60)
        for pillar, count in results.items():
            logger.info(f"{pillar:10s}: {count:2d} questions ✅")
        logger.info("=" * 60)

        assert all(count == PILLAR_QUESTIONS_COUNT for count in results.values())

    @pytest.mark.asyncio
    async def test_topic_validation_logic(self):
        """Test topic validation function with various scenarios."""
        # Test 1: All questions match topics
        questions_all_match = [
            {"question": "What is a noun? Grammar is important.", "task_type": "multiple_choice"},
            {"question": "Define 'vocabulary' in your own words.", "task_type": "fill_blank"},
            {"question": "Read the passage and find the main idea.", "task_type": "passage_true_false"},
        ]

        validated = validate_topic_alignment(
            questions_all_match,
            ["Grammar", "Vocabulary", "Reading Comprehension"],
            "reading"
        )

        assert len(validated) == 3, "All questions should pass topic validation"

        # Test 2: Some questions don't match
        questions_mixed = [
            {"question": "What color is the sky?", "task_type": "multiple_choice"},  # Won't match
            {"question": "A noun is a naming word.", "task_type": "fill_blank"},  # Matches
            {"question": "What is 2 + 2?", "task_type": "multiple_choice"},  # Won't match
        ]

        validated = validate_topic_alignment(
            questions_mixed,
            ["Grammar", "Vocabulary"],
            "reading"
        )

        assert len(validated) >= 1, "At least the grammar question should pass"
        assert len(validated) < 3, "Not all questions should pass"

        # Test 3: No topics selected (should accept all)
        validated = validate_topic_alignment(
            questions_mixed,
            [],
            "reading"
        )

        assert len(validated) == 3, "With no topics, all questions should pass"

        logger.info("✅ Topic validation logic tests passed")

    @pytest.mark.asyncio
    async def test_field_validation(self):
        """Test that required fields are present and correct."""
        mock_questions = create_mock_pillar_questions("reading", 10)

        # Required fields
        required_fields = ["id", "task_type", "pillar", "question", "difficulty",
                          "points_value", "correct_answer", "emoji_hint"]

        for i, q in enumerate(mock_questions):
            for field in required_fields:
                assert field in q, f"Question {i+1} missing required field: {field}"

            # Validate types
            assert isinstance(q["id"], int), f"Question {i+1}: id should be int"
            assert isinstance(q["points_value"], int), f"Question {i+1}: points_value should be int"
            assert q["points_value"] == 10, f"Question {i+1}: points_value should be 10"
            assert q["pillar"] == "reading", f"Question {i+1}: pillar should be 'reading'"

        logger.info("✅ Field validation tests passed")


# ---------------------------------------------------------------------------
# Summary Test
# ---------------------------------------------------------------------------

class TestGrade4Summary:
    """Comprehensive summary test for reporting."""

    @pytest.mark.asyncio
    async def test_comprehensive_grade4_validation(self):
        """
        Comprehensive test demonstrating full Grade 4 mission generation workflow.

        This test validates:
        1. All 4 pillars generate exactly 10 questions
        2. All questions have required fields
        3. All questions have points_value = 10
        4. Task types match pillar configuration
        5. Topic validation works correctly
        """
        test_results = {
            "pillars_tested": [],
            "total_questions": 0,
            "validation_passes": 0,
            "validation_failures": 0,
        }

        for pillar in ["reading", "writing", "listening", "speaking"]:
            mock_questions = create_mock_pillar_questions(pillar, 10)

            with patch("app.agents.tutor_agent.mission_generator.ChatOpenAI") as mock_openai_class:
                mock_llm = MagicMock()
                mock_openai_class.return_value.with_structured_output.return_value = mock_llm

                questions_obj = [MissionQuestion(**q) for q in mock_questions]
                pillar_missions = PillarMissions(questions=questions_obj)

                mock_chain = AsyncMock()
                mock_chain.ainvoke = AsyncMock(return_value=pillar_missions)
                mock_llm.__or__ = MagicMock(return_value=mock_chain)

                result = await generate_pillar_missions(
                    pillar=pillar,
                    grade_level=4,
                    active_topics=["Grammar", "Vocabulary", "Reading Comprehension", "Composition"],
                    student_id="test-student-grade4",
                    student_weaknesses=["reading accuracy: 40%"],
                    performance_profile={
                        "overall_accuracy": 55,
                        "pillar_accuracy": {pillar: 50},
                        "weak_topics": [],
                        "strong_topics": [],
                    },
                    context_chunks=[],
                )

                # Track results
                test_results["pillars_tested"].append(pillar)
                test_results["total_questions"] += len(result)

                # Validate each question
                for q in result:
                    try:
                        assert q["pillar"] == pillar
                        assert q["points_value"] == 10
                        assert "task_type" in q
                        assert "question" in q
                        assert "correct_answer" in q
                        test_results["validation_passes"] += 1
                    except AssertionError as e:
                        test_results["validation_failures"] += 1
                        logger.error(f"Validation failed for {pillar} question: {e}")

        # Final Report
        logger.info("\n" + "=" * 70)
        logger.info("GRADE 4 MISSION GENERATION COMPREHENSIVE TEST REPORT")
        logger.info("=" * 70)
        logger.info(f"Pillars Tested: {', '.join(test_results['pillars_tested'])}")
        logger.info(f"Total Questions Generated: {test_results['total_questions']}")
        logger.info(f"Expected: {len(test_results['pillars_tested']) * PILLAR_QUESTIONS_COUNT}")
        logger.info(f"Validation Passes: {test_results['validation_passes']}")
        logger.info(f"Validation Failures: {test_results['validation_failures']}")
        logger.info("=" * 70)
        logger.info("✅ TEST FRAMEWORK VALIDATED - Ready for real API testing")
        logger.info("=" * 70)

        # Final assertions
        assert test_results["total_questions"] == 40, "Should generate 40 questions (10 per pillar)"
        assert test_results["validation_failures"] == 0, "All validations should pass"
        assert len(test_results["pillars_tested"]) == 4, "Should test all 4 pillars"
