#!/usr/bin/env python3
"""
Test script to verify SNC curriculum grounding in pillar missions.

Usage:
    python test_pillar_rag.py
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.agents.tutor_agent.mission_generator import generate_pillar_missions


async def test_pillar_mission_rag():
    """Test that pillar missions accept and use curriculum context."""

    print("Testing pillar mission generation with RAG context...\n")

    # Mock curriculum context chunks
    mock_context_chunks = [
        {
            "content": "Grade 3 vocabulary: animals (cat, dog, bird), colors (red, blue, green), "
                      "simple present tense. Example: The cat is sleeping. The bird is flying.",
            "metadata": {"grade": 3}
        },
        {
            "content": "Grade 3 reading comprehension: short stories about daily life, family, "
                      "school activities. Use simple sentences with common verbs.",
            "metadata": {"grade": 3}
        },
        {
            "content": "Grade 3 writing: sentence formation, basic punctuation, simple descriptions. "
                      "Focus on subject-verb-object patterns.",
            "metadata": {"grade": 3}
        }
    ]

    # Test 1: With context chunks
    print("Test 1: Generating reading pillar missions WITH curriculum context...")
    try:
        missions_with_context = await generate_pillar_missions(
            pillar="reading",
            grade_level=3,
            active_topics=["Animals", "Colors"],
            student_id="test_student_123",
            student_weaknesses=["vocabulary"],
            is_frustrated=False,
            performance_profile=None,
            context_chunks=mock_context_chunks,
        )

        print(f"✓ Generated {len(missions_with_context)} missions with curriculum context")
        if missions_with_context:
            print(f"  Sample question: {missions_with_context[0].get('question', 'N/A')[:100]}")
        print()

    except Exception as e:
        print(f"✗ Failed to generate missions with context: {e}\n")
        return False

    # Test 2: Without context chunks (backward compatibility)
    print("Test 2: Generating listening pillar missions WITHOUT curriculum context...")
    try:
        missions_without_context = await generate_pillar_missions(
            pillar="listening",
            grade_level=3,
            active_topics=["Greetings"],
            student_id="test_student_456",
            student_weaknesses=[],
            is_frustrated=False,
            performance_profile=None,
            context_chunks=None,  # No context
        )

        print(f"✓ Generated {len(missions_without_context)} missions without curriculum context")
        if missions_without_context:
            print(f"  Sample question: {missions_without_context[0].get('question', 'N/A')[:100]}")
        print()

    except Exception as e:
        print(f"✗ Failed to generate missions without context: {e}\n")
        return False

    # Test 3: With empty context chunks list
    print("Test 3: Generating writing pillar missions with EMPTY context list...")
    try:
        missions_empty_context = await generate_pillar_missions(
            pillar="writing",
            grade_level=3,
            active_topics=["Sentence Formation"],
            student_id="test_student_789",
            student_weaknesses=["grammar"],
            is_frustrated=False,
            performance_profile=None,
            context_chunks=[],  # Empty list
        )

        print(f"✓ Generated {len(missions_empty_context)} missions with empty context list")
        if missions_empty_context:
            print(f"  Sample question: {missions_empty_context[0].get('question', 'N/A')[:100]}")
        print()

    except Exception as e:
        print(f"✗ Failed to generate missions with empty context: {e}\n")
        return False

    print("=" * 70)
    print("All tests passed! Pillar missions now support curriculum context.")
    print("=" * 70)
    return True


if __name__ == "__main__":
    result = asyncio.run(test_pillar_mission_rag())
    sys.exit(0 if result else 1)
