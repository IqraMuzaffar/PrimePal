# Student "My Scores" Feature - Design Spec

**Date:** 2026-05-04
**Status:** Approved
**Author:** Claude (via brainstorming session)

## Overview

Add a "My Scores" page for students to view their performance across skills (Reading, Writing, Listening, Speaking) with time-based filtering. Replaces the Quests navigation item.

## Requirements

**Must Have:**
- Replace "Quests" nav item with "My Scores"
- Show overall stats: total questions, stars earned, accuracy %
- Show per-pillar breakdown with accuracy
- Date filters: "Everything", "This Week", "This Month"
- Colorful card layout for stats
- Student-only access (JWT auth)

**Must NOT Have:**
- Progress bars
- AI insights / recommendations
- Trend analysis
- Daily score charts
- Detailed analytics

## Architecture

### Backend

**New Endpoint:** `GET /api/v1/student/my-scores`

**Query Params:**
- `time_range`: `"everything"` | `"week"` | `"month"` (default: `"everything"`)

**Response Schema:**
```python
class PillarScore(BaseModel):
    pillar: str              # reading/writing/listening/speaking
    total: int
    correct: int
    accuracy_pct: int        # 0-100

class MyScoresResponse(BaseModel):
    total_questions: int
    total_correct: int
    overall_accuracy_pct: int
    total_points: int
    pillar_scores: list[PillarScore]  # Always 4 items
    time_range_label: str
```

**Logic:**
1. Extract student_id from JWT
2. Calculate date range (week = last 7 days, month = last 30 days)
3. Query `student_interactions` table filtered by student_id + date range
4. Aggregate: total questions, correct answers, group by pillar
5. Get points from `students` table
6. Calculate accuracy percentages (round to integer, handle division by zero)
7. Return all 4 pillars (show 0 for pillars with no data)

**Auth:** `get_current_student` dependency (student JWT required)

**File:** `backend/app/api/v1/endpoints/student_scores.py`

### Frontend

**New Page:** `frontend/app/student/scores/page.tsx`

**Layout:**

1. **Header:**
   - Title: "My Scores 📊"
   - Date filter dropdown (right side)

2. **Stats Cards** (grid, 3 cards):
   - Total Questions (indigo, 🎯)
   - Stars Earned (amber, ⭐)
   - Accuracy (emerald/amber/rose based on %, ✓)

3. **Pillar Breakdown:**
   - Title: "My Skills"
   - 4 rows (Reading, Writing, Listening, Speaking)
   - Each shows: icon, pillar name, questions, correct, accuracy %
   - Uses pillar theme colors

**States:**
- Loading: Skeleton cards
- Empty: "Start answering questions to see your scores! 🚀"
- Error: "😕 Can't load scores right now. Try again!"

**Hook:** `useMyScores(timeRange)` - TanStack Query, 30s cache

### Navigation Changes

**File:** `frontend/app/student/layout.tsx`

**Update NAV_LINKS:**
```typescript
// OLD:
{ href: "/student/quests", label: "Quests", icon: "📋" }

// NEW:
{ href: "/student/scores", label: "My Scores", icon: "📊" }
```

**Remove:**
- `/student/quests/page.tsx` and all quests functionality

## Error Handling

**Backend:**
- No data: Return zeros (not an error)
- Invalid time_range: 422 "Invalid time range"
- DB errors: 500 "Could not load scores"

**Frontend:**
- Network error: "😕 Can't reach the server. Check your connection!"
- Division by zero: Show 0% (not NaN)
- Large numbers: Format with commas (1,234)

## Data Privacy

- Students see only their own data (JWT-enforced)
- No cross-student comparisons
- No PII exposed beyond student's own name/scores

## Files

**Create:**
- `backend/app/api/v1/endpoints/student_scores.py`
- `frontend/app/student/scores/page.tsx`

**Modify:**
- `frontend/app/student/layout.tsx` (nav links)
- `frontend/lib/hooks/queries.ts` (add useMyScores)
- `backend/app/main.py` (register new route)

**Delete:**
- `frontend/app/student/quests/page.tsx` (and any quests-related files)

## Design Decisions

1. **New endpoint vs reusing teacher endpoint:** New student endpoint for cleaner separation and optimized payload
2. **Date ranges:** Kid-friendly labels ("This Week" not "Last 7 Days")
3. **Accuracy display:** Show percentages despite being "detailed" - users confirmed this is needed
4. **No progress bars:** Keep UI simple, just numbers and percentages
5. **All 4 pillars shown:** Even if student has 0 questions in a pillar, show it with zeros

## Success Criteria

- Students can view their scores filtered by time range
- Page loads in <2s with typical data
- Works on mobile and desktop
- Visual design matches existing student pages
- Quests functionality completely removed without breaking other features
