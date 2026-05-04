# Topics Endpoints

**Module:** `backend/app/api/v1/endpoints/topics.py`
**Prefix:** `/api/v1/topics`
**Auth:** Mixed -- public for listing, Teacher GoTrue for grade-level selections

## Overview

Manages SNC (Single National Curriculum) English topic definitions and grade-level topic activation. Topics are global reference data shared across all classrooms. Teachers can toggle topics on/off at the grade level via `grade_topic_selections`.

---

## GET `/api/v1/topics/`

**Auth:** None (public)

List all predefined SNC English topics for a given grade level.

**Query Parameters:**
- `grade_level` (int, required) -- 1 to 5

**Response:** `list[SncTopicOut]`
```json
[
  { "id": 1, "grade_level": 3, "topic_name": "My Family" }
]
```

**DB Tables:** `snc_topics` (filtered by grade_level, ordered by id)

**Errors:** 400 (grade_level out of range 1-5)

---

## GET `/api/v1/topics/grade-selections/{grade_level}`

**Auth:** Teacher GoTrue (`get_current_teacher`)

List all SNC topics for a grade, each annotated with its active status from `grade_topic_selections`. Topics with no saved row default to `is_active=true`.

**Path Parameters:** `grade_level` (int) -- 1 to 5

**Response:** `GradeSelectionsResponse`
```json
{
  "grade_level": 3,
  "topics": [
    {
      "topic_id": 1,
      "topic_name": "My Family",
      "skill": "listening",
      "is_active": true
    },
    {
      "topic_id": 2,
      "topic_name": "Animals",
      "skill": "reading",
      "is_active": false
    }
  ]
}
```

**DB Tables:** `snc_topics`, `grade_topic_selections`

**Errors:** 400 (grade_level out of range)

---

## PUT `/api/v1/topics/grade-selections/{grade_level}`

**Auth:** Teacher GoTrue (`get_current_teacher`)
**Permission:** `topic:manage_grade`

Bulk update active status for a grade's topics. Upserts rows in `grade_topic_selections`.

**Path Parameters:** `grade_level` (int) -- 1 to 5

**Request Body:** `GradeSelectionsUpdate`
```json
{
  "selections": [
    { "topic_id": 1, "is_active": true },
    { "topic_id": 2, "is_active": false }
  ]
}
```

**Response:** `GradeSelectionsResponse` (same as GET -- returns the full updated list)

**Business Logic:**
1. Validate grade_level (1-5)
2. Upsert each selection into `grade_topic_selections` with `on_conflict="grade_level,topic_id"`
3. Re-fetch and return the full topic list (delegates to GET handler)

**DB Tables:** `grade_topic_selections` (upsert), `snc_topics`

**Errors:** 400 (grade_level out of range)
