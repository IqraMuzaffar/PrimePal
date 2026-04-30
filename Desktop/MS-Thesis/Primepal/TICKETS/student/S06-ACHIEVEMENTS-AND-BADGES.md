# S06 — Achievements Tab & Badge System

**Priority:** MEDIUM
**Status:** TODO
**Depends on:** None (points system already exists)

## What Exists

- Cumulative points system: `students.points` column, 10 pts per correct answer
- Daily chest reward: random bonus points (25/50 + 2x multiplier)
- Leaderboard: classroom ranking by points
- Home page has template/placeholder area for achievements (no backend)
- Points are monotonic — never subtracted (already matches client requirement)

## What Needs to Be Built

### 1. Achievement Definitions Table

New table `achievements`:
```
id, name, description, description_ur, icon, tier (bronze/silver/gold),
threshold_type (points/missions/streak/pillar), threshold_value, created_at
```

Seed data (examples):
| Name | Tier | Trigger | Threshold |
|------|------|---------|-----------|
| First Steps | Bronze | points | 50 |
| Rising Star | Silver | points | 200 |
| Champion | Gold | points | 500 |
| Bookworm | Bronze | missions_reading | 5 |
| Wordsmith | Bronze | missions_writing | 5 |
| Good Listener | Bronze | missions_listening | 5 |
| Chatterbox | Bronze | missions_speaking | 5 |
| Streak Starter | Bronze | streak | 3 |
| On Fire | Silver | streak | 7 |
| Spelling Whiz | Bronze | spelling_bee_correct | 20 |

### 2. Student Achievements Junction Table

New table `student_achievements`:
```
id, student_id, achievement_id, unlocked_at
```

### 3. Achievement Check Logic

- After every point-awarding action (mission complete, spelling bee correct, daily chest):
  - Query: which achievements has this student NOT yet unlocked?
  - For each, check if threshold is now met
  - If met: insert into `student_achievements`, return `{ new_achievement: { name, icon, tier } }` in the API response
- Frontend: show a celebratory popup/toast when a new achievement is unlocked

### 4. Achievements Tab UI

- Dedicated page: `/student/achievements`
- Grid of all possible achievements
- Unlocked: full color with unlock date
- Locked: greyed out with progress bar showing how close they are
- Tiers visually distinct (bronze/silver/gold color coding)
- "Show parents" friendly — this is a motivation display

### 5. Home Page Integration

- Replace the placeholder achievements area on `/student/home` with latest unlocked badges
- Show total badge count

## Engineering Notes

- Achievement checking should be lightweight — run after point updates, not on every page load
- Cache the student's unlocked achievements in the JWT payload or a quick lookup
- Keep badge count under 20 total to avoid overwhelming young students

## Files to Touch

- `supabase/migrations/` — `achievements` + `student_achievements` tables
- `backend/app/endpoints/rewards.py` — achievement check after point awards
- `backend/app/endpoints/` — new `achievements.py` (list all, list student's, check/unlock)
- `frontend/src/app/student/achievements/` — new page
- `frontend/src/app/student/home/page.tsx` — integrate badge display
- `frontend/src/components/student/` — `AchievementCard`, `AchievementPopup` components
