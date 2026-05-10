"""
Test script to verify admin-only classroom and student CRUD operations.
Tests that regular teachers get 403 Forbidden, admins get 200 OK.

Run this with both backend and frontend servers running:
python test_admin_only_operations.py
"""
import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"

# Test tokens - you'll need to get these by logging in
TEACHER_TOKEN = None  # Regular teacher (is_admin=False)
ADMIN_TOKEN = None    # Admin teacher (is_admin=True)


def setup_tokens():
    """Prompt user to paste auth tokens"""
    global TEACHER_TOKEN, ADMIN_TOKEN

    print("=" * 70)
    print("ADMIN-ONLY OPERATIONS TEST SETUP")
    print("=" * 70)
    print()
    print("You need TWO teacher accounts:")
    print("1. Regular teacher (is_admin=False)")
    print("2. Admin teacher (is_admin=True)")
    print()
    print("To get tokens:")
    print("1. Login at http://localhost:3000/teacher/login")
    print("2. Open DevTools > Application > Local Storage")
    print("3. Copy the access_token from 'sb-...-auth-token'")
    print()

    teacher = input("Paste REGULAR TEACHER token (or press Enter to skip): ").strip()
    if teacher:
        TEACHER_TOKEN = teacher

    admin = input("Paste ADMIN TEACHER token (or press Enter to skip): ").strip()
    if admin:
        ADMIN_TOKEN = admin

    if not TEACHER_TOKEN and not ADMIN_TOKEN:
        print("\n⚠ No tokens provided. Please setup tokens and try again.")
        return False

    return True


def test_create_classroom_as_teacher():
    """Test that regular teachers cannot create classrooms (403)"""
    print("\n1. Test: Regular teacher tries to CREATE classroom")

    if not TEACHER_TOKEN:
        print("   ⏭ Skipped: No teacher token")
        return None

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}", "Content-Type": "application/json"}
    data = {
        "grade_level": 1,
        "section": "Test",
        "class_name": "Test Classroom"
    }

    response = requests.post(f"{BASE_URL}/classroom/", json=data, headers=headers)

    if response.status_code == 403:
        print("   ✓ PASS: Got 403 Forbidden (expected)")
        return True
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 403")
        print(f"   Response: {response.text}")
        return False


def test_create_classroom_as_admin():
    """Test that admins can create classrooms (201)"""
    print("\n2. Test: Admin teacher tries to CREATE classroom")

    if not ADMIN_TOKEN:
        print("   ⏭ Skipped: No admin token")
        return None

    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}", "Content-Type": "application/json"}
    data = {
        "grade_level": 1,
        "section": "AdminTest",
        "class_name": "Admin Test Classroom"
    }

    response = requests.post(f"{BASE_URL}/classroom/", json=data, headers=headers)

    if response.status_code == 201:
        print("   ✓ PASS: Got 201 Created (expected)")
        classroom_id = response.json()["id"]
        print(f"   Created classroom ID: {classroom_id}")
        return classroom_id
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 201")
        print(f"   Response: {response.text}")
        return False


def test_add_students_as_teacher(classroom_id):
    """Test that regular teachers cannot add students (403)"""
    print("\n3. Test: Regular teacher tries to ADD students")

    if not TEACHER_TOKEN or not classroom_id:
        print("   ⏭ Skipped: No teacher token or classroom ID")
        return None

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}", "Content-Type": "application/json"}
    data = {
        "students": [
            {"student_name": "Test Student", "roll_number": "001", "email": "test@example.com"}
        ]
    }

    response = requests.post(
        f"{BASE_URL}/classroom/{classroom_id}/students/bulk-v2",
        json=data,
        headers=headers
    )

    if response.status_code == 403:
        print("   ✓ PASS: Got 403 Forbidden (expected)")
        return True
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 403")
        print(f"   Response: {response.text}")
        return False


def test_add_students_as_admin(classroom_id):
    """Test that admins can add students (200)"""
    print("\n4. Test: Admin teacher tries to ADD students")

    if not ADMIN_TOKEN or not classroom_id:
        print("   ⏭ Skipped: No admin token or classroom ID")
        return None

    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}", "Content-Type": "application/json"}
    data = {
        "students": [
            {"student_name": "Admin Test Student", "roll_number": "001", "email": "admin@example.com"}
        ]
    }

    response = requests.post(
        f"{BASE_URL}/classroom/{classroom_id}/students/bulk-v2",
        json=data,
        headers=headers
    )

    if response.status_code == 200:
        print("   ✓ PASS: Got 200 OK (expected)")
        return True
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 200")
        print(f"   Response: {response.text}")
        return False


def test_update_classroom_as_teacher(classroom_id):
    """Test that regular teachers cannot update classrooms (403)"""
    print("\n5. Test: Regular teacher tries to UPDATE classroom")

    if not TEACHER_TOKEN or not classroom_id:
        print("   ⏭ Skipped: No teacher token or classroom ID")
        return None

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}", "Content-Type": "application/json"}
    data = {"class_name": "Updated by Teacher"}

    response = requests.patch(
        f"{BASE_URL}/classroom/{classroom_id}",
        json=data,
        headers=headers
    )

    if response.status_code == 403:
        print("   ✓ PASS: Got 403 Forbidden (expected)")
        return True
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 403")
        print(f"   Response: {response.text}")
        return False


def test_delete_classroom_as_teacher(classroom_id):
    """Test that regular teachers cannot delete classrooms (403)"""
    print("\n6. Test: Regular teacher tries to DELETE classroom")

    if not TEACHER_TOKEN or not classroom_id:
        print("   ⏭ Skipped: No teacher token or classroom ID")
        return None

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}

    response = requests.delete(
        f"{BASE_URL}/classroom/{classroom_id}",
        headers=headers
    )

    if response.status_code == 403:
        print("   ✓ PASS: Got 403 Forbidden (expected)")
        return True
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 403")
        print(f"   Response: {response.text}")
        return False


def test_view_classroom_as_teacher(classroom_id):
    """Test that regular teachers CAN view classrooms (200)"""
    print("\n7. Test: Regular teacher tries to VIEW classroom (should work)")

    if not TEACHER_TOKEN or not classroom_id:
        print("   ⏭ Skipped: No teacher token or classroom ID")
        return None

    headers = {"Authorization": f"Bearer {TEACHER_TOKEN}"}

    response = requests.get(
        f"{BASE_URL}/classroom/{classroom_id}",
        headers=headers
    )

    if response.status_code == 200:
        print("   ✓ PASS: Got 200 OK (expected - teachers can view)")
        return True
    else:
        print(f"   ✗ FAIL: Got {response.status_code}, expected 200")
        print(f"   Response: {response.text}")
        return False


def cleanup_test_classroom(classroom_id):
    """Clean up test classroom created during tests"""
    print("\n8. Cleanup: Delete test classroom")

    if not ADMIN_TOKEN or not classroom_id:
        print("   ⏭ Skipped: No admin token or classroom ID")
        return None

    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}

    response = requests.delete(
        f"{BASE_URL}/classroom/{classroom_id}",
        headers=headers
    )

    if response.status_code == 204:
        print("   ✓ Cleanup successful: Test classroom deleted")
        return True
    else:
        print(f"   ⚠ Cleanup failed: {response.status_code}")
        print(f"   You may need to manually delete classroom: {classroom_id}")
        return False


def main():
    if not setup_tokens():
        sys.exit(1)

    print("\n" + "=" * 70)
    print("RUNNING TESTS")
    print("=" * 70)

    results = []

    # Test 1: Teacher tries to create classroom (should fail)
    results.append(("Teacher CREATE classroom", test_create_classroom_as_teacher()))

    # Test 2: Admin creates classroom (should succeed)
    classroom_id = test_create_classroom_as_admin()
    if classroom_id and classroom_id is not False:
        results.append(("Admin CREATE classroom", True))

        # Test 3: Teacher tries to add students (should fail)
        results.append(("Teacher ADD students", test_add_students_as_teacher(classroom_id)))

        # Test 4: Admin adds students (should succeed)
        results.append(("Admin ADD students", test_add_students_as_admin(classroom_id)))

        # Test 5: Teacher tries to update classroom (should fail)
        results.append(("Teacher UPDATE classroom", test_update_classroom_as_teacher(classroom_id)))

        # Test 6: Teacher tries to delete classroom (should fail)
        results.append(("Teacher DELETE classroom", test_delete_classroom_as_teacher(classroom_id)))

        # Test 7: Teacher can view classroom (should succeed)
        results.append(("Teacher VIEW classroom", test_view_classroom_as_teacher(classroom_id)))

        # Cleanup
        cleanup_test_classroom(classroom_id)
    else:
        results.append(("Admin CREATE classroom", False))

    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    passed = 0
    failed = 0
    skipped = 0

    for name, result in results:
        if result is None:
            status = "⏭ SKIP"
            skipped += 1
        elif result:
            status = "✓ PASS"
            passed += 1
        else:
            status = "✗ FAIL"
            failed += 1

        print(f"{status}: {name}")

    print()
    print(f"Results: {passed} passed, {failed} failed, {skipped} skipped")

    if failed > 0:
        print("\n✗ SOME TESTS FAILED. Please review the errors above.")
        sys.exit(1)
    elif passed > 0:
        print("\n✓ ALL TESTS PASSED! Admin-only operations are working correctly.")
        sys.exit(0)
    else:
        print("\n⚠ NO TESTS RUN. Please provide auth tokens.")
        sys.exit(1)


if __name__ == "__main__":
    main()
