# S08 — Scoring Visibility (Per-Task + Daily + Cumulative)

**Priority:** HIGH
**Status:** TODO
**Depends on:** S02 (difficulty-based scoring requires task variety)

## What Exists

- `students.points` — cumulative total, currently +10 per correct answer
- Leaderboard shows total points per student
- `student_interactions` logs each Q/A with `score` and `correct` fields
- Home page shows total points
- No per-task score display, no daily score breakdown, no difficulty-based scoring

## What Needs to Be Built

### 1. Difficulty-Based Scoring Per Question

Replace flat 10pts/correct with difficulty-weighted scoring:
- Very Easy = 5 pts
- Easy = 10 pts
- Medium = 15 pts
- Hard = 20 pts

Total per pillar (10 questions) = 100 pts (mix of difficulties)

The mission generator already has difficulty context — add explicit `difficulty` and `points_value` to each generated question.

### 2. Per-Task Score Display

- After each question answer: show "+5", "+10", "+15", or "+20" with green animation (correct) or "0" with gentle red (incorrect)
- After completing a full mission (10 Qs): show summary screen with:
  - Score for this mission (e.g., "75 / 100")
  - Breakdown per question (correct/incorrect indicator)
  - Encouraging message based on score range

### 3. Daily Score on Home Page

- Home page must show TWO numbers:
  - **Today's score**: sum of all points earned today (from `student_interactions WHERE created_at = today`)
  - **Total score**: cumulative `students.points`
- Backend: `GET /rewards/daily-summary/{student_id}` → `{ today_points, total_points, missions_today }`

### 4. Teacher Visibility

- Per-student analytics (teacher side) must show:
  - Student's total score
  - Today's score
  - Score per pillar (LSRW breakdown)
- This data feeds into the evaluator report — ensure `student_interactions` records include `points_awarded` per interaction

## Engineering Notes

- Difficulty assignment happens in the mission generator LLM prompt — specify distribution: ~2 very easy, ~3 easy, ~3 medium, ~2 hard per mission
- Points are still monotonic (never subtracted) per client requirement
- The daily score resets visually at midnight but total never decreases

## Files to Touch

- `backend/app/agents/mission_generator.py` — add `difficulty` + `points_value` to question schema
- `backend/app/endpoints/missions.py` — use `points_value` instead of flat 10
- `backend/app/endpoints/rewards.py` — `GET /rewards/daily-summary/{student_id}`
- `frontend/src/app/student/missions/[pillar]/page.tsx` — per-question score animation, mission summary
- `frontend/src/app/student/home/page.tsx` — daily + total score display
- `backend/app/endpoints/evaluator.py` — include score breakdowns in teacher reports
