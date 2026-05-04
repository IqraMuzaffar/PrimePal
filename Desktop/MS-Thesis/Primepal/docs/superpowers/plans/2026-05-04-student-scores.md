# Student "My Scores" Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "My Scores" page where students can view their performance stats (questions, stars, accuracy) filtered by time range, replacing the Quests page.

**Architecture:** New student-only endpoint `/student/my-scores` that aggregates data from `student_interactions` table. Frontend displays stats in colorful cards with pillar breakdown. Uses existing student auth (JWT).

**Tech Stack:** FastAPI, Pydantic, Supabase (PostgreSQL), Next.js 14, TanStack Query, TypeScript

---

## File Structure

**Create:**
- `backend/app/api/v1/endpoints/student_scores.py` - New endpoint with schemas and logic
- `frontend/app/student/scores/page.tsx` - My Scores page component

**Modify:**
- `backend/app/api/v1/router.py` - Register new student_scores router
- `frontend/lib/hooks/queries.ts` - Add useMyScores hook + types
- `frontend/app/student/layout.tsx` - Update nav links

**Delete:**
- `frontend/app/student/quests/page.tsx` - Remove quests page

---

## Task 1: Remove Quests Functionality

**Files:**
- Delete: `frontend/app/student/quests/page.tsx`

- [ ] **Step 1: Delete quests page**

```bash
git rm frontend/app/student/quests/page.tsx
```

- [ ] **Step 2: Verify no other files import from quests**

Run:
```bash
grep -r "from.*quests" frontend/app/student/ || echo "No imports found - good!"
grep -r "student/quests" frontend/ || echo "No references found - good!"
```

Expected: No imports or references found

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove quests page

Removing quests functionality to make room for My Scores feature.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Backend - Create Student Scores Endpoint

**Files:**
- Create: `backend/app/api/v1/endpoints/student_scores.py`
- Test: Manual testing via API (FastAPI automatic docs)

- [ ] **Step 1: Create schemas and endpoint skeleton**

Create `backend/app/api/v1/endpoints/student_scores.py`:

```python
"""
Student Scores Endpoint
GET /api/v1/student/my-scores - View own performance stats
"""
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_student
from app.core.supabase_client import get_supabase_admin

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────


class PillarScore(BaseModel):
    pillar: str
    total: int
    correct: int
    accuracy_pct: int


class MyScoresResponse(BaseModel):
    total_questions: int
    total_correct: int
    overall_accuracy_pct: int
    total_points: int
    pillar_scores: list[PillarScore]
    time_range_label: str


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get(
    "/my-scores",
    response_model=MyScoresResponse,
    summary="Get student's own performance scores",
)
async def get_my_scores(
    student: dict = Depends(get_current_student),
    time_range: Literal["everything", "week", "month"] = Query("everything"),
) -> MyScoresResponse:
    """
    Returns student's performance stats filtered by time range.

    Time ranges:
    - everything: All time
    - week: Last 7 days
    - month: Last 30 days

    Returns overall stats (questions, accuracy, points) and per-pillar breakdown.
    """
    from collections import defaultdict

    supabase = get_supabase_admin()
    student_id: str = student["sub"]

    # 1. Calculate date range
    date_from = None
    time_range_label = "Everything"

    if time_range == "week":
        date_from = (datetime.now() - timedelta(days=7)).date().isoformat()
        time_range_label = "This Week"
    elif time_range == "month":
        date_from = (datetime.now() - timedelta(days=30)).date().isoformat()
        time_range_label = "This Month"

    # 2. Query interactions with date filter
    query = (
        supabase.table("student_interactions")
        .select("pillar, correct")
        .eq("student_id", student_id)
        .not_.is_("correct", "null")  # Only count answered questions
    )

    if date_from:
        query = query.gte("created_at", date_from)

    interactions_resp = query.execute()
    interactions = interactions_resp.data or []

    # 3. Aggregate overall stats
    total_questions = len(interactions)
    total_correct = sum(1 for i in interactions if i.get("correct"))
    overall_accuracy_pct = round((total_correct / total_questions * 100)) if total_questions > 0 else 0

    # 4. Aggregate by pillar
    pillar_data = defaultdict(lambda: {"total": 0, "correct": 0})
    for interaction in interactions:
        pillar = interaction.get("pillar")
        if pillar:
            pillar_data[pillar]["total"] += 1
            if interaction.get("correct"):
                pillar_data[pillar]["correct"] += 1

    # 5. Build pillar scores (always return all 4 pillars)
    all_pillars = ["reading", "writing", "listening", "speaking"]
    pillar_scores = []

    for pillar in all_pillars:
        data = pillar_data[pillar]
        total = data["total"]
        correct = data["correct"]
        accuracy_pct = round((correct / total * 100)) if total > 0 else 0

        pillar_scores.append(
            PillarScore(
                pillar=pillar,
                total=total,
                correct=correct,
                accuracy_pct=accuracy_pct,
            )
        )

    # 6. Get total points from students table
    student_resp = (
        supabase.table("students")
        .select("points")
        .eq("id", student_id)
        .maybe_single()
        .execute()
    )

    total_points = student_resp.data.get("points", 0) if student_resp.data else 0

    return MyScoresResponse(
        total_questions=total_questions,
        total_correct=total_correct,
        overall_accuracy_pct=overall_accuracy_pct,
        total_points=total_points,
        pillar_scores=pillar_scores,
        time_range_label=time_range_label,
    )
```

- [ ] **Step 2: Test endpoint manually**

Start backend:
```bash
cd backend && uvicorn app.main:app --reload
```

Open http://localhost:8000/docs, find `/student/my-scores`, test with:
- Valid student JWT token
- time_range: "everything", "week", "month"

Expected: Returns valid MyScoresResponse with all 4 pillars

- [ ] **Step 3: Commit backend endpoint**

```bash
git add backend/app/api/v1/endpoints/student_scores.py
git commit -m "feat(backend): add student scores endpoint

New GET /student/my-scores endpoint for students to view their
performance stats (questions, accuracy, points) filtered by time range.

Returns overall stats + breakdown by pillar (reading/writing/listening/speaking).
Uses student JWT auth, queries student_interactions table.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Backend - Register Endpoint

**Files:**
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Import and register student_scores router**

Add to imports:
```python
from app.api.v1.endpoints import achievements, admin, auth, chat, classroom, curriculum, evaluations, evaluator, interactions, missions, rewards, speaking, spelling_bee, story_time, student_scores, topics
```

Add to router registrations (after rewards router):
```python
api_router.include_router(student_scores.router, prefix="/student", tags=["student"])
```

- [ ] **Step 2: Verify endpoint is registered**

Restart backend, check http://localhost:8000/docs

Expected: See `/api/v1/student/my-scores` in API docs under "student" tag

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/router.py
git commit -m "feat(backend): register student scores router

Add /student prefix for student-specific endpoints.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Frontend - Add useMyScores Hook

**Files:**
- Modify: `frontend/lib/hooks/queries.ts`

- [ ] **Step 1: Add types and query key**

Add interface after `PointsBreakdown`:

```typescript
export interface PillarScore {
  pillar: string;
  total: number;
  correct: number;
  accuracy_pct: number;
}

export interface MyScoresData {
  total_questions: number;
  total_correct: number;
  overall_accuracy_pct: number;
  total_points: number;
  pillar_scores: PillarScore[];
  time_range_label: string;
}
```

Add to `queryKeys` object:
```typescript
myScores: (timeRange: string) => ["myScores", timeRange] as const,
```

- [ ] **Step 2: Add useMyScores hook**

Add after `usePointsBreakdown`:

```typescript
export function useMyScores(timeRange: string = "everything") {
  return useQuery({
    queryKey: queryKeys.myScores(timeRange),
    queryFn: () => studentFetch<MyScoresData>(`/student/my-scores?time_range=${timeRange}`),
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/hooks/queries.ts
git commit -m "feat(frontend): add useMyScores query hook

Add TanStack Query hook for fetching student scores with time range filter.
Caches for 30s to reduce API calls.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Frontend - Create Scores Page

**Files:**
- Create: `frontend/app/student/scores/page.tsx`

- [ ] **Step 1: Create scores page with all sections**

Create `frontend/app/student/scores/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Star, CheckCircle } from "lucide-react";
import { useMyScores } from "@/lib/hooks/queries";

// ── Pillar Config ────────────────────────────────────────────────────────────

const PILLAR_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  reading: { label: "Reading", icon: "📖", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  writing: { label: "Writing", icon: "✍️", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  listening: { label: "Listening", icon: "👂", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
  speaking: { label: "Speaking", icon: "🗣️", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function getAccuracyColor(pct: number): string {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-rose-600";
}

function getAccuracyBg(pct: number): string {
  if (pct >= 70) return "from-emerald-400 to-emerald-600";
  if (pct >= 40) return "from-amber-400 to-amber-600";
  return "from-rose-400 to-rose-600";
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function ScoresSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border-2 border-slate-200 p-6 animate-pulse">
            <div className="h-12 w-12 bg-slate-200 rounded-full mb-3" />
            <div className="h-8 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      {/* Pillar breakdown skeleton */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScoresPage() {
  const [timeRange, setTimeRange] = useState<string>("everything");
  const { data, isLoading, error } = useMyScores(timeRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          My Scores 📊
        </h1>

        {/* Date filter */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 rounded-xl border-2 border-slate-200 bg-white font-semibold text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400
                     transition-all"
        >
          <option value="everything">Everything</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && <ScoresSkeleton />}

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center">
          <p className="text-lg font-bold text-rose-700">
            😕 Can't load scores right now. Try again!
          </p>
        </div>
      )}

      {/* Data loaded */}
      {data && !isLoading && (
        <>
          {/* Empty state */}
          {data.total_questions === 0 ? (
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-12 text-center">
              <p className="text-2xl font-extrabold text-indigo-700 mb-2">
                Start answering questions to see your scores! 🚀
              </p>
              <p className="text-slate-600">
                Complete missions to track your progress here!
              </p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Questions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg p-6 text-white"
                >
                  <Target className="w-12 h-12 mb-3 opacity-90" />
                  <p className="text-4xl font-extrabold mb-1">{formatNumber(data.total_questions)}</p>
                  <p className="text-sm font-semibold opacity-90">Total Questions</p>
                </motion.div>

                {/* Stars Earned */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg p-6 text-white"
                >
                  <Star className="w-12 h-12 mb-3 opacity-90 fill-current" />
                  <p className="text-4xl font-extrabold mb-1">{formatNumber(data.total_points)}</p>
                  <p className="text-sm font-semibold opacity-90">Stars Earned</p>
                </motion.div>

                {/* Accuracy */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`bg-gradient-to-br ${getAccuracyBg(data.overall_accuracy_pct)} rounded-2xl shadow-lg p-6 text-white`}
                >
                  <CheckCircle className="w-12 h-12 mb-3 opacity-90" />
                  <p className="text-4xl font-extrabold mb-1">{data.overall_accuracy_pct}%</p>
                  <p className="text-sm font-semibold opacity-90">Accuracy</p>
                </motion.div>
              </div>

              {/* Pillar Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-6"
              >
                <h2 className="text-xl font-extrabold text-slate-800 mb-4">
                  My Skills
                </h2>

                <div className="space-y-3">
                  {data.pillar_scores.map((pillar) => {
                    const config = PILLAR_CONFIG[pillar.pillar];
                    if (!config) return null;

                    return (
                      <div
                        key={pillar.pillar}
                        className={`rounded-xl border-2 p-4 transition-all hover:shadow-md ${config.bg}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{config.icon}</span>
                            <div>
                              <p className={`font-extrabold text-lg ${config.color}`}>
                                {config.label}
                              </p>
                              <p className="text-sm text-slate-600 font-medium">
                                {pillar.correct} / {pillar.total} correct
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className={`text-2xl font-extrabold ${getAccuracyColor(pillar.accuracy_pct)}`}>
                              {pillar.accuracy_pct}%
                            </p>
                            <p className="text-xs text-slate-500 font-semibold">Accuracy</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test page manually**

Start frontend:
```bash
cd frontend && npm run dev
```

Navigate to http://localhost:3000/student/scores (will need to log in as student first)

Test:
- Page loads and shows skeleton while loading
- Stats cards display correctly
- Pillar breakdown shows all 4 skills
- Date filter works (Everything, This Week, This Month)
- Empty state shows when no data
- Error message shows on network error

- [ ] **Step 3: Commit**

```bash
git add frontend/app/student/scores/page.tsx
git commit -m "feat(frontend): add My Scores page

New student scores page with:
- Overall stats cards (questions, stars, accuracy)
- Per-pillar breakdown with colorful cards
- Time range filter (Everything, This Week, This Month)
- Loading, empty, and error states
- Responsive design matching student pages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Frontend - Update Navigation

**Files:**
- Modify: `frontend/app/student/layout.tsx`

- [ ] **Step 1: Update NAV_LINKS constant**

Find `NAV_LINKS` array (around line 30) and replace:

```typescript
const NAV_LINKS = [
  { href: "/student/home",         label: "Home",        icon: "🏠" },
  { href: "/student/chat",         label: "Chat",        icon: "💬" },
  { href: "/student/missions",     label: "Missions",    icon: "🎯" },
  { href: "/student/scores",       label: "My Scores",   icon: "📊" },
  { href: "/student/achievements", label: "Badges",      icon: "🏅" },
  { href: "/student/leaderboard",  label: "Leaderboard", icon: "🏆" },
];
```

- [ ] **Step 2: Test navigation**

Start frontend, log in as student, verify:
- "My Scores" nav item appears (no "Quests")
- Clicking "My Scores" navigates to `/student/scores`
- Active state highlights correctly
- All other nav items still work

- [ ] **Step 3: Commit**

```bash
git add frontend/app/student/layout.tsx
git commit -m "feat(frontend): replace Quests with My Scores in nav

Update student navigation to show My Scores instead of Quests.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Final Integration Test

**Files:**
- None (testing only)

- [ ] **Step 1: Full user journey test**

Test complete flow:
1. Student logs in at `/student/play`
2. Navigates to "My Scores" from top nav
3. Sees their scores with "Everything" filter
4. Changes to "This Week" - data updates
5. Changes to "This Month" - data updates
6. Verifies all 4 pillars show (even with 0 questions)
7. Verifies accuracy colors (green >70%, amber 40-70%, red <40%)
8. Tests on mobile viewport (cards stack vertically)

- [ ] **Step 2: Verify quests is completely removed**

```bash
# Should return no results:
find . -name "*quest*" -type f | grep -v node_modules | grep -v .git
grep -r "quests" frontend/app/student/ | grep -v node_modules || echo "Clean!"
```

Expected: No quest-related files or references

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Student My Scores feature

Replace Quests with My Scores page for students to view performance.

Features:
- New /student/my-scores endpoint (backend)
- My Scores page with stats cards and pillar breakdown (frontend)
- Time range filters: Everything, This Week, This Month
- Responsive design, loading/empty/error states
- Complete removal of quests functionality

Closes #[issue-number]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Replace Quests nav item with My Scores (Task 6)
- ✅ Show overall stats: questions, stars, accuracy (Task 5)
- ✅ Show per-pillar breakdown with accuracy (Task 5)
- ✅ Date filters: Everything, This Week, This Month (Tasks 2, 5)
- ✅ Colorful card layout (Task 5)
- ✅ Student-only access via JWT (Task 2)
- ✅ Remove quests functionality (Task 1)

**Placeholder Check:**
- ✅ No TBDs, TODOs, or "implement later"
- ✅ All code blocks contain actual code
- ✅ All file paths are exact
- ✅ All commands have expected output

**Type Consistency:**
- ✅ `PillarScore` schema matches between backend and frontend
- ✅ `MyScoresResponse` / `MyScoresData` structure consistent
- ✅ Time range values: "everything", "week", "month" (consistent)
- ✅ Pillar names: "reading", "writing", "listening", "speaking" (consistent)

---

## Success Criteria

- ✅ Students can access "My Scores" from navigation
- ✅ Page shows overall stats and pillar breakdown
- ✅ Time filters work correctly
- ✅ Works on mobile and desktop
- ✅ Quests functionality completely removed
- ✅ No broken links or errors
- ✅ Visual design matches existing student pages
