# Admin Pages

All admin pages live under `frontend/app/admin/`. Auth is Supabase GoTrue with an additional `isCurrentUserAdmin()` check. The admin UI uses a dark slate theme (`bg-slate-900`).

---

## Layout: `admin/layout.tsx`

**Type**: Client component (`"use client"`)

**Purpose**: Admin shell with auth guard, header, tab navigation, and mobile drawer.

**Auth Guard**:
1. Calls `supabase.auth.getSession()` to check for active session
2. Calls `isCurrentUserAdmin()` to verify admin role
3. Redirects to `/admin/login` if either check fails
4. Login page is excluded from the guard (`isLoginPage` check)

**State Variables**:
- `loading`: boolean
- `authenticated`: boolean
- `adminName`: string (email)
- `showMobileMenu`: boolean

**Desktop Tab Navigation** (sticky top bar):
- Evaluations (`/admin/dashboard`)
- Staff Directory (`/admin/dashboard/staff`)
- School Hierarchy (`/admin/dashboard/hierarchy`)
- Students (`/admin/dashboard/students`)
- Global Curriculum (`/admin/dashboard/curriculum`)
- Data Export (`/admin/dashboard/export`)
- Divider
- Teacher View section: Dashboard (`/teacher/dashboard`), AI Assistant (`/teacher/assistant`)

**Mobile Navigation**: Drawer overlay with same links, toggled by hamburger menu.

**Sign Out**: Calls `supabase.auth.signOut()`, redirects to `/admin/login`.

---

## `/admin/login` -- Admin Login & Signup

**File**: `admin/login/page.tsx`

**Purpose**: 3-step authentication: invite code validation, account creation, or direct login.

**State Variables**:
- `step`: `"code" | "signup" | "login"`
- `inviteCode`: string
- `email`: string
- `fullName`: string
- `password`, `confirmPassword`: string
- `error`: string
- `loading`: boolean

**Step 1 -- Invite Code**:
- Input: invite code string
- API: `POST /admin/validate-invite-code`
- Body: `{ code: inviteCode }`
- On success: sets `email` from response, advances to signup step

**Step 2 -- Signup**:
- Inputs: full name, password, confirm password
- Client-side validation: passwords must match
- API: `POST /admin/teachers`
- Body: `{ email, full_name, password, invite_code }`
- Then auto-signs in via `supabase.auth.signInWithPassword({ email, password })`
- Redirects to `/admin/dashboard/staff`

**Step 3 -- Login**:
- Inputs: email, password
- Auth: `supabase.auth.signInWithPassword({ email, password })`
- Redirects to `/admin/dashboard/staff`

**Navigation**: Links between steps -- "Already have an account? Sign in" and "Back to invite code".

---

## `/admin/dashboard` -- Evaluations

**File**: `admin/dashboard/page.tsx`

**Purpose**: Manage pre/post test evaluations and view results.

**Hooks**:
- `useAdminClassrooms()` -- classroom list for scope selection
- `useAdminEvalResults()` -- evaluation result data
- `useTriggerPostTest()` -- mutation to trigger post-tests

**Trigger Post-Test**: Scoped by `global`, `grade`, or `classroom`. Sends command to make post-tests available for selected scope.

**Results Display**:
- Summary: pre-test count, post-test count, average pre-score, average post-score
- Per-student table: student name, pre-test score, post-test score, psychometric average, change indicator

---

## `/admin/dashboard/staff` -- Staff Directory

**File**: `admin/dashboard/staff/page.tsx`

**Purpose**: Manage teacher accounts and generate invite codes.

**Hooks**:
- `useAdminTeachers()` -- fetches teacher list
- `useInviteAdmin()` -- mutation to generate invite code
- `useUpdateAdminTeacher()` -- mutation to edit teacher
- `useDeleteAdminTeacher()` -- mutation to delete teacher

**Invite Flow**: Click "Invite" -> generates a one-time invite code -> display code for sharing. The invited user enters this code on the admin login page to create their account.

**Edit**: Update teacher name and email via modal.

**Delete**: Confirmation dialog. If teacher has assigned classrooms, prompts for classroom reassignment before deletion.

---

## `/admin/dashboard/hierarchy` -- School Hierarchy

**File**: `admin/dashboard/hierarchy/page.tsx`

**Purpose**: Manage classroom-teacher assignments and the overall school structure.

**Hooks**:
- `useAdminClassrooms()` -- classroom list
- `useAdminTeachers()` -- teacher list (for assignment dropdowns)
- `useAdminStudents()` -- student counts per classroom
- CRUD mutations for classrooms

**Table Columns**: Classroom name, grade level, assigned teacher, student count, class code.

**Modals**: Create classroom, edit classroom (name, grade, teacher assignment), delete classroom.

---

## `/admin/dashboard/students` -- Student Management

**File**: `admin/dashboard/students/page.tsx`

**Purpose**: Global student CRUD with search, filtering, and PIN management.

**Hooks**:
- `useAdminStudents()` -- fetches all students
- `useAdminClassrooms()` -- classroom list (for filter + assignment)
- CRUD mutations for students
- `useResetStudentPin()` -- mutation to reset a student's PIN

**Filters**: Search by name, filter by grade level.

**Actions**:
- **Create**: Opens modal. Fields: name, roll number, email (optional), classroom. Displays generated PIN on success.
- **Edit**: Modal with name, roll number, email, classroom reassignment.
- **Delete**: Confirmation dialog.
- **Reset PIN**: Generates new PIN and displays it.

---

## `/admin/dashboard/curriculum` -- Curriculum Pipeline

**File**: `admin/dashboard/curriculum/page.tsx`

**Purpose**: Upload textbook PDFs and monitor the processing pipeline. View and audit extracted chunks.

**Hooks**:
- `useAdminBooks()` -- fetches book list with processing status

**Upload Pipeline** (status polling):
1. `pending` -- uploaded, waiting
2. `extracting` -- text extraction in progress
3. `chunking` -- splitting into chunks
4. `embedding` -- generating vector embeddings
5. `success` -- processing complete
6. `failed` -- error occurred

**API Calls**:
- Upload: `POST /admin/curriculum/upload` (FormData with PDF)
- Poll status: `GET /admin/curriculum/books/{id}/status`
- View chunks: `GET /admin/curriculum/books/{id}/chunks`
- Delete: `DELETE /admin/curriculum/books/{id}`

**Chunk Viewer**: Modal with paginated view of extracted text chunks. Shows chunk text, page number, and embedding status.

---

## `/admin/dashboard/export` -- Data Export

**File**: `admin/dashboard/export/page.tsx`

**Purpose**: Export platform data in CSV or JSON format with configurable filters.

**Export Types**:
- `students` -- student records
- `interactions` -- chat/mission interactions
- `missions` -- mission completion data
- `evaluations` -- pre/post test results

**Formats**: CSV, JSON

**Filters** (vary by export type):
- `grade_level` -- filter by grade
- `student_id` -- filter by specific student
- `date_from`, `date_to` -- date range
- `pillar` -- filter by skill pillar (reading/writing/listening/speaking)
- `evaluation_type` -- pre or post

**API Call**: `GET /admin/export/{type}` with query parameters for filters and format.

**Preview**: Displays first 10 rows of the export before download. Download button triggers full export.
