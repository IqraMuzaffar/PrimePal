# Spelling Bee Endpoints

**Module:** `backend/app/api/v1/endpoints/spelling_bee.py`
**Prefix:** `/api/v1/spelling-bee`
**Auth:** Student JWT (`get_current_student`) for all endpoints

## Overview

Spelling practice feature. Generates 10 grade-appropriate words from the active week's topic using LLM, and records spelling attempts with a two-attempt scoring system.

---

## GET `/api/v1/spelling-bee/words`

Generate 10 spelling words from the active week's syllabus topic.

**Response:** `SpellingWordsResponse`
```json
{
  "words": [
    { "word": "elephant", "emoji": "..." }
  ],
  "topic": "Animals and Pets",
  "week_number": 5
}
```

**Business Logic:**
1. Fetch classroom grade level from `classrooms`
2. Fetch active week topic from `classroom_syllabus`
3. Fallback chain if no active week: try `classroom_active_topics` -> `snc_topics`, then generic grade topic
4. Generate 10 words via gpt-4o-mini with emoji hints
5. Parse JSON response, lowercase and strip all words

**DB Tables:** `classrooms`, `classroom_syllabus`, `classroom_active_topics`, `snc_topics`

**Errors:** 404 (classroom not found), 500 (LLM parse failure)

---

## POST `/api/v1/spelling-bee/submit`

Record a spelling attempt and award points.

**Request Body:** `SpellingSubmitRequest`
```json
{
  "word": "elephant",
  "student_spelling": "elefant",
  "correct": false,
  "attempt_number": 1
}
```

**Response:** `SpellingSubmitResponse`
```json
{
  "points_awarded": 0,
  "new_total": 150
}
```

**Scoring:**
- 10 points if correct on first attempt (`attempt_number == 1`)
- 5 points if correct on second attempt (`attempt_number == 2`)
- 0 points if incorrect on both attempts

**Business Logic:**
1. Calculate points based on correctness and attempt number
2. Fetch current points from `students`
3. Update student points (direct update, not RPC)
4. Log interaction to `student_interactions` with `interaction_type: "spelling_bee"` and `original_message: word`
5. Update daily streak

**DB Tables:** `students`, `classrooms`, `student_interactions`

**Errors:** 404 (student not found), 500 (points update failure)
