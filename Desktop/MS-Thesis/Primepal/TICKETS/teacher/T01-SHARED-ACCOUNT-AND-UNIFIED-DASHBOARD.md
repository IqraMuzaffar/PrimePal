# T01 — Shared Teacher Account & Unified Dashboard with Advanced Filtering

**Priority:** CRITICAL
**Status:** TODO
**Depends on:** None

## What Exists

- Teacher login via Supabase GoTrue (email/password)
- Teacher dashboard (`/teacher/dashboard`) shows KPI cards scoped to the logged-in teacher's classrooms
- Analytics pages with tabs: Overview, By Grade, By Class, By Student
- Components: `AnalyticsOverview`, `AnalyticsByGrade`, `AnalyticsByClass`, `AnalyticsByStudent`
- Student search by name on `/teacher/students`
- Classroom list grouped by grade on `/teacher/classroom`

## What Needs to Change

### 1. Shared Teacher Account Model

The client specifies **1 shared teacher account for all teachers**:

- All teachers log in with the **same credentials** (single master account)
- This means the dashboard must show **ALL students across ALL classes** by default — not filtered to one teacher's classrooms
- Backend queries that currently filter by `teacher_id` must be updated to return global data when the shared account is used
- Alternatively: create one teacher account, assign ALL classrooms to it

**Implementation approach**: The simplest approach is to assign all classrooms to one teacher account. The existing queries already work by teacher_id → classrooms → students. If all classrooms belong to one teacher, the data is automatically global.

### 2. Advanced Search & Filter Controls

The dashboard must support:

| Filter | Current State | Needed |
|--------|--------------|--------|
| By Grade | Tab exists in analytics | Dropdown filter on student roster + analytics |
| By Student Name | Text search exists on `/teacher/students` | Also on dashboard + analytics pages |
| By Roll Number | Not implemented | New search field |
| By Specific Skill (LSRW) | Not implemented | Dropdown: filter analytics to show only Reading / Writing / Speaking / Listening |
| By Specific Topic | Not implemented | Dropdown: filter analytics by SNC topic |

### 3. Default View

- When no filters applied: show complete global roster of all students, all grades
- Filters should be combinable: e.g., "Grade 2 + Reading skill + Nouns topic"
- URL params for filter state (shareable/bookmarkable)

### 4. Dashboard KPI Updates

Current KPIs (total students, interactions, accuracy) should add:
- **Per-grade breakdown** in the overview cards
- **Per-skill (LSRW) accuracy** as a visible metric
- **Active today** count (students who completed at least 1 task today)

## Engineering Notes

- This is primarily a frontend filtering task — the backend data endpoints already return enough data, they just need optional query params for grade, pillar, topic
- Add query params to existing evaluator endpoints: `?grade_level=1&pillar=reading&topic=nouns`
- The shared account approach avoids complex multi-tenant changes — keep it simple

## Files to Touch

- `frontend/src/app/teacher/dashboard/page.tsx` — filter controls, updated KPIs
- `frontend/src/app/teacher/students/page.tsx` — add roll number search, grade filter
- `frontend/src/components/teacher/Analytics*.tsx` — skill + topic filter dropdowns
- `backend/app/endpoints/evaluator.py` — add optional `grade_level`, `pillar`, `topic` query params
- `backend/app/endpoints/classroom.py` — ensure roster endpoints support global view
