# Speaking Endpoints

**Module:** `backend/app/api/v1/endpoints/speaking.py`
**Prefix:** `/api/v1/speaking`
**Auth:** Student JWT (`get_current_student`) for all endpoints

## Overview

Voice-based speaking practice with word-level pronunciation feedback. Uses OpenAI Whisper for transcription and custom phoneme comparison for pronunciation assessment. Includes garbled-input detection and retry logic.

**Constants:**
- `WHISPER_ACCENT_PROMPT`: Pakistani English accent priming
- `_GARBLED_SIMILARITY_THRESHOLD`: 0.30
- `_GARBLED_MIN_CHARS`: 3
- `_MAX_ATTEMPTS`: 3

---

## GET `/api/v1/speaking/prompts`

Generate 3 speaking prompts based on the active week's topic.

**Response:** `PromptsResponse`
```json
{
  "prompts": [
    { "id": 1, "prompt": "Tell me about your favorite animal", "hint": "Name 2-3 animals you like" }
  ],
  "topic": "Animals and Pets",
  "week_number": 5
}
```

**Business Logic:**
1. Fetch classroom grade level
2. Fetch active week topic from `classroom_syllabus`
3. Generate 3 prompts via gpt-4o-mini
4. Parse JSON response (with markdown code block stripping)

**DB Tables:** `classrooms`, `classroom_syllabus`

**Errors:** 404 (classroom or active week not found), 500 (LLM parse failure)

---

## POST `/api/v1/speaking/evaluate`

Evaluate a student's spoken response (text transcript). Awards points based on relevance and quality.

**Request Body:** `EvaluateRequest`
```json
{
  "prompt_id": 1,
  "prompt_text": "Tell me about your favorite animal",
  "transcript": "I like cats and dogs",
  "attempt_number": 1
}
```

**Response:** `EvaluateFeedback`
```json
{
  "score": 2,
  "feedback": "Great job! You used good words about animals.",
  "points_awarded": 10,
  "new_total": 160,
  "status": "final"
}
```

**Scoring:** 0 = off-topic (0 pts), 1 = partial (5 pts), 2 = on-topic with good vocab (10 pts)

**Business Logic:**
1. Garbled/empty input detection (similarity < 0.30 or < 3 chars)
2. If garbled: return `"retry"` or `"give_up"` (after 3 attempts)
3. LLM evaluation via gpt-4o-mini with structured JSON output
4. Update student points directly in `students` table
5. Log interaction to `student_interactions` with `pillar: "speaking"`
6. Update daily streak

**DB Tables:** `students`, `classrooms`, `student_interactions`

---

## POST `/api/v1/speaking/evaluate-pro`

Enhanced evaluation with word-level pronunciation feedback via Whisper.

**Request:** multipart/form-data
- `audio_file` (UploadFile, required)
- `prompt_id` (int, required, via form field from `EvaluateProRequest`)
- `prompt_text` (string, required)
- `attempt_number` (int, default 1)

**Response:** `EvaluatePronunciationFeedback`
```json
{
  "score": 2,
  "feedback": "Excellent pronunciation! Keep it up!",
  "pronunciation_score": 85,
  "pronunciation_data": [
    { "word": "I", "status": "correct" },
    { "word": "like", "status": "correct" },
    { "word": "cats", "status": "incorrect" }
  ],
  "points_awarded": 10,
  "new_total": 170,
  "status": "final",
  "noise_flagged": false
}
```

**Business Logic:**
1. Transcribe audio using Whisper with `response_format="verbose_json"` and `timestamp_granularities=["word"]`
2. Extract word-level data from Whisper response
3. Compare target phrase against spoken words via `compare_phrases()` (75% similarity threshold)
4. Calculate pronunciation score via `calculate_pronunciation_score()`
5. Garbled detection: if score < 20 and < 2 spoken words, return retry/give_up
6. Noise detection: if all words incorrect but words were detected, flag `noise_flagged=true`
7. Overall correct if pronunciation_score >= 70
8. Points: 10 if correct, 5 if score >= 50, 0 otherwise
9. Generate AI feedback via gpt-4o-mini
10. Store `pronunciation_data` in `student_interactions`
11. Update streak

**DB Tables:** `students`, `classrooms`, `student_interactions` (with `pronunciation_data` and `noise_flagged`)

**Errors:** 404 (student not found), 500 (transcription or points update failure)
