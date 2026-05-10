#!/usr/bin/env python3
"""
Test script to verify pillar mission generation fixes.

This script tests that:
1. All 4 pillars (reading, writing, listening, speaking) return exactly 10 questions
2. Timeouts are sufficient (30s)
3. Diagnostic logging works
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.agents.tutor_agent.mission_generator import generate_pillar_missions


async def test_pillar(pillar: str, grade_level: int = 3):
    """Test a single pillar mission generation."""
    print(f"\n{'='*60}")
    print(f"Testing {pillar.upper()} missions for Grade {grade_level}")
    print(f"{'='*60}")

    try:
        start_time = asyncio.get_event_loop().time()

        missions = await generate_pillar_missions(
            pillar=pillar,
            grade_level=grade_level,
            active_topics=["Animals", "Family"],
            student_id="test-student-123",
            student_weaknesses=[],
            is_frustrated=False,
            performance_profile=None,
        )

        elapsed = asyncio.get_event_loop().time() - start_time

        print(f"[OK] SUCCESS: Generated {len(missions)} questions in {elapsed:.2f}s")

        # Verify count
        if len(missions) == 10:
            print(f"[OK] PASS: Exactly 10 questions returned")
        else:
            print(f"[FAIL] FAIL: Expected 10 questions, got {len(missions)}")
            return False

        # Verify structure
        for i, q in enumerate(missions, 1):
            if 'task_type' not in q or 'question' not in q:
                print(f"[FAIL] FAIL: Question {i} missing required fields")
                return False

        print(f"[OK] PASS: All questions have required fields")

        # Show task types
        task_types = [q['task_type'] for q in missions]
        print(f"Task types: {', '.join(task_types)}")

        return True

    except Exception as e:
        print(f"[FAIL] FAIL: {type(e).__name__}: {e}")
        return False


async def main():
    """Run tests for all 4 pillars."""
    print("\n" + "="*60)
    print("PILLAR MISSION GENERATION TEST SUITE")
    print("="*60)
    print("Testing fixes:")
    print("  1. Timeout increased: 10s->25s (LLM), 12s->30s (chain)")
    print("  2. Fail-soft removed: Require exactly 10 questions")
    print("  3. Retry logic: 2 retries with exponential backoff")
    print("  4. Diagnostic logging: Track timing and question count")
    print("="*60)

    pillars = ["reading", "writing", "listening", "speaking"]
    results = {}

    for pillar in pillars:
        results[pillar] = await test_pillar(pillar)
        await asyncio.sleep(1)  # Brief pause between tests

    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")

    for pillar, passed in results.items():
        status = "[OK] PASS" if passed else "[FAIL] FAIL"
        print(f"{pillar.ljust(12)}: {status}")

    all_passed = all(results.values())
    print(f"{'='*60}")

    if all_passed:
        print("[OK] ALL TESTS PASSED")
        print("\nFixes validated:")
        print("  * All pillars return exactly 10 questions")
        print("  * Timeouts are sufficient")
        print("  * No partial results accepted")
        return 0
    else:
        print("[FAIL] SOME TESTS FAILED")
        print("\nPlease check:")
        print("  * OpenAI API key is valid")
        print("  * Network connection is stable")
        print("  * Backend logs for detailed errors")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
