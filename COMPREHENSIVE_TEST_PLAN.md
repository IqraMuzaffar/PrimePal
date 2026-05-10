# PrimePal — Comprehensive Test Plan

Complete test cases to validate all features from scratch. Includes setup, API tests, frontend flows, and edge cases.

---

## 📋 Pre-Test Setup

### Environment Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install pytest pytest-asyncio httpx  # if not already installed

# Create .env for testing
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

# Frontend
cd frontend
npm install

# Docker & Redis
docker-compose up -d
```

### Test Database
- Tests use Supabase directly (no local SQLite)
- Create a test project in Supabase
- Run all migrations: `supabase/migrations/*.sql`
- Migrations should be idempotent

### Clear Test Data (before each run)
```sql
-- Run in Supabase SQL editor
DELETE FROM daily_rewards;
DELETE FROM missions_completed;
DELETE FROM student_interactions;
DELETE FROM students;
DELETE FROM classroom_active_topics;
DELETE FROM classrooms;
DELETE FROM snc_topics; -- if resetting
DELETE FROM snc_knowledge_base;
DELETE FROM snc_uploads;
DELETE FROM announcements;
-- Teachers: only delete if full reset needed
```

---

# SECTION 1: AUTHENTICATION & ROLE MANAGEMENT

## Test Suite 1.1: Teacher Login (Supabase GoTrue)

### TC-1.1.1: Teacher Login - Valid Credentials
**Setup:** Teacher account exists in Supabase Auth
```
POST /api/v1/auth/teacher/login
{
  "email": "teacher@example.com",
  "password": "SecurePass123"
}
```
**Expected:**
- Status: 200
- Response: `{ "access_token": "...", "user": { "id": "...", "email": "...", "is_admin": false } }`
- Token should be a valid JWT

**Test Code:**
```python
@pytest.mark.asyncio
async def test_teacher_login_valid(client):
    response = await client.post("/api/v1/auth/teacher/login", json={
        "email": "teacher@example.com",
        "password": "SecurePass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "teacher@example.com"
```

### TC-1.1.2: Teacher Login - Invalid Password
**Setup:** Teacher account exists
```
POST /api/v1/auth/teacher/login
{
  "email": "teacher@example.com",
  "password": "WrongPassword"
}
```
**Expected:**
- Status: 401
- Error: `{ "detail": "Invalid credentials" }`

### TC-1.1.3: Teacher Login - Non-existent Email
```
POST /api/v1/auth/teacher/login
{
  "email": "nonexistent@example.com",
  "password": "AnyPassword"
}
```
**Expected:**
- Status: 401

---

## Test Suite 1.2: Student Login (Custom PyJWT)

### TC-1.2.1: Student Login - Valid Class Code, Avatar, PIN
**Setup:** Classroom exists with code "ABC123", Student exists with PIN "1234"
```
POST /api/v1/auth/student/login
{
  "class_code": "ABC123",
  "student_id": "<student_uuid>",
  "pin": "1234"
}
```
**Expected:**
- Status: 200
- Response: `{ "access_token": "<PyJWT>", "student": { "id": "...", "full_name": "...", "avatar_url": "..." } }`
- Token decodes to: `{ "student_id": "...", "classroom_id": "...", "exp": ... }`

**Test Code:**
```python
@pytest.mark.asyncio
async def test_student_login_valid(client, mock_supabase):
    # Mock student retrieval
    mock_supabase.table("students").select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "student-123",
        "full_name": "Ali",
        "secret_pin": "1234"
    }

    response = await client.post("/api/v1/auth/student/login", json={
        "class_code": "ABC123",
        "student_id": "student-123",
        "pin": "1234"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### TC-1.2.2: Student Login - Wrong PIN
```
POST /api/v1/auth/student/login
{
  "class_code": "ABC123",
  "student_id": "<student_uuid>",
  "pin": "9999"
}
```
**Expected:**
- Status: 401
- Error: Invalid PIN

### TC-1.2.3: Student Login - Invalid Class Code
```
POST /api/v1/auth/student/login
{
  "class_code": "INVALID",
  "student_id": "<student_uuid>",
  "pin": "1234"
}
```
**Expected:**
- Status: 404
- Error: Class code not found

### TC-1.2.4: Student Login - Student Not in Class
```
POST /api/v1/auth/student/login
{
  "class_code": "ABC123",  # Different classroom
  "student_id": "<wrong_student_uuid>",
  "pin": "1234"
}
```
**Expected:**
- Status: 404
- Error: Student not found in this classroom

---

## Test Suite 1.3: Avatar Listing

### TC-1.3.1: Get Avatars for Classroom
**Setup:** Classroom "ABC123" has 5 students
```
GET /api/v1/auth/classroom/ABC123/avatars
```
**Expected:**
- Status: 200
- Response: `[ { "id": "...", "full_name": "Ali", "avatar_url": "...", "avatar_style": "adventurer" }, ... ]`
- Array length: 5

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_classroom_avatars(client, mock_supabase):
    mock_students = [
        {"id": f"student-{i}", "full_name": f"Student{i}", "avatar_url": "...", "avatar_style": "adventurer"}
        for i in range(5)
    ]
    mock_supabase.table("students").select.return_value.eq.return_value.execute.return_value.data = mock_students

    response = await client.get("/api/v1/auth/classroom/ABC123/avatars")
    assert response.status_code == 200
    assert len(response.json()) == 5
```

### TC-1.3.2: Get Avatars - Invalid Class Code
```
GET /api/v1/auth/classroom/INVALID/avatars
```
**Expected:**
- Status: 404
- Error: Class code not found

---

## Test Suite 1.4: Admin Login & Invite Codes

### TC-1.4.1: Admin Login - Valid Credentials + Is Admin
**Setup:** Teacher with `is_admin = true` exists
```
POST /api/v1/auth/admin/login
{
  "email": "admin@example.com",
  "password": "AdminPass123"
}
```
**Expected:**
- Status: 200
- Response includes `is_admin: true`

### TC-1.4.2: Admin Login - Teacher (Non-admin)
**Setup:** Teacher with `is_admin = false`
```
POST /api/v1/auth/admin/login
{
  "email": "teacher@example.com",
  "password": "TeacherPass123"
}
```
**Expected:**
- Status: 403
- Error: `{ "detail": "Not authorized as admin" }`

### TC-1.4.3: Admin Signup - Valid Invite Code
**Setup:** Invite code "ADMIN-2025-001" exists and is unused
```
POST /api/v1/auth/admin/signup
{
  "email": "newadmin@example.com",
  "password": "AdminPass123",
  "invite_code": "ADMIN-2025-001"
}
```
**Expected:**
- Status: 201
- New admin account created
- Invite code marked as used

### TC-1.4.4: Admin Signup - Invalid/Used Invite Code
```
POST /api/v1/auth/admin/signup
{
  "email": "newadmin@example.com",
  "password": "AdminPass123",
  "invite_code": "INVALID"
}
```
**Expected:**
- Status: 400
- Error: Invalid or already-used invite code

---

# SECTION 2: CLASSROOM MANAGEMENT

## Test Suite 2.1: Classroom CRUD

### TC-2.1.1: Create Classroom
**Auth:** Teacher token required
```
POST /api/v1/classroom
Headers: Authorization: Bearer <teacher_token>
{
  "name": "Grade 3-A",
  "grade_level": 3,
  "section": "A"
}
```
**Expected:**
- Status: 201
- Response: `{ "id": "...", "name": "Grade 3-A", "grade_level": 3, "class_code": "ABC123", "created_at": "..." }`
- `class_code` is unique, 6 characters, hex

**Test Code:**
```python
@pytest.mark.asyncio
async def test_create_classroom(client, teacher_token):
    response = await client.post(
        "/api/v1/classroom",
        json={"name": "Grade 3-A", "grade_level": 3, "section": "A"},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Grade 3-A"
    assert len(data["class_code"]) == 6
```

### TC-2.1.2: Create Classroom - No Auth
```
POST /api/v1/classroom
{
  "name": "Grade 3-A",
  "grade_level": 3
}
```
**Expected:**
- Status: 401
- Error: Unauthorized

### TC-2.1.3: Get Classroom
**Auth:** Teacher token
```
GET /api/v1/classroom/<classroom_id>
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 200
- Response includes all classroom details + list of students

### TC-2.1.4: Update Classroom
**Auth:** Teacher token (must be owner)
```
PUT /api/v1/classroom/<classroom_id>
Headers: Authorization: Bearer <teacher_token>
{
  "name": "Grade 3-B",
  "grade_level": 4
}
```
**Expected:**
- Status: 200
- Classroom updated

### TC-2.1.5: Update Classroom - Not Owner
**Setup:** Different teacher tries to update another's classroom
```
PUT /api/v1/classroom/<other_classroom_id>
Headers: Authorization: Bearer <other_teacher_token>
```
**Expected:**
- Status: 403
- Error: Not authorized

### TC-2.1.6: Delete Classroom
**Auth:** Teacher (owner)
```
DELETE /api/v1/classroom/<classroom_id>
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 204
- Classroom deleted (cascades to students if configured)

---

## Test Suite 2.2: Student Roster Management

### TC-2.2.1: Add Student to Classroom
**Auth:** Teacher token
```
POST /api/v1/classroom/<classroom_id>/student
Headers: Authorization: Bearer <teacher_token>
{
  "full_name": "Ali Ahmed",
  "roll_number": "001"
}
```
**Expected:**
- Status: 201
- Response: `{ "id": "...", "full_name": "Ali Ahmed", "secret_pin": "1234", "avatar_url": "...", "points": 0 }`
- PIN auto-generated (4 digits)
- Avatar URL generated via DiceBear

**Test Code:**
```python
@pytest.mark.asyncio
async def test_add_student_to_classroom(client, teacher_token, classroom_id):
    response = await client.post(
        f"/api/v1/classroom/{classroom_id}/student",
        json={"full_name": "Ali Ahmed", "roll_number": "001"},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Ali Ahmed"
    assert len(data["secret_pin"]) == 4
    assert "dicebear.com" in data["avatar_url"]
```

### TC-2.2.2: Add Student - Duplicate Name in Class
```
POST /api/v1/classroom/<classroom_id>/student
{
  "full_name": "Ali Ahmed",  # Already exists
  "roll_number": "002"
}
```
**Expected:**
- Status: 400 or 201 (depends on if duplicates allowed)
- If allowed: different PIN generated

### TC-2.2.3: Get All Students in Classroom
**Auth:** Teacher
```
GET /api/v1/classroom/<classroom_id>/students
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 200
- Response: `[ { "id": "...", "full_name": "...", "points": "...", "avatar_url": "..." }, ... ]`

### TC-2.2.4: Remove Student from Classroom
**Auth:** Teacher
```
DELETE /api/v1/classroom/<classroom_id>/student/<student_id>
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 204
- Student record deleted (or soft-deleted)

### TC-2.2.5: Update Student Details
**Auth:** Teacher
```
PUT /api/v1/classroom/<classroom_id>/student/<student_id>
Headers: Authorization: Bearer <teacher_token>
{
  "full_name": "Ali Ahmed Khan",
  "roll_number": "001"
}
```
**Expected:**
- Status: 200
- Student updated

---

## Test Suite 2.3: Classroom Active Topics

### TC-2.3.1: Get Available Topics for Grade
```
GET /api/v1/topics?grade_level=3
```
**Expected:**
- Status: 200
- Response: `[ { "id": "...", "name": "Nouns", "grade_level": 3 }, ... ]`
- Array length: 6 (assuming 6 topics per grade)

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_topics_by_grade(client):
    response = await client.get("/api/v1/topics?grade_level=3")
    assert response.status_code == 200
    topics = response.json()
    assert len(topics) == 6
    assert all(t["grade_level"] == 3 for t in topics)
```

### TC-2.3.2: Get Classroom Active Topics
**Auth:** Teacher
```
GET /api/v1/classroom/<classroom_id>/active-topics
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 200
- Response: `{ "active_topic_ids": ["topic-1", "topic-2", ...], "all_topics": [...] }`
- By default, all topics should be active

### TC-2.3.3: Update Classroom Active Topics
**Auth:** Teacher
```
PUT /api/v1/classroom/<classroom_id>/active-topics
Headers: Authorization: Bearer <teacher_token>
{
  "active_topic_ids": ["topic-1", "topic-3", "topic-5"]
}
```
**Expected:**
- Status: 200
- Only specified topics now active
- Mission generator will use only these topics

**Test Code:**
```python
@pytest.mark.asyncio
async def test_update_active_topics(client, teacher_token, classroom_id):
    topic_ids = ["topic-1", "topic-3"]
    response = await client.put(
        f"/api/v1/classroom/{classroom_id}/active-topics",
        json={"active_topic_ids": topic_ids},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200

    # Verify by fetching again
    response = await client.get(
        f"/api/v1/classroom/{classroom_id}/active-topics",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert set(response.json()["active_topic_ids"]) == set(topic_ids)
```

### TC-2.3.4: Update with Invalid Topic ID
```
PUT /api/v1/classroom/<classroom_id>/active-topics
{
  "active_topic_ids": ["invalid-topic-id"]
}
```
**Expected:**
- Status: 400 or 404
- Error: Invalid topic ID

---

# SECTION 3: CURRICULUM INGESTION (Agent A)

## Test Suite 3.1: PDF Upload Pipeline

### TC-3.1.1: Upload PDF and Process
**Auth:** Teacher
```
POST /api/v1/curriculum/upload
Headers: Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data

Files:
  - file: <english_textbook_grade3.pdf>
  - grade_level: 3
  - book_title: "English Textbook Grade 3"
```
**Expected:**
- Status: 200
- Response: `{ "upload_id": "...", "file_name": "...", "status": "processing", "total_chunks": null }`
- Background job starts: extract → chunk → embed → store in pgvector

**Manual Flow:**
1. Visit Teacher Dashboard → Curriculum → Upload Hub
2. Select PDF file
3. Enter grade level (3)
4. Enter book title
5. Click Upload
6. See "Processing..." status
7. Wait 1-2 minutes for completion
8. See checkmark + chunk count

**Test Code:**
```python
@pytest.mark.asyncio
async def test_upload_pdf(client, teacher_token, tmp_path):
    # Create a minimal PDF
    pdf_file = tmp_path / "test.pdf"
    pdf_file.write_bytes(b"%PDF-1.4\n...")  # Minimal valid PDF

    with open(pdf_file, "rb") as f:
        response = await client.post(
            "/api/v1/curriculum/upload",
            files={"file": f},
            data={"grade_level": "3", "book_title": "Test Book"},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processing"
```

### TC-3.1.2: Upload Invalid File Type
```
POST /api/v1/curriculum/upload
Files:
  - file: <image.jpg>
  - grade_level: 3
```
**Expected:**
- Status: 400
- Error: Invalid file type (only PDF allowed)

### TC-3.1.3: Upload Large PDF (>50MB)
**Setup:** Create 60MB PDF file
```
POST /api/v1/curriculum/upload
```
**Expected:**
- Status: 413 or 400
- Error: File too large

### TC-3.1.4: Verify Chunks in pgvector
**After upload completes:**
```sql
SELECT COUNT(*) as chunk_count FROM snc_knowledge_base
WHERE metadata->>'grade_level' = '3';
```
**Expected:**
- Count > 0
- Each row has `embedding` (vector), `content` (text), `metadata` (JSON)

**Test Code:**
```python
@pytest.mark.asyncio
async def test_chunks_stored_in_pgvector(supabase_client):
    response = supabase_client.table("snc_knowledge_base").select("id").eq("metadata->grade_level", 3).execute()
    assert len(response.data) > 0
    for chunk in response.data:
        assert chunk["id"] is not None
```

---

## Test Suite 3.2: Curriculum Retrieval (RAG)

### TC-3.2.1: Vector Search for Topic
**Simulate:** Student asking about "Past Tense"
```
GET /api/v1/curriculum/search
Query: "Past Tense"
Grade: 3
Topic: "Verbs"
Limit: 3
```
**Expected:**
- Status: 200
- Response: `[ { "id": "...", "content": "...", "similarity": 0.95 }, ... ]`
- Results ranked by cosine similarity
- Top result has similarity > 0.8

### TC-3.2.2: Vector Search - Empty Results
```
GET /api/v1/curriculum/search
Query: "Quantum Physics"  # Not in curriculum
Grade: 3
```
**Expected:**
- Status: 200
- Response: `[]` (empty array)

---

## Test Suite 3.3: Upload History

### TC-3.3.1: Get Upload History
**Auth:** Teacher
```
GET /api/v1/curriculum/uploads
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 200
- Response: `[ { "id": "...", "file_name": "...", "grade_level": 3, "total_chunks": 127, "created_at": "..." }, ... ]`
- Ordered by created_at DESC

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_upload_history(client, teacher_token):
    response = await client.get(
        "/api/v1/curriculum/uploads",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    uploads = response.json()
    assert isinstance(uploads, list)
    if len(uploads) > 0:
        assert "file_name" in uploads[0]
        assert "total_chunks" in uploads[0]
```

---

# SECTION 4: MISSIONS

## Test Suite 4.1: Daily Missions

### TC-4.1.1: Generate Daily Mission
**Auth:** Student
```
POST /api/v1/missions/daily
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "mission_id": "...",
  "type": "daily",
  "questions": [
    {
      "id": "q1",
      "question_text": "What is the past tense of 'go'?",
      "options": ["gone", "went", "going", "goes"],
      "topic": "Verbs",
      "grade_level": 3
    },
    {...},
    {...}
  ],
  "points_available": 30,
  "created_at": "..."
}
```
- Exactly 3 questions
- Questions grounded in active classroom topics
- Use pgvector to seed RAG context

**Manual Flow:**
1. Log in as student
2. Go to Missions page
3. Click "Start Daily Mission" (if not yet completed today)
4. See 3 questions with multiple choice options
5. Read each question carefully

**Test Code:**
```python
@pytest.mark.asyncio
async def test_generate_daily_mission(client, student_token, classroom_id):
    response = await client.post(
        "/api/v1/missions/daily",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "daily"
    assert len(data["questions"]) == 3
    assert data["points_available"] == 30
```

### TC-4.1.2: Get Today's Mission (if already generated)
```
GET /api/v1/missions/daily
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200 if generated, 404 if not yet generated today

### TC-4.1.3: Submit Daily Mission Answers
**Auth:** Student
```
POST /api/v1/missions/daily/submit
Headers: Authorization: Bearer <student_token>
{
  "mission_id": "...",
  "answers": [
    { "question_id": "q1", "selected_option": "went" },
    { "question_id": "q2", "selected_option": "books" },
    { "question_id": "q3", "selected_option": "blue" }
  ]
}
```
**Expected:**
- Status: 200
- Response:
```json
{
  "score": 67,
  "max_score": 100,
  "correct": 2,
  "incorrect": 1,
  "points_earned": 20,
  "feedback": [
    { "question_id": "q1", "correct": true, "explanation": "..." },
    { "question_id": "q2", "correct": true, "explanation": "..." },
    { "question_id": "q3", "correct": false, "correct_answer": "red", "explanation": "..." }
  ]
}
```
- Points added to student.points immediately
- Interaction logged to student_interactions table
- missions_completed record created

**Test Code:**
```python
@pytest.mark.asyncio
async def test_submit_daily_mission(client, student_token, mission_id):
    response = await client.post(
        "/api/v1/missions/daily/submit",
        json={
            "mission_id": mission_id,
            "answers": [
                {"question_id": "q1", "selected_option": "went"},
                {"question_id": "q2", "selected_option": "books"},
                {"question_id": "q3", "selected_option": "blue"}
            ]
        },
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "points_earned" in data
    assert data["correct"] + data["incorrect"] == 3
```

### TC-4.1.4: Submit Daily Mission Twice (same day)
**Setup:** Student already submitted today's mission
```
POST /api/v1/missions/daily/submit
{...}
```
**Expected:**
- Status: 400 or 409
- Error: Already completed today's mission

### TC-4.1.5: Submit with Missing Answers
```
POST /api/v1/missions/daily/submit
{
  "mission_id": "...",
  "answers": [
    { "question_id": "q1", "selected_option": "went" }
    // q2 and q3 missing
  ]
}
```
**Expected:**
- Status: 400
- Error: All questions must be answered

---

## Test Suite 4.2: Pillar Missions

### TC-4.2.1: Generate Pillar Mission
**Auth:** Student
```
POST /api/v1/missions/pillar
Headers: Authorization: Bearer <student_token>
{
  "pillar": "reading"  // or writing, listening, speaking
}
```
**Expected:**
- Status: 200
- Response:
```json
{
  "mission_id": "...",
  "type": "pillar",
  "pillar": "reading",
  "questions": [
    {...}, {...}, ... (10 questions)
  ],
  "points_available": 100
}
```
- 10 questions, weighted toward student's weak areas
- Difficulty levels mixed

**Manual Flow:**
1. Log in as student
2. Go to Missions page
3. Click "Pillar Missions" tab
4. Select a pillar (Reading, Writing, Listening, Speaking)
5. See 10 questions
6. Answer all

**Test Code:**
```python
@pytest.mark.asyncio
async def test_generate_pillar_mission(client, student_token):
    response = await client.post(
        "/api/v1/missions/pillar",
        json={"pillar": "reading"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "pillar"
    assert data["pillar"] == "reading"
    assert len(data["questions"]) == 10
```

### TC-4.2.2: Submit Pillar Mission
```
POST /api/v1/missions/pillar/submit
{
  "mission_id": "...",
  "pillar": "reading",
  "answers": [
    {"question_id": "q1", "selected_option": "..."}, ...
  ]
}
```
**Expected:**
- Status: 200
- Points earned (0-100 based on performance)
- Interaction logged with pillar metadata

### TC-4.2.3: Pillar Mission - Invalid Pillar
```
POST /api/v1/missions/pillar
{
  "pillar": "invalid"
}
```
**Expected:**
- Status: 400
- Error: Invalid pillar (must be reading, writing, listening, speaking)

---

# SECTION 5: STUDENT FEATURES

## Test Suite 5.1: Speaking Module

### TC-5.1.1: Get Speaking Prompt
**Auth:** Student
```
POST /api/v1/speaking/prompt
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "prompt_id": "...",
  "prompt_text": "Tell me about your family",
  "topic": "Family",
  "grade_level": 3,
  "difficulty": "easy",
  "example_answer": "My family has 4 people: mum, dad, sister and me."
}
```

**Manual Flow:**
1. Log in as student
2. Go to Speaking section
3. Read the prompt
4. Click "Record Audio"
5. Speak into microphone
6. Click "Submit"

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_speaking_prompt(client, student_token):
    response = await client.post(
        "/api/v1/speaking/prompt",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "prompt_text" in data
    assert "topic" in data
```

### TC-5.1.2: Submit Speaking Response - Web Speech API
**Auth:** Student
```
POST /api/v1/speaking/submit
Headers: Authorization: Bearer <student_token>
{
  "prompt_id": "...",
  "transcript": "My family has 4 people",  // from browser Speech API
  "audio_url": "https://storage/audio-123.wav"  // optional, uploaded to storage
}
```
**Expected:**
- Status: 200
- Response:
```json
{
  "score": 75,
  "points_earned": 25,
  "feedback": {
    "pronunciation": "Good",
    "fluency": "Fair - try speaking more slowly",
    "vocabulary": "Appropriate for grade level"
  }
}
```

### TC-5.1.3: Submit Speaking Response - Whisper Fallback
**If Web Speech fails:**
```
POST /api/v1/speaking/submit
{
  "prompt_id": "...",
  "audio_file": <binary audio data>,  // send raw audio
  "audio_format": "wav"
}
```
**Expected:**
- Status: 200
- Whisper transcribes → evaluates → scores

### TC-5.1.4: Speaking - No Audio Provided
```
POST /api/v1/speaking/submit
{
  "prompt_id": "...",
  "transcript": ""  // empty
}
```
**Expected:**
- Status: 400
- Error: Audio or transcript required

---

## Test Suite 5.2: Spelling Bee

### TC-5.2.1: Get Spelling Word
**Auth:** Student
```
POST /api/v1/spelling-bee/word
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "word_id": "...",
  "word": "beautiful",
  "grade_level": 3,
  "audio_url": "https://tts-service/beautiful.mp3",  // TTS generated
  "difficulty": "medium",
  "hint": "Something that looks nice"
}
```

**Manual Flow:**
1. Log in as student
2. Go to Spelling Bee
3. Click "Play Word" (audio plays)
4. Type the word
5. Click "Check"
6. See feedback

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_spelling_word(client, student_token):
    response = await client.post(
        "/api/v1/spelling-bee/word",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "word" in data
    assert "audio_url" in data
```

### TC-5.2.2: Submit Spelling Answer
```
POST /api/v1/spelling-bee/submit
{
  "word_id": "...",
  "user_answer": "beautiful"
}
```
**Expected:**
- Status: 200
- Response:
```json
{
  "correct": true,
  "score": 100,
  "points_earned": 10,
  "feedback": "Excellent!"
}
```
or
```json
{
  "correct": false,
  "score": 0,
  "points_earned": 0,
  "correct_spelling": "beautiful",
  "feedback": "The correct spelling is 'beautiful'"
}
```

### TC-5.2.3: Spelling Answer - Case Insensitive
```
POST /api/v1/spelling-bee/submit
{
  "word_id": "...",
  "user_answer": "BEAUTIFUL"  // uppercase
}
```
**Expected:**
- Status: 200
- Response: `{ "correct": true, ... }`

### TC-5.2.4: Spelling Answer - Extra Spaces
```
POST /api/v1/spelling-bee/submit
{
  "word_id": "...",
  "user_answer": " beautiful  "  // leading/trailing spaces
}
```
**Expected:**
- Status: 200
- Response: `{ "correct": true, ... }`

---

## Test Suite 5.3: Story Time

### TC-5.3.1: Generate AI Story
**Auth:** Student
```
POST /api/v1/story-time/story
Headers: Authorization: Bearer <student_token>
{
  "topic": "Adventure"  // or any topic
}
```
**Expected:**
- Status: 200 or 202 (if async)
- Response:
```json
{
  "story_id": "...",
  "title": "Ali's Adventure in the Forest",
  "story_text": "Once upon a time, a boy named Ali went to the forest...",
  "grade_level": 3,
  "word_count": 250,
  "questions": [
    {
      "id": "q1",
      "question": "Who is the main character?",
      "options": ["Ali", "Sara", "Hassan", "Fatima"]
    },
    {...}
  ]
}
```
- Cached in Redis to avoid re-generation
- 3-5 comprehension questions included

**Manual Flow:**
1. Log in as student
2. Go to Story Time
3. Select topic
4. Read story
5. Answer comprehension questions

**Test Code:**
```python
@pytest.mark.asyncio
async def test_generate_story(client, student_token):
    response = await client.post(
        "/api/v1/story-time/story",
        json={"topic": "Adventure"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code in [200, 202]
    data = response.json()
    assert "story_text" in data
    assert "questions" in data
```

### TC-5.3.2: Submit Story Comprehension Answers
```
POST /api/v1/story-time/submit
{
  "story_id": "...",
  "answers": [
    {"question_id": "q1", "selected_option": "Ali"},
    {"question_id": "q2", "selected_option": "forest"},
    {"question_id": "q3", "selected_option": "treasure"}
  ]
}
```
**Expected:**
- Status: 200
- Response:
```json
{
  "score": 100,
  "points_earned": 20,
  "feedback": [
    {"question_id": "q1", "correct": true}
  ]
}
```

---

## Test Suite 5.4: Bilingual Chat

### TC-5.4.1: Send Chat Message (English)
**Auth:** Student
```
POST /api/v1/chat
Headers: Authorization: Bearer <student_token>
{
  "message": "What is a noun?",
  "language": "en"
}
```
**Expected:**
- Status: 200
- Response:
```json
{
  "conversation_id": "...",
  "user_message": "What is a noun?",
  "ai_response": "A noun is a word that names a person, place, thing, or idea...",
  "language": "en",
  "context_chunks": [
    {"content": "...", "relevance": 0.95}
  ]
}
```
- Response is RAG-grounded in curriculum
- Conversation history maintained

**Manual Flow:**
1. Log in as student
2. Go to Chat
3. Type "What is a noun?"
4. See AI response
5. Continue conversation

**Test Code:**
```python
@pytest.mark.asyncio
async def test_chat_english(client, student_token):
    response = await client.post(
        "/api/v1/chat",
        json={"message": "What is a noun?", "language": "en"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "ai_response" in data
    assert len(data["ai_response"]) > 0
```

### TC-5.4.2: Send Chat Message (Urdu)
```
POST /api/v1/chat
{
  "message": "اسم کیا ہے؟",  // "What is a noun?" in Urdu
  "language": "ur"
}
```
**Expected:**
- Status: 200
- Response in Urdu
- Bi-directional translation works

### TC-5.4.3: Chat - Inappropriate Content
```
POST /api/v1/chat
{
  "message": "<harmful content>",
  "language": "en"
}
```
**Expected:**
- Status: 200
- Safe response: "I'm here to help you learn English. Let me help with that."
- No error, but message filtered/sanitized

---

## Test Suite 5.5: Rewards & Daily Chest

### TC-5.5.1: Get Daily Reward Chest Status
**Auth:** Student
```
GET /api/v1/rewards/daily-chest
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "status": "available",  // or "claimed" or "locked"
  "next_available_at": "2025-04-30T23:59:59Z",
  "reward_points": 50,
  "can_claim": true
}
```

**Manual Flow:**
1. Log in as student
2. See daily chest icon on home page
3. Click "Open Chest"
4. Get points
5. Icon shows "Come back tomorrow"

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_daily_chest(client, student_token):
    response = await client.get(
        "/api/v1/rewards/daily-chest",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "can_claim" in data
```

### TC-5.5.2: Claim Daily Reward
```
POST /api/v1/rewards/daily-chest/claim
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "points_awarded": 50,
  "new_total": 150,
  "next_claim_at": "2025-05-01T00:00:00Z"
}
```
- Entry created in daily_rewards table
- Student.points incremented

### TC-5.5.3: Claim Reward Twice (same day)
**Setup:** Student already claimed today
```
POST /api/v1/rewards/daily-chest/claim
```
**Expected:**
- Status: 400 or 409
- Error: Already claimed today

---

## Test Suite 5.6: Leaderboard

### TC-5.6.1: Get Classroom Leaderboard
**Auth:** Student
```
GET /api/v1/leaderboard/<classroom_id>
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "classroom_name": "Grade 3-A",
  "rankings": [
    { "rank": 1, "name": "Ali", "points": 500, "is_me": false },
    { "rank": 2, "name": "Sara", "points": 450, "is_me": true },
    { "rank": 3, "name": "Hassan", "points": 420, "is_me": false }
  ]
}
```
- Sorted by points DESC
- Current student marked with is_me: true

**Manual Flow:**
1. Log in as student
2. Go to Leaderboard
3. See all students ranked by points

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_leaderboard(client, student_token, classroom_id):
    response = await client.get(
        f"/api/v1/leaderboard/{classroom_id}",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "rankings" in data
    assert data["rankings"][0]["rank"] == 1
    assert data["rankings"][0]["points"] >= data["rankings"][1]["points"]
```

---

# SECTION 6: TEACHER FEATURES

## Test Suite 6.1: Teacher Analytics

### TC-6.1.1: Get Classroom Overview
**Auth:** Teacher
```
GET /api/v1/evaluator/classroom/<classroom_id>
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "classroom_name": "Grade 3-A",
  "total_students": 30,
  "avg_completion_rate": 0.85,
  "pillar_stats": {
    "reading": { "avg_score": 78, "attempts": 45 },
    "writing": { "avg_score": 72, "attempts": 40 },
    "listening": { "avg_score": 81, "attempts": 42 },
    "speaking": { "avg_score": 75, "attempts": 38 }
  },
  "top_performers": [
    { "student_name": "Ali", "points": 500 }
  ],
  "bottom_performers": [
    { "student_name": "Hassan", "points": 150 }
  ]
}
```

**Manual Flow:**
1. Log in as teacher
2. Go to Analytics
3. Select classroom
4. See overview with charts

**Test Code:**
```python
@pytest.mark.asyncio
async def test_get_classroom_overview(client, teacher_token, classroom_id):
    response = await client.get(
        f"/api/v1/evaluator/classroom/{classroom_id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert "pillar_stats" in data
```

### TC-6.1.2: Get Individual Student Report
**Auth:** Teacher
```
GET /api/v1/evaluator/student/<student_id>
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "student_name": "Ali",
  "total_points": 500,
  "completion_rate": 0.9,
  "interaction_count": 45,
  "pillar_breakdown": {
    "reading": { "scores": [80, 85, 90], "avg": 85 },
    "writing": { "scores": [75, 78], "avg": 76.5 },
    "listening": { "scores": [88, 90, 92], "avg": 90 },
    "speaking": { "scores": [70, 72], "avg": 71 }
  },
  "recent_interactions": [
    {
      "type": "mission",
      "pillar": "reading",
      "score": 90,
      "timestamp": "2025-04-30T15:20:00Z"
    }
  ]
}
```

**Manual Flow:**
1. Log in as teacher
2. Go to Students
3. Click on a student
4. See detailed report with chart

### TC-6.1.3: Export Classroom Report (PDF)
**Auth:** Teacher
```
GET /api/v1/evaluator/classroom/<classroom_id>/report
Headers: Authorization: Bearer <teacher_token>
Params:
  format: pdf
```
**Expected:**
- Status: 200
- Content-Type: application/pdf
- PDF contains classroom overview, all students, pillar stats

**Manual Flow:**
1. In Analytics, click "Download Report"
2. PDF downloads with all data

---

## Test Suite 6.2: Announcements

### TC-6.2.1: Create Announcement
**Auth:** Teacher
```
POST /api/v1/announcements
Headers: Authorization: Bearer <teacher_token>
{
  "title": "Homework Due Tomorrow",
  "content": "Please complete the past tense worksheet.",
  "classroom_id": "...",
  "is_active": true
}
```
**Expected:**
- Status: 201
- Response: `{ "id": "...", "title": "...", "created_at": "..." }`

**Manual Flow:**
1. Log in as teacher
2. Go to Announcements
3. Click "Create"
4. Enter title, content
5. Select classroom
6. Click "Publish"

**Test Code:**
```python
@pytest.mark.asyncio
async def test_create_announcement(client, teacher_token, classroom_id):
    response = await client.post(
        "/api/v1/announcements",
        json={
            "title": "Homework",
            "content": "Complete the worksheet",
            "classroom_id": classroom_id,
            "is_active": True
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Homework"
```

### TC-6.2.2: Get Active Announcements (Student View)
**Auth:** Student
```
GET /api/v1/announcements/active
Headers: Authorization: Bearer <student_token>
```
**Expected:**
- Status: 200
- Response: `[ { "title": "...", "content": "...", "created_at": "..." }, ... ]`
- Only active announcements from their classroom

### TC-6.2.3: Update Announcement
**Auth:** Teacher (creator)
```
PUT /api/v1/announcements/<announcement_id>
Headers: Authorization: Bearer <teacher_token>
{
  "title": "Homework Due Tomorrow (Updated)"
}
```
**Expected:**
- Status: 200
- Announcement updated

### TC-6.2.4: Delete Announcement
**Auth:** Teacher
```
DELETE /api/v1/announcements/<announcement_id>
Headers: Authorization: Bearer <teacher_token>
```
**Expected:**
- Status: 204
- Announcement deleted

---

# SECTION 7: ADMIN FEATURES

## Test Suite 7.1: Admin Dashboard

### TC-7.1.1: Get System Overview
**Auth:** Admin
```
GET /api/v1/admin/dashboard
Headers: Authorization: Bearer <admin_token>
```
**Expected:**
- Status: 200
- Response:
```json
{
  "total_teachers": 45,
  "total_students": 1200,
  "total_classrooms": 60,
  "active_users_today": 850,
  "api_calls_today": 15000,
  "most_used_feature": "missions"
}
```

**Manual Flow:**
1. Log in as admin
2. See dashboard with system stats

---

## Test Suite 7.2: Teacher Management

### TC-7.2.1: Create Invite Code
**Auth:** Admin
```
POST /api/v1/admin/invite-codes
Headers: Authorization: Bearer <admin_token>
{
  "uses": 5  // number of sign-ups allowed
}
```
**Expected:**
- Status: 201
- Response: `{ "code": "ADMIN-2025-001", "uses_remaining": 5, "created_at": "..." }`

### TC-7.2.2: List All Teachers
**Auth:** Admin
```
GET /api/v1/admin/teachers
Headers: Authorization: Bearer <admin_token>
```
**Expected:**
- Status: 200
- Response: `[ { "id": "...", "email": "...", "full_name": "...", "created_at": "..." }, ... ]`

### TC-7.2.3: Promote Teacher to Admin
**Auth:** Admin
```
PUT /api/v1/admin/teachers/<teacher_id>
{
  "is_admin": true
}
```
**Expected:**
- Status: 200
- Teacher's `is_admin` flag set to true

### TC-7.2.4: Disable Teacher
**Auth:** Admin
```
PUT /api/v1/admin/teachers/<teacher_id>
{
  "is_active": false
}
```
**Expected:**
- Status: 200
- Teacher can no longer log in

---

## Test Suite 7.3: Curriculum Audit

### TC-7.3.1: List All Curriculum Uploads
**Auth:** Admin
```
GET /api/v1/admin/curriculum/uploads
Headers: Authorization: Bearer <admin_token>
```
**Expected:**
- Status: 200
- Response:
```json
[
  {
    "id": "...",
    "teacher_id": "...",
    "teacher_name": "Ms. Fatima",
    "file_name": "Grade3-English.pdf",
    "grade_level": 3,
    "total_chunks": 127,
    "created_at": "..."
  }
]
```

### TC-7.3.2: Delete Curriculum Upload
**Auth:** Admin
```
DELETE /api/v1/admin/curriculum/uploads/<upload_id>
Headers: Authorization: Bearer <admin_token>
```
**Expected:**
- Status: 204
- Upload and all chunks deleted

---

# SECTION 8: INTERACTION LOGGING (Agent C)

## Test Suite 8.1: Interaction Logging

### TC-8.1.1: Log Student Interaction (Automatic)
**Trigger:** Student submits mission/spelling/speaking
```
POST /api/v1/interactions
Headers: Authorization: Bearer <student_token>
{
  "interaction_type": "mission",
  "pillar": "reading",
  "correct": true,
  "score": 90,
  "prompt": "What is a noun?",
  "response": "A person, place, or thing"
}
```
**Expected:**
- Status: 204 (fire-and-forget)
- Entry created in student_interactions table (async)

**Notes:**
- Should be logged automatically by BackgroundTasks
- Should NOT block the response
- Should include: timestamp, student_id, classroom_id, grade_level

**Test Code:**
```python
@pytest.mark.asyncio
async def test_log_interaction(client, student_token):
    response = await client.post(
        "/api/v1/interactions",
        json={
            "interaction_type": "mission",
            "pillar": "reading",
            "correct": True,
            "score": 90,
            "prompt": "...",
            "response": "..."
        },
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 204

    # Verify logged asynchronously (may need delay)
    # SELECT * FROM student_interactions WHERE student_id = '...'
```

---

# SECTION 9: ERROR HANDLING & EDGE CASES

## Test Suite 9.1: Auth Edge Cases

### TC-9.1.1: Expired Token
```
GET /api/v1/classroom/<classroom_id>
Headers: Authorization: Bearer <expired_token>
```
**Expected:**
- Status: 401
- Error: Token expired

### TC-9.1.2: Malformed Token
```
GET /api/v1/classroom/<classroom_id>
Headers: Authorization: Bearer malformed-token-xyz
```
**Expected:**
- Status: 401
- Error: Invalid token

### TC-9.1.3: Missing Authorization Header
```
GET /api/v1/classroom/<classroom_id>
```
**Expected:**
- Status: 401
- Error: Authorization header required

---

## Test Suite 9.2: Validation Edge Cases

### TC-9.2.1: Create Classroom - Missing Required Fields
```
POST /api/v1/classroom
{
  "name": "Grade 3-A"
  // missing grade_level
}
```
**Expected:**
- Status: 422
- Error: `{ "detail": [{"loc": ["body", "grade_level"], "msg": "field required"}] }`

### TC-9.2.2: Create Student - Name Too Long
```
POST /api/v1/classroom/<classroom_id>/student
{
  "full_name": "A" * 500  // 500 characters
}
```
**Expected:**
- Status: 422 or 400
- Error: Name too long (max 100 chars)

### TC-9.2.3: Invalid Grade Level
```
POST /api/v1/classroom
{
  "name": "Invalid",
  "grade_level": 10  // only 1-6 valid
}
```
**Expected:**
- Status: 422
- Error: grade_level must be 1-6

---

## Test Suite 9.3: Concurrency & Race Conditions

### TC-9.3.1: Two Students Claim Daily Reward Simultaneously
**Setup:** 2 concurrent requests from same student
```
POST /api/v1/rewards/daily-chest/claim  (Request 1)
POST /api/v1/rewards/daily-chest/claim  (Request 2, 10ms after)
```
**Expected:**
- Request 1: Status 200, points awarded
- Request 2: Status 400 or 409, already claimed
- Only one entry in daily_rewards table

### TC-9.3.2: Two Teachers Submit Mission Answers Simultaneously
```
POST /api/v1/missions/daily/submit  (Request 1)
POST /api/v1/missions/daily/submit  (Request 2, same student)
```
**Expected:**
- Request 1: Status 200, success
- Request 2: Status 409, already submitted

---

# SECTION 10: FRONTEND E2E TESTS (Manual)

## Test Suite 10.1: Student Journey

### TC-10.1.1: Complete Student Onboarding
**Manual Steps:**
1. Open frontend URL
2. See landing page with "Start Learning" button
3. Click "I'm a Student"
4. Enter class code "ABC123"
5. Select avatar from list
6. Enter PIN "1234"
7. Confirm login
8. See dashboard with points, avatar, classroom name

**Expected:**
- All information persists across page reloads
- JWT stored in localStorage
- Can navigate to all student pages

### TC-10.1.2: Complete Daily Mission Flow
**Manual Steps:**
1. From student home, click "Start Daily Mission"
2. See 3 questions
3. Select answers
4. Click "Submit"
5. See score + feedback
6. See points increased on dashboard

### TC-10.1.3: Complete Speaking Task
**Manual Steps:**
1. Go to Speaking section
2. See prompt
3. Click "Record"
4. Speak clearly
5. Click "Stop"
6. Click "Submit"
7. See evaluation + score

**Expected:**
- Microphone permission works
- Audio recorded
- Transcription appears
- Score > 0

---

## Test Suite 10.2: Teacher Journey

### TC-10.2.1: Teacher Setup Flow
**Manual Steps:**
1. Open frontend
2. Click "I'm a Teacher"
3. Sign up with email/password
4. Create classroom (Grade 3, Section A)
5. Add 5 students manually
6. Upload curriculum PDF
7. See all features available

**Expected:**
- Email verification sent (if configured)
- Classroom created with unique code
- Students added with PINs
- PDF processing starts

### TC-10.2.2: View Analytics Dashboard
**Manual Steps:**
1. After students complete missions
2. Go to Analytics
3. Select classroom
4. See pillar breakdown chart
5. See top/bottom performers
6. Click on student → see individual report

**Expected:**
- Charts render correctly
- Data updates in real-time
- PDF export works

---

## Test Suite 10.3: Mobile Responsiveness

### TC-10.3.1: Student App - Mobile View
**Manual Steps:**
1. Open frontend on mobile device (or Chrome DevTools)
2. Set viewport to 375x667 (iPhone SE)
3. Verify:
   - Bottom navigation visible
   - All buttons clickable
   - Text readable without zoom
   - Images load correctly
   - No horizontal scroll

### TC-10.3.2: Teacher Dashboard - Tablet View
**Manual Steps:**
1. Set viewport to 1024x768 (iPad)
2. Verify:
   - Sidebar navigation present
   - Tables display without scroll
   - Charts responsive
   - Modals centered

---

# SECTION 11: PERFORMANCE TESTS

## Test Suite 11.1: API Response Times

### TC-11.1.1: GET Classroom - Response Time < 500ms
```
GET /api/v1/classroom/<classroom_id>
```
**Expected:**
- Status: 200
- Response time: < 500ms
- Use: `time curl -X GET http://localhost:8000/api/v1/classroom/xxx`

### TC-11.1.2: Submit Mission - Response Time < 3s
```
POST /api/v1/missions/daily/submit
{...}
```
**Expected:**
- Status: 200
- Response time: < 3s (includes LLM evaluation)

### TC-11.1.3: Get Leaderboard (30 students) - Response Time < 200ms
```
GET /api/v1/leaderboard/<classroom_id>
```
**Expected:**
- Response time: < 200ms
- Use Redis cache if needed

---

## Test Suite 11.2: Load Testing

### TC-11.2.1: Concurrent Student Logins (50 students)
```bash
# Use: locust, Apache JMeter, or k6
# Simulate 50 concurrent login requests
```
**Expected:**
- All succeed
- Response time avg < 200ms
- No server crashes

### TC-11.2.2: Mission Generation Under Load
```bash
# 20 concurrent requests to POST /api/v1/missions/daily
```
**Expected:**
- All complete successfully
- Cache hit rate increases
- No race conditions

---

# SECTION 12: DATABASE INTEGRITY

## Test Suite 12.1: Referential Integrity

### TC-12.1.1: Delete Classroom - Cascade to Students
**Setup:** Classroom with 5 students
```sql
DELETE FROM classrooms WHERE id = '...';
```
**Expected:**
- Classroom deleted
- All 5 students deleted (or soft-deleted)
- No orphaned records

### TC-12.1.2: Delete Teacher - Cascade to Classrooms
**Setup:** Teacher with 3 classrooms, 20 students
```sql
DELETE FROM teachers WHERE id = '...';
```
**Expected:**
- Teacher deleted
- All 3 classrooms deleted
- All 20 students deleted
- All interactions preserved (foreign key: ON DELETE SET NULL)

---

## Test Suite 12.2: Data Consistency

### TC-12.2.1: Student Points Consistency
**Verify:**
```sql
SELECT s.id, s.points,
  (SELECT SUM(score) FROM student_interactions
   WHERE student_id = s.id) as calculated_points
FROM students s
WHERE s.points != calculated_points;
```
**Expected:**
- Query returns 0 rows (all consistent)

### TC-12.2.2: Mission Completion Tracking
**Verify:**
```sql
SELECT COUNT(*) FROM missions_completed mc
WHERE NOT EXISTS (
  SELECT 1 FROM student_interactions si
  WHERE si.student_id = mc.student_id
    AND si.interaction_type = mc.mission_type
);
```
**Expected:**
- Query returns 0 rows

---

# APPENDIX: Test Data Generator

```python
# tests/data_generator.py
import uuid
from datetime import datetime, timezone
from app.core.security import create_student_token

def create_teacher(supabase, email="teacher@test.com"):
    """Create a test teacher account."""
    response = supabase.table("teachers").insert({
        "id": str(uuid.uuid4()),
        "email": email,
        "full_name": "Test Teacher",
        "is_admin": False
    }).execute()
    return response.data[0]

def create_classroom(supabase, teacher_id, name="Grade 3-A"):
    """Create a test classroom."""
    response = supabase.table("classrooms").insert({
        "id": str(uuid.uuid4()),
        "teacher_id": teacher_id,
        "name": name,
        "grade_level": 3,
        "class_code": "ABC123"
    }).execute()
    return response.data[0]

def create_student(supabase, classroom_id, name="Ali"):
    """Create a test student."""
    response = supabase.table("students").insert({
        "id": str(uuid.uuid4()),
        "classroom_id": classroom_id,
        "full_name": name,
        "avatar_url": f"https://api.dicebear.com/7.x/adventurer/svg?seed={name}",
        "secret_pin": "1234",
        "points": 0
    }).execute()
    return response.data[0]

def generate_student_token(student_id, classroom_id):
    """Generate a student JWT for testing."""
    return create_student_token({"student_id": student_id, "classroom_id": classroom_id})

# Usage in conftest.py
@pytest.fixture
async def setup_test_data(supabase_client):
    teacher = create_teacher(supabase_client)
    classroom = create_classroom(supabase_client, teacher["id"])
    students = [create_student(supabase_client, classroom["id"], f"Student{i}") for i in range(5)]
    return {
        "teacher": teacher,
        "classroom": classroom,
        "students": students,
        "tokens": {
            "student": generate_student_token(students[0]["id"], classroom["id"])
        }
    }
```

---

# Running Tests

## Run All Tests
```bash
cd backend
pytest -v
```

## Run Specific Test Suite
```bash
pytest tests/test_auth.py -v
pytest tests/test_classroom.py -v
```

## Run with Coverage
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

## Run Frontend Tests
```bash
cd frontend
npm test
```

---

This comprehensive test plan covers all 11 modules and 100+ individual test cases ensuring PrimePal is production-ready.
