"""
Test script to verify global teacher access works correctly.
Tests that all teachers can see all classrooms, students, and generate reports.

Run this with the backend server running:
python test_global_teacher_access.py
"""
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

# You'll need a valid teacher JWT token
# Get this by logging in as a teacher first
TEACHER_TOKEN = None  # Will be set after login


def login_teacher():
    """Login as a teacher to get JWT token"""
    global TEACHER_TOKEN

    # Use Supabase auth endpoint - you'll need to replace with actual teacher credentials
    print("NOTE: This script requires manual setup:")
    print("1. Login to teacher panel at http://localhost:3000/teacher/login")
    print("2. Open browser DevTools > Application > Local Storage")
    print("3. Copy the 'sb-...-auth-token' value")
    print("4. Paste the access_token here")
    print()

    token = input("Paste teacher access token (or press Enter to skip): ").strip()
    if token:
        TEACHER_TOKEN = token
        return True
    return False


def test_list_classrooms():
    """Test GET /classroom/ - should return all classrooms"""
    print("\n1. Testing GET /classroom/ (list all classrooms)...")

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}
    response = requests.get(f"{BASE_URL}/classroom/", headers=headers)

    if response.status_code == 200:
        classrooms = response.json()
        print(f"   ✓ Success: Retrieved {len(classrooms)} classrooms")
        if classrooms:
            print(f"   Sample: {classrooms[0].get('class_name')} (Grade {classrooms[0].get('grade_level')})")
        return True
    else:
        print(f"   ✗ Failed: {response.status_code} - {response.text}")
        return False


def test_get_classroom_detail():
    """Test GET /classroom/{id} - should return any classroom without ownership check"""
    print("\n2. Testing GET /classroom/{id} (get classroom detail)...")

    # First get a classroom ID
    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}
    response = requests.get(f"{BASE_URL}/classroom/", headers=headers)

    if response.status_code != 200 or not response.json():
        print("   ⚠ Skipped: No classrooms available")
        return True

    classroom_id = response.json()[0]["id"]
    response = requests.get(f"{BASE_URL}/classroom/{classroom_id}", headers=headers)

    if response.status_code == 200:
        classroom = response.json()
        print(f"   ✓ Success: Retrieved classroom '{classroom.get('class_name')}'")
        print(f"   Students in classroom: {len(classroom.get('students', []))}")
        return True
    else:
        print(f"   ✗ Failed: {response.status_code} - {response.text}")
        return False


def test_dashboard_stats():
    """Test GET /evaluator/dashboard-stats - should show global stats"""
    print("\n3. Testing GET /evaluator/dashboard-stats (global stats)...")

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}
    response = requests.get(f"{BASE_URL}/evaluator/dashboard-stats", headers=headers)

    if response.status_code == 200:
        stats = response.json()
        print(f"   ✓ Success: Global stats retrieved")
        print(f"   Total students: {stats.get('total_students')}")
        print(f"   Total interactions: {stats.get('total_interactions')}")
        print(f"   Average accuracy: {stats.get('avg_accuracy')}%")
        return True
    else:
        print(f"   ✗ Failed: {response.status_code} - {response.text}")
        return False


def test_skill_accuracy():
    """Test GET /evaluator/skill-accuracy - should show global skill breakdown"""
    print("\n4. Testing GET /evaluator/skill-accuracy (global skills)...")

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}
    response = requests.get(f"{BASE_URL}/evaluator/skill-accuracy", headers=headers)

    if response.status_code == 200:
        skills = response.json()
        print(f"   ✓ Success: Skill accuracy retrieved")
        print(f"   Reading: {skills.get('reading')}%")
        print(f"   Writing: {skills.get('writing')}%")
        print(f"   Listening: {skills.get('listening')}%")
        print(f"   Speaking: {skills.get('speaking')}%")
        return True
    else:
        print(f"   ✗ Failed: {response.status_code} - {response.text}")
        return False


def test_all_students():
    """Test GET /evaluator/students - should show all students across all classrooms"""
    print("\n5. Testing GET /evaluator/students (all students)...")

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}
    response = requests.get(f"{BASE_URL}/evaluator/students", headers=headers)

    if response.status_code == 200:
        data = response.json()
        students = data.get('students', [])
        print(f"   ✓ Success: Retrieved {len(students)} students")
        if students:
            print(f"   Sample: {students[0].get('student_name')} from {students[0].get('classroom_name')}")
        return True
    else:
        print(f"   ✗ Failed: {response.status_code} - {response.text}")
        return False


def test_grade_report():
    """Test GET /evaluator/report/grade/{grade_level} - should show global grade report"""
    print("\n6. Testing GET /evaluator/report/grade/1 (grade-level report)...")

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}
    response = requests.get(f"{BASE_URL}/evaluator/report/grade/1", headers=headers)

    if response.status_code == 200:
        report = response.json()
        print(f"   ✓ Success: Grade 1 report retrieved")
        print(f"   Total students: {report.get('total_students')}")
        print(f"   Overall accuracy: {report.get('overall_accuracy_pct')}%")
        return True
    else:
        print(f"   ✗ Failed: {response.status_code} - {response.text}")
        return False


def main():
    print("=" * 60)
    print("GLOBAL TEACHER ACCESS TEST")
    print("=" * 60)
    print()
    print("This test verifies that all teachers can access all data:")
    print("- All classrooms (not just owned ones)")
    print("- All students across all classrooms")
    print("- Global dashboard stats and reports")
    print()

    if not login_teacher():
        print("\n⚠ No token provided. Please login manually and run tests individually.")
        print("Example: curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8000/api/v1/classroom/")
        sys.exit(1)

    print("\nRunning tests...")
    print("-" * 60)

    results = []
    results.append(("List Classrooms", test_list_classrooms()))
    results.append(("Get Classroom Detail", test_get_classroom_detail()))
    results.append(("Dashboard Stats", test_dashboard_stats()))
    results.append(("Skill Accuracy", test_skill_accuracy()))
    results.append(("All Students", test_all_students()))
    results.append(("Grade Report", test_grade_report()))

    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)

    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")

    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)

    print(f"\n{passed_count}/{total_count} tests passed")

    if passed_count == total_count:
        print("\n✓ All tests passed! Global teacher access is working correctly.")
        sys.exit(0)
    else:
        print(f"\n✗ {total_count - passed_count} test(s) failed. Please review the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
