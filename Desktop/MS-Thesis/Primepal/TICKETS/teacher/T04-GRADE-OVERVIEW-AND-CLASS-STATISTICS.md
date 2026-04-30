# T04 — Grade-Level Overview & Class Statistics

**Priority:** HIGH
**Status:** TODO
**Depends on:** T01 (unified dashboard). Soft dep: S07 (provides `last_activity_date` column used for idle detection — can fallback to querying `student_interactions.created_at` if S07 is not yet built)

## What Exists

- `AnalyticsByGrade` component — exists but relies on mock/aggregated data
- `AnalyticsByClass` component — per-classroom stats
- Evaluator provides per-student and per-classroom analytics
- Dashboard KPI cards show total students, interactions, accuracy

## What Needs to Be Built

### 1. Grade-Level Statistics Dashboard

Teacher should see at a glance, per grade:

- **Total students** in that grade
- **Skill proficiency breakdown**: "80% proficient in Reading, 50% struggling with Speaking"
- **Top 3 weak topics** across the grade
- **Top 3 strong topics** across the grade
- **Active vs. idle students** (who completed a task today vs. who didn't)
- **Average score** per skill (LSRW)

### 2. Drill-Down Capability

From grade overview → click into:
- Individual student list (filtered to that grade)
- Per-student detail view (existing `/teacher/students/[id]/report`)
- Skill-specific view (e.g., all Grade 2 Speaking data)

### 3. Idle Student Detection

- Highlight students who haven't completed any task in the last 48 hours
- Visual indicator (amber/red badge) on the student card
- "Nudge" capability: teacher can see who needs attention

### 4. Data Visualization

The client wants teachers to be "well-informed with statistics." Add:
- **Bar charts**: per-skill accuracy distribution per grade
- **Progress over time**: line chart showing grade-level accuracy week-over-week
- **Skill radar chart**: per-student or per-grade skill balance visualization

### 5. Backend Aggregation Endpoints

- `GET /evaluator/grade-overview/{grade_level}` → skill breakdown, topic heatmap, student count
- `GET /evaluator/idle-students?threshold_hours=48` → students with no recent activity
- These should aggregate from `student_interactions` + `students` + `classrooms`

## Engineering Notes

- Chart library: use `recharts` (already common in Next.js projects) or `chart.js`
- Grade overview data can be cached for 1 hour (teacher doesn't need real-time refresh)
- Mock data removal (Ticket 03) must happen before this — analytics components currently have some placeholder data
- Idle student detection: simple query `WHERE last_activity_date < NOW() - INTERVAL '48 hours'` (uses the column from S07)

## Files to Touch

- `frontend/src/components/teacher/AnalyticsByGrade.tsx` — real data + charts
- `frontend/src/components/teacher/AnalyticsOverview.tsx` — grade summary cards
- `backend/app/endpoints/evaluator.py` — grade overview + idle student endpoints
- `backend/app/agents/nlp_evaluator.py` — grade-level aggregation logic
- `frontend/package.json` — add charting library
