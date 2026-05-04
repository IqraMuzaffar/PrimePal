# Teacher Pages

All teacher pages live under `frontend/app/teacher/`. Auth is via Supabase GoTrue; API calls use `apiFetch()` or `teacherFetch()` / `teacherMutate()` which auto-attach the session token.

---

## Layout: `teacher/layout.tsx`

**Type**: Client component (`"use client"`)

**Purpose**: Simple wrapper that renders the `TeacherShell` component. TeacherShell provides sidebar navigation, header, and content area.

---

## `/teacher/login` -- Teacher Login

**File**: `teacher/login/page.tsx`

**Purpose**: Email/password authentication via Supabase GoTrue.

**State Variables**:
- `email`: string
- `password`: string
- `error`: string
- `loading`: boolean

**Auth Call**: `supabase.auth.signInWithPassword({ email, password })`

**Browser Autofill**: Reads values directly from DOM input elements to handle browser autofill race conditions.

**Redirect**: On success, pushes to `/teacher/dashboard`.

---

## `/teacher/dashboard` -- Teacher Dashboard

**File**: `teacher/dashboard/page.tsx`

**Purpose**: Overview KPIs, skill accuracy breakdown, classroom cards, and quick action links.

**Hooks**:
- `useTeacherClassrooms()` -- fetches teacher's classroom list
- `useTeacherDashboardStats({ gradeLevel, pillar })` -- aggregate stats with optional filters
- `useTeacherSkillAccuracy(gradeLevel)` -- per-skill accuracy percentages

**Display Sections**:
1. **KPI Cards**: Total students, total interactions, average accuracy, active this week
2. **Skill Breakdown**: Reading, writing, listening, speaking accuracy with progress bars
3. **Classroom Cards**: Grid of classrooms with student count and grade
4. **Quick Actions**: Links to classrooms, students, reports, analytics

---

## `/teacher/dashboard/curriculum` -- Curriculum Upload (Dashboard)

**File**: `teacher/dashboard/curriculum/page.tsx`

**Purpose**: Quick textbook PDF upload from the dashboard.

**Components**: `FileUploadZone` -- drag-and-drop zone for PDF files.

**Upload Result Display**: Shows `total_chunks`, `embedded_count`, `sample_chunk` after successful processing.

---

## `/teacher/classroom` -- Classroom List

**File**: `teacher/classroom/page.tsx`

**Purpose**: Lists all classrooms grouped by grade level. Supports create and delete.

**Hooks**:
- `useTeacherClassrooms()` -- fetches classroom list
- `useTeacherRole()` -- checks if user is admin (for create/delete permissions)

**Display**: Classrooms grouped by grade level. Each card shows class name, class code (copy button), student count, manage button.

**Admin-Only Features**:
- "New Classroom" button -> opens `CreateClassroomModal`
- Delete button on each classroom card

---

## `/teacher/classroom/[id]` -- Classroom Detail

**File**: `teacher/classroom/[id]/page.tsx`

**Purpose**: Manage a single classroom's roster, topics, and student PINs.

**Hooks**:
- `useTeacherClassroom(params.id)` -- fetches classroom detail with student list

**Tabs**:
1. **Roster**: Student list with search, bulk add, edit, PIN management, remove
2. **Missions**: Topic selection by skill

**Roster Actions**:
- **Search**: Client-side filter on student name
- **Bulk Add**: Opens `BulkAddStudentsModal`
- **Edit Student**: Opens `EditStudentModal`
- **PIN Management**: Save PIN via `teacherMutate PATCH /auth/student/{id}/pin`
- **Remove Student**: `DELETE /classroom/{id}/students/{studentId}`

**Topic Selection**: Renders `TopicSelectionBySkill` component for configuring active topics.

---

## `/teacher/classroom/[id]/syllabus` -- Syllabus Grid

**File**: `teacher/classroom/[id]/syllabus/page.tsx`

**Purpose**: 30-week syllabus progression tracker.

**Hooks**:
- `useTeacherSyllabus(params.id)` -- fetches syllabus weeks with status
- `useUnlockNextWeek(params.id)` -- mutation to unlock the next locked week

**Display**: 5x6 grid (30 weeks). Each week cell shows:
- Status: `locked` (gray), `active` (blue), `completed` (green)
- Week number

**Action**: "Unlock Next Week" button calls the mutation to advance syllabus.

---

## `/teacher/curriculum` -- Curriculum Upload Hub

**File**: `teacher/curriculum/page.tsx`

**Purpose**: Per-grade curriculum management with textbook upload history.

**API Calls** (raw fetch with Supabase session token):
- `GET /curriculum/uploads` -- upload history
- `GET /topics?grade_level={grade}` -- topics per grade

**Display**: Grade cards (1-6), each showing upload history. `UploadBookModal` for new uploads.

---

## `/teacher/students` -- Student Directory

**File**: `teacher/students/page.tsx`

**Purpose**: Global student directory across all classrooms with search and filtering.

**Hooks**:
- `useTeacherStudents({ gradeLevel, pillar, search })` -- fetches filtered student list

**Filters**: `FilterBar` component with URL-synced params for grade level, pillar, and search text. Classroom filter dropdown.

**Table Columns**: Student name, classroom, points, accuracy, active status.

**Actions**: Report link, edit, PIN management, delete (admin-only via `useTeacherRole()`).

---

## `/teacher/students/[id]/report` -- Individual Student Report

**File**: `teacher/students/[id]/report/page.tsx`

**Purpose**: Detailed AI-generated report card for a single student with PDF export.

**API Call**:
- `GET /evaluator/report/student/{id}/detailed` via `teacherFetch`
- Query params: optional `date_from`, `date_to`

**Date Range Filter**: Presets for all time, last 7 days, last 30 days.

**Report Sections**:
1. Identity card (name, classroom, grade)
2. Summary stats (total missions, accuracy, points)
3. Pillar breakdown (reading/writing/listening/speaking)
4. Daily scores table
5. AI insights: strengths, areas for improvement, recommended topics, teacher note

**PDF Export**: Uses `jsPDF` + `jspdf-autotable` to generate downloadable PDF.

---

## `/teacher/analytics` -- Global Analytics

**File**: `teacher/analytics/page.tsx`

**Type**: Server component (`async function`) -- runs on the server.

**API Calls** (server-side fetch):
- `GET /classroom` -- all classrooms
- `GET /evaluator/report/classroom/{id}` -- per-classroom aggregated data

**Aggregation**: Computes `summaryStats`, `classrooms`, `topStudents`, `studentTableData`, `sections` from fetched data.

**Components**: Renders `TabbedDashboard` component with the aggregated data.

---

## `/teacher/announcements` -- Announcement Management

**File**: `teacher/announcements/page.tsx`

**Purpose**: Create and manage announcements with configurable scope.

**Hooks**:
- `useTeacherClassrooms()` -- for classroom-scoped announcements
- `useTeacherAnnouncements()` -- fetches existing announcements

**Scopes**: `classroom` (single class), `grade_level` (all classes in a grade), `school_wide` (everyone).

**API Calls**:
- Create: `POST /announcements` via `teacherMutate`
- Toggle active: `PATCH /announcements/{id}` via `teacherMutate`

**UI Note**: Mentions auto Urdu translation in the interface.

---

## `/teacher/assistant` -- AI Daily Plan

**File**: `teacher/assistant/page.tsx`

**Purpose**: Generate AI-powered daily teaching plans.

**Hooks**:
- `useGenerateDailyPlan()` -- mutation that triggers plan generation

**Input**: Select grade level (1-5).

**Output Structure**:
- `summary`: text overview
- `focus_areas`: array of `{ pillar, topic, reason }`
- `suggested_activities`: array of `{ target_pillar, title, description, estimated_minutes }`
- `student_groups`: array of `{ group_name, student_names, recommendation }`
- `snc_references`: curriculum alignment references

---

## `/teacher/missions` -- Mission Monitoring

**File**: `teacher/missions/page.tsx`

**Purpose**: Monitor mission completion and performance across classrooms.

**Hooks**:
- `useTeacherClassrooms()` -- classroom list
- `useClassroomMissionReport()` -- per-classroom mission stats

**Per-Classroom Stats**: Active students, total missions completed, average accuracy.

**Student List**: Individual performance with accuracy progress bars.

---

## `/teacher/reports` -- Grade & Student Reports

**File**: `teacher/reports/page.tsx`

**Purpose**: Multi-view report system with PDF and CSV export.

**Views** (3-view navigation):

1. **Home View**: Grade selector (1-5) + student search bar
2. **Grade View**:
   - `GET /evaluator/report/grade/{grade}` via `teacherFetch`
   - CSV export: `GET /evaluator/report/grade/{grade}/csv`
   - Table of all students in grade with stats
3. **Student View**:
   - `GET /evaluator/report/student/{id}/detailed` via `teacherFetch`
   - PDF export via `jsPDF`
   - AI insights: strengths, areas for improvement, recommended topics

---

## `/teacher/topics` -- SNC Topic Selection

**File**: `teacher/topics/page.tsx`

**Purpose**: Control which SNC (Single National Curriculum) topics are active for each grade level.

**Hooks**:
- `useTeacherTopics(grade)` -- fetches topics for selected grade
- `useTeacherRole()` -- checks admin status for edit permissions

**State Variables**:
- `grade`: number (1-5)
- `topics`: array of `{ topic_id, topic_name, skill, is_active }`
- `saving`, `saved`, `error`, `dirty`: UI state

**Grouping**: Topics grouped by skill (`listening`, `speaking`, `reading`, `writing`) with color-coded headers.

**API Call**:
- Save: `PUT /topics/grade-selections/{grade}` via `teacherMutate`
- Body: `{ selections: [{ topic_id, is_active }] }`

**Permissions**: Only admins can toggle topics and save. Non-admins see read-only view with "contact an admin" message.

**Bulk Actions** (admin-only): "Select All" and "Deselect All" buttons.
