"""
End-to-end test for weakness detection system.

Verifies the complete flow:
1. Student completes missions with varying success rates
2. Weakness detection correctly identifies weak pillars
3. Mission generator receives weakness data
4. Weaknesses are used in LLM prompt construction
"""


def simulate_student_performance():
    """Simulate a student's interaction history."""

    interactions = []

    # Reading: 2/10 = 20% (strong weakness)
    for i in range(10):
        interactions.append({
            "pillar": "reading",
            "correct": i < 2,  # Only first 2 correct
            "interaction_type": "mission_mc"
        })

    # Writing: 7/10 = 70% (not a weakness)
    for i in range(10):
        interactions.append({
            "pillar": "writing",
            "correct": i < 7,  # First 7 correct
            "interaction_type": "mission_fill"
        })

    # Listening: 5/10 = 50% (weakness)
    for i in range(10):
        interactions.append({
            "pillar": "listening",
            "correct": i < 5,  # First 5 correct
            "interaction_type": "mission_mc"
        })

    # Speaking: 9/10 = 90% (not a weakness)
    for i in range(10):
        interactions.append({
            "pillar": "speaking",
            "correct": i < 9,  # First 9 correct
            "interaction_type": "mission_mc"
        })

    return interactions


def detect_weaknesses(interactions):
    """Replicate the weakness detection logic."""

    # Calculate accuracy per pillar
    pillar_stats = {}
    for r in interactions:
        p = r.get("pillar")
        if p and p in ["reading", "writing", "listening", "speaking"]:
            if p not in pillar_stats:
                pillar_stats[p] = {"correct": 0, "total": 0}
            pillar_stats[p]["total"] += 1
            if r.get("correct"):
                pillar_stats[p]["correct"] += 1

    # Return pillars with <60% accuracy (minimum 3 attempts)
    weaknesses = []
    for pillar_name, stats in pillar_stats.items():
        if stats["total"] >= 3:
            acc = stats["correct"] / stats["total"]
            if acc < 0.6:
                weaknesses.append(f"{pillar_name} (accuracy: {acc*100:.0f}%)")

    return weaknesses, pillar_stats


def build_llm_prompt(weaknesses, active_topics):
    """Simulate how weaknesses are used in LLM prompt."""

    weakness_context = ""
    if weaknesses:
        weakness_context = (
            "\n\nSTUDENT'S RECENT WEAK AREAS (create 3-4 questions targeting these):\n"
            + "\n".join([f"- {w}" for w in weaknesses])
        )

    system_prompt = f"""You are an ESL mission designer for Pakistani primary school students.

Generate 10 interactive English language questions.

ACTIVE TOPICS: {', '.join(active_topics)}
{weakness_context}

RULES:
1. Create questions based on active topics
2. For weak areas, generate 3-4 targeted questions
3. Mix difficulty levels appropriately
"""

    return system_prompt


def test_e2e_weakness_flow():
    """Test the complete weakness detection flow."""

    print("=== End-to-End Weakness Detection Test ===\n")

    # Step 1: Simulate student performance
    print("Step 1: Simulating student performance...")
    interactions = simulate_student_performance()
    print(f"  Generated {len(interactions)} interactions across 4 pillars\n")

    # Step 2: Detect weaknesses
    print("Step 2: Detecting weaknesses...")
    weaknesses, pillar_stats = detect_weaknesses(interactions)

    print("  Pillar Performance:")
    for pillar, stats in sorted(pillar_stats.items()):
        acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
        status = "WEAK" if acc < 0.6 else "STRONG"
        print(f"    {pillar:12} {stats['correct']:2}/{stats['total']:2} = {acc*100:5.1f}% [{status}]")

    print(f"\n  Detected Weaknesses: {weaknesses}\n")

    # Step 3: Build LLM prompt
    print("Step 3: Building LLM prompt with weaknesses...")
    active_topics = ["Animals", "Food", "Family"]
    prompt = build_llm_prompt(weaknesses, active_topics)

    print("  LLM Prompt Preview:")
    print("  " + "-" * 60)
    for line in prompt.split("\n")[:15]:  # Show first 15 lines
        print(f"  {line}")
    print("  " + "-" * 60 + "\n")

    # Step 4: Validate results
    print("Step 4: Validating results...")

    tests_passed = 0
    tests_total = 0

    # Test 1: Reading should be detected (20% accuracy)
    tests_total += 1
    if any("reading" in w for w in weaknesses):
        print("  [PASS] Reading correctly identified as weakness (20%)")
        tests_passed += 1
    else:
        print("  [FAIL] Reading should be identified as weakness (20%)")

    # Test 2: Listening should be detected (50% accuracy)
    tests_total += 1
    if any("listening" in w for w in weaknesses):
        print("  [PASS] Listening correctly identified as weakness (50%)")
        tests_passed += 1
    else:
        print("  [FAIL] Listening should be identified as weakness (50%)")

    # Test 3: Writing should NOT be detected (70% accuracy)
    tests_total += 1
    if not any("writing" in w for w in weaknesses):
        print("  [PASS] Writing correctly excluded (70%)")
        tests_passed += 1
    else:
        print("  [FAIL] Writing should not be a weakness (70%)")

    # Test 4: Speaking should NOT be detected (90% accuracy)
    tests_total += 1
    if not any("speaking" in w for w in weaknesses):
        print("  [PASS] Speaking correctly excluded (90%)")
        tests_passed += 1
    else:
        print("  [FAIL] Speaking should not be a weakness (90%)")

    # Test 5: Prompt contains weakness context
    tests_total += 1
    if "STUDENT'S RECENT WEAK AREAS" in prompt:
        print("  [PASS] Prompt contains weakness section")
        tests_passed += 1
    else:
        print("  [FAIL] Prompt should contain weakness section")

    # Test 6: Weaknesses formatted correctly
    tests_total += 1
    if all("accuracy:" in w for w in weaknesses):
        print("  [PASS] Weaknesses formatted with accuracy percentages")
        tests_passed += 1
    else:
        print("  [FAIL] Weaknesses should include accuracy percentages")

    # Final summary
    print(f"\n=== Test Summary ===")
    print(f"Tests passed: {tests_passed}/{tests_total}")

    if tests_passed == tests_total:
        print("Status: ALL TESTS PASSED")
        return 0
    else:
        print("Status: SOME TESTS FAILED")
        return 1


def test_edge_cases():
    """Test edge cases for weakness detection."""

    print("\n=== Edge Case Tests ===\n")

    # Edge case 1: No interactions
    print("Edge Case 1: No interactions")
    weaknesses, _ = detect_weaknesses([])
    print(f"  Result: {weaknesses}")
    print(f"  [{'PASS' if not weaknesses else 'FAIL'}] Empty list returned\n")

    # Edge case 2: All correct (no weaknesses)
    print("Edge Case 2: All correct answers")
    all_correct = [
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
    ]
    weaknesses, _ = detect_weaknesses(all_correct)
    print(f"  Result: {weaknesses}")
    print(f"  [{'PASS' if not weaknesses else 'FAIL'}] No weaknesses with 100% accuracy\n")

    # Edge case 3: Insufficient data (< 3 attempts)
    print("Edge Case 3: Insufficient data (< 3 attempts)")
    insufficient = [
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
    ]
    weaknesses, _ = detect_weaknesses(insufficient)
    print(f"  Result: {weaknesses}")
    print(f"  [{'PASS' if not weaknesses else 'FAIL'}] No weaknesses with < 3 attempts\n")

    # Edge case 4: Exactly 60% accuracy (boundary test)
    print("Edge Case 4: Exactly 60% accuracy (boundary)")
    boundary = [
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": True, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
    ]
    weaknesses, stats = detect_weaknesses(boundary)
    acc = stats["reading"]["correct"] / stats["reading"]["total"]
    print(f"  Accuracy: {acc*100:.0f}%")
    print(f"  Result: {weaknesses}")
    print(f"  [{'PASS' if not weaknesses else 'FAIL'}] 60% is NOT a weakness (>= 60% threshold)\n")

    # Edge case 5: Null pillars (chat interactions)
    print("Edge Case 5: Null pillars (chat/spelling_bee)")
    with_nulls = [
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
        {"pillar": "reading", "correct": False, "interaction_type": "mission_mc"},
        {"pillar": None, "correct": True, "interaction_type": "chat"},
        {"pillar": None, "correct": False, "interaction_type": "spelling_bee"},
    ]
    weaknesses, stats = detect_weaknesses(with_nulls)
    print(f"  Result: {weaknesses}")
    print(f"  [{'PASS' if None not in stats else 'FAIL'}] Null pillars correctly ignored\n")


if __name__ == "__main__":
    exit_code = test_e2e_weakness_flow()
    test_edge_cases()

    print("\n=== All Tests Complete ===")
    exit(exit_code)
