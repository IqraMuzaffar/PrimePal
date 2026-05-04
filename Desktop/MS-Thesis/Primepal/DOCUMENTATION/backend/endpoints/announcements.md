# Announcements Endpoints

**Module:** `backend/app/api/v1/endpoints/announcements.py`
**Prefix:** `/api/v1/announcements`
**Auth:** Mixed -- Teacher GoTrue for CRUD, public for student-facing active announcement

## Overview

Bilingual announcement board for classrooms. Teachers post announcements in English; the system auto-translates to Urdu using gpt-4o-mini. Supports three scope levels: classroom-specific, grade-level, or school-wide. Students see the latest active announcement on their home dashboard.

---

## POST `/api/v1/announcements`

**Auth:** Teacher GoTrue (`get_current_teacher`)
**Status Code:** 201

Create a new bilingual announcement.

**Request Body:** `AnnouncementCreate`
```json
{
  "message_en": "Tomorrow is a holiday. No classes!",
  "scope": "grade_level",
  "classroom_id": null,
  "target_grade_level": 3
}
```

**Validation:**
- `scope` must be one of: `"classroom"`, `"grade_level"`, `"school_wide"`
- `message_en` max 5000 characters, non-empty
- If `scope="classroom"`: `classroom_id` required, teacher ownership verified
- If `scope="grade_level"`: `target_grade_level` required (1-5)

**Response:** `AnnouncementResponse`
```json
{
  "id": "uuid",
  "classroom_id": null,
  "teacher_id": "uuid",
  "message_en": "Tomorrow is a holiday. No classes!",
  "message_ur": "...(Urdu translation)...",
  "scope": "grade_level",
  "target_grade_level": 3,
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Business Logic:**
1. Validate scope and required parameters
2. Translate English to Urdu via `translate_to_urdu()` (gpt-4o-mini, temperature=0)
3. Insert into `announcements` table with `is_active=true`

**DB Tables:** `classrooms` (ownership check), `announcements` (insert)

**Errors:** 400 (empty message, missing required params), 403 (not your classroom), 500 (translation or DB failure)

---

## GET `/api/v1/announcements`

**Auth:** Teacher GoTrue (`get_current_teacher`)

Fetch all announcements (active and inactive) created by the authenticated teacher, newest first.

**Response:** `AnnouncementsList`
```json
{
  "announcements": [...],
  "total_count": 12
}
```

**DB Tables:** `announcements` (filtered by teacher_id)

---

## GET `/api/v1/announcements/classroom/{classroom_id}`

**Auth:** Teacher GoTrue (`get_current_teacher`)

Fetch all announcements for a specific classroom. Includes classroom-scoped, grade-level-scoped (matching grade), and school-wide announcements.

**Path Parameters:** `classroom_id` (string)

**Response:** `AnnouncementsList`

**Business Logic:**
1. Verify teacher owns the classroom
2. Get classroom grade level
3. Fetch all teacher's announcements
4. Filter to: classroom_id match OR (grade_level scope + matching grade) OR school_wide scope
5. Sort by created_at DESC

**DB Tables:** `classrooms`, `announcements`

**Errors:** 403 (not your classroom), 404 (classroom not found)

---

## GET `/api/v1/announcements/active/{classroom_id}`

**Auth:** None (public)

Fetch the latest active announcement for a student's classroom. Used by the student frontend home dashboard.

**Path Parameters:** `classroom_id` (string)

**Response:** `AnnouncementResponse` or `null` if no active announcement

**Business Logic:** Fetches classroom's grade_level and teacher_id, then finds the most recent active announcement that applies (classroom-specific, grade-level match, or school-wide).

**DB Tables:** `classrooms`, `announcements`

---

## PATCH `/api/v1/announcements/{announcement_id}`

**Auth:** Teacher GoTrue (`get_current_teacher`)

Toggle an announcement's active status. Only the teacher who created it can update it.

**Path Parameters:** `announcement_id` (string)

**Request Body:** `AnnouncementUpdate`
```json
{ "is_active": false }
```

**Response:** `AnnouncementResponse`

**DB Tables:** `announcements` (read + update)

**Errors:** 404 (announcement not found or not yours)
