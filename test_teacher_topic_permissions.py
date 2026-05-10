"""
Test that teachers can view topics and modify topic selections (non-admin teachers).
Run with: python test_teacher_topic_permissions.py
"""

import os
import sys
import requests

BASE_URL = os.getenv("API_URL", "http://localhost:8000/api/v1")

def test_teacher_topic_permissions():
    """
    Test that:
    1. Teachers can view topics-by-skill for any classroom (global access)
    2. Non-admin teachers can update active topic selections
    """

    print("=" * 60)
    print("Testing Teacher Topic Permissions")
    print("=" * 60)

    # Step 1: Login as non-admin teacher
    print("\n1. Logging in as non-admin teacher...")
    login_response = requests.post(
        f"{BASE_URL}/auth/teacher/login",
        json={
            "email": "teacher@example.com",  # Change this to a real non-admin teacher email
            "password": "password123"
        }
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        print("\n⚠️  Please create a non-admin teacher account first or update the credentials in this test.")
        return False

    auth_data = login_response.json()
    access_token = auth_data.get("access_token")
    teacher_data = auth_data.get("teacher", {})
    is_admin = teacher_data.get("is_admin", False)

    print(f"✓ Logged in as: {teacher_data.get('full_name')} ({teacher_data.get('email')})")
    print(f"  Admin status: {is_admin}")

    if is_admin:
        print("⚠️  Warning: Testing with admin account. Test should use non-admin teacher.")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Step 2: Get list of classrooms
    print("\n2. Fetching classrooms...")
    classrooms_response = requests.get(f"{BASE_URL}/classroom/", headers=headers)

    if classrooms_response.status_code != 200:
        print(f"❌ Failed to fetch classrooms: {classrooms_response.status_code}")
        return False

    classrooms = classrooms_response.json()
    if not classrooms:
        print("❌ No classrooms found. Please create at least one classroom.")
        return False

    classroom = classrooms[0]
    classroom_id = classroom["id"]
    print(f"✓ Found classroom: {classroom['class_name']} (Grade {classroom['grade_level']})")

    # Step 3: Test GET topics-by-skill (should work with global access)
    print(f"\n3. Testing GET /classroom/{classroom_id}/topics-by-skill...")
    topics_response = requests.get(
        f"{BASE_URL}/classroom/{classroom_id}/topics-by-skill",
        headers=headers
    )

    if topics_response.status_code == 403:
        print("❌ FAILED: Got 403 Forbidden - Global teacher access not working!")
        print(f"Response: {topics_response.text}")
        return False
    elif topics_response.status_code != 200:
        print(f"❌ FAILED: Got {topics_response.status_code}")
        print(f"Response: {topics_response.text}")
        return False

    topics_data = topics_response.json()
    print(f"✓ SUCCESS: Retrieved topics for grade {topics_data['grade_level']}")
    print(f"  Skills available: {len(topics_data['skills'])}")

    # Step 4: Test PUT active-topics (should work for non-admin teachers)
    print(f"\n4. Testing PUT /classroom/{classroom_id}/active-topics...")

    # Collect all topic IDs from the first skill
    all_topic_ids = []
    if topics_data['skills']:
        first_skill = topics_data['skills'][0]
        all_topic_ids = [t['id'] for t in first_skill['topics'] if t['is_globally_active']]
        print(f"  Selecting {len(all_topic_ids)} topics from '{first_skill['skill']}' skill")

    update_response = requests.put(
        f"{BASE_URL}/classroom/{classroom_id}/active-topics",
        headers=headers,
        json={"topic_ids": all_topic_ids}
    )

    if update_response.status_code == 403:
        print("❌ FAILED: Got 403 Forbidden - Non-admin teachers cannot update topics!")
        print(f"Response: {update_response.text}")
        return False
    elif update_response.status_code != 200:
        print(f"❌ FAILED: Got {update_response.status_code}")
        print(f"Response: {update_response.text}")
        return False

    result = update_response.json()
    print(f"✓ SUCCESS: Topic selections updated")
    print(f"  Active topics count: {len(result.get('active_topics', []))}")

    # Step 5: Summary
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("✓ Teachers have global access to view topics")
    print("✓ Non-admin teachers can update topic selections")
    print()

    return True


if __name__ == "__main__":
    try:
        success = test_teacher_topic_permissions()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
