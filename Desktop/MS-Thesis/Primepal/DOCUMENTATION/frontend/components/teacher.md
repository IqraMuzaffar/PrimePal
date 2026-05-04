# Teacher Components

Detailed reference for all components under `frontend/components/teacher/`.

---

## Layout

### TeacherShell

**File:** `components/teacher/TeacherShell.tsx`

**Props:**
```ts
{ children: React.ReactNode }
```

**State:**
- `email: string | null` -- teacher's email from Supabase session
- `showSettings: boolean` -- settings modal visibility
- `showMobileMenu: boolean` -- mobile nav drawer visibility

**Behavior:**
- Top navigation bar with indigo gradient background.
- Brand logo links to `/teacher/dashboard`.
- Desktop: horizontal nav links rendered inline.
- Mobile: hamburger button toggles a dropdown nav drawer with backdrop overlay.
- Navigation links (all under `/teacher/`): Dashboard, Classrooms, Students, Missions, Announcements, Curriculum Hub, Topics, AI Assistant.
- Active route detection via `pathname.startsWith(href)`.
- Right side: Settings button, logout button, avatar initial circle.
- Settings modal shows account info (email, role) and a sign-out button.
- Logout calls `supabase.auth.signOut()` then redirects to `/teacher/login`.
- Responsive: desktop shows text labels, mobile shows icon-only buttons for settings/logout.

**Used by:** All teacher pages as the root layout wrapper.

---

## Analytics Dashboard

### TabbedDashboard

**File:** `components/teacher/TabbedDashboard.tsx`

**Props:**
```ts
interface Props {
  data: AnalyticsDashboardData;
  gradeLevel?: number;
  pillar?: string;
}
```

**State:**
- `activeTab: "overview" | "byGrade" | "byClass" | "byStudent"` -- default `"overview"`
- `selectedGrade: number | null`
- `selectedGradeForClass: number | null`
- `selectedSection: string | null`
- `studentTablePage: number`
- `studentTableFilters: { grade?: number; class?: string }`

**Behavior:**
- Renders a sticky header with title "Global Analytics".
- Renders `FilterBar` (search hidden) and `TabNavigation`.
- Switches between four tab views:
  - Overview: `AnalyticsOverview`
  - By Grade: `AnalyticsByGrade` with grade selector state
  - By Class: `AnalyticsByClass` with grade + section selectors
  - By Student: `AnalyticsByStudent` with pagination and filter state

**Used by:** Teacher analytics/dashboard page.

---

### TabNavigation

**File:** `components/teacher/TabNavigation.tsx`

**Props:**
```ts
interface Props {
  activeTab: "overview" | "byGrade" | "byClass" | "byStudent";
  onTabChange: (tabId: Tab["id"]) => void;
}
```

**State:** None.

**Behavior:**
- Renders four tab buttons: Overview, By Grade, By Class, By Student.
- Active tab is highlighted with indigo text.
- Animated underline indicator slides between tabs using Framer Motion `layoutId`.
- Sticky positioning at top of page.

**Used by:** `TabbedDashboard`.

---

### AnalyticsOverview

**File:** `components/teacher/AnalyticsOverview.tsx`

**Props:**
```ts
interface Props {
  data: AnalyticsDashboardData;
}
```

**State:**
- `dashStats: DashboardStats | null` -- from `/evaluator/dashboard-stats`
- `skillAccuracy: SkillAccuracy | null` -- from `/evaluator/skill-accuracy`
- `weeklyTrends: WeeklyTrendData[]` -- from `/evaluator/weekly-trend/{grade}`

**Internal types:**
```ts
interface DashboardStats {
  total_students: number;
  total_interactions: number;
  avg_accuracy: number;
  active_this_week: number;
}
interface SkillAccuracy {
  reading: number; writing: number; listening: number; speaking: number;
  active_today: number;
}
interface WeeklyTrendPoint { week_label: string; accuracy: number; interactions: number; }
```

**Behavior:**
- Fetches dashboard stats and skill accuracy in parallel on mount.
- Fetches weekly trend for the first available grade.
- Falls back to server-provided `data.summaryStats` if API calls fail.
- Renders:
  1. Summary stats grid (4 cards): total students, total interactions, system accuracy, active today.
  2. Skill Pillar Accuracy: 4 colored cards + horizontal bar chart for reading/writing/listening/speaking.
  3. Weekly Accuracy Trend: CSS bar chart.
  4. Top 5 Students: ranked list with avatar, grade, accuracy badge, points.
  5. Average Accuracy by Grade: horizontal bars for grades 1-5.

**Internal sub-components:**
- `AccuracyBar({ label, value })` -- horizontal progress bar with color coding (green >= 70, yellow >= 40, red < 40).
- `WeeklyBars({ weeks })` -- vertical bar chart using CSS.

**Used by:** `TabbedDashboard` (overview tab).

---

### AnalyticsByGrade

**File:** `components/teacher/AnalyticsByGrade.tsx`

**Props:**
```ts
interface Props {
  data: AnalyticsDashboardData;
  selectedGrade: number | null;
  onGradeChange: (grade: number | null) => void;
}
```

**State:**
- `gradeOverview: GradeOverview | null` -- from `/evaluator/grade-overview/{grade}`
- `weeklyTrend: WeeklyTrendData | null` -- from `/evaluator/weekly-trend/{grade}`
- `loading: boolean`
- `error: string | null`

**Internal types:**
```ts
interface GradeOverview {
  grade_level: number;
  total_students: number;
  active_today: number;
  idle_students: number;
  avg_accuracy: number;
  pillar_accuracy: Record<string, number>;
  weak_pillars: string[];
  strong_pillars: string[];
  idle_student_list: { student_id: string; student_name: string; last_activity_date: string | null }[];
}
```

**Behavior:**
- Grade selector dropdown. Fetches grade data when a grade is selected.
- No grade selected: shows clickable grade overview cards (student count, avg accuracy, classroom count).
- Grade selected: shows:
  1. Stats row (4 cards): students, active today, idle, avg accuracy.
  2. Pillar accuracy bars with strong/weak badges.
  3. Weekly accuracy trend (bar chart).
  4. Idle students list with activity badges and links to student reports.
  5. Classrooms in grade list.

**Internal sub-components:**
- `AccuracyBar`, `WeeklyBars` (same pattern as AnalyticsOverview).
- `IdleBadge({ lastActivity })` -- renders "Never active", "Idle 3+ days", "Inactive", or "Active" badge.

**Used by:** `TabbedDashboard` (byGrade tab).

---

### AnalyticsByClass

**File:** `components/teacher/AnalyticsByClass.tsx`

**Props:**
```ts
interface Props {
  data: AnalyticsDashboardData;
  selectedGrade: number | null;
  selectedSection: string | null;
  onGradeChange: (grade: number | null) => void;
  onSectionChange: (section: string | null) => void;
}
```

**State:** None (fully controlled by parent).

**Behavior:**
- Two dropdowns: Select Grade, then Select Section (filtered by grade).
- Section dropdown is disabled until a grade is selected.
- When both are selected: shows section leaderboard (top student name, student count) and a placeholder "Activity feed coming soon".
- When no section selected: shows a prompt to select grade and section.

**Used by:** `TabbedDashboard` (byClass tab).

---

### AnalyticsByStudent

**File:** `components/teacher/AnalyticsByStudent.tsx`

**Props:**
```ts
interface Props {
  data: AnalyticsDashboardData;
  page: number;
  filters: { grade?: number; class?: string };
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: { grade?: number; class?: string }) => void;
}
```

**State:**
- `searchQuery: string`
- `liveStudents: StudentWithStats[]` -- from `/evaluator/students`
- `liveLoading: boolean`

**Internal types:**
```ts
interface StudentWithStats {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  avatar_url: string | null;
  classroom_id: string;
  classroom_name: string;
  grade_level: number;
  total_points: number;
  total_interactions: number;
  mission_accuracy_pct: number;
  active_this_week: boolean;
  last_activity_date?: string | null;
  current_streak?: number;
  pillar_accuracies?: Record<string, number>;
}
```

**Behavior:**
- `SearchBar` for name/roll number search.
- Two filter dropdowns: grade and class.
- Fetches live student data from `/evaluator/students` with grade and search params.
- Falls back to server-provided `data.studentTableData` while loading.
- Client-side filtering for class name.
- Renders a data table with columns: Name (with avatar and streak flame), Grade, Class, Accuracy (color badge), Points, Status (activity badge), Action (link to `/teacher/students/{id}/report`).
- Pagination: 10 items per page with prev/next buttons and page indicator.

**Internal sub-components:**
- `ActivityBadge({ activeThisWeek, lastActivity })` -- renders "Active" (green), "Inactive" (amber), or "Idle 3+ days" (red).

**Used by:** `TabbedDashboard` (byStudent tab).

---

## Filter and Search

### FilterBar

**File:** `components/teacher/FilterBar.tsx`

**Props:**
```ts
interface FilterBarProps {
  showSearch?: boolean;              // default true
  searchPlaceholder?: string;        // default "Search by name or roll number..."
  showPillar?: boolean;              // default true
  grades?: number[];                 // default [1, 2, 3, 4, 5]
}
```

**State:** None (reads/writes URL search params).

**Behavior:**
- URL-driven: reads `grade`, `pillar`, `search` from URL search params via `useSearchParams`.
- Updates URL on change via `router.push()` with `scroll: false`.
- Renders:
  - Search input (if `showSearch`): icon + text input.
  - Grade dropdown: "All Grades" + grade options.
  - Pillar dropdown (if `showPillar`): "All Skills", Reading, Writing, Listening, Speaking.

**Exported hook:**
```ts
function useFilterParams(): {
  gradeLevel: number | undefined;
  pillar: string | undefined;
  search: string | undefined;
}
```
Convenience hook for page components to read current filter values.

**Used by:** `TabbedDashboard`, various teacher pages.

---

### SearchBar

**File:** `components/teacher/SearchBar.tsx`

**Props:**
```ts
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;    // default "Search..."
}
```

**State:** None (controlled component).

**Behavior:**
- Simple text input with search icon on the left.
- Styled with rounded border, focus ring.

**Used by:** `AnalyticsByStudent`.

---

## Modals

### CreateClassroomModal

**File:** `components/teacher/CreateClassroomModal.tsx`

**Props:**
```ts
interface Props {
  onClose: () => void;
  onCreated: (classroom: Classroom) => void;
}
```

**State:**
- `section: string` -- default "A"
- `className: string` -- optional
- `gradeLevel: number` -- default 1
- `loading: boolean`
- `error: string | null`

**Behavior:**
- Form with grade selector (1-5), section selector (A-H), optional class name.
- If class name left empty, auto-generates as "Grade X - Section Y".
- Shows info note: "Each section can only exist once per grade."
- On submit: POSTs to `/classroom/` with Supabase auth token.
- Calls `onCreated` with the returned `Classroom` object on success.

**Used by:** Teacher classroom management page.

---

### BulkAddStudentsModal

**File:** `components/teacher/BulkAddStudentsModal.tsx`

**Props:**
```ts
interface Props {
  classroomId: string;
  onClose: () => void;
  onAdded: () => void;   // triggers parent roster re-fetch
}
```

**State:**
- `text: string` -- raw textarea content
- `loading: boolean`
- `error: string | null`
- `successMsg: string | null`

**Behavior:**
- Textarea for entering student names (comma or newline separated).
- Parses names by splitting on `[\n,]`, trimming, removing empties.
- POSTs to `/classroom/{id}/students/bulk` with `{ names }`.
- Shows success message with count. Does NOT auto-close; user clicks "Done".
- Calls `onAdded` after successful add (parent refetches roster).

**Used by:** Teacher classroom detail page.

---

### EditStudentModal

**File:** `components/teacher/EditStudentModal.tsx`

**Props:**
```ts
interface Props {
  student: Student;
  classroomId: string;
  onClose: () => void;
  onSaved: (updated: Student) => void;
}
```

**State:**
- `name: string`
- `rollNumber: string`
- `email: string`
- `saving: boolean`
- `error: string | null`

**Behavior:**
- Form with name, roll number, and email fields.
- PATCHes to `/classroom/{classroomId}/students/{studentId}` with changed fields.
- Save button disabled when name is empty or while saving.
- Calls `onSaved` with updated student on success.

**Used by:** Teacher classroom detail page.

---

### UploadBookModal

**File:** `components/teacher/UploadBookModal.tsx`

**Props:**
```ts
interface Props {
  gradeLevel: number;
  topics: SncTopic[];
  onClose: () => void;
  onSuccess: (result: UploadResult) => void;
}
```

**Internal types:**
```ts
interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
}
type UploadState = "idle" | "uploading" | "chunking" | "embedding" | "done";
```

**State:**
- `bookTitle: string`
- `selectedTopicId: number | null`
- `uploadState: UploadState`
- `error: string | null`

**Behavior:**
- Book title input (required).
- Optional topic tag dropdown (populated from `topics` prop).
- Click-to-browse file picker (PDF only).
- Progressive upload states: uploading -> chunking -> embedding -> done.
- POSTs FormData to `/curriculum/upload` with `file`, `grade_level`, `book_title`, optional `topic_id`.
- Close button disabled during upload.
- Calls `onSuccess` on completion.

**Used by:** Teacher topics/curriculum page.

---

## Upload

### FileUploadZone

**File:** `components/teacher/FileUploadZone.tsx`

**Props:**
```ts
interface FileUploadZoneProps {
  onSuccess: (result: UploadResult) => void;
}
```

**Internal types:**
```ts
interface UploadResult {
  status: string;
  total_chunks: number;
  embedded_count: number;
  sample_chunk: { content: string; metadata: Record<string, unknown> } | null;
}
type UploadState = "idle" | "uploading" | "chunking" | "embedding" | "done";
```

**State:**
- `isDragging: boolean`
- `uploadState: UploadState`
- `error: string | null`
- `gradeLevel: string` -- default "3"
- `bookTitle: string`

**Behavior:**
- Two form fields: grade level selector (1-6) and book title input.
- Drag-and-drop zone with click-to-browse fallback. PDF only.
- Validates: book title required, PDF extension required.
- Progressive state labels during upload (uploading -> chunking -> embedding).
- Uses raw `fetch` (not `apiFetch`) because FormData requires browser-set Content-Type.
- POSTs to `/curriculum/upload` with Supabase auth token.
- On success: resets book title, calls `onSuccess`.

**Used by:** Teacher curriculum hub page.

---

## Topic Management

### TopicSelectionBySkill

**File:** `components/teacher/TopicSelectionBySkill.tsx`

**Props:**
```ts
interface TopicSelectionBySkillProps {
  classroomId: string;
}
```

**Internal types:**
```ts
interface SncTopic {
  id: number;
  grade_level: number;
  skill: "listening" | "speaking" | "reading" | "writing";
  topic_name: string;
  is_globally_active: boolean;
}
interface SkillTopicsGroup {
  skill: "listening" | "speaking" | "reading" | "writing";
  topics: SncTopic[];
}
interface TopicsBySkillResponse {
  grade_level: number;
  skills: SkillTopicsGroup[];
}
```

**State:**
- `data: TopicsBySkillResponse | null`
- `selectedTopicIds: Set<number>`
- `loading: boolean`
- `saving: boolean`
- `saved: boolean`
- `error: string | null`

**Behavior:**
- Fetches topics grouped by LSRW skill from `/classroom/{id}/topics-by-skill`.
- Pre-selects all globally active topics.
- Topics organized by skill with color-coded headers (blue/green/purple/orange).
- Each topic is a toggle pill button. Globally inactive topics are dimmed and disabled.
- "Save Changes" button PUTs selected topic IDs to `/classroom/{id}/active-topics`.
- Shows selection counts per skill (e.g., "3/5 selected (2 disabled)").
- Loading state shows skeleton placeholders.

**Used by:** Teacher classroom detail page (topics section).
