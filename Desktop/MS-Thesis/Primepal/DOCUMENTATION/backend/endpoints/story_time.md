# Story Time Endpoints

**Module:** `backend/app/api/v1/endpoints/story_time.py`
**Prefix:** `/api/v1/story-time`
**Auth:** Student (custom PyJWT)

## Endpoints

### GET `/story-time/story`
Generate an AI story with comprehension questions.
Uses LLM + curriculum RAG context, cached in Redis.
**Response:** `{ title, story_text, questions: [{ question, options, correct_index }] }`

### POST `/story-time/evaluate`
Evaluate comprehension answers.
**Body:** `{ answers: [{ question_index, selected_index }] }`
Awards points based on correct answers.

## Features
- Stories are grade-appropriate, using SNC vocabulary
- 3 comprehension questions per story with multiple-choice answers
- TTS read-aloud support on the frontend
