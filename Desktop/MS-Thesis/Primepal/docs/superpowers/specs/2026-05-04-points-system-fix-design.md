# Points System Fix & Enhancement — Design Spec

**Date:** 2026-05-04
**Status:** Approved
**Scope:** Bug fixes + new points breakdown endpoint + Quests page

## Problem Statement

1. Mission points are saved to the database but the frontend never invalidates React Query caches after earning them, so points appear stale for up to 5 minutes.
2. The Quests nav link (`/student/quests`) leads to a page that doesn't exist.
3. `story_time.py` doesn't record `score` in `log_interaction`, leaving NULL values in `student_interactions.score`.
4. Daily reward uses a non-atomic read-then-write on `students.points`, creating a race condition.
5. Students have no way to see a breakdown of how their points were earned.

## Design

### 1. Bug Fixes

#### 1a. Mission completion cache invalidation
- **File:** `frontend/app/student/missions/[pillar]/page.tsx`
- **Change:** Replace raw `apiFetch` loop in `handleComplete` with `useMissionComplete().mutateAsync()` from `mutations.ts`
- **Effect:** `studentProfile`, `streak`, `achievements`, `dailySummary` caches all invalidate on success
- **Offline fallback:** Keep `addPendingAnswer` in catch block

#### 1b. Missing score in story_time.py
- **File:** `backend/app/api/v1/endpoints/story_time.py`
- **Change:** Add `score=points` to the `log_interaction` call in POST `/answer`

#### 1c. Daily reward race condition
- **File:** `backend/app/api/v1/endpoints/rewards.py`
- **Change:** Replace read-then-write in POST `/claim-daily` with `increment_student_points` RPC
- **Effect:** Atomic point increment, no race with concurrent mission completions

#### 1d. Remove daily-summary cache
- **File:** `backend/app/api/v1/endpoints/rewards.py`
- **Change:** Remove 2-min cache from GET `/daily-summary`
- **Rationale:** Lightweight indexed query; correctness > saving a trivial DB read

### 2. New Backend Endpoint — Points Breakdown

- **Endpoint:** `GET /api/v1/rewards/points-breakdown`
- **File:** `backend/app/api/v1/endpoints/rewards.py`
- **Auth:** Student JWT (`Depends(get_current_student)`)
- **No cache** — lightweight query, correctness matters

**Query logic:**
- Query `student_interactions` WHERE `student_id = X` AND `correct = true`
- Two time windows: today (UTC midnight), this week (rolling 7 days)
- Group by `interaction_type`, sum `score`, count rows
- Map raw `interaction_type` to display categories:
  - `mission_mc`, `mission_fill`, `mission_speaking` → "Missions"
  - `spelling_bee` → "Spelling Bee"
  - `story_time` → "Story Time"
  - `speaking_practice`, `speaking_pro` → "Speaking"

**Response model:**
```python
class ActivityPoints(BaseModel):
    activity: str
    points: int
    count: int

class PointsBreakdownResponse(BaseModel):
    today: list[ActivityPoints]
    this_week: list[ActivityPoints]
    total_points: int
```

### 3. Quests Page — Frontend

- **Route:** `/student/quests`
- **File:** `frontend/app/student/quests/page.tsx` (new)
- **Data source:** Existing `GET /api/v1/missions/weekly-progress`
- **Hook:** New `useWeeklyProgress()` in `queries.ts`

**UI:**
- Page title "Weekly Quests" with week topic subtitle
- Four pillar cards with progress bars (reading, writing, listening, speaking)
- Pillar-specific colors and icons
- Done/target text and completion state
- Follows existing student UI design language

### 4. Points Breakdown on Home Page

- **File:** `frontend/app/student/home/page.tsx`
- **Placement:** Between hero strip and quick-launch cards
- **Hook:** New `usePointsBreakdown()` in `queries.ts`
- **UI:** Compact pill badges per activity type, hidden when empty
- **Section header:** "Today's Earnings" (falls back to "This Week" if today empty)

### 5. Cache Invalidation Updates

- **File:** `frontend/lib/hooks/mutations.ts`
- Add `pointsBreakdown` query key to invalidation in both `useMissionComplete()` and `useClaimReward()`
- **File:** `frontend/lib/hooks/queries.ts`
- Add `pointsBreakdown` and `weeklyProgress` to `queryKeys`

## Files Changed

| File | Type | Change |
|------|------|--------|
| `frontend/app/student/missions/[pillar]/page.tsx` | Bug fix | Use mutation hook instead of raw fetch |
| `backend/app/api/v1/endpoints/story_time.py` | Bug fix | Add `score=points` to log_interaction |
| `backend/app/api/v1/endpoints/rewards.py` | Bug fix + new endpoint | Atomic daily reward + remove summary cache + add points-breakdown |
| `frontend/app/student/quests/page.tsx` | New file | Quests page with pillar progress bars |
| `frontend/lib/hooks/queries.ts` | Enhancement | Add useWeeklyProgress, usePointsBreakdown hooks + query keys |
| `frontend/lib/hooks/mutations.ts` | Enhancement | Add pointsBreakdown invalidation |
| `frontend/app/student/home/page.tsx` | Enhancement | Add points breakdown section |

## Non-goals

- No new database tables or migrations
- No schema changes
- No Redis caching additions
- No points ledger/transaction table (future consideration)
