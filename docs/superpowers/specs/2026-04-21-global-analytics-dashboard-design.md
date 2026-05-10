# Global Analytics Dashboard Design

**Date:** 2026-04-21
**Feature:** Tabbed Analytics Dashboard for Teacher Portal
**Approach:** Option C (Smart Hybrid — Summaries + Top N + Pagination)

---

## Overview

A modern, polished SaaS-style tabbed analytics interface that rolls up all classrooms into a single unified dashboard. Teachers see system-wide insights immediately, with ability to drill into grades, classes, and individual students.

**Key Pattern:** Server Component fetches smart hybrid data payload upfront (summaries, top performers, paginated student list). Client Component handles tab state, filtering, and pagination instantly with zero additional network calls for common workflows.

---

## Architecture

### Data Layer (Server Component)

**File:** `frontend/app/teacher/analytics/page.tsx`
**Type:** Server Component (async)

**Responsibilities:**
- Fetch teacher's classrooms from Supabase
- Aggregate student interactions and accuracy across classrooms
- Generate summaries: total students, avg accuracy, total interactions
- Extract weak points per grade (most-failing topics)
- Fetch top 5 students by accuracy (system-wide)
- Fetch paginated student table data (first 50 students, sorted by points descending)
- Fetch section previews (top student per section, student count)

**Data Passed to Client:**

```typescript
interface AnalyticsDashboardData {
  // Summary stats displayed in Overview
  summaryStats: {
    totalInteractions: number;
    totalStudents: number;
    avgAccuracy: number;
    activeClassrooms: number;
  };

  // Classroom list with rollups (used in grade/class dropdowns)
  classrooms: Array<{
    id: string;
    name: string;
    grade: number;
    studentCount: number;
    avgAccuracy: number;
  }>;

  // Top performers (Overview tab card)
  topStudents: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    grade: number;
    accuracy: number;
    totalPoints: number;
  }>;

  // Weak points per grade (By Grade tab dropdown info)
  weakPointsByGrade: {
    [grade: number]: string[]; // e.g., { 3: ["Verbs", "Adjectives"], 4: [...] }
  };

  // Student data table (paginated)
  studentTableData: {
    items: Array<{
      id: string;
      name: string;
      rollNumber: string;
      grade: number;
      className: string;
      classId: string;
      accuracy: number;
      totalPoints: number;
      avatarUrl: string | null;
    }>;
    totalCount: number; // For pagination controls
    pageSize: number;   // 50
    currentPage: number; // 1 (initial)
  };

  // Section rollups for By Class tab
  sections: Array<{
    grade: number;
    section: string; // "A", "B", "C"
    sectionId: string;
    studentCount: number;
    topStudentName: string;
    topStudentAccuracy: number;
  }>;
}
```

---

## Component Structure (Client Side)

### 1. **TabbedDashboard Component** (Main Client Component)
**File:** `frontend/components/teacher/TabbedDashboard.tsx`

**Props:** Receives `AnalyticsDashboardData`

**State:**
- `activeTab: "overview" | "byGrade" | "byClass" | "byStudent"`
- `selectedGrade: number | null` (for By Grade tab)
- `selectedGradeForClass: number | null` (for By Class tab, dropdown 1)
- `selectedSection: string | null` (for By Class tab, dropdown 2)
- `studentTablePage: number` (pagination for By Student tab)
- `studentTableFilters: { grade?: number; class?: string }` (table filters)

**UI:**
- Sticky header with "Global Analytics" title
- Tab navigation (4 tabs with Framer Motion animated underline)
- Content area (renders active tab component)

**Tab Navigation (Custom Component):**
- 4 tabs: Overview, By Grade, By Class, By Student
- Framer Motion `layoutId="activeTab"` for smooth animated underline
- Clicking tab updates `activeTab` state

---

### 2. **Overview Tab Component**
**File:** `frontend/components/teacher/AnalyticsOverview.tsx`

**Layout:**
1. **Summary Stats Grid** (4 cards, top of tab)
   - Total Interactions (icon: Activity)
   - System-wide Avg Accuracy (icon: Target)
   - Active Classrooms (icon: Building)
   - Top Performing Grade (icon: TrendingUp)

2. **Top Performers Card**
   - Title: "Top 5 Students"
   - List of top 5 students with avatar, name, grade, accuracy badge
   - Icon: Trophy
   - Soft background tint (e.g., amber-50)

3. **Grade Comparison** (Visual bars)
   - Title: "Average Accuracy by Grade"
   - Horizontal bar chart (Tailwind flex bars as mock chart)
   - Shows Grade 1, Grade 2, Grade 3, Grade 4, Grade 5 with avg accuracy
   - Color bars: green (70%+), yellow (40-69%), red (<40%)
   - Labels with percentages

---

### 3. **By Grade Tab Component**
**File:** `frontend/components/teacher/AnalyticsByGrade.tsx`

**Layout:**
1. **Grade Selector Dropdown**
   - Populated from `classrooms` data, extracted unique grades
   - Default: "Select a Grade"
   - onChange updates parent state `selectedGrade`

2. **When a grade is selected, show:**
   - Grade-level stats card (student count, avg accuracy, total interactions)
   - **Weak Points section** — displays `weakPointsByGrade[selectedGrade]`
     - Title: "Common Struggling Topics"
     - Bulleted list with icons (e.g., 📖 for vocab, 📊 for grammar)
   - **Classrooms in this grade** — shows all classrooms filtered to this grade
     - Mini cards: classroom name, student count, avg accuracy

---

### 4. **By Class Tab Component**
**File:** `frontend/components/teacher/AnalyticsByClass.tsx`

**Layout:**
1. **Dependent Dropdowns:**
   - Dropdown 1: "Select Grade" (from unique grades in classrooms)
   - Dropdown 2: "Select Section" (populated by filtering sections to selected grade)
   - Both update parent state

2. **When a section is selected, show:**
   - **Leaderboard Card**
     - Title: "[Section Name] — Top 5 Students"
     - Table/list: Rank, Avatar, Name, Accuracy, Total Points
     - Color-coded badges (🥇 🥈 🥉 for top 3)

   - **Recent Activity Feed**
     - Title: "[Section Name] — Recent Interactions"
     - Mock list of recent student actions (stub for now)
     - Each item: Student avatar, action, timestamp, accuracy improvement

---

### 5. **By Student Tab Component**
**File:** `frontend/components/teacher/AnalyticsByStudent.tsx`

**Layout:**
1. **Filter Bar (sticky at top)**
   - Dropdown: "Filter by Grade" (includes "All Grades")
   - Dropdown: "Filter by Class" (includes "All Classes")
   - These update `studentTableFilters` state
   - Filtered list updates in real-time

2. **Data Table**
   - Columns: Avatar | Name | Roll Number | Grade | Class | Accuracy % | Total Points | Actions
   - Rows: Each student from `studentTableData`, filtered by selected filters
   - Avatar: Image or initials badge
   - Accuracy: Color-coded badge (green 70%+, yellow, red)
   - Actions: Button "View Report" (stub, can open a modal later)

3. **Pagination Controls**
   - Shows: "Showing X–Y of Z students"
   - Prev/Next buttons
   - Current page indicator
   - onChange fetches next page data (requires client-side fetch hook)

---

## Styling & Animation

**Color Palette:**
- Primary: Indigo-600 (accents, focus states, badges)
- Backgrounds: Gray-50 (page), white (cards)
- Text: Gray-900 (primary), Gray-600 (secondary), Gray-400 (tertiary)
- Status: Green-100/700 (high accuracy), Yellow-100/700 (medium), Red-100/700 (low)

**Typography:**
- Page title: 3xl font-bold
- Section titles: lg font-semibold
- Labels: sm font-medium uppercase tracking-wide
- Card stats: 2xl font-bold numbers, xs uppercase labels

**Animations (Framer Motion):**
- Tab underline: `layoutId="activeTab"`, `transition={{ duration: 0.3 }}`
- Card entrance: fade + slight scale (if needed)
- Skeleton loaders for pagination (optional)

**Icons (Lucide React):**
- Activity (interactions)
- Target (accuracy)
- Building (classrooms)
- TrendingUp (top performing)
- Trophy (top students)
- ChevronDown (dropdowns)
- ArrowRight (actions)
- Zap (energy/engagement)

---

## Data Fetching & Caching

**Server Component (`page.tsx`):**
- Calls `getTeacherHeaders()` to get auth headers
- Fetches `/classroom` to get teacher's classrooms
- For each classroom, calls `/evaluator/report/classroom/{id}` to get student interactions
- Aggregates data locally in Server Component
- No caching specified yet (can add `revalidate: 3600` for 1-hour revalidation)

**Client Component:**
- Receives data prop, renders immediately
- **Pagination:** When user clicks "Next page", Client Component calls `/api/v1/analytics/students?page=2` (endpoint needs implementation)
- No polling or refetch logic needed for initial load

---

## Error Handling

1. **Server-side fetch failures:**
   - If `/classroom` fails → show empty state "No classrooms yet"
   - If individual classroom report fails → show that classroom as "No data available"

2. **Client-side pagination:**
   - If pagination fetch fails → show error toast + disable pagination button
   - Retry button to refetch current page

---

## Testing Strategy

1. **Mock data for development:** Use realistic student/classroom data in mock component
2. **Integration tests:** Verify Server Component correctly aggregates data from Supabase
3. **Component tests:** Tab switching, filter updates, pagination controls work
4. **E2E:** Teacher can switch tabs, select grade/class, paginate student table

---

## Success Criteria

- ✅ Page loads in <1s with initial payload (Overview tab visible immediately)
- ✅ Tab switching is instant (no flicker, smooth animation)
- ✅ Filter dropdowns update results instantly (client-side)
- ✅ Pagination loads next page in <500ms
- ✅ All 4 tabs render correctly with mock and real data
- ✅ Mobile-responsive (grid cols adjust to 1 on mobile)
- ✅ Matches SaaS design standard (polished, professional, modern)

---

## Future Enhancements (Out of Scope)

- Export analytics as PDF
- Custom date range filtering
- Drill into individual student reports (already exists, can link)
- Real-time dashboard refresh (WebSocket)
- Advanced analytics (trends over time, cohort comparisons)
