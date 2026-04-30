# S01 — Diagnostic Mission (Cold-Start Pre-Test)

**Priority:** CRITICAL (blocks adaptive algorithm baseline + thesis pre-test data)
**Status:** TODO
**Depends on:** A01 (Pre/Post Test system — admin triggers post-test)

## What Exists

- Pillar missions exist (`/student/missions`, `backend/app/endpoints/missions.py`) with 10 Qs per pillar
- `missions_completed` table tracks completions
- `student_interactions` table logs every Q/A with pillar, score, correctness
- Mission generator (`backend/app/agents/mission_generator.py`) supports difficulty levels
- Student login flow exists (`/student/play` → avatar select → PIN entry)

## What Needs to Be Built

### 1. Diagnostic Mission Flow (First Login Intercept)

On a student's **very first login**, before they reach the home screen:

- Serve a **fixed baseline test** — NOT dynamically generated
- Medium difficulty, grade-aligned (use the student's `classroom.grade_level`)
- **10 questions total**: distributed equally across LSRW (2-3 per skill)
- Questions sourced from RAG pipeline for that grade's SNC curriculum
- Uses the same task UI components as regular missions (MCQ, fill-blank, listen-select, repeat-sentence)
- Standard timer rules apply (15s standard, 30s for reading comprehension)

### 2. Scoring — Isolated from Gamification

- Diagnostic scores must **NOT** feed into the student's cumulative `points` column
- Diagnostic scores must **NOT** appear on leaderboard or daily score
- Store results in a dedicated `evaluation_records` table (see A01 for schema)
- Each record: `student_id`, `evaluation_type` (pre/post), `pillar`, `question_index`, `question_text`, `student_answer`, `correct_answer`, `is_correct`, `time_taken_ms`, `grade_level`, `created_at`

### 3. Detection Logic

- Backend must check: has this student ever completed a diagnostic? Query `evaluation_records WHERE student_id = X AND evaluation_type = 'pre'`
- If no pre-test record → force diagnostic before home screen
- Frontend: after successful student login, call `GET /evaluations/status/{student_id}` → if `pre_test_completed: false`, route to `/student/diagnostic` instead of `/student/home`

### 4. UX

- Wizard-style: one question per screen (low cognitive load)
- No score shown during the test (prevent anxiety)
- Friendly completion screen: "Great job! You're all set to start learning!"
- After completion, redirect to `/student/home`

## Engineering Notes

- The diagnostic questions per grade should be **pre-generated and stored** (not generated on-the-fly) to ensure every student in the same grade gets the exact same test
- This is the "Pre-Test" for thesis data collection — consistency is non-negotiable
- Post-test uses identical format but swapped vocabulary (see A01)

## Files to Touch

- `backend/app/endpoints/` — new `evaluations.py` router
- `backend/app/agents/` — evaluation question generation (one-time seed script)
- `frontend/src/app/student/diagnostic/` — new page
- `frontend/src/app/student/play/` — add post-login redirect logic
- `supabase/migrations/` — `evaluation_records` table, `evaluation_questions` table
