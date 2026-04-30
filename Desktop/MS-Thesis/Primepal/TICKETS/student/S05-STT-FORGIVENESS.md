# S05 — STT (Speech-to-Text) Forgiveness for Speaking Pillar

**Priority:** MEDIUM
**Status:** TODO
**Depends on:** Ticket 02 (Whisper `.get()` bug must be fixed first)

## What Exists

- Speaking practice page (`/student/speaking`) with audio recording + Whisper transcription
- Backend endpoint `POST /speaking/evaluate` sends audio to OpenAI Whisper API
- Pronunciation scoring uses word-level timestamps from Whisper
- **Known bug (Ticket 02):** `.get("text")` called on Pydantic model object — this must be fixed first
- Speaking endpoint returns `transcription`, `pronunciation_score`, `word_scores`

## What Needs to Be Built

### 1. Garbled Input Detection

- After Whisper returns a transcription, compare it against the expected prompt
- If similarity score < 30% (or Whisper returns empty/near-empty text):
  - Do NOT mark as incorrect immediately
  - Return a special response: `{ "status": "retry", "message": "I couldn't hear you clearly, let's try again!" }`
  - Allow **up to 2 retries** per question before marking as attempted

### 2. Accent Tolerance

- The Whisper prompt parameter should include context about Pakistani English accent patterns
- Set `language: "en"` explicitly in Whisper API call to prevent language detection confusion
- Consider lowering the pronunciation scoring threshold for Grade 1-2 students (they're just starting)

### 3. Background Noise Handling

- If Whisper returns high word-error-rate across all words:
  - Show tip: "Try moving to a quieter spot!" (once per session, not every question)
  - Don't penalize the score — log it as `noise_flagged: true` in interactions

### 4. Frontend UX

- On retry prompt: show encouraging message with a re-record button
- Animate the microphone icon to indicate "try again"
- After 2 retries with no improvement: "No worries! Let's move to the next one." → score as 0 but don't show failure state

## Engineering Notes

- Whisper `word_timestamps: true` is already used — leverage this for confidence scoring
- The retry logic is frontend-driven (don't re-call the LLM, just re-record and re-submit audio)
- Log all retry attempts in `student_interactions` with `attempt_number` field for thesis data

## Files to Touch

- `backend/app/endpoints/speaking.py` — fix `.get()` bug, add similarity threshold, retry response
- `frontend/src/app/student/speaking/page.tsx` — retry UI, encouraging messages
- `backend/app/agents/` — Whisper prompt tuning for accent tolerance
