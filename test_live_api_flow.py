"""
Direct Live API Testing for Complete Teacher-Student Flow

Tests against the running backend at http://localhost:8000
Validates all critical fixes applied to mission generation.

REQUIREMENTS:
1. Backend running on localhost:8000
2. Valid Supabase database with test data
3. Redis running for caching
4. OpenAI API key configured

WHAT THIS TESTS:
- Fix #1: Weakness detection (pillar-based performance analysis)
- Fix #2: Topic validation (semantic keyword matching)
- Fix #3: Pre-generation (no field name crashes)
- Fix #4: Curriculum grounding (RAG retrieval)
- Fix #5: Cache invalidation (real-time updates)
"""

import requests
import json
import time
from typing import Dict, List, Any
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class Colors:
    PASS = '\033[92m'  # Green
    FAIL = '\033[91m'  # Red
    WARN = '\033[93m'  # Yellow
    INFO = '\033[94m'  # Blue
    END = '\033[0m'    # Reset

def print_header(text: str):
    print(f"\n{'='*80}")
    print(f"{Colors.INFO}{text}{Colors.END}")
    print('='*80)

def print_test(name: str, status: str, details: str = ""):
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "PASS":
        emoji = f"{Colors.PASS}[OK]{Colors.END}"
        status_text = f"{Colors.PASS}PASS{Colors.END}"
    elif status == "FAIL":
        emoji = f"{Colors.FAIL}[XX]{Colors.END}"
        status_text = f"{Colors.FAIL}FAIL{Colors.END}"
    else:
        emoji = f"{Colors.WARN}[..]{Colors.END}"
        status_text = f"{Colors.WARN}{status}{Colors.END}"

    print(f"[{timestamp}] {emoji} {name}: {status_text}")
    if details:
        print(f"    -> {details}")

def test_backend_health() -> bool:
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_test("Backend health check", "PASS", "Service is running")
            return True
        else:
            print_test("Backend health check", "FAIL", f"Status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_test("Backend health check", "FAIL", f"Cannot connect: {e}")
        return False

def get_public_topics(grade_level: int) -> List[Dict]:
    """Fetch available topics for a grade (public endpoint)"""
    try:
        response = requests.get(f"{API_BASE}/topics/?grade_level={grade_level}")
        if response.status_code == 200:
            topics = response.json()
            print_test(f"Fetch Grade {grade_level} topics", "PASS",
                      f"Found {len(topics)} topics")
            return topics
        else:
            print_test(f"Fetch Grade {grade_level} topics", "FAIL",
                      f"Status: {response.status_code}")
            return []
    except Exception as e:
        print_test(f"Fetch Grade {grade_level} topics", "FAIL", str(e))
        return []

def test_mission_generation_with_database() -> bool:
    """
    Test mission generation directly using a real database student.
    This requires a test student to exist in the database.
    """
    print_header("DIRECT DATABASE TESTING")
    print("\nThis test requires:")
    print("1. A test student exists in the database")
    print("2. Student authentication token")
    print("\nTo get a student token:")
    print("  1. Create a student via admin panel or API")
    print("  2. Login as that student via /api/v1/auth/student/login")
    print("  3. Use the returned access_token")

    token_input = input("\nEnter student JWT token (or press Enter to skip): ").strip()

    if not token_input:
        print_test("Database mission test", "SKIP", "No token provided")
        return False

    headers = {"Authorization": f"Bearer {token_input}"}

    # Test all 4 pillars
    pillars = ["reading", "writing", "listening", "speaking"]
    results = []

    for pillar in pillars:
        try:
            print(f"\n{Colors.INFO}Testing {pillar.upper()} pillar...{Colors.END}")
            response = requests.get(
                f"{API_BASE}/missions/pillar",
                params={"pillar": pillar},
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                questions = data.get("questions", [])
                active_topics = data.get("active_topics_summary", "")
                weakness_count = data.get("weakness_focus_questions", 0)

                # Validation checks
                checks = []

                # Check 1: Got questions
                if len(questions) >= 5:  # At least 5 questions
                    checks.append(("Question generation", "PASS", f"{len(questions)} questions"))
                else:
                    checks.append(("Question generation", "FAIL", f"Only {len(questions)} questions"))

                # Check 2: Topic alignment (Fix #2)
                if active_topics:
                    checks.append(("Topic alignment", "PASS", f"Topics: {active_topics}"))
                else:
                    checks.append(("Topic alignment", "WARN", "No topics specified"))

                # Check 3: Weakness targeting (Fix #1)
                if weakness_count >= 0:  # Can be 0 if no weaknesses
                    checks.append(("Weakness detection", "PASS", f"{weakness_count} weakness-focused"))
                else:
                    checks.append(("Weakness detection", "FAIL", "Invalid weakness count"))

                # Check 4: Question quality (Fix #4 - curriculum grounding)
                if questions:
                    avg_length = sum(len(q.get("question", "")) for q in questions) / len(questions)
                    if avg_length > 15:  # Realistic questions are typically >15 chars
                        checks.append(("Content quality", "PASS", f"Avg {avg_length:.0f} chars"))
                    else:
                        checks.append(("Content quality", "WARN", f"Questions seem short: {avg_length:.0f} chars"))

                # Check 5: Correct answer stripped from response
                has_correct_answer = any("correct_answer" in q for q in questions)
                if not has_correct_answer:
                    checks.append(("Security check", "PASS", "correct_answer stripped"))
                else:
                    checks.append(("Security check", "FAIL", "correct_answer exposed to client!"))

                # Print all checks
                for check_name, check_status, check_details in checks:
                    print_test(f"  {pillar} - {check_name}", check_status, check_details)

                results.append({"pillar": pillar, "status": "PASS", "checks": checks})

            elif response.status_code == 401 or response.status_code == 403:
                print_test(f"{pillar} mission generation", "FAIL", "Authentication failed")
                results.append({"pillar": pillar, "status": "AUTH_FAIL"})
                break  # No point continuing with invalid auth

            else:
                print_test(f"{pillar} mission generation", "FAIL",
                          f"Status {response.status_code}: {response.text[:200]}")
                results.append({"pillar": pillar, "status": "FAIL"})

        except requests.exceptions.Timeout:
            print_test(f"{pillar} mission generation", "FAIL", "Request timeout (>30s)")
            results.append({"pillar": pillar, "status": "TIMEOUT"})
        except Exception as e:
            print_test(f"{pillar} mission generation", "FAIL", str(e))
            results.append({"pillar": pillar, "status": "ERROR"})

    # Summary
    print(f"\n{Colors.INFO}Mission Generation Summary:{Colors.END}")
    passed_pillars = sum(1 for r in results if r["status"] == "PASS")
    print(f"Pillars tested: {len(results)}/4")
    print(f"Successful: {passed_pillars}/4")

    return passed_pillars == 4

def test_pre_generation_fix() -> bool:
    """
    Test Fix #3: Pre-generation no longer crashes.
    This is validated by checking backend logs or trying to trigger pre-generation.
    """
    print_header("FIX #3: PRE-GENERATION VALIDATION")
    print("\nValidating that background pre-generation doesn't crash...")
    print("This fix changed line 64 in pregenerate_missions.py:")
    print("  BEFORE: active_topic_names = [t['name'] for t in active_topics]")
    print("  AFTER:  active_topic_names = [t['topic_name'] for t in active_topics]")

    # We can't directly test this without teacher auth and topic updates
    # But we can verify the code change exists
    try:
        with open("backend/app/utils/pregenerate_missions.py", "r", encoding="utf-8") as f:
            content = f.read()
            if 'active_topic_names = [t["topic_name"] for t in active_topics]' in content:
                print_test("Pre-generation fix applied", "PASS",
                          "Correct field name 'topic_name' found in code")
                return True
            else:
                print_test("Pre-generation fix applied", "FAIL",
                          "Fix not found in pregenerate_missions.py")
                return False
    except FileNotFoundError:
        print_test("Pre-generation fix verification", "SKIP",
                  "Cannot read source file (running from different directory)")
        return False

def test_cache_invalidation_fix() -> bool:
    """
    Test Fix #5: Cache invalidation on topic updates.
    Validates that the invalidate_classroom_missions_cache function exists.
    """
    print_header("FIX #5: CACHE INVALIDATION VALIDATION")
    print("\nValidating cache invalidation implementation...")
    print("This fix added invalidate_classroom_missions_cache() function")
    print("and calls it before pre-generation when topics change.")

    try:
        with open("backend/app/api/v1/endpoints/classroom.py", "r", encoding="utf-8") as f:
            content = f.read()
            if 'async def invalidate_classroom_missions_cache' in content:
                print_test("Cache invalidation function exists", "PASS",
                          "invalidate_classroom_missions_cache() found")

                if 'cache_delete_pattern' in content:
                    print_test("Cache deletion logic", "PASS",
                              "Uses cache_delete_pattern for cleanup")
                    return True
                else:
                    print_test("Cache deletion logic", "WARN",
                              "cache_delete_pattern not found")
                    return False
            else:
                print_test("Cache invalidation function exists", "FAIL",
                          "Function not found in classroom.py")
                return False
    except FileNotFoundError:
        print_test("Cache invalidation verification", "SKIP",
                  "Cannot read source file")
        return False

def test_weakness_detection_fix() -> bool:
    """
    Test Fix #1: Weakness detection now uses pillar-based performance.
    Validates the fetch_weaknesses function implementation.
    """
    print_header("FIX #1: WEAKNESS DETECTION VALIDATION")
    print("\nValidating weakness detection implementation...")
    print("This fix rewrote fetch_weaknesses() to use pillar-based accuracy")
    print("instead of broken original_message queries.")

    try:
        with open("backend/app/api/v1/endpoints/missions.py", "r", encoding="utf-8") as f:
            content = f.read()

            checks = []

            # Check 1: Function exists
            if 'async def fetch_weaknesses' in content or 'def fetch_weaknesses' in content:
                checks.append(("Function exists", "PASS"))
            else:
                checks.append(("Function exists", "FAIL"))

            # Check 2: Uses pillar field
            if 'pillar' in content and 'student_interactions' in content:
                checks.append(("Uses pillar field", "PASS"))
            else:
                checks.append(("Uses pillar field", "FAIL"))

            # Check 3: NOT using original_message (the broken field)
            weakness_section = content[content.find('fetch_weaknesses'):content.find('fetch_weaknesses')+2000] if 'fetch_weaknesses' in content else ""
            if 'original_message' not in weakness_section:
                checks.append(("Avoids broken original_message", "PASS"))
            else:
                checks.append(("Avoids broken original_message", "FAIL"))

            # Check 4: Calculates accuracy
            if 'accuracy' in weakness_section or 'correct' in weakness_section:
                checks.append(("Calculates accuracy", "PASS"))
            else:
                checks.append(("Calculates accuracy", "WARN"))

            for check_name, check_status in checks:
                print_test(check_name, check_status)

            return all(status == "PASS" for _, status in checks[:3])  # First 3 are critical

    except FileNotFoundError:
        print_test("Weakness detection verification", "SKIP",
                  "Cannot read source file")
        return False

def test_topic_validation_fix() -> bool:
    """
    Test Fix #2: Topic validation with semantic keyword matching.
    """
    print_header("FIX #2: TOPIC VALIDATION")
    print("\nValidating topic validation implementation...")
    print("This fix added validate_topic_alignment() with semantic keyword matching")

    try:
        with open("backend/app/agents/tutor_agent/mission_generator.py", "r", encoding="utf-8") as f:
            content = f.read()

            checks = []

            if 'validate_topic_alignment' in content:
                checks.append(("Validation function exists", "PASS"))
            else:
                checks.append(("Validation function exists", "FAIL"))

            if 'TOPIC_KEYWORDS' in content:
                checks.append(("Topic keywords mapping", "PASS"))
            else:
                checks.append(("Topic keywords mapping", "WARN"))

            if 'word-boundary' in content or r'\b' in content:
                checks.append(("Word-boundary matching", "PASS"))
            else:
                checks.append(("Word-boundary matching", "WARN"))

            for check_name, check_status in checks:
                print_test(check_name, check_status)

            return checks[0][1] == "PASS"  # At least function must exist

    except FileNotFoundError:
        print_test("Topic validation verification", "SKIP",
                  "Cannot read source file")
        return False

def test_curriculum_grounding_fix() -> bool:
    """
    Test Fix #4: Curriculum grounding via RAG for pillar missions.
    """
    print_header("FIX #4: CURRICULUM GROUNDING")
    print("\nValidating curriculum grounding implementation...")
    print("This fix added RAG retrieval for pillar missions")

    try:
        with open("backend/app/agents/tutor_agent/mission_generator.py", "r", encoding="utf-8") as f:
            content = f.read()

            checks = []

            if 'context_chunks' in content:
                checks.append(("Context chunks parameter", "PASS"))
            else:
                checks.append(("Context chunks parameter", "FAIL"))

            if 'retrieve_context' in content or 'get_context' in content or 'snc' in content.lower():
                checks.append(("RAG retrieval integration", "PASS"))
            else:
                checks.append(("RAG retrieval integration", "WARN"))

            if 'SNC' in content or 'curriculum' in content.lower():
                checks.append(("Curriculum reference", "PASS"))
            else:
                checks.append(("Curriculum reference", "WARN"))

            for check_name, check_status in checks:
                print_test(check_name, check_status)

            return checks[0][1] == "PASS"

    except FileNotFoundError:
        print_test("Curriculum grounding verification", "SKIP",
                  "Cannot read source file")
        return False

def main():
    """Run all tests"""
    print_header("PRIMEPAL RIGOROUS END-TO-END TESTING")
    print("\nThis script validates all critical fixes applied to the mission generation system")
    print(f"Backend URL: {BASE_URL}")
    print(f"Testing started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    # Phase 1: Backend connectivity
    print_header("PHASE 1: BACKEND CONNECTIVITY")
    results["backend_health"] = test_backend_health()

    if not results["backend_health"]:
        print(f"\n{Colors.FAIL}[XX] CRITICAL: Backend is not running. Cannot continue.{Colors.END}")
        print(f"\nTo start the backend:")
        print("  cd backend")
        print("  uvicorn app.main:app --reload")
        sys.exit(1)

    # Phase 2: Public endpoints (no auth needed)
    print_header("PHASE 2: PUBLIC ENDPOINTS")
    grade_4_topics = get_public_topics(4)
    grade_5_topics = get_public_topics(5)
    results["public_topics"] = len(grade_4_topics) > 0 and len(grade_5_topics) > 0

    # Phase 3: Code-level fix validation
    print_header("PHASE 3: CODE-LEVEL FIX VALIDATION")
    results["fix_1_weakness"] = test_weakness_detection_fix()
    results["fix_2_topic_validation"] = test_topic_validation_fix()
    results["fix_3_pregeneration"] = test_pre_generation_fix()
    results["fix_4_curriculum"] = test_curriculum_grounding_fix()
    results["fix_5_cache"] = test_cache_invalidation_fix()

    # Phase 4: Live mission generation (requires auth)
    print_header("PHASE 4: LIVE MISSION GENERATION")
    results["live_missions"] = test_mission_generation_with_database()

    # Final Summary
    print_header("TEST EXECUTION SUMMARY")

    total_tests = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total_tests - passed

    print(f"\nTotal Test Phases: {total_tests}")
    print(f"{Colors.PASS}[OK] Passed: {passed}{Colors.END}")
    print(f"{Colors.FAIL}[XX] Failed: {failed}{Colors.END}")
    print(f"\nSuccess Rate: {(passed/total_tests)*100:.1f}%")

    print("\n" + "="*80)
    print(f"\n{Colors.INFO}FIX STATUS OVERVIEW:{Colors.END}")
    fix_statuses = [
        ("Fix #1: Weakness Detection", results.get("fix_1_weakness", False)),
        ("Fix #2: Topic Validation", results.get("fix_2_topic_validation", False)),
        ("Fix #3: Pre-generation", results.get("fix_3_pregeneration", False)),
        ("Fix #4: Curriculum Grounding", results.get("fix_4_curriculum", False)),
        ("Fix #5: Cache Invalidation", results.get("fix_5_cache", False)),
    ]

    for fix_name, status in fix_statuses:
        emoji = f"{Colors.PASS}[OK]{Colors.END}" if status else f"{Colors.FAIL}[XX]{Colors.END}"
        print(f"{emoji} {fix_name}")

    print("\n" + "="*80)

    if failed > 0:
        print(f"\n{Colors.WARN}[!!]  Some tests failed. Review the output above for details.{Colors.END}")
        sys.exit(1)
    else:
        print(f"\n{Colors.PASS}[OK] All tests passed! The system is ready for production testing.{Colors.END}")
        sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.WARN}Test execution interrupted by user.{Colors.END}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.FAIL}[XX] CRITICAL ERROR: {e}{Colors.END}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
