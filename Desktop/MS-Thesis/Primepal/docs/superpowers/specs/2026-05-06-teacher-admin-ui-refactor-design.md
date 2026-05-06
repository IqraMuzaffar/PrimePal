# Teacher & Admin UI Refactor Design Spec

**Date:** 2026-05-06
**Status:** Approved
**Priority Pages:** Dashboard + Classrooms (Teacher), then Admin pages

---

## Problem

The current teacher and admin UI is functional but lacks the polish and visual consistency shown in the design files (`frontend/teacherdesigns/*.jsx`). The design files demonstrate a modern, professional interface with:

- Dark navy sidebar navigation with smooth interactions
- Gradient banners and accent colors
- Professional typography hierarchy
- Grade-specific color coding
- Polished stat cards, progress bars, and charts
- Consistent spacing and visual rhythm

The current implementation uses basic Tailwind styling that doesn't match this design vision. Additionally, the admin side has a separate dark theme that creates visual inconsistency.

## Goal

Refactor teacher and admin UI to exactly match the design files while:
1. **Preserving all existing functionality** - Pure visual refactor, no behavioral changes
2. **Unifying design language** - Same design system for teacher and admin
3. **Maintaining performance** - No new dependencies, use existing Geist fonts and Lucide icons
4. **Ensuring zero breakage** - All features, filters, data fetching, and navigation work identically

## Scope

### In Scope
- Teacher pages: Dashboard, Classrooms (priority), then others
- Admin pages: All pages (evaluations, staff, hierarchy, students, curriculum, export)
- Shared layout: Sidebar, TopBar, core components
- Visual styling only: colors, spacing, typography, component design

### Out of Scope
- Functional changes or feature additions
- Student UI (already redesigned recently)
- Backend/API changes
- New dependencies or libraries

## Design System Approach

**Selected Strategy:** Design System Lite (Approach C)

Create a minimal design system with tokens and core components, then refactor pages incrementally.

**Why this approach:**
- Design tokens prevent color/spacing drift
- Core components ensure consistency
- Balanced: not over-engineering, not under-engineering
- Easy to test components independently
- Scales well for future pages

---

## Architecture

### Design Tokens (`lib/design-tokens.ts`)

Centralized constants for colors, typography, spacing, and effects:

```typescript
export const designTokens = {
  colors: {
    // Brand
    primary: '#4361ee',
    primaryLight: '#7c9eff',
    primaryBg: '#e8eeff',

    // Grade colors (matching design files)
    grade: {
      1: '#4361ee',  // Blue
      2: '#10b981',  // Green
      3: '#f59e0b',  // Amber
      4: '#ef4444',  // Red
      5: '#8b5cf6',  // Purple
      6: '#ec4899',  // Pink
    },

    // Status colors
    success: '#059669',
    successBg: '#d1fae5',
    warning: '#d97706',
    warningBg: '#fef3c7',
    danger: '#dc2626',
    dangerBg: '#fee2e2',

    // Neutrals
    dark: '#0f1729',           // Sidebar background
    darkSecondary: '#1a2e6e',  // Gradient end
    slate: {
      50: '#f8f9fc',
      100: '#f4f5fb',
      200: '#eaedf5',
      300: '#e0e6f5',
      400: '#d1d5db',
      500: '#9ca3af',
      600: '#6b7280',
      700: '#4b5563',
      800: '#374151',
      900: '#1f2937',
    },
  },

  typography: {
    // Font families (existing Geist fonts)
    heading: 'var(--font-geist-sans)',  // Mimics Space Grotesk
    body: 'var(--font-geist-sans)',     // Mimics DM Sans

    // Weight mapping
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    // Size scale (matching design files)
    sizes: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '15px',
      xl: '18px',
      '2xl': '21px',
      '3xl': '26px',
    },
  },

  spacing: {
    card: '18px 20px',
    section: '22px 26px',
  },

  effects: {
    cardShadow: '0 1px 4px rgba(0,0,0,0.04)',
    hoverShadow: '0 6px 20px rgba(67,97,238,0.13)',
    darkShadow: '0 4px 20px rgba(15,23,41,0.22)',

    transition: {
      fast: '0.14s',
      base: '0.18s',
      slow: '0.22s cubic-bezier(.4,0,.2,1)',
    },

    borderRadius: {
      sm: '8px',
      base: '10px',
      md: '12px',
      lg: '14px',
      xl: '16px',
    },
  },
};
```

### Component Architecture

```
components/teacher/
├── design-system/              ← New: core design components
│   ├── Icon.tsx               - Styled Lucide wrapper
│   ├── Sidebar.tsx            - Dark navy collapsible sidebar
│   ├── TopBar.tsx             - White header with title/user
│   ├── StatCard.tsx           - Stat display with icon + trend
│   ├── ProgressBar.tsx        - Simple progress indicator
│   ├── LineChart.tsx          - SVG line chart for trends
│   └── index.ts               - Barrel export
├── dashboard/                  ← New: dashboard-specific
│   ├── WelcomeBanner.tsx      - Gradient welcome banner
│   ├── ClassroomCard.tsx      - Classroom summary card
│   ├── QuickAction.tsx        - Icon action button
│   └── index.ts
├── classrooms/                 ← New: classrooms-specific
│   ├── GradeCard.tsx          - Grade filter card
│   ├── StudentTable.tsx       - Student list table
│   └── index.ts
├── [existing components...]    - Keep all existing
```

---

## Layout System

### Sidebar Component (`components/teacher/design-system/Sidebar.tsx`)

Replaces `TeacherShell` with dark navy sidebar matching design files.

**Visual Features:**
- Background: `#0f1729` with subtle borders (`rgba(255,255,255,0.07)`)
- Width: 224px expanded, 64px collapsed
- Smooth transition: `0.22s cubic-bezier(.4,0,.2,1)`
- Logo area: "P" badge + "PrimePal" text (hidden when collapsed)
- Circular toggle button on right edge
- Icons: Lucide with `size={17}`, `strokeWidth={1.8}`

**Navigation Items (Keeping Current Structure):**
```typescript
// Teacher navigation
const NAV_LINKS = [
  { href: "/teacher/dashboard",  label: "Dashboard",       icon: LayoutDashboard },
  { href: "/teacher/classroom",  label: "Classrooms",      icon: School },
  { href: "/teacher/students",   label: "Students",        icon: GraduationCap },
  { href: "/teacher/missions",   label: "Missions",        icon: Zap },
  { href: "/teacher/curriculum", label: "Curriculum Hub",  icon: BookOpen },
  { href: "/teacher/topics",     label: "Topics",          icon: BookMarked },
  { href: "/teacher/reports",    label: "Reports",         icon: FileBarChart },
  { href: "/teacher/assistant",  label: "AI Assistant",    icon: Sparkles },
];

// Admin navigation
const ADMIN_NAV_LINKS = [
  { href: "/admin/dashboard",           label: "Evaluations",     icon: ClipboardCheck },
  { href: "/admin/dashboard/staff",     label: "Staff",           icon: Users },
  { href: "/admin/dashboard/hierarchy", label: "Hierarchy",       icon: Network },
  { href: "/admin/dashboard/students",  label: "Students",        icon: GraduationCap },
  { href: "/admin/dashboard/curriculum",label: "Curriculum",      icon: BookOpen },
  { href: "/admin/dashboard/export",    label: "Export",          icon: Download },
];
```

**Active State:**
- Background: `rgba(67,97,238,0.16)`
- Text color: `#a5b8ff`
- Left border: `3px solid #4361ee`
- Font weight: 600

**Bottom Section:**
- Settings button
- Logout button
- User profile (avatar + email + role)

**Functionality Preserved:**
- Same routing with Next.js Link
- Same active state detection
- Same auth/logout handlers
- Collapsible state stored in localStorage

### TopBar Component (`components/teacher/design-system/TopBar.tsx`)

White header bar above content.

**Visual Features:**
- Height: 64px
- Background: white
- Bottom border: `#e8eaf0`
- Left: Page title (bold, 18px) + date subtitle (11.5px, gray)
- Right: Bell icon with notification dot + user avatar

**Date Format:**
"Tuesday, 29 April 2026 · Term 2, Week 6"

**Functionality Preserved:**
- Dynamic page title based on route
- User info from auth context
- Notification bell click handler

### Layout Wrapper

Update `app/teacher/layout.tsx` and `app/admin/layout.tsx`:

```tsx
<div className="flex h-screen">
  <Sidebar
    active={currentPage}
    navItems={isAdmin ? ADMIN_NAV_LINKS : NAV_LINKS}
  />
  <div className="flex-1 flex flex-col overflow-hidden">
    <TopBar page={currentPage} />
    <main className="flex-1 overflow-auto bg-gray-50">
      {children}
    </main>
  </div>
</div>
```

---

## Core UI Components

### Icon (`components/teacher/design-system/Icon.tsx`)

Wrapper around Lucide icons for consistent styling.

**Interface:**
```typescript
interface IconProps {
  icon: LucideIcon;
  size?: number;          // Default: 18
  color?: string;         // Default: currentColor
  strokeWidth?: number;   // Default: 1.8
  className?: string;
}
```

**Usage:**
```tsx
<Icon icon={Users} size={17} strokeWidth={1.8} />
```

### StatCard (`components/teacher/design-system/StatCard.tsx`)

Display metric with icon, value, label, and optional trend.

**Interface:**
```typescript
interface StatCardProps {
  value: string | number;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: number;        // +3 or -2 for trend badge
}
```

**Visual Specs:**
- White background, rounded 14px
- Border: `#eaedf5`, shadow: `0 1px 4px rgba(0,0,0,0.04)`
- Icon badge: 40x40, rounded 11px, custom bg
- Value: 3xl, font-weight 800 (Geist Sans)
- Trend badge: green (positive) or red (negative), rounded-full

**Example:**
```tsx
<StatCard
  value="142"
  label="Total Students"
  subtitle="Across 6 classrooms"
  icon={Users}
  iconColor="#4361ee"
  iconBg="#e8eeff"
  trend={3}
/>
```

### ProgressBar (`components/teacher/design-system/ProgressBar.tsx`)

Simple progress indicator.

**Interface:**
```typescript
interface ProgressBarProps {
  value: number;      // 0-100
  color: string;
  height?: number;    // Default: 8px
  bgColor?: string;   // Default: #f0f2f8
}
```

**Visual:**
- Rounded-full
- Animated width transition
- Custom color for fill

### LineChart (`components/teacher/design-system/LineChart.tsx`)

SVG line chart for accuracy trends.

**Interface:**
```typescript
interface LineChartProps {
  labels: string[];           // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  datasets: Array<{
    values: number[];         // [82, 86, 88, 85, 91]
    color: string;
    label?: string;
  }>;
  height?: number;            // Default: 180px
}
```

**Implementation:**
- Pure SVG (no charting library)
- Multi-line support (up to 3 lines)
- Grid lines in background
- Smooth curves with SVG paths
- Legend below with color dots + labels

---

## Dashboard Page Refactor

### Target: `app/teacher/dashboard/page.tsx`

**Preserved Functionality:**
- All data fetching: `useTeacherClassrooms`, `useTeacherDashboardStats`, `useTeacherSkillAccuracy`
- FilterBar and filter logic
- All routing and navigation
- All click handlers and business logic

**Visual Changes:**

#### 1. Welcome Banner (`WelcomeBanner.tsx`)

Replace plain heading with gradient banner:

```tsx
<div className="bg-gradient-to-br from-[#0f1729] to-[#1a2e6e] rounded-2xl p-6 flex justify-between items-center shadow-xl">
  <div>
    <h1 className="text-2xl font-bold text-white">
      Good morning, {teacherName} 👋
    </h1>
    <p className="text-white/55 text-sm mt-1">
      {activeClasses} active classes · {pendingMissions} pending missions today
    </p>
  </div>
  <button className="bg-white/12 border border-white/20 text-white rounded-lg px-4 py-2.5">
    + New Mission
  </button>
</div>
```

**Data:**
- Teacher name from auth context
- Active classes and pending missions from `stats`

#### 2. Stats Grid

4-column grid with `StatCard` components:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    value={stats.total_students}
    label="Total Students"
    subtitle="Across all classrooms"
    icon={Users}
    iconColor="#4361ee"
    iconBg="#e8eeff"
    trend={3}
  />
  <StatCard
    value={stats.active_this_week}
    label="Active This Week"
    subtitle="69% attendance rate"
    icon={Activity}
    iconColor="#059669"
    iconBg="#d1fae5"
    trend={2}
  />
  <StatCard
    value={stats.live_missions}
    label="Live Missions"
    subtitle="Across all classes"
    icon={Target}
    iconColor="#d97706"
    iconBg="#fef3c7"
  />
  <StatCard
    value={`${stats.avg_accuracy}%`}
    label="Avg Accuracy"
    subtitle="↑ 4% from last week"
    icon={TrendingUp}
    iconColor="#7c3aed"
    iconBg="#ede9fe"
    trend={4}
  />
</div>
```

**Data Source:** `useTeacherDashboardStats` (existing)

#### 3. Main Content (Two-Column Layout)

**Left Column (main):**

```tsx
<div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-bold text-gray-900">Your Classrooms</h2>
    <button className="text-blue-600 text-sm font-semibold">
      Manage all →
    </button>
  </div>

  <div className="grid grid-cols-3 gap-3">
    {classrooms.map(classroom => (
      <ClassroomCard
        key={classroom.id}
        classroom={classroom}
        onView={() => navigate(`/teacher/classroom/${classroom.id}`)}
        onReports={() => navigate(`/teacher/reports?classroom=${classroom.id}`)}
      />
    ))}
  </div>

  <button className="w-full mt-3 border-2 border-dashed border-gray-300 rounded-lg py-2.5 text-gray-400 hover:border-blue-600 hover:text-blue-600">
    + Add New Classroom
  </button>
</div>
```

**ClassroomCard Component:**
- Colored top stripe (4px, grade color)
- Grade badge
- Subject and topic
- Student count + accuracy
- Two action buttons: "View Class", "Reports"
- Hover lift effect

**Right Column (sidebar - 290px):**

```tsx
{/* Quick Actions */}
<div className="bg-white rounded-2xl border border-gray-200 p-4">
  <h3 className="text-sm font-bold mb-3">Quick Actions</h3>
  <div className="grid grid-cols-4 gap-2">
    <QuickAction label="Add Student" icon={Users} color="#4361ee" bg="#e8eeff" />
    <QuickAction label="New Mission" icon={Target} color="#059669" bg="#d1fae5" />
    <QuickAction label="Upload Book" icon={BookOpen} color="#d97706" bg="#fef3c7" />
    <QuickAction label="Analytics" icon={BarChart3} color="#7c3aed" bg="#ede9fe" />
  </div>
</div>

{/* Announcements (if available) */}
{/* Pending Actions (optional) */}
```

#### 4. Bottom Row (Optional - Can Add Later)

Two cards side-by-side:
- Recent Activity feed
- This Week's Accuracy chart (`LineChart` component)

**Data Transformation:**
Transform `useTeacherSkillAccuracy` data into line chart format with daily accuracy trends.

---

## Classrooms Page Refactor

### Target: `app/teacher/classroom/page.tsx`

**Preserved Functionality:**
- Data fetching: `useTeacherClassrooms`
- Search and filter logic
- Classroom navigation
- Modal triggers (Add Student, Create Classroom)
- Export functionality

**Visual Changes:**

#### 1. Grade Cards Row (`GradeCard.tsx`)

Top section with 6 grade cards:

```tsx
<div className="grid grid-cols-6 gap-3 mb-6">
  {[1,2,3,4,5,6].map(grade => (
    <GradeCard
      key={grade}
      grade={`Grade ${grade}`}
      color={designTokens.colors.grade[grade]}
      subject={getSubjectForGrade(grade)}
      topic={getCurrentTopic(grade)}
      students={getStudentCount(grade)}
      accuracy={getAccuracy(grade)}
      isSelected={selectedGrade === grade}
      onClick={() => handleGradeSelect(grade)}
    />
  ))}
</div>
```

**GradeCard Visual:**
- Colored top stripe (4px)
- Grade badge with matching color
- Subject and topic text
- Student count
- Large accuracy percentage (colored: green/amber/red)
- Selected state: thicker border + shadow
- Hover effect: lift + shadow

**Behavior:**
- Click to filter students by grade
- Highlights selected grade
- Updates URL params (existing FilterBar integration)

#### 2. Student Table Card

Main content with header + table:

```tsx
<div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
  {/* Header */}
  <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
    <div>
      <h2 className="text-lg font-bold text-gray-900">
        {selectedGrade ? `${selectedGrade} — ${subject}` : 'All Students'}
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
      </p>
    </div>

    <div className="flex gap-2">
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <Search size={14} className="text-gray-400" />
        <input
          placeholder="Search by name or roll no."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-sm outline-none w-48"
        />
      </div>

      {/* Grade filter */}
      <select
        value={selectedGrade || 'all'}
        onChange={e => setSelectedGrade(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="all">All Grades</option>
        {[1,2,3,4,5,6].map(g => (
          <option key={g} value={g}>Grade {g}</option>
        ))}
      </select>

      <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">
        + Add Student
      </button>

      <button className="bg-gray-50 text-blue-600 border border-gray-200 rounded-lg px-4 py-2 text-sm font-semibold">
        Export
      </button>
    </div>
  </div>

  {/* Table */}
  <StudentTable students={filteredStudents} onStudentClick={handleStudentClick} />
</div>
```

**StudentTable Component:**

Columns: Student Name, Roll Number, Grade, Missions, Accuracy, Status

**Row Structure:**
```tsx
<div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_110px] gap-4 py-3 border-b">
  {/* Name with avatar */}
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
      {student.name[0]}
    </div>
    <span className="font-semibold text-gray-900">{student.name}</span>
  </div>

  {/* Roll Number */}
  <span className="text-gray-600 font-medium text-sm">{student.roll}</span>

  {/* Grade badge */}
  <span className="inline-flex">
    <span className="px-2 py-1 rounded-full text-xs font-bold"
      style={{
        backgroundColor: `${gradeColor}18`,
        color: gradeColor
      }}>
      {student.grade}
    </span>
  </span>

  {/* Missions */}
  <span className="text-gray-600">{student.missions}</span>

  {/* Accuracy (colored) */}
  <span className="font-extrabold text-sm" style={{ color: accuracyColor }}>
    {student.accuracy}%
  </span>

  {/* Status badge */}
  <span className="inline-flex">
    <span className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: statusBg,
        color: statusColor
      }}>
      {statusLabel}
    </span>
  </span>
</div>
```

**Status Logic:**
- Excellent (≥80%): green
- Good (65-79%): amber
- Needs Help (<65%): red

**Empty State:**
When `filteredStudents.length === 0`:
```tsx
<div className="text-center py-12">
  <div className="text-4xl mb-2">🔍</div>
  <div className="text-sm font-semibold text-gray-900">No students found</div>
  <div className="text-xs text-gray-500 mt-1">
    Try a different name, roll number, or grade
  </div>
</div>
```

---

## Admin Pages Application

### Strategy: Unified Design Language

Admin pages get the same visual treatment as teacher pages.

### Admin Layout (`app/admin/layout.tsx`)

**Changes:**
- Use same `Sidebar` component with admin nav items
- Use same `TopBar` component
- Remove all dark slate theme classes
- Replace with white/gray design system

**Theme Transformation:**
```typescript
// Remove:
- bg-slate-900, bg-slate-800
- text-slate-200, text-slate-400
- border-slate-700, border-slate-600

// Replace with:
+ bg-white, bg-gray-50
+ text-gray-900, text-gray-600
+ border-gray-200, border-gray-300
```

### Admin Dashboard (`app/admin/dashboard/page.tsx`)

**Visual Updates:**
- White card backgrounds (replace dark slate)
- Same border/shadow styling as teacher cards
- Form controls use design tokens
- Tables match teacher table styling
- Remove dark theme-specific styles

**Example Transformation:**
```tsx
// Before:
<div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm p-6">
  <h2 className="text-lg font-semibold text-slate-200 mb-4">
    Trigger Post-Test
  </h2>
  <select className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2">
    ...
  </select>
</div>

// After:
<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
  <h2 className="text-lg font-bold text-gray-900 mb-4">
    Trigger Post-Test
  </h2>
  <select className="bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2">
    ...
  </select>
</div>
```

**Preserved Functionality:**
- All admin queries: `useAdminClassrooms`, `useAdminEvalResults`, etc.
- Post-test trigger logic
- Evaluation results display
- All admin-specific business logic

### Admin Sub-Pages

**Staff, Hierarchy, Students, Curriculum, Export:**
- Apply same card styling
- Apply same table styling (if tables exist)
- Apply same form control styling
- Use design tokens throughout
- Keep all functionality identical

### Shared Components

Admin pages reuse:
- `Sidebar` (with admin nav items)
- `TopBar`
- `StatCard` (if stats exist)
- `ProgressBar`
- `LineChart`
- Table styling patterns from StudentTable

---

## Implementation Plan

### Phase 1: Foundation
1. Create `lib/design-tokens.ts` with all colors, typography, spacing, effects
2. Create `components/teacher/design-system/`:
   - `Icon.tsx`
   - `Sidebar.tsx`
   - `TopBar.tsx`
   - `StatCard.tsx`
   - `ProgressBar.tsx`
   - `LineChart.tsx`
3. Export all from `index.ts`

### Phase 2: Teacher Dashboard
4. Create `components/teacher/dashboard/`:
   - `WelcomeBanner.tsx`
   - `ClassroomCard.tsx`
   - `QuickAction.tsx`
5. Refactor `app/teacher/dashboard/page.tsx`:
   - Replace heading with WelcomeBanner
   - Replace stat cards with StatCard components
   - Rebuild classrooms grid with ClassroomCard
   - Add quick actions panel
   - Optional: Add line chart for trends
6. Update `app/teacher/layout.tsx`:
   - Replace TeacherShell with Sidebar + TopBar layout
   - Test navigation still works

### Phase 3: Teacher Classrooms
7. Create `components/teacher/classrooms/`:
   - `GradeCard.tsx`
   - `StudentTable.tsx`
8. Refactor `app/teacher/classroom/page.tsx`:
   - Add grade cards row at top
   - Rebuild student table with new styling
   - Ensure search/filter still works

### Phase 4: Admin Pages
9. Update `app/admin/layout.tsx`:
   - Use Sidebar with admin nav items
   - Use TopBar
   - Remove dark theme
10. Refactor `app/admin/dashboard/page.tsx`:
    - Replace dark card styles with white
    - Apply design tokens
    - Ensure post-test trigger works
11. Refactor admin sub-pages:
    - `staff/page.tsx`
    - `hierarchy/page.tsx`
    - `students/page.tsx`
    - `curriculum/page.tsx`
    - `export/page.tsx`
    - Apply same white/gray styling throughout

### Phase 5: Polish & Testing
12. Responsive adjustments:
    - Mobile breakpoints (sidebar drawer on mobile)
    - Tablet view
    - Collapsible sidebar on small screens
13. Testing (see Testing section below)

---

## Testing Strategy

### Smoke Test (What I'll Test)

**Teacher Side:**
- ✅ Login with valid credentials
- ✅ Dashboard loads with stats from API
- ✅ Classrooms page loads with grade cards
- ✅ Student table displays data
- ✅ Search input filters students
- ✅ Grade filter updates results
- ✅ Navigation between all pages works
- ✅ Sidebar collapse/expand works
- ✅ No console errors or warnings
- ✅ No visual breaks (overlapping, missing styles, broken layouts)

**Admin Side:**
- ✅ Admin login works
- ✅ Dashboard loads with evaluation data
- ✅ Post-test trigger form displays correctly
- ✅ Navigation between admin pages works
- ✅ Tables render without errors
- ✅ No console errors

**Student Side (Regression Check):**
- ✅ Student login flow works (class code → avatar → PIN)
- ✅ Home dashboard loads with stats
- ✅ Mission selection works (4 pillars visible)
- ✅ At least one mission gameplay works (reading mission)
- ✅ No visual regressions from layout changes

**API Endpoints (Spot Check):**
- ✅ `GET /teacher/dashboard/stats` returns data
- ✅ `GET /teacher/classrooms` returns classrooms list
- ✅ `GET /student/missions` returns missions
- ✅ `GET /admin/evaluations` returns evaluation results

### Test Summary Format

After smoke testing, I will provide:

```
✅ TESTED & WORKING:
- [List of verified features]
- [API endpoints responding correctly]
- [Key user flows working]

⚠️ YOU SHOULD TEST (Comprehensive):
- [Detailed feature list]
- [Edge cases]
- [Modal interactions]
- [Form submissions]

🐛 KNOWN ISSUES (if any):
- [Any minor issues with suggested fixes]
```

### User Testing Checklist

**Teacher Side - Detailed:**
- [ ] All FilterBar combinations (grade + pillar + section filters)
- [ ] Create new classroom via modal
- [ ] Bulk add students modal (paste names)
- [ ] Edit student modal (update name, roll, email)
- [ ] File upload (curriculum PDF)
- [ ] Reports generation and PDF export
- [ ] AI Assistant page and interactions
- [ ] Topics selection for classrooms
- [ ] Analytics page (if exists - all tabs)
- [ ] Missions monitoring page
- [ ] Settings modal
- [ ] Logout and login cycle

**Admin Side - Detailed:**
- [ ] Post-test trigger - global scope
- [ ] Post-test trigger - grade scope
- [ ] Post-test trigger - classroom scope
- [ ] Staff management (view, add, edit, delete)
- [ ] Hierarchy view
- [ ] Student management (admin view)
- [ ] Curriculum management
- [ ] Export functionality (all export types)

**Student Side - Detailed:**
- [ ] All 4 pillar missions (Reading, Writing, Listening, Speaking)
- [ ] Daily mission
- [ ] Story time feature
- [ ] Spelling bee feature
- [ ] Chat interface (bilingual streaming)
- [ ] Achievements page and popups
- [ ] Leaderboard display
- [ ] Evaluation (pre-test and post-test)
- [ ] Offline mode and answer queue sync

**Cross-Browser/Device:**
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Mobile Safari (iOS)
- [ ] Chrome (Android)
- [ ] Tablet view (iPad/Android tablet)

**Performance:**
- [ ] Page load times similar to before
- [ ] No new console warnings/errors
- [ ] Images/assets load properly
- [ ] Animations smooth (no jank)

---

## Key Constraints

### Must Preserve
- All existing functionality
- All API integrations and data fetching
- All routing and navigation
- All authentication and authorization
- All form handlers and business logic
- All modal interactions
- All filter/search behavior

### Visual Changes Only
- Component structure and styling
- Layout and spacing
- Colors and typography
- Borders, shadows, and effects
- Hover and transition states

### No New Dependencies
- Use existing Geist fonts (mimic Space Grotesk/DM Sans weights)
- Use existing Lucide icons (adjust styling only)
- Pure SVG for charts (no charting library)
- Tailwind CSS for all styling

---

## Success Criteria

1. **Visual Match**: Teacher dashboard and classrooms match design files exactly
2. **Unified Design**: Admin pages use same design language as teacher pages
3. **Zero Breakage**: All existing features work identically to before
4. **Performance**: No degradation in load times or responsiveness
5. **Clean Code**: Reusable components with clear interfaces
6. **Tested**: All smoke tests pass, user testing checklist completed
7. **Documented**: Test summary provided to user with clear testing instructions

---

## Notes

- Design files are in `frontend/teacherdesigns/*.jsx` (React prototypes)
- Current implementation uses Next.js 14 App Router + TypeScript
- Student side was recently redesigned (commit b1c94ecd) - do not touch
- Recent commits show dashboard filter improvements (cascading filters work)
- Sidebar must support collapsible state (localStorage persistence)
- Mobile responsive behavior required (drawer/overlay on mobile)
- All Lucide icons should use `strokeWidth={1.8}` to match design fidelity

---

## Appendix: Color Reference

### Grade Colors
- Grade 1: `#4361ee` (Blue)
- Grade 2: `#10b981` (Green)
- Grade 3: `#f59e0b` (Amber)
- Grade 4: `#ef4444` (Red)
- Grade 5: `#8b5cf6` (Purple)
- Grade 6: `#ec4899` (Pink)

### Status Colors
- Excellent (≥80%): `#059669` (Green), background `#d1fae5`
- Good (65-79%): `#d97706` (Amber), background `#fef3c7`
- Needs Help (<65%): `#dc2626` (Red), background `#fee2e2`

### UI Colors
- Primary: `#4361ee`
- Primary Light: `#7c9eff`
- Primary Background: `#e8eeff`
- Dark Sidebar: `#0f1729`
- Dark Gradient End: `#1a2e6e`

### Neutrals
- White: `#ffffff`
- Gray 50: `#f8f9fc`
- Gray 100: `#f4f5fb`
- Gray 200: `#eaedf5`
- Gray 600: `#6b7280`
- Gray 900: `#1f2937`
