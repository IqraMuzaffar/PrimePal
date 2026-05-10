#!/usr/bin/env python3
"""
Demonstration of Grade 4 Mission Generation Test Validation Logic

This script demonstrates the validation checks that the E2E tests perform,
without requiring OpenAI API calls. It shows:

1. Field validation
2. Task type distribution validation
3. Topic alignment checking
4. Points value verification

Run this to understand what the tests validate.
"""

from app.agents.tutor_agent.mission_generator import (
    PILLAR_QUESTIONS_COUNT,
    PILLAR_TASK_CONFIGS,
    TOPIC_KEYWORDS,
)


# Sample mock questions for demonstration
SAMPLE_READING_QUESTIONS = [
    {
        "id": 1,
        "task_type": "sentence_picture_match",
        "pillar": "reading",
        "question": "Which picture matches: 'The grammar book is on the desk'?",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "a",
        "emoji_hint": "📖",
        "urdu_hint": "کتاب میز پر ہے",
        "image_options": [
            {"id": "a", "text": "book", "emoji": "📖"},
            {"id": "b", "text": "cat", "emoji": "🐱"},
            {"id": "c", "text": "car", "emoji": "🚗"},
            {"id": "d", "text": "apple", "emoji": "🍎"},
        ]
    },
    {
        "id": 2,
        "task_type": "sentence_picture_match",
        "pillar": "reading",
        "question": "Match: 'The student is reading a composition'",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "c",
        "emoji_hint": "📚",
        "urdu_hint": "طالب علم پڑھ رہا ہے",
        "image_options": [
            {"id": "a", "text": "running", "emoji": "🏃"},
            {"id": "b", "text": "eating", "emoji": "🍽️"},
            {"id": "c", "text": "reading", "emoji": "📚"},
            {"id": "d", "text": "sleeping", "emoji": "😴"},
        ]
    },
    {
        "id": 3,
        "task_type": "sentence_picture_match",
        "pillar": "reading",
        "question": "Which shows good vocabulary practice?",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "b",
        "emoji_hint": "📓",
        "urdu_hint": "الفاظ کی مشق",
        "image_options": [
            {"id": "a", "text": "playing", "emoji": "⚽"},
            {"id": "b", "text": "writing", "emoji": "✏️"},
            {"id": "c", "text": "running", "emoji": "🏃"},
            {"id": "d", "text": "jumping", "emoji": "🤸"},
        ]
    },
    {
        "id": 4,
        "task_type": "odd_one_out",
        "pillar": "reading",
        "question": "Which word does NOT belong?",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "d",
        "emoji_hint": "🔍",
        "urdu_hint": "کون سا مختلف ہے؟",
        "options": [
            {"id": "a", "text": "noun"},
            {"id": "b", "text": "verb"},
            {"id": "c", "text": "adjective"},
            {"id": "d", "text": "apple"},
        ]
    },
    {
        "id": 5,
        "task_type": "odd_one_out",
        "pillar": "reading",
        "question": "Find the word that doesn't fit:",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "c",
        "emoji_hint": "[FAIL]",
        "urdu_hint": "غلط لفظ تلاش کریں",
        "options": [
            {"id": "a", "text": "reading"},
            {"id": "b", "text": "comprehension"},
            {"id": "c", "text": "bicycle"},
            {"id": "d", "text": "vocabulary"},
        ]
    },
    {
        "id": 6,
        "task_type": "odd_one_out",
        "pillar": "reading",
        "question": "Which is different?",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "b",
        "emoji_hint": "🚫",
        "urdu_hint": "کون سا مختلف ہے؟",
        "options": [
            {"id": "a", "text": "grammar"},
            {"id": "b", "text": "orange"},
            {"id": "c", "text": "composition"},
            {"id": "d", "text": "sentence"},
        ]
    },
    {
        "id": 7,
        "task_type": "fill_blank_word_bank",
        "pillar": "reading",
        "question": "A ___ is a describing word.",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "c",
        "emoji_hint": "📝",
        "urdu_hint": "صفت ایک وصف کرنے والا لفظ ہے",
        "options": [
            {"id": "a", "text": "noun"},
            {"id": "b", "text": "verb"},
            {"id": "c", "text": "adjective"},
            {"id": "d", "text": "adverb"},
        ]
    },
    {
        "id": 8,
        "task_type": "fill_blank_word_bank",
        "pillar": "reading",
        "question": "Good ___ helps you understand better.",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "a",
        "emoji_hint": "🧠",
        "urdu_hint": "اچھی سمجھ",
        "options": [
            {"id": "a", "text": "comprehension"},
            {"id": "b", "text": "jumping"},
            {"id": "c", "text": "running"},
            {"id": "d", "text": "eating"},
        ]
    },
    {
        "id": 9,
        "task_type": "passage_true_false",
        "pillar": "reading",
        "passage": "Grammar is very important. It helps us write correctly. Students should learn grammar rules. This improves their writing skills.",
        "question": "Learning grammar improves writing skills.",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "true",
        "emoji_hint": "✓",
        "urdu_hint": "گرامر سیکھنا لکھنے کی مہارت بہتر بناتا ہے"
    },
    {
        "id": 10,
        "task_type": "passage_true_false",
        "pillar": "reading",
        "passage": "Reading comprehension means understanding what you read. You find the main idea. You identify key details. This is a valuable skill.",
        "question": "Reading comprehension is about understanding text.",
        "difficulty": "medium",
        "points_value": 10,
        "correct_answer": "true",
        "emoji_hint": "📖",
        "urdu_hint": "پڑھنا سمجھنا متن کو سمجھنے کے بارے میں ہے"
    },
]

GRADE_4_TOPICS = [
    "Grammar",
    "Composition",
    "Reading Comprehension",
    "Vocabulary"
]


def validate_question_fields(question: dict, pillar: str) -> list[str]:
    """Validate required fields."""
    errors = []
    required = ["id", "task_type", "pillar", "question", "difficulty",
                "points_value", "correct_answer", "emoji_hint"]

    for field in required:
        if field not in question:
            errors.append(f"Missing field: {field}")

    if question.get("pillar") != pillar:
        errors.append(f"Pillar mismatch: expected {pillar}, got {question.get('pillar')}")

    if question.get("points_value") != 10:
        errors.append(f"Points should be 10, got {question.get('points_value')}")

    task_type = question.get("task_type")
    valid_task_types = [tt for tt, _ in PILLAR_TASK_CONFIGS[pillar]["task_types"]]
    if task_type not in valid_task_types:
        errors.append(f"Invalid task_type '{task_type}' for {pillar}")

    return errors


def validate_task_distribution(questions: list[dict], pillar: str) -> dict:
    """Validate task type distribution."""
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
    """Check topic alignment."""
    active_keywords = set()
    for topic in active_topics:
        topic_lower = topic.lower().strip()
        active_keywords.add(topic_lower)
        active_keywords.update(topic_lower.split())
        for key, keywords in TOPIC_KEYWORDS.items():
            if key in topic_lower or topic_lower in key:
                active_keywords.update(keywords)

    aligned_count = 0
    aligned_questions = []
    unaligned_questions = []

    for q in questions:
        question_text = q.get("question", "").lower()
        passage = (q.get("passage") or "").lower()
        searchable = f"{question_text} {passage}"
        searchable_words = set(searchable.split())

        is_aligned = any(keyword in searchable_words for keyword in active_keywords)

        if is_aligned:
            aligned_count += 1
            aligned_questions.append(q["id"])
        else:
            unaligned_questions.append(q["id"])

    pass_rate = (aligned_count / len(questions) * 100) if questions else 0

    return {
        "total_questions": len(questions),
        "aligned_questions": aligned_count,
        "aligned_ids": aligned_questions,
        "unaligned_ids": unaligned_questions,
        "pass_rate": pass_rate,
        "passes_threshold": pass_rate >= 90
    }


def main():
    """Run demonstration."""
    print("=" * 80)
    print("GRADE 4 MISSION GENERATION TEST VALIDATION DEMONSTRATION")
    print("=" * 80)
    print()

    # Test 1: Question Count
    print("TEST 1: Question Count Validation")
    print("-" * 80)
    print(f"Expected: {PILLAR_QUESTIONS_COUNT} questions")
    print(f"Actual: {len(SAMPLE_READING_QUESTIONS)} questions")
    status = "PASS" if len(SAMPLE_READING_QUESTIONS) == PILLAR_QUESTIONS_COUNT else "FAIL"
    print(f"Status: {status}")
    print()

    # Test 2: Field Validation
    print("TEST 2: Field Validation")
    print("-" * 80)
    all_valid = True
    for i, q in enumerate(SAMPLE_READING_QUESTIONS):
        errors = validate_question_fields(q, "reading")
        if errors:
            print(f"Question {i+1}: [FAIL] FAIL - {errors}")
            all_valid = False

    if all_valid:
        print(f"All {len(SAMPLE_READING_QUESTIONS)} questions have valid fields [PASS]")
    print()

    # Test 3: Points Value
    print("TEST 3: Points Value Validation")
    print("-" * 80)
    all_10_points = all(q.get("points_value") == 10 for q in SAMPLE_READING_QUESTIONS)
    print(f"All questions worth 10 points: {'[PASS] PASS' if all_10_points else '[FAIL] FAIL'}")
    print()

    # Test 4: Task Type Distribution
    print("TEST 4: Task Type Distribution")
    print("-" * 80)
    dist = validate_task_distribution(SAMPLE_READING_QUESTIONS, "reading")
    print(f"Expected distribution:")
    for task_type, count in dist["expected"].items():
        print(f"  - {task_type}: {count}")
    print()
    print(f"Actual distribution:")
    for task_type, count in dist["actual"].items():
        print(f"  - {task_type}: {count}")
    print()
    print(f"Distribution matches: {'[PASS] PASS' if dist['matches'] else '[FAIL] FAIL'}")
    print()

    # Test 5: Topic Alignment
    print("TEST 5: Topic Alignment")
    print("-" * 80)
    print(f"Active Topics: {', '.join(GRADE_4_TOPICS)}")
    print()
    alignment = check_topic_alignment(SAMPLE_READING_QUESTIONS, GRADE_4_TOPICS)
    print(f"Total questions: {alignment['total_questions']}")
    print(f"Aligned questions: {alignment['aligned_questions']}")
    print(f"Aligned IDs: {alignment['aligned_ids']}")
    print(f"Unaligned IDs: {alignment['unaligned_ids']}")
    print(f"Pass rate: {alignment['pass_rate']:.1f}%")
    print(f"Threshold (90%): {'[PASS] PASS' if alignment['passes_threshold'] else '[FAIL] FAIL'}")
    print()

    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    tests = [
        ("Question Count", len(SAMPLE_READING_QUESTIONS) == PILLAR_QUESTIONS_COUNT),
        ("Field Validation", all_valid),
        ("Points Value", all_10_points),
        ("Task Distribution", dist["matches"]),
        ("Topic Alignment", alignment["passes_threshold"]),
    ]

    for test_name, passed in tests:
        status = "[PASS] PASS" if passed else "[FAIL] FAIL"
        print(f"{test_name:20s}: {status}")

    print()
    all_passed = all(passed for _, passed in tests)
    print(f"Overall Status: {'[PASS] ALL TESTS PASSED' if all_passed else '[FAIL] SOME TESTS FAILED'}")
    print("=" * 80)


if __name__ == "__main__":
    main()
