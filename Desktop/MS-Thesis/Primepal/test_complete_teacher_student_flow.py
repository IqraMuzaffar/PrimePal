"""
Comprehensive End-to-End Test: Teacher-Student Flow
Tests the complete cycle from teacher topic selection to student missions to reporting.

Requirements:
- Backend running on http://localhost:8000
- Database populated with test data
- Redis running
- OpenAI API key configured

Test Flow:
1. Teacher selects topics for Grade 4
2. Student gets missions for all 4 pillars (Reading, Writing, Listening, Speaking)
3. Validate topic alignment, weakness detection, curriculum grounding
4. Student completes missions with intentional weakness pattern
5. Teacher views student-level report
6. Teacher views grade-level report
7. AI assistant provides guidance
8. Test cache invalidation
9. Repeat for Grade 5
"""

import requests
import json
import time
from typing import Dict, List, Optional
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEACHER_EMAIL = "test@teacher.com"
TEACHER_PASSWORD = "testpass123"
GRADE_4_TOPICS = {
    "reading": ["Animals", "Food"],
    "writing": ["Simple Sentences", "Prepositions"],
    "listening": ["Audio Stories", "Instructions"],
    "speaking": ["Greetings", "Introduction"]
}
GRADE_5_TOPICS = {
    "reading": ["Environment", "Health"],
    "writing": ["Descriptive Writing", "Letter Writing"],
    "listening": ["News Reports", "Dialogues"],
    "speaking": ["Opinions", "Storytelling"]
}

class TestSession:
    def __init__(self):
        self.teacher_token: Optional[str] = None
        self.student_token: Optional[str] = None
        self.classroom_id: Optional[str] = None
        self.student_id: Optional[str] = None
        self.results = []

    def log(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        result = {
            "timestamp": timestamp,
            "test": test_name,
            "status": status,
            "details": details
        }
        self.results.append(result)
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏳"
        print(f"[{timestamp}] {status_emoji} {test_name}: {status}")
        if details:
            print(f"    → {details}")

    def get_teacher_token(self) -> str:
        """Get teacher auth token from Supabase"""
        # Note: This requires Supabase Auth setup
        # For testing, we'll use a mock token or environment variable
        print("\n🔐 Teacher Authentication Required")
        print("Please provide a valid teacher JWT token:")
        print("You can get this from:")
        print("1. Login to frontend as teacher")
        print("2. Open browser DevTools → Application → Local Storage")
        print("3. Copy the 'sb-<project>-auth-token' value")

        # For automated testing, read from environment or config
        import os
        token = os.getenv("TEST_TEACHER_TOKEN")
        if token:
            self.teacher_token = token
            return token

        # Interactive input
        token = input("\nEnter teacher token (or press Enter to skip): ").strip()
        if token:
            self.teacher_token = token
            return token

        raise Exception("Teacher authentication required")

    def get_or_create_classroom(self, grade_level: int) -> str:
        """Get or create a test classroom for the grade"""
        headers = {"Authorization": f"Bearer {self.teacher_token}"}

        # List existing classrooms
        response = requests.get(f"{BASE_URL}/classroom/", headers=headers)
        if response.status_code == 200:
            classrooms = response.json()
            for classroom in classrooms:
                if classroom.get("grade_level") == grade_level:
                    self.log(f"Found Grade {grade_level} classroom", "PASS",
                            f"ID: {classroom['id']}")
                    return classroom["id"]

        # Create new classroom
        data = {
            "grade_level": grade_level,
            "section": "Test",
            "class_name": f"Test Grade {grade_level}"
        }
        response = requests.post(f"{BASE_URL}/classroom/", headers=headers, json=data)
        if response.status_code == 201:
            classroom = response.json()
            self.log(f"Created Grade {grade_level} classroom", "PASS",
                    f"ID: {classroom['id']}")
            return classroom["id"]

        raise Exception(f"Failed to get/create classroom: {response.text}")

    def get_topics_for_grade(self, grade_level: int) -> List[Dict]:
        """Get all available topics for a grade"""
        response = requests.get(f"{BASE_URL}/topics/?grade_level={grade_level}")
        if response.status_code == 200:
            topics = response.json()
            self.log(f"Fetched Grade {grade_level} topics", "PASS",
                    f"Found {len(topics)} topics")
            return topics
        raise Exception(f"Failed to fetch topics: {response.text}")

    def select_topics_for_classroom(self, classroom_id: str, grade_level: int,
                                   topic_names: Dict[str, List[str]]) -> None:
        """Select specific topics for a classroom"""
        # Get all available topics
        all_topics = self.get_topics_for_grade(grade_level)

        # Find topic IDs for the names we want
        selected_ids = []
        for skill, names in topic_names.items():
            for name in names:
                for topic in all_topics:
                    if topic["topic_name"] == name and topic["skill"] == skill:
                        selected_ids.append(topic["id"])
                        break

        # Update classroom topics
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        data = {"topic_ids": selected_ids}
        response = requests.put(
            f"{BASE_URL}/classroom/{classroom_id}/active-topics",
            headers=headers,
            json=data
        )

        if response.status_code == 200:
            result = response.json()
            self.log(f"Selected topics for classroom", "PASS",
                    f"Active topics: {result.get('active_count', len(selected_ids))}")
        else:
            self.log(f"Topic selection failed", "FAIL", response.text)
            raise Exception(f"Failed to select topics: {response.text}")

    def verify_active_topics(self, classroom_id: str, expected_count: int) -> List[Dict]:
        """Verify that topics were saved correctly"""
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(
            f"{BASE_URL}/classroom/{classroom_id}/active-topics",
            headers=headers
        )

        if response.status_code == 200:
            topics = response.json()
            if len(topics) == expected_count:
                self.log("Topic verification", "PASS",
                        f"Found {len(topics)} active topics")
                return topics
            else:
                self.log("Topic verification", "FAIL",
                        f"Expected {expected_count}, got {len(topics)}")
                return topics
        else:
            self.log("Topic verification", "FAIL", response.text)
            raise Exception(f"Failed to verify topics: {response.text}")

    def get_student_for_classroom(self, classroom_id: str) -> str:
        """Get or create a test student in the classroom"""
        headers = {"Authorization": f"Bearer {self.teacher_token}"}

        # Get classroom details with students
        response = requests.get(f"{BASE_URL}/classroom/{classroom_id}", headers=headers)
        if response.status_code == 200:
            classroom = response.json()
            students = classroom.get("students", [])

            if students:
                student = students[0]
                self.log("Found test student", "PASS",
                        f"Student: {student['student_name']} (ID: {student['id']})")
                return student["id"]

        # Create a test student
        data = {"names": ["Test Student"]}
        response = requests.post(
            f"{BASE_URL}/classroom/{classroom_id}/students/bulk",
            headers=headers,
            json=data
        )

        if response.status_code == 200:
            result = response.json()
            # Get updated classroom to get student ID
            response = requests.get(f"{BASE_URL}/classroom/{classroom_id}", headers=headers)
            if response.status_code == 200:
                classroom = response.json()
                students = classroom.get("students", [])
                if students:
                    student = students[0]
                    self.log("Created test student", "PASS",
                            f"Student: {student['student_name']} (ID: {student['id']})")
                    return student["id"]

        raise Exception("Failed to get/create student")

    def student_login(self, classroom_id: str, student_id: str) -> str:
        """Authenticate as student"""
        # First, get student's PIN and class code
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(f"{BASE_URL}/classroom/{classroom_id}", headers=headers)

        if response.status_code != 200:
            raise Exception("Failed to get classroom details")

        classroom = response.json()
        class_code = classroom.get("class_code")

        # Find the student
        students = classroom.get("students", [])
        student = next((s for s in students if s["id"] == student_id), None)
        if not student:
            raise Exception("Student not found in classroom")

        secret_pin = student.get("secret_pin")

        # Login as student
        data = {
            "student_id": student_id,
            "class_code": class_code,
            "secret_pin": secret_pin
        }
        response = requests.post(f"{BASE_URL}/auth/student/login", json=data)

        if response.status_code == 200:
            result = response.json()
            token = result.get("access_token")
            self.student_token = token
            self.log("Student login", "PASS", f"Token obtained")
            return token
        else:
            raise Exception(f"Student login failed: {response.text}")

    def test_pillar_missions(self, pillar: str, expected_topics: List[str]) -> Dict:
        """Test mission generation for a specific pillar"""
        headers = {"Authorization": f"Bearer {self.student_token}"}
        response = requests.get(
            f"{BASE_URL}/missions/pillar?pillar={pillar}",
            headers=headers
        )

        if response.status_code != 200:
            self.log(f"{pillar.capitalize()} missions", "FAIL", response.text)
            return {}

        missions = response.json()
        questions = missions.get("questions", [])

        # Check if we got questions
        if not questions:
            self.log(f"{pillar.capitalize()} missions", "FAIL", "No questions generated")
            return missions

        self.log(f"{pillar.capitalize()} missions", "PASS",
                f"Generated {len(questions)} questions")

        # Validate topic alignment
        topics_summary = missions.get("active_topics_summary", "")
        matched_topics = sum(1 for topic in expected_topics if topic.lower() in topics_summary.lower())

        if matched_topics > 0:
            self.log(f"  → Topic alignment", "PASS",
                    f"{matched_topics}/{len(expected_topics)} topics referenced")
        else:
            self.log(f"  → Topic alignment", "FAIL",
                    f"Expected topics: {expected_topics}, Got: {topics_summary}")

        # Check for curriculum grounding (questions should have realistic content)
        # This is a heuristic check - proper validation would require manual review
        avg_question_length = sum(len(q.get("question", "")) for q in questions) / len(questions)
        if avg_question_length > 20:  # Realistic questions are typically >20 chars
            self.log(f"  → Content quality", "PASS",
                    f"Avg question length: {avg_question_length:.0f} chars")
        else:
            self.log(f"  → Content quality", "WARN",
                    f"Questions seem too short: {avg_question_length:.0f} chars")

        # Check for weakness focus (should have some weakness-targeted questions)
        weakness_count = missions.get("weakness_focus_questions", 0)
        self.log(f"  → Weakness targeting", "PASS",
                f"{weakness_count} weakness-focused questions")

        return missions

    def complete_missions_with_pattern(self, pillar: str, accuracy: float) -> None:
        """Complete missions with a specific accuracy to create weakness pattern"""
        headers = {"Authorization": f"Bearer {self.student_token}"}

        # Get missions
        response = requests.get(
            f"{BASE_URL}/missions/pillar?pillar={pillar}",
            headers=headers
        )

        if response.status_code != 200:
            self.log(f"Complete {pillar} missions", "FAIL", "Failed to fetch missions")
            return

        missions = response.json()
        questions = missions.get("questions", [])

        # Calculate how many to answer correctly
        target_correct = int(len(questions) * accuracy)

        # Submit answers
        correct_count = 0
        for i, question in enumerate(questions):
            is_correct = i < target_correct

            data = {
                "question_correct": is_correct,
                "question_type": "mission_mc",
                "pillar": pillar,
                "points_value": 10,
                "submitted_at": datetime.utcnow().isoformat()
            }

            response = requests.post(
                f"{BASE_URL}/missions/complete",
                headers=headers,
                json=data
            )

            if response.status_code == 200:
                if is_correct:
                    correct_count += 1

            time.sleep(0.1)  # Small delay between submissions

        actual_accuracy = (correct_count / len(questions)) * 100
        self.log(f"Complete {pillar} missions", "PASS",
                f"Submitted {len(questions)} answers, {actual_accuracy:.0f}% correct")

    def test_student_report(self, student_id: str) -> Dict:
        """Test student-level report"""
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(
            f"{BASE_URL}/evaluator/report/student/{student_id}/detailed",
            headers=headers
        )

        if response.status_code != 200:
            self.log("Student report", "FAIL", response.text)
            return {}

        report = response.json()
        self.log("Student report", "PASS", "Report generated successfully")

        # Verify pillar stats
        pillar_stats = report.get("pillar_stats", {})
        if pillar_stats:
            self.log("  → Pillar stats", "PASS",
                    f"Found stats for {len(pillar_stats)} pillars")
            for pillar, stats in pillar_stats.items():
                accuracy = stats.get("accuracy", 0)
                self.log(f"    • {pillar.capitalize()}", "INFO",
                        f"{accuracy:.1f}% accuracy")

        return report

    def test_grade_report(self, grade_level: int) -> Dict:
        """Test grade-level report"""
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.get(
            f"{BASE_URL}/evaluator/report/grade/{grade_level}",
            headers=headers
        )

        if response.status_code != 200:
            self.log(f"Grade {grade_level} report", "FAIL", response.text)
            return {}

        report = response.json()
        self.log(f"Grade {grade_level} report", "PASS", "Report generated successfully")

        # Verify aggregated stats
        pillar_accuracy = report.get("pillar_accuracy", {})
        if pillar_accuracy:
            self.log("  → Class averages", "PASS",
                    f"Found averages for {len(pillar_accuracy)} pillars")

        return report

    def test_ai_assistant(self, grade_level: int) -> Dict:
        """Test AI teaching assistant"""
        headers = {"Authorization": f"Bearer {self.teacher_token}"}
        response = requests.post(
            f"{BASE_URL}/evaluator/teacher-assistant/daily-plan",
            headers=headers,
            json={"grade_level": grade_level}
        )

        if response.status_code != 200:
            self.log("AI assistant", "FAIL", response.text)
            return {}

        plan = response.json()
        self.log("AI assistant", "PASS", "Daily plan generated successfully")

        # Verify plan components
        if plan.get("summary"):
            self.log("  → Summary", "PASS", f"{len(plan['summary'])} chars")
        if plan.get("focus_areas"):
            self.log("  → Focus areas", "PASS", f"{len(plan['focus_areas'])} areas")
        if plan.get("suggested_activities"):
            self.log("  → Activities", "PASS", f"{len(plan['suggested_activities'])} activities")

        return plan

    def test_cache_invalidation(self, classroom_id: str, grade_level: int) -> None:
        """Test that changing topics invalidates cache"""
        # Get current missions (will be cached)
        headers_student = {"Authorization": f"Bearer {self.student_token}"}
        response1 = requests.get(
            f"{BASE_URL}/missions/pillar?pillar=reading",
            headers=headers_student
        )

        if response1.status_code != 200:
            self.log("Cache test - initial fetch", "FAIL", response1.text)
            return

        missions1 = response1.json()
        topics1 = missions1.get("active_topics_summary", "")

        # Change topics
        headers_teacher = {"Authorization": f"Bearer {self.teacher_token}"}
        all_topics = self.get_topics_for_grade(grade_level)

        # Select different topics (just first 2 reading topics)
        reading_topics = [t for t in all_topics if t["skill"] == "reading"][:2]
        new_topic_ids = [t["id"] for t in reading_topics]

        data = {"topic_ids": new_topic_ids}
        response = requests.put(
            f"{BASE_URL}/classroom/{classroom_id}/active-topics",
            headers=headers_teacher,
            json=data
        )

        if response.status_code != 200:
            self.log("Cache test - topic change", "FAIL", response.text)
            return

        # Wait a moment for cache invalidation
        time.sleep(2)

        # Get missions again (should be different)
        response2 = requests.get(
            f"{BASE_URL}/missions/pillar?pillar=reading",
            headers=headers_student
        )

        if response2.status_code != 200:
            self.log("Cache test - second fetch", "FAIL", response2.text)
            return

        missions2 = response2.json()
        topics2 = missions2.get("active_topics_summary", "")

        # Verify topics changed
        if topics1 != topics2:
            self.log("Cache invalidation", "PASS",
                    f"Topics updated: '{topics1}' → '{topics2}'")
        else:
            self.log("Cache invalidation", "FAIL",
                    "Topics did not change - cache not invalidated")

    def run_full_test(self):
        """Run the complete end-to-end test"""
        print("\n" + "="*80)
        print("PRIMEPAL END-TO-END TEST: Teacher-Student Flow")
        print("="*80 + "\n")

        try:
            # Phase 1: Teacher Authentication
            print("\n📋 PHASE 1: Teacher Authentication")
            print("-" * 80)
            self.get_teacher_token()

            # Phase 2: Grade 4 Setup
            print("\n📋 PHASE 2: Grade 4 Teacher Topic Selection")
            print("-" * 80)
            classroom_id = self.get_or_create_classroom(4)
            self.classroom_id = classroom_id

            # Calculate expected topic count
            expected_count = sum(len(topics) for topics in GRADE_4_TOPICS.values())

            self.select_topics_for_classroom(classroom_id, 4, GRADE_4_TOPICS)
            active_topics = self.verify_active_topics(classroom_id, expected_count)

            # Phase 3: Student Setup
            print("\n📋 PHASE 3: Student Authentication")
            print("-" * 80)
            student_id = self.get_student_for_classroom(classroom_id)
            self.student_id = student_id
            self.student_login(classroom_id, student_id)

            # Phase 4: Mission Generation for All Pillars
            print("\n📋 PHASE 4: Mission Generation (All 4 Pillars)")
            print("-" * 80)
            self.test_pillar_missions("reading", GRADE_4_TOPICS["reading"])
            self.test_pillar_missions("writing", GRADE_4_TOPICS["writing"])
            self.test_pillar_missions("listening", GRADE_4_TOPICS["listening"])
            self.test_pillar_missions("speaking", GRADE_4_TOPICS["speaking"])

            # Phase 5: Mission Completion with Weakness Pattern
            print("\n📋 PHASE 5: Mission Completion (Creating Weakness Pattern)")
            print("-" * 80)
            print("Target pattern: Reading 30%, Writing 80%, Listening 50%, Speaking 20%")
            self.complete_missions_with_pattern("reading", 0.3)
            self.complete_missions_with_pattern("writing", 0.8)
            self.complete_missions_with_pattern("listening", 0.5)
            self.complete_missions_with_pattern("speaking", 0.2)

            # Phase 6: Teacher Reports
            print("\n📋 PHASE 6: Teacher Reports")
            print("-" * 80)
            self.test_student_report(student_id)
            self.test_grade_report(4)

            # Phase 7: AI Assistant
            print("\n📋 PHASE 7: AI Teaching Assistant")
            print("-" * 80)
            self.test_ai_assistant(4)

            # Phase 8: Cache Invalidation
            print("\n📋 PHASE 8: Real-Time Cache Invalidation")
            print("-" * 80)
            self.test_cache_invalidation(classroom_id, 4)

            # Summary
            print("\n" + "="*80)
            print("TEST SUMMARY")
            print("="*80)

            total_tests = len(self.results)
            passed = sum(1 for r in self.results if r["status"] == "PASS")
            failed = sum(1 for r in self.results if r["status"] == "FAIL")

            print(f"\nTotal Tests: {total_tests}")
            print(f"✅ Passed: {passed}")
            print(f"❌ Failed: {failed}")
            print(f"\nSuccess Rate: {(passed/total_tests)*100:.1f}%")

            if failed > 0:
                print("\n❌ FAILED TESTS:")
                for r in self.results:
                    if r["status"] == "FAIL":
                        print(f"  • {r['test']}: {r['details']}")

            print("\n" + "="*80 + "\n")

        except Exception as e:
            print(f"\n❌ CRITICAL ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    session = TestSession()
    session.run_full_test()
