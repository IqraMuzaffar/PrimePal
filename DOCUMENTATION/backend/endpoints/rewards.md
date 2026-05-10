# Rewards Endpoints

**Module:** `backend/app/api/v1/endpoints/rewards.py`
**Prefix:** `/api/v1/rewards`
**Auth:** Student JWT (`get_current_student`) for all endpoints

## Overview

Gamification reward system with a daily "Surprise Chest" loot box, daily score summaries, and streak tracking. Anti-cheat validation uses server-side UTC timestamps to prevent double-claiming.

---

## POST `/api/v1/rewards/claim-daily`

Claim the daily reward (Surprise Daily Chest).

**Response:** `DailyRewardResponse`
```json
{
  "reward_type": "stars_50",
  "amount": 50,
  "new_total": 550,
  "message": "You earned +50 Stars!",
  "new_achievements": [{ "name": "Star Collector", "icon": "...", "tier": "bronze" }]
}
```

**Reward probabilities:**
- 70% chance: `"stars_25"` (+25 points)
- 20% chance: `"stars_50"` (+50 points)
- 10% chance: `"multiplier_2x"` (2x multiplier, amount=0)

**Business Logic:**
1. Fetch student's `points` and `last_daily_reward_at`
2. **Anti-cheat:** Compare `last_daily_reward_at` against current UTC date. If same calendar day, reject with 400.
3. Generate random reward
4. Update `points` and `last_daily_reward_at` in `students` table
5. Check for newly unlocked achievements

**DB Tables:** `students` (read + update), `achievements`, `student_achievements`

**Errors:**
- 400: Already claimed today
- 404: Student not found
- 500: Failed to claim

---

## GET `/api/v1/rewards/status`

Check if the student has already claimed their daily reward today.

**Response:** `RewardStatusResponse`
```json
{
  "has_claimed_today": true,
  "last_claimed_at": "2024-01-15T08:30:00+00:00"
}
```

**DB Tables:** `students` (read `last_daily_reward_at`)

**Errors:** 404 (student not found)

---

## GET `/api/v1/rewards/daily-summary`

Return the student's score summary for today. Cached for 2 minutes.

**Response:** `DailySummaryResponse`
```json
{
  "today_points": 80,
  "total_points": 550,
  "missions_today": 8
}
```

**Business Logic:**
- `today_points`: Sum of `score` from correct interactions created today
- `missions_today`: Count of correct interactions today
- `total_points`: From student record

**DB Tables:** `students`, `student_interactions` (filtered by today + correct=true)

---

## GET `/api/v1/rewards/streak`

Get the student's current and longest streak.

**Response:** `StreakResponse`
```json
{
  "current_streak": 5,
  "longest_streak": 12,
  "last_activity_date": "2024-01-15"
}
```

**Business Logic:** Direct read from `students` table columns `current_streak`, `longest_streak`, `last_activity_date`.

**DB Tables:** `students`

**Errors:** 404 (student not found)
