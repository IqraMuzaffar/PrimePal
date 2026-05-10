# Evaluations Endpoints

**Module:** `backend/app/api/v1/endpoints/evaluations.py`
**Prefix:** `/api/v1/evaluations`
**Auth:** Mixed -- Student JWT for student-facing, Admin GoTrue for admin-facing
**Feature:** Pre/Post-Test Evaluation System (A01)

## Overview

Standardized pre- and post-test evaluations to measure student improvement. Results are completely ISOLATED from the gamification layer (no points, no streak, no interaction logs). The post-test must be explicitly unlocked by an admin before students can take it.

---

## GET `/api/v1/evaluations/status`

**Auth:** Student JWT (`get_current_student`)

Check whether the current student needs to take a pre- or post-test.

**Response:** `EvaluationStatusOut`
```json
{
  "needs_pre_test": true,
  "needs_post_test": false,
  "pre_completed": false,
  "post_completed": false
}
```

**Business Logic:** Fetches or creates an `evaluation_status` row for the student. `needs_post_test` is true only if `post_test_unlocked=true` AND `post_test_completed=false`.

**DB Tables:** `evaluation_status` (upsert)

---

## GET `/api/v1/evaluations/questions`

**Auth:** Student JWT (`get_current_student`)

Return the ordered question set for this student's grade and evaluation type.

**Query Parameters:**
- `type` (string, required) -- must be `"pre"` or `"post"` (regex validated)

**Response:** 200 -- list of question objects
```json
[
  {
    "id": "uuid",
    "grade_level": 3,
    "evaluation_type": "pre",
    "section": "reading",
    "pillar": "reading",
    "question_index": 1,
    "question_text": "What is the main idea?",
    "question_text_ur": "...",
    "task_type": "multiple_choice",
    "options": ["A", "B", "C", "D"],
    "difficulty": "medium",
    "audio_text": null,
    "image_context": null
  }
]
```

**Note:** `correct_answer` is intentionally NOT included in the select query (security).

**Business Logic:** Resolves student's grade level via students -> classrooms join, then fetches questions ordered by `question_index`.

**DB Tables:** `students`, `classrooms`, `evaluation_questions`

---

## POST `/api/v1/evaluations/submit`

**Auth:** Student JWT (`get_current_student`)

Submit all answers for an evaluation. Grades answers and stores individual records.

**Request Body:** `SubmitBody`
```json
{
  "evaluation_type": "pre",
  "answers": [
    {
      "question_id": "uuid",
      "student_answer": "B",
      "time_taken_ms": 5000,
      "likert_value": 4
    }
  ]
}
```

**Response:** `SubmitOut`
```json
{
  "total_questions": 20,
  "correct_count": 15,
  "completed": true
}
```

**Business Logic:**
1. Validate evaluation_type is "pre" or "post"
2. Check evaluation_status: pre-test not already completed; post-test must be unlocked and not completed
3. Fetch correct answers from `evaluation_questions`
4. Grade each answer (case-insensitive string comparison)
5. Bulk insert records into `evaluation_records`
6. Update `evaluation_status` with completion timestamp

**DB Tables:** `evaluation_status`, `evaluation_questions`, `evaluation_records`, `students`, `classrooms`

**Errors:**
- 400: Invalid evaluation_type, pre-test already completed, post-test already completed
- 403: Post-test not yet unlocked

---

## POST `/api/v1/evaluations/trigger-post-test`

**Auth:** Admin GoTrue (`get_current_admin`)

Unlock the post-test for a set of students.

**Request Body:** `TriggerPostTestBody`
```json
{
  "scope": "grade",
  "target_id": "3"
}
```

**Scope options:**
- `"global"` -- All students (no target_id needed)
- `"grade"` -- All students in classrooms of `target_id` grade level
- `"classroom"` -- All students in `target_id` classroom

**Response:** `TriggerPostTestOut`
```json
{ "students_unlocked": 75 }
```

**Business Logic:** For each student in scope, ensures `evaluation_status` row exists, then sets `post_test_unlocked=true`.

**DB Tables:** `students`, `classrooms`, `evaluation_status`

**Errors:** 400 (missing target_id, invalid scope)

---

## GET `/api/v1/evaluations/results`

**Auth:** Admin GoTrue (`get_current_admin`)

Return aggregated evaluation results for admin review.

**Query Parameters:**
- `grade_level` (int, optional)
- `evaluation_type` (string, optional) -- "pre" or "post"
- `student_id` (string, optional)

**Response:** `ResultsOut`
```json
{
  "results": [
    {
      "student_id": "uuid",
      "student_name": "Ali",
      "evaluation_type": "pre",
      "total": 20,
      "correct": 15,
      "psychometric_avg": 3.8
    }
  ]
}
```

**Business Logic:** Aggregates `evaluation_records` per (student_id, evaluation_type). Computes correct count and average likert_value (psychometric score) where available.

**DB Tables:** `evaluation_records`, `students`
