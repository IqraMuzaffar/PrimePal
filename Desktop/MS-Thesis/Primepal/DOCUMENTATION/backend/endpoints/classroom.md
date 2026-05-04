# Classroom Endpoints

**Module:** `backend/app/api/v1/endpoints/classroom.py`
**Prefix:** `/api/v1/classroom`
**Auth:** All endpoints require Teacher GoTrue JWT (`get_current_teacher`)
**Features:** Classroom Manager (Feature 2), SNC Pacing Calendar (Feature 15), Active Topics

## Overview

Full CRUD for classrooms and student roster management. Includes syllabus pacing calendar (30 weeks) and SNC topic selection per classroom. Admin users bypass ownership checks.

---

## POST `/api/v1/classroom/`

**Permission:** `classroom:create`

Create a new classroom with auto-generated class code and 30-week syllabus.

**Request Body:** `ClassroomCreate` (from `app.schemas.classroom`)
- `grade_level` (int, required)
- `section` (string, required)
- `class_name` (string, optional -- auto-generated as "Grade X - Section Y")

**Response:** `ClassroomResponse` (201)

**Business Logic:**
1. Auto-generate `class_name` if not provided
2. Check for duplicate grade+class_name per teacher (409 Conflict)
3. Generate memorable class code via `generate_memorable_code()` with retry (up to 10 attempts)
4. Insert classroom row
5. Auto-generate 30 `classroom_syllabus` rows (week 1 active, rest locked)

**DB Tables:** `classrooms` (insert), `classroom_syllabus` (bulk insert)

**Errors:** 409 (duplicate), 500 (code generation failure)

---

## GET `/api/v1/classroom/`

List all classrooms for the authenticated teacher. Admin sees all classrooms.

**Response:** `List[ClassroomResponse]` -- newest first

**DB Tables:** `classrooms`

---

## GET `/api/v1/classroom/{classroom_id}`

Get classroom details plus the full student roster.

**Path Parameters:** `classroom_id` (string)

**Response:** `ClassroomDetail` -- classroom fields + `students` array with: `id, student_name, avatar_url, secret_pin, roll_number, email, avatar_style, theme_color, points, father_name`

**DB Tables:** `classrooms`, `students`

**Errors:** 404 (not found), 403 (not your classroom)

---

## DELETE `/api/v1/classroom/{classroom_id}`

**Permission:** `classroom:delete`

Delete a classroom. Must have 0 students.

**Response:** 204 No Content

**DB Tables:** `classrooms` (delete), `students` (count check)

**Errors:** 400 (has students), 404 (not found)

---

## PATCH `/api/v1/classroom/{classroom_id}`

**Permission:** `classroom:update`

Update classroom settings (currently only `class_name`).

**Request Body:** `ClassroomUpdate`
- `class_name` (string, optional)

**Response:** `ClassroomResponse`

**Errors:** 422 (no fields), 404, 403, 500

---

## POST `/api/v1/classroom/{classroom_id}/students/bulk`

**Permission:** `student:create`

Bulk-create student ghost profiles with randomly assigned adventurer avatars.

**Request Body:** `StudentBulkCreate`
- `names` (list of strings)

**Response:** `{ "added": int }`

**Business Logic:** Creates student rows with DiceBear adventurer avatars, default theme `#6366f1`.

**DB Tables:** `students` (bulk insert)

---

## POST `/api/v1/classroom/{classroom_id}/students/bulk-v2`

**Permission:** `student:create`

Bulk-create students with name, roll_number, and email fields.

**Request Body:** `StudentBulkCreateV2`
- `students` -- list of `{ student_name, roll_number?, email? }`

**Response:** `{ "added": int }`

**DB Tables:** `students` (bulk insert)

---

## DELETE `/api/v1/classroom/{classroom_id}/students/{student_id}`

**Permission:** `student:delete`

Remove a student from the roster. Returns 204 on success.

**DB Tables:** `students` (delete)

**Errors:** 404 (student not found in classroom)

---

## PATCH `/api/v1/classroom/{classroom_id}/students/{student_id}`

**Permission:** `student:update`

Update student identity fields (name, roll_number, email).

**Request Body:** `StudentUpdate`
- `student_name` (string, optional)
- `roll_number` (string, optional)
- `email` (string, optional)

**Response:** `StudentResponse`

**Errors:** 422 (no fields), 404

---

## GET `/api/v1/classroom/{classroom_id}/active-topics`

Get active SNC topics for this classroom. If no topics have been saved to `classroom_active_topics`, returns ALL topics for the classroom's grade level (default all active). Topics disabled at the grade level via `grade_topic_selections` are excluded.

**Response:** `list[SncTopicOut]` -- `{ id, grade_level, skill, topic_name }`

**DB Tables:** `classroom_active_topics`, `snc_topics`, `classrooms`, `grade_topic_selections`

---

## PUT `/api/v1/classroom/{classroom_id}/active-topics`

**Permission:** `topic:select`

Replace all active topic selections for this classroom. Send `topic_ids: []` to reset to default (all active).

**Request Body:** `ActiveTopicsUpdate`
- `topic_ids` (list of int)

**Response:** `ActiveTopicsResponse` -- `{ "active_count": int }`

**Business Logic:** Delete-then-insert replacement in `classroom_active_topics`.

---

## GET `/api/v1/classroom/{classroom_id}/topics-by-skill`

Get topics organized by LSRW skills (listening, speaking, reading, writing) for the classroom's grade. Each topic annotated with `is_globally_active` from `grade_topic_selections`.

**Response:** `TopicsBySkillResponse`
```json
{
  "grade_level": 3,
  "skills": [
    {
      "skill": "listening",
      "topics": [{ "id": 1, "grade_level": 3, "skill": "listening", "topic_name": "..." }]
    }
  ]
}
```

**DB Tables:** `snc_topics`, `grade_topic_selections`, `classroom_active_topics`, `classrooms`

---

## GET `/api/v1/classroom/{classroom_id}/syllabus`

Return the 30-week pacing calendar for a classroom.

**Response:** `SyllabusListResponse`
```json
{
  "weeks": [
    { "id": "uuid", "week_number": 1, "topic_title": "Week 1: Topic 1", "status": "active" }
  ]
}
```

**DB Tables:** `classroom_syllabus`

---

## PATCH `/api/v1/classroom/{classroom_id}/syllabus/{week_number}`

**Permission:** `syllabus:update`

Update the status of a specific week in the pacing calendar.

**Request Body:** `UpdateWeekStatusRequest`
- `status` -- one of: `"locked"`, `"active"`, `"completed"`

**Response:** `{ "ok": true }`

**DB Tables:** `classroom_syllabus`

**Errors:** 404 (week not found)
