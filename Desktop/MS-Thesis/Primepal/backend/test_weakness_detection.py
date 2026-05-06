"""
Test script to verify the weakness detection logic.

This script simulates the weakness detection function to validate:
1. Pillar-based accuracy calculation
2. Minimum attempt threshold (3)
3. Weakness threshold (<60% accuracy)
4. Correct formatting of weakness messages
"""


def test_weakness_detection():
    """Test the weakness detection logic with sample data."""

    # Simulate student_interactions data
    test_data = [
        # Reading: 2/5 correct = 40% (should be weakness)
        {"pillar": "reading", "correct": True},
        {"pillar": "reading", "correct": False},
        {"pillar": "reading", "correct": False},
        {"pillar": "reading", "correct": False},
        {"pillar": "reading", "correct": True},

        # Writing: 4/5 correct = 80% (should NOT be weakness)
        {"pillar": "writing", "correct": True},
        {"pillar": "writing", "correct": True},
        {"pillar": "writing", "correct": True},
        {"pillar": "writing", "correct": True},
        {"pillar": "writing", "correct": False},

        # Listening: 2/4 correct = 50% (should be weakness)
        {"pillar": "listening", "correct": True},
        {"pillar": "listening", "correct": False},
        {"pillar": "listening", "correct": False},
        {"pillar": "listening", "correct": True},

        # Speaking: only 2 attempts (should be ignored - below minimum)
        {"pillar": "speaking", "correct": True},
        {"pillar": "speaking", "correct": False},

        # Some null pillars (should be ignored)
        {"pillar": None, "correct": True},
        {"pillar": None, "correct": False},
    ]

    # Replicate the weakness detection logic
    pillar_stats = {}
    for r in test_data:
        p = r.get("pillar")
        if p and p in ["reading", "writing", "listening", "speaking"]:
            if p not in pillar_stats:
                pillar_stats[p] = {"correct": 0, "total": 0}
            pillar_stats[p]["total"] += 1
            if r.get("correct"):
                pillar_stats[p]["correct"] += 1

    # Calculate weaknesses
    weaknesses = []
    for pillar, stats in pillar_stats.items():
        if stats["total"] >= 3:
            acc = stats["correct"] / stats["total"]
            if acc < 0.6:
                weaknesses.append(f"{pillar} (accuracy: {acc*100:.0f}%)")

    # Print results
    print("=== Weakness Detection Test ===\n")
    print("Pillar Statistics:")
    for pillar, stats in pillar_stats.items():
        acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
        print(f"  {pillar:12} {stats['correct']}/{stats['total']} = {acc*100:.1f}%")

    print(f"\nWeaknesses (accuracy < 60%, min 3 attempts):")
    if weaknesses:
        for w in weaknesses:
            print(f"  - {w}")
    else:
        print("  None")

    # Validate expected results
    expected_weaknesses = ["reading", "listening"]
    detected_pillars = [w.split()[0] for w in weaknesses]

    print("\n=== Validation ===")
    if sorted(detected_pillars) == sorted(expected_weaknesses):
        print("[PASS] Correct weaknesses detected")
    else:
        print(f"[FAIL] Expected {expected_weaknesses}, got {detected_pillars}")

    # Check that speaking was excluded (< 3 attempts)
    if "speaking" not in detected_pillars:
        print("[PASS] Speaking excluded (only 2 attempts)")
    else:
        print("[FAIL] Speaking should be excluded (< 3 attempts)")

    # Check that writing was excluded (80% accuracy)
    if "writing" not in detected_pillars:
        print("[PASS] Writing excluded (80% accuracy)")
    else:
        print("[FAIL] Writing should be excluded (>= 60% accuracy)")

    return weaknesses


if __name__ == "__main__":
    result = test_weakness_detection()
    print(f"\n=== Final Result ===")
    print(f"Weaknesses: {result}")
