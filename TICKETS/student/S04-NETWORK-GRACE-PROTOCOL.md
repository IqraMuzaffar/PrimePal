# S04 — Network Grace Protocol

**Priority:** HIGH
**Status:** TODO
**Depends on:** None (infrastructure-level, applies to all student features)

## What Exists

- `QuestionTimer` component handles 15s countdown per mission question (client-side)
- Mission answers are submitted per-question via API call to backend
- No offline handling, no retry logic, no local caching of answers
- Students are in low-resource Pakistani school environments with unstable/shared internet

## What Needs to Be Built

### 1. Timer Pause on Network Drop

- The `QuestionTimer` must detect network connectivity loss
- When connection drops: **pause the timer immediately**
- Show a non-alarming overlay: "Waiting for connection..." (with a subtle spinner)
- When connection restores: **resume the timer** from where it paused
- Detection: use `navigator.onLine` + `window.addEventListener('online'/'offline')` + periodic fetch heartbeat

### 2. Local Answer Caching

- When a student submits an answer but the API call fails (network error, timeout):
  - Cache the answer in `localStorage` with key `primepal_pending_answers`
  - Structure: `{ student_id, question_id, answer, pillar, mission_type, timestamp }`
  - Show the student a green checkmark as if it submitted (don't block their flow)
- On next successful API connection, flush the pending answer queue:
  - Submit all cached answers in order
  - Clear from localStorage on successful submission
  - Backend endpoint must handle late/batched submissions gracefully (idempotent by question_id + student_id)

### 3. Backend: Idempotent Answer Submission

- The mission scoring endpoint must accept a `submitted_at` timestamp from the client
- If an answer for the same `(student_id, question_id, mission_session)` already exists, skip (don't double-count)
- Add a `PUT /missions/submit-batch` endpoint for flushing cached answers

### 4. Retry Logic

- Use exponential backoff for retries: 1s → 2s → 4s → 8s (max 3 retries)
- After 3 failures, cache locally and show "Your answer is saved, it will sync when you're back online"

## Engineering Notes

- This is critical for thesis validity — a student marked as "weak" because of Wi-Fi drops corrupts the research data
- The timer pause must be visually obvious so the student doesn't panic
- localStorage is acceptable here (not IndexedDB) — the data is small and temporary
- Test with Chrome DevTools Network throttling (offline mode, slow 3G)

## Files to Touch

- `frontend/src/components/student/QuestionTimer.tsx` — pause/resume logic
- `frontend/src/lib/` — new `network-queue.ts` utility (offline cache + retry)
- `frontend/src/app/student/missions/[pillar]/page.tsx` — integrate network-aware submission
- `backend/app/endpoints/missions.py` — idempotent submission + batch endpoint
