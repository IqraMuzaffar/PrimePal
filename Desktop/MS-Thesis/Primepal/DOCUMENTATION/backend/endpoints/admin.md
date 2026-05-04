# Admin Endpoints

**Module:** `backend/app/api/v1/endpoints/admin.py`
**Prefix:** `/api/v1/admin` (defined on the router itself)
**Auth:** Admin GoTrue (`get_current_admin`) for most endpoints; some are public
**Features:** Admin management, teacher CRUD, classroom CRUD, student CRUD, curriculum management (A03), raw data export (A04)

## Overview

Comprehensive admin panel backend. Manages teachers (via invite codes), classrooms, students, and curriculum. Includes a full RAG upload pipeline with status tracking. All destructive actions are logged to `admin_audit_log`. Exports available in CSV and JSON formats.

---

## Admin Invite Codes

### POST `/api/v1/admin/invite-code`

**Auth:** Admin GoTrue

Create an invite code for a new admin.

**Request Body:** `AdminInviteRequest`
```json
{ "email": "newadmin@school.edu", "expires_in_days": 7 }
```

**Response:**
```json
{ "code": "base64url-token", "email": "newadmin@school.edu", "expires_at": "2024-01-22T..." }
```

**DB Tables:** `admin_invite_codes` (insert), `admin_audit_log` (log)

### POST `/api/v1/admin/validate-invite-code`

**Auth:** None (public)

Validate an invite code before signup.

**Query Parameters:** `code` (string)

**Response:** `{ "valid": true, "email": "..." }`

**Errors:** 400 (invalid, already used, expired)

---

## Teacher Management

### POST `/api/v1/admin/teachers`

**Auth:** None (public -- invite code is the auth)

Create a new admin account via invite code.

**Request Body:** `TeacherCreateRequest`
```json
{ "email": "admin@school.edu", "full_name": "Amna Khan", "password": "secure123", "invite_code": "abc..." }
```

**Business Logic:**
1. Verify invite code (valid, unused, not expired)
2. Create Supabase Auth user with `admin_create_user`
3. Insert into `teachers` table with `role='admin'`
4. Mark invite code as used

**DB Tables:** `admin_invite_codes`, `teachers` (insert), Supabase Auth

### PUT `/api/v1/admin/teachers/{teacher_id}`

**Auth:** Admin GoTrue

Edit teacher details (full_name, email).

**Request Body:** `TeacherEditRequest`
```json
{ "full_name": "Updated Name", "email": "new@email.com" }
```

**DB Tables:** `teachers` (update), `admin_audit_log`

### DELETE `/api/v1/admin/teachers/{teacher_id}`

**Auth:** Admin GoTrue

Delete a teacher and reassign their classrooms.

**Request Body:** `TeacherDeleteRequest`
```json
{ "reassign_classrooms_to": "target-teacher-uuid" }
```

**Response:** `{ "deleted": true, "classrooms_reassigned": 3 }`

**DB Tables:** `teachers` (delete), `classrooms` (update teacher_id), `admin_audit_log`

### GET `/api/v1/admin/teachers`

**Auth:** Admin GoTrue

List all teachers.

**Response:** Array of teacher objects.

---

## Classroom Management

### PUT `/api/v1/admin/classrooms/{classroom_id}/reassign`

**Auth:** Admin GoTrue

Reassign a classroom to a different teacher.

**Request Body:** `ClassroomReassignRequest`
```json
{ "teacher_id": "uuid" }
```

**DB Tables:** `teachers` (validate), `classrooms` (update), `admin_audit_log`

### GET `/api/v1/admin/classrooms`

**Auth:** Admin GoTrue

List all classrooms with teacher names (via join: `classrooms` + `teachers(full_name)`).

### POST `/api/v1/admin/classrooms`

**Auth:** Admin GoTrue

Create a new classroom.

**Request Body:** `ClassroomCreateRequest`
```json
{ "class_name": "Grade 3A", "grade_level": 3, "teacher_id": "uuid", "section": "A" }
```

**Business Logic:** Validates teacher exists, generates unique 6-char alphanumeric class code (up to 10 retries).

**DB Tables:** `teachers` (validate), `classrooms` (insert), `admin_audit_log`

### PUT `/api/v1/admin/classrooms/{classroom_id}`

**Auth:** Admin GoTrue

Edit classroom details (class_name, grade_level, section).

**Request Body:** `ClassroomEditRequest`

### DELETE `/api/v1/admin/classrooms/{classroom_id}`

**Auth:** Admin GoTrue

Delete a classroom. Returns 409 if students still exist.

**Errors:** 409 (has students), 404 (not found)

---

## Curriculum Management

### DELETE `/api/v1/admin/curriculum/{chunk_id}`

**Auth:** Admin GoTrue

Delete a single curriculum chunk from `snc_knowledge_base`.

### GET `/api/v1/admin/curriculum`

**Auth:** Admin GoTrue

List all curriculum chunks.

### POST `/api/v1/admin/curriculum/upload`

**Auth:** Admin GoTrue

Upload a PDF textbook and run the full RAG pipeline with status tracking.

**Request:** multipart/form-data
- `file` (UploadFile) -- PDF only
- `grade_level` (int) -- 1 to 5
- `book_title` (string)

**Pipeline stages:** `pending` -> `extracting` -> `chunking` -> `embedding` -> `success` (or `failed`)

**Response:**
```json
{
  "id": "upload-uuid",
  "status": "success",
  "book_title": "Grade 3 English",
  "grade_level": 3,
  "filename": "textbook.pdf",
  "total_chunks": 45,
  "embedded_count": 45
}
```

**DB Tables:** `snc_uploads` (status tracking), `snc_knowledge_base` (embeddings), `admin_audit_log`

### GET `/api/v1/admin/curriculum/books`

**Auth:** Admin GoTrue

List all uploaded books from `snc_uploads`, ordered by grade then date.

### GET `/api/v1/admin/curriculum/books/{book_id}/chunks`

**Auth:** Admin GoTrue

Paginated chunk viewer for a specific book.

**Query Parameters:** `page` (int, default 1), `page_size` (int, default 20, max 100)

**Response:**
```json
{
  "chunks": [{ "id": "uuid", "content_preview": "First 200 chars...", "content": "...", "metadata": {...} }],
  "total": 45, "page": 1, "page_size": 20, "total_pages": 3
}
```

### DELETE `/api/v1/admin/curriculum/books/{book_id}`

**Auth:** Admin GoTrue

Delete a book and all its chunks from the knowledge base. Matches chunks via `metadata->>book_title`.

### GET `/api/v1/admin/curriculum/books/{book_id}/status`

**Auth:** Admin GoTrue

Poll upload status for a specific book (for progress tracking UI).

**Response:**
```json
{ "id": "uuid", "status": "embedding", "error_message": null, "total_chunks": 45, "updated_at": "..." }
```

---

## Student Management

### GET `/api/v1/admin/students`

**Auth:** Admin GoTrue

List all students with optional search and filters.

**Query Parameters:**
- `q` (string, optional) -- search by name or roll number
- `grade_level` (int, optional)
- `classroom_id` (string, optional)

**Response:** Array of student objects with flattened classroom info (classroom_name, grade_level).

### POST `/api/v1/admin/students`

**Auth:** Admin GoTrue

Create a single student with auto-generated 4-digit PIN and DiceBear avatar.

**Request Body:** `StudentCreateRequest`
```json
{ "student_name": "Ali", "classroom_id": "uuid", "roll_number": "001", "email": "ali@school.edu" }
```

### PUT `/api/v1/admin/students/{student_id}`

**Auth:** Admin GoTrue

Edit student details. Changing `classroom_id` transfers the student.

**Request Body:** `StudentEditRequest`
```json
{ "student_name": "Ali Khan", "roll_number": "002", "email": null, "classroom_id": "new-uuid" }
```

### DELETE `/api/v1/admin/students/{student_id}`

**Auth:** Admin GoTrue

Delete a student.

### POST `/api/v1/admin/students/{student_id}/reset-pin`

**Auth:** Admin GoTrue

Reset a student's PIN to a new random 4-digit code.

**Response:** `{ "new_pin": "5678" }`

---

## Raw Data Export (A04)

All export endpoints support `format` query parameter: `"csv"` (default) or `"json"`.

### GET `/api/v1/admin/export/students`

**Query Parameters:** `grade_level` (optional), `format` (default "csv")

**CSV Columns:** student_id, student_name, roll_number, grade_level, classroom_name, email, total_points, current_streak, created_at

### GET `/api/v1/admin/export/interactions`

**Query Parameters:** `grade_level`, `date_from`, `date_to`, `student_id`, `pillar`, `format`

**CSV Columns:** id, student_id, student_name, grade_level, classroom_name, interaction_type, pillar, correct, score, original_message, created_at

**Limit:** 50,000 rows

### GET `/api/v1/admin/export/missions`

**Query Parameters:** `grade_level`, `date_from`, `date_to`, `student_id`, `pillar`, `format`

**CSV Columns:** student_id, student_name, grade_level, pillar, task_type, is_correct, points_awarded, completed_at

Filters to `interaction_type IN ('mission_mc', 'mission_fill')`.

### GET `/api/v1/admin/export/evaluations`

**Query Parameters:** `grade_level`, `evaluation_type`, `student_id`, `format`

**CSV Columns:** student_id, student_name, grade_level, evaluation_type, section, pillar, question_text, student_answer, is_correct, likert_value, time_taken_ms, created_at

**Note:** Returns empty data gracefully if evaluation tables do not exist yet.
