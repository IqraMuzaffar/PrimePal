# Story Time Endpoints

**Module:** `backend/app/api/v1/endpoints/story_time.py`
**Prefix:** `/api/v1/story-time`
**Auth:** Student JWT (`get_current_student`) for all endpoints

## Overview

Reading comprehension feature. Generates a short story with 3 multiple-choice comprehension questions based on the active week's topic. Logs interactions with `pillar: "reading"` for Quests progress tracking.

---

## GET `/api/v1/story-time/story`

Generate a short story and 3 comprehension questions based on the active week's topic.

**Response:** `StoryResponse`
```json
{
  "story_title": "The Little Cat",
  "story_text": "A little cat lived in a village...",
  "topic": "Animals and Pets",
  "week_number": 5,
  "questions": [
    {
      "id": 1,
      "question": "Where did the cat live?",
      "options": ["In a city", "In a village", "In a forest", "In a school"],
      "correct_index": 1
    }
  ]
}
```

**Note:** `correct_index` IS included in the response (unlike missions). The client handles validation locally.

**Business Logic:**
1. Fetch classroom grade level
2. Fetch active week topic from `classroom_syllabus`
3. Generate story (4-6 sentences) + 3 MCQ questions via gpt-4o-mini
4. Validate: exactly 3 questions, each with exactly 4 options, valid correct_index (0-3)

**DB Tables:** `classrooms`, `classroom_syllabus`

**Errors:** 404 (classroom or active week not found), 500 (LLM parse failure)

---

## POST `/api/v1/story-time/answer`

Record a comprehension answer and award points.

**Request Body:** `AnswerRequest`
```json
{
  "question_id": 1,
  "selected_index": 1,
  "correct": true
}
```

**Response:** `AnswerResponse`
```json
{
  "points_awarded": 10,
  "new_total": 170
}
```

**Scoring:** 10 points per correct answer, 0 for incorrect.

**Business Logic:**
1. Calculate points (10 if correct, 0 otherwise)
2. Fetch current points, update student record (direct update)
3. Log interaction with `interaction_type: "story_time"`, `pillar: "reading"`, `original_message: "Q{question_id}"`

**DB Tables:** `students`, `classrooms`, `student_interactions`

**Errors:** 404 (student not found), 500 (points update failure)
