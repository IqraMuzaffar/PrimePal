# Missions Endpoints

**Module:** `backend/app/api/v1/endpoints/missions.py`
**Prefix:** `/api/v1/missions`
**Auth:** Student JWT (`get_current_student`) for all endpoints
**Features:** Gamified Missions (Feature 6), Pillar Missions (Feature 3), Leaderboard (Feature 17), Quests (Feature 18)

## Overview

Core gamification engine. Generates AI-powered daily and pillar-specific mission questions using RAG + LLM. Handles answer submission with points, streaks, achievement checks, and idempotency. Grade level is always resolved server-side from the classroom record.

**Key design decisions:**
- `correct_answer` is stripped from all responses (security)
- `correct_order` is included for frontend validation of scramble/translation tasks
- Client sends `question_correct: bool` which the server trusts (thesis prototype)
- Points: 10 per correct answer (configurable via `points_value`)

---

## GET `/api/v1/missions/daily`

Generate 3 daily English questions tailored to the student's grade level.

**Query Parameters:**
- `is_frustrated` (bool, default false) -- If true, generates "Confidence Builder" questions with reduced complexity

**Response:** `DailyMissionsResponse`
```json
{
  "grade_level": 3,
  "topic": "Animals and Pets",
  "questions": [
    {
      "id": 1,
      "task_type": "multiple_choice",
      "pillar": "reading",
      "question": "...",
      "difficulty": "medium",
      "points_value": 10,
      "emoji_hint": "...",
      "options": [{ "id": "a", "text": "...", "emoji": null }],
      "passage": null,
      "audio_text": null,
      "image_context": null,
      "image_options": null,
      "word_bank": null,
      "word_with_blanks": null,
      "letter_options": null,
      "sentence_start": null,
      "urdu_hint": "",
      "correct_order": null
    }
  ]
}
```

**Business Logic:**
1. Resolve grade_level from `classrooms` table (server-side guardrail)
2. Resolve active topics via `get_active_topics()`
3. Check Redis cache (1-hour TTL, skipped if frustrated)
4. Retrieve grade-filtered SNC context chunks via pgvector RPC
5. Generate missions via `generate_daily_missions()` LLM call
6. Strip `correct_answer` before returning

**DB Tables:** `classrooms`, `classroom_active_topics`, `snc_topics`, `grade_topic_selections`

**Errors:** 404 (classroom not found), 503 (RAG or LLM failure)

---

## POST `/api/v1/missions/complete`

Record whether a student answered a question correctly and award points.

**Request Body:** `CompleteRequest`
```json
{
  "question_correct": true,
  "question_type": "multiple_choice",
  "task_type": "fill_blanks",
  "pillar": "reading",
  "points_value": 10,
  "answer_data": {},
  "submitted_at": "2024-01-15T10:30:00Z"
}
```

**Response:** `CompleteResponse`
```json
{
  "points_awarded": 10,
  "new_total": 150,
  "current_streak": 3
}
```

**Business Logic:**
1. Fetch current points from `students` table
2. Idempotency check: if `submitted_at` provided, check for duplicate interaction within 60s window
3. Award points via `increment_student_points` RPC (atomic)
4. Log interaction in background (`log_interaction`)
5. Update daily streak (`update_streak`)
6. Invalidate performance cache in background
7. Check and unlock achievements in background

**DB Tables:** `students` (read/update via RPC), `student_interactions` (idempotency check + log), `classrooms`

**Errors:** 404 (student not found)

---

## POST `/api/v1/missions/submit-batch`

Submit multiple answers at once (offline queue flush). Same idempotency logic as `/complete`.

**Request Body:** `BatchSubmitRequest`
```json
{
  "answers": [
    { "question_correct": true, "task_type": "multiple_choice", "pillar": "reading", "points_value": 10, "submitted_at": "..." }
  ]
}
```

**Response:** `BatchSubmitResponse`
```json
{ "processed": 5, "skipped": 1, "new_total": 200 }
```

**Business Logic:** Loops through answers, applies idempotency per-answer, accumulates points, then calls `increment_student_points` RPC once with the total.

---

## GET `/api/v1/missions/me`

Fetch the authenticated student's profile, avatar, and cumulative points. Cached for 5 minutes.

**Response:** `StudentProfileResponse`
```json
{
  "student_id": "uuid",
  "student_name": "Ali",
  "avatar_url": "...",
  "points": 150,
  "missions_completed": 42,
  "avatar_style": "adventurer",
  "theme_color": "#6366f1"
}
```

**DB Tables:** `students`, `student_interactions` (count where `interaction_type LIKE 'mission%'`)

---

## GET `/api/v1/missions/pillar`

Generate 10 questions for a specific pillar, weighted by student weaknesses.

**Query Parameters:**
- `pillar` (string, required) -- one of: `reading`, `writing`, `listening`, `speaking`
- `is_frustrated` (bool, default false) -- Confidence Builder mode

**Response:** `PillarMissionsResponse`
```json
{
  "pillar": "reading",
  "active_topics_summary": "Animals, Food",
  "questions": [...],
  "weakness_focus_questions": 3
}
```

**Business Logic:**
1. Validate pillar parameter
2. Resolve grade + active topics
3. Check cache (1-hour TTL, keyed by student+pillar+topics hash)
4. Analyze last 30 interactions to identify weak pillars (<60% accuracy, min 3 attempts)
5. Fetch student performance profile for adaptive difficulty
6. Generate via `generate_pillar_missions()` LLM call with weakness context
7. Count weakness-focused questions, strip correct_answer

**Weakness Detection:**
- Queries last 30 `student_interactions` with non-null pillar
- Calculates accuracy per pillar (reading, writing, listening, speaking)
- Returns pillars with <60% accuracy as weaknesses (requires minimum 3 attempts)
- Format: `["reading (accuracy: 40%)", "listening (accuracy: 50%)"]`
- LLM uses weakness data to generate 3-4 targeted questions per weak pillar

**DB Tables:** `classrooms`, `classroom_active_topics`, `snc_topics`, `student_interactions`, `grade_topic_selections`

**Errors:** 400 (invalid pillar), 404 (classroom not found), 503 (LLM failure)

---

## POST `/api/v1/missions/submit-speaking`

Submit a speaking answer for a mission question. Uses Whisper for transcription and SequenceMatcher for similarity scoring.

**Request:** multipart/form-data
- `audio_file` (UploadFile, required)
- `expected_text` (string, required)
- `pillar` (string, default "speaking")
- `attempt_number` (int, default 1)

**Response:** `SpeakingSubmissionResponse`
```json
{
  "is_correct": true,
  "similarity_score": 0.85,
  "transcription": "Hello teacher",
  "points_awarded": 10,
  "new_total": 160,
  "status": "final"
}
```

**Business Logic:**
- Audio < 100 bytes = empty, return retry/give_up
- Whisper transcription with Pakistani English accent prompt
- Similarity threshold: >= 0.6 for correct
- Garbled detection: similarity < 0.30 triggers retry (max 3 attempts)
- Status: `"final"` | `"retry"` | `"give_up"`
- Logs interaction and updates streak

**DB Tables:** `students`, `classrooms`, `student_interactions`

---

## GET `/api/v1/missions/performance`

Return the student's per-topic performance profile.

**Response:** `PerformanceResponse`
```json
{
  "overall_accuracy": 72.5,
  "pillar_accuracy": { "reading": 80.0, "writing": 65.0, "listening": 70.0, "speaking": 75.0 },
  "weak_topics": [...],
  "strong_topics": [...],
  "difficulty_recommendation": "medium"
}
```

**Business Logic:** Delegates to `get_student_performance_profile(student_id)`.

---

## GET `/api/v1/missions/leaderboard`

Class leaderboard sorted by points (highest first). Cached 10 minutes.

**Response:** `LeaderboardResponse`
```json
{
  "entries": [
    { "rank": 1, "student_id": "uuid", "student_name": "Ali", "avatar_url": "...", "points": 500, "is_current_student": false }
  ],
  "current_student_rank": 3,
  "total_students": 25
}
```

**DB Tables:** `students` (ordered by points desc)

---

## GET `/api/v1/missions/weekly-progress`

Weekly 4-pillar progress tracking. Rolling 7-day window. Cached 5 minutes.

**Response:** `WeeklyProgressResponse`
```json
{
  "week_topic": "Animals and Pets",
  "pillars": [
    { "pillar": "reading", "done": 7, "target": 10, "pct": 70 }
  ]
}
```

**DB Tables:** `classroom_syllabus` (active week), `student_interactions` (pillar counts)
