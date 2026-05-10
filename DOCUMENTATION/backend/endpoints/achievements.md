# Achievements Endpoints

**Module:** `backend/app/api/v1/endpoints/achievements.py`
**Prefix:** `/api/v1/achievements`
**Auth:** Mixed -- public for definitions, Student JWT for progress/check
**Feature:** Achievements & Badge System (S06)

## Overview

Badge and achievement system. Achievements are defined in the `achievements` table with threshold-based unlock conditions. Students unlock achievements by reaching thresholds on various metrics (points, missions, streaks, per-pillar correct counts). The module exports `check_and_unlock_achievements()` which is called from other modules (missions, rewards) after state changes.

**Threshold types:** `points`, `missions_total`, `streak`, `missions_reading`, `missions_writing`, `missions_listening`, `missions_speaking`

**Pillar mapping:** Pillar threshold types map to `student_interactions` pillar values via the `PILLAR_MAP` constant.

---

## GET `/api/v1/achievements/all`

**Auth:** None (public)

List all achievement definitions.

**Response:** `AllAchievementsResponse`
```json
{
  "achievements": [
    {
      "id": "uuid",
      "name": "First Steps",
      "description": "Complete your first mission",
      "description_ur": "...",
      "icon": "...",
      "tier": "bronze",
      "threshold_type": "missions_total",
      "threshold_value": 1
    }
  ]
}
```

**DB Tables:** `achievements` (ordered by threshold_value)

---

## GET `/api/v1/achievements/me`

**Auth:** Student JWT (`get_current_student`)

Return all achievements with the student's current progress and unlock status.

**Response:** `AchievementListResponse`
```json
{
  "achievements": [
    {
      "id": "uuid",
      "name": "First Steps",
      "description": "Complete your first mission",
      "description_ur": "...",
      "icon": "...",
      "tier": "bronze",
      "threshold_type": "missions_total",
      "threshold_value": 1,
      "unlocked": true,
      "unlocked_at": "2024-01-15T10:00:00Z",
      "current_progress": 42
    }
  ]
}
```

**Business Logic:**
1. Fetch all achievement definitions
2. Fetch student's unlocked achievements from `student_achievements`
3. Gather student stats via `_get_student_stats()`:
   - `points`: from `students` table
   - `missions_total`: count of `student_interactions` where `interaction_type LIKE 'mission%'`
   - `streak`: `current_streak` from `students` table
   - Per-pillar correct counts: via `get_student_achievement_stats` RPC
4. For each achievement, compute `current_progress` from stats and check unlock status

**DB Tables:** `achievements`, `student_achievements`, `students`, `student_interactions` (count + RPC)

---

## POST `/api/v1/achievements/check`

**Auth:** Student JWT (`get_current_student`)

Check and unlock any newly earned achievements for the student.

**Request Body:** `CheckRequest`
```json
{ "student_id": "uuid" }
```

**Validation:** `student_id` must match the authenticated student's ID (cannot check another student's achievements).

**Response:** `CheckResponse`
```json
{
  "new_achievements": [
    { "name": "Star Collector", "icon": "...", "tier": "silver" }
  ]
}
```

**Business Logic:** Delegates to `check_and_unlock_achievements(student_id)`.

**Errors:** 403 (attempting to check another student's achievements)

---

## Exported Utility: `check_and_unlock_achievements(student_id)`

Called from other modules (missions `/complete`, rewards `/claim-daily`) after state changes.

**Logic:**
1. Fetch all achievements and already-unlocked IDs
2. Gather student stats
3. For each locked achievement, compare `current_progress >= threshold_value`
4. Insert into `student_achievements` for newly earned ones
5. Return list of `{ name, icon, tier }` for newly unlocked
6. Duplicate inserts are silently handled (likely unique constraint)
