# S07 — Daily Streak Engine

**Priority:** MEDIUM
**Status:** TODO
**Depends on:** None

## What Exists

- `daily_rewards` table tracks daily chest claims (`student_id`, `claimed_at`, `points_awarded`)
- `students.last_daily_reward_at` timestamp exists
- No streak tracking of any kind in DB or frontend

## What Needs to Be Built

### 1. Streak Tracking

Add columns to `students` table:
- `current_streak` (integer, default 0)
- `longest_streak` (integer, default 0)
- `last_activity_date` (date, nullable)

Streak logic:
- A "streak day" = the student logged in AND completed **at least one educational task** (mission question, spelling bee word, or speaking prompt)
- On task completion, check `last_activity_date`:
  - If `last_activity_date` = today → no change (already counted)
  - If `last_activity_date` = yesterday → `current_streak += 1`, update `longest_streak` if higher
  - If `last_activity_date` < yesterday → `current_streak = 1` (reset)
  - If null → `current_streak = 1` (first ever)
- Update `last_activity_date = today`

### 2. Frontend UI

- **Header streak counter**: small flame icon + number in the student app header
- Flame animates (pulse/glow) when streak >= 3 days
- Streak broken state: briefly show "Your streak reset — let's start a new one!" (encouraging, not punishing)
- Tap the flame to see: current streak, longest streak, "Come back tomorrow to keep it going!"

### 3. Streak-Based Achievements (links to S06)

- 3-day streak → "Streak Starter" badge
- 7-day streak → "On Fire" badge
- 14-day streak → "Unstoppable" badge (important for the 3-week thesis study)

### 4. Backend Endpoint

- Streak update logic should run inside existing task-completion endpoints (missions, spelling-bee, speaking)
- No separate streak endpoint needed — return `current_streak` in the task completion response
- `GET /rewards/streak/{student_id}` — for the header display on page load

## Engineering Notes

- Use UTC dates for streak comparison to avoid timezone issues
- The streak reset at midnight UTC is acceptable — students are in Pakistan (UTC+5), so reset happens at 5 AM local time
- Streak is a retention mechanic for the 3-week study period — keep it simple and encouraging

## Files to Touch

- `supabase/migrations/` — add streak columns to `students`
- `backend/app/endpoints/missions.py` — update streak on mission completion
- `backend/app/endpoints/spelling_bee.py` — update streak on spelling bee completion
- `backend/app/endpoints/speaking.py` — update streak on speaking completion
- `backend/app/endpoints/rewards.py` — `GET /rewards/streak/{student_id}`
- `frontend/src/components/student/` — `StreakCounter` component
- `frontend/src/app/student/` — integrate streak display in layout/header
