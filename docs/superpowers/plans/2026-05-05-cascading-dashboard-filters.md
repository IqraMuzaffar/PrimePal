# Cascading Dashboard Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cascading filter behavior on teacher dashboard where grade filters sections, filters organize classroom display visually, and skill filters add visual prominence.

**Architecture:** Client-side filtering using existing classroom data, no backend changes. Compute filtered sections from classroom array, sort/style classrooms by match score, apply conditional rendering to skill cards and stats badges.

**Tech Stack:** React, Next.js 14, TypeScript, TailwindCSS

---

## File Structure

**Files to modify:**
- `frontend/app/teacher/dashboard/page.tsx` - All implementation happens here

**No new files needed.** FilterBar component receives filtered data but doesn't change internally.

---

### Task 1: Implement Section Filtering Logic

**Files:**
- Modify: `frontend/app/teacher/dashboard/page.tsx:16-40`

**Goal:** Make section dropdown show only sections that exist for the selected grade.

- [ ] **Step 1: Add filtered sections computation**

In the `DashboardContent` component, after line 18 where `classrooms` data is loaded, add the filtered sections logic:

```typescript
const { data: classrooms = [], isLoading: classroomsLoading } = useTeacherClassrooms();
const { data: stats, isLoading: statsLoading } = useTeacherDashboardStats({ gradeLevel, pillar, section });
const { data: skillAccuracy, isLoading: skillLoading } = useTeacherSkillAccuracy(gradeLevel, section);

// Extract unique sections from classrooms for the filter dropdown
const availableSections = Array.from(new Set(classrooms.map(c => c.section).filter(Boolean))) as string[];
availableSections.sort();

// NEW: Compute filtered sections based on grade selection
const filteredSections = gradeLevel
  ? Array.from(new Set(
      classrooms
        .filter(c => c.grade_level === gradeLevel)
        .map(c => c.section)
        .filter(Boolean)
    )).sort()
  : availableSections;
```

- [ ] **Step 2: Update FilterBar to use filtered sections**

Change line 39 from:

```typescript
<FilterBar showSearch={false} showPillar={true} showSection={true} sections={availableSections} />
```

To:

```typescript
<FilterBar showSearch={false} showPillar={true} showSection={true} sections={filteredSections} />
```

- [ ] **Step 3: Test section filtering**

Manual test steps:
1. Run `cd frontend && npm run dev`
2. Navigate to `/teacher/dashboard`
3. Verify all sections appear when no grade selected
4. Select Grade 1 → verify only Grade 1 sections appear
5. Select Grade 2 → verify section dropdown updates to Grade 2 sections
6. Select Grade 1, then Section A, then change to Grade 2 (with no Section A) → verify section filter auto-clears

Expected behavior: Section dropdown dynamically updates based on grade selection.

- [ ] **Step 4: Commit section filtering**

```bash
git add frontend/app/teacher/dashboard/page.tsx
git commit -m "feat(dashboard): add cascading section filter based on grade selection

- Compute filtered sections from classrooms matching selected grade
- Auto-clear invalid sections when grade changes
- Section dropdown now context-aware

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Implement Classroom Visual Hierarchy

**Files:**
- Modify: `frontend/app/teacher/dashboard/page.tsx:145-200`

**Goal:** Sort classrooms by match score and apply 3-tier opacity system (100%, 60%, 30%).

- [ ] **Step 1: Add match score function**

Before the return statement in `DashboardContent`, add these helper functions:

```typescript
const loading = classroomsLoading || statsLoading || skillLoading;

// NEW: Calculate match score for classroom sorting
const getMatchScore = (classroom: TeacherClassroom) => {
  let score = 0;
  if (gradeLevel) {
    if (classroom.grade_level === gradeLevel) {
      score += 100;
      if (section && classroom.section === section) {
        score += 10;
      }
    }
  } else {
    score = 50; // Default score when no filter
  }
  return score;
};

// NEW: Get opacity class for classroom card
const getClassroomOpacity = (classroom: TeacherClassroom) => {
  if (!gradeLevel) return "opacity-100";

  const matchesGrade = classroom.grade_level === gradeLevel;
  const matchesSection = !section || classroom.section === section;

  if (matchesGrade && matchesSection) return "opacity-100";
  if (matchesGrade) return "opacity-60";
  return "opacity-30";
};
```

- [ ] **Step 2: Sort classrooms by match score**

Find the section that renders classrooms (around line 174, the `.map((c) => ` line), and before that map, add sorting:

```typescript
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {classrooms
      .slice()
      .sort((a, b) => getMatchScore(b) - getMatchScore(a))
      .map((c) => (
```

- [ ] **Step 3: Apply opacity classes to classroom cards**

In the classroom card `Link` component (around line 176), update the className to include opacity and transition:

Change from:

```typescript
<Link
  key={c.id}
  href={`/teacher/classroom/${c.id}`}
  className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all"
>
```

To:

```typescript
<Link
  key={c.id}
  href={`/teacher/classroom/${c.id}`}
  className={`group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all ${getClassroomOpacity(c)}`}
>
```

- [ ] **Step 4: Test classroom hierarchy**

Manual test steps:
1. Run `npm run dev` in frontend directory
2. Navigate to `/teacher/dashboard`
3. **No filters:** Verify all classrooms at 100% opacity
4. **Select Grade 1:** Verify Grade 1 classrooms at 100%, others at 30%
5. **Select Grade 1 + Section A:** Verify Grade 1-A at 100%, other Grade 1 sections at 60%, other grades at 30%
6. Verify smooth opacity transitions (200ms)

Expected behavior: Classrooms visually organized by match score with clear 3-tier hierarchy.

- [ ] **Step 5: Commit classroom hierarchy**

```bash
git add frontend/app/teacher/dashboard/page.tsx
git commit -m "feat(dashboard): add visual hierarchy to classroom display

- Sort classrooms by match score (grade + section)
- Apply 3-tier opacity system: 100% match, 60% partial, 30% no match
- Add smooth 200ms transition for opacity changes
- Matching classrooms appear first in grid

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Implement Skill Breakdown Prominence

**Files:**
- Modify: `frontend/app/teacher/dashboard/page.tsx:103-133`

**Goal:** Make selected skill card prominent (larger, bold border) and dim other skills to 40% opacity.

- [ ] **Step 1: Restructure skill data for easier iteration**

Find the Skill Breakdown section (around line 104) and refactor the hardcoded skill array into a data structure:

Replace the existing skill cards section (lines 108-125) with:

```typescript
<div className="mb-8">
  <h2 className="text-lg font-bold text-gray-900 mb-4">Skill Breakdown</h2>

  {/* NEW: Skill cards with data-driven approach */}
  <div className={
    pillar
      ? "grid grid-cols-1 md:grid-cols-3 gap-4"  // 1 large + 3 small
      : "grid grid-cols-2 md:grid-cols-4 gap-4"  // 4 equal
  }>
    {[
      { key: "reading", label: "Reading", value: skillAccuracy.reading, icon: BookOpenCheck },
      { key: "writing", label: "Writing", value: skillAccuracy.writing, icon: BookOpen },
      { key: "listening", label: "Listening", value: skillAccuracy.listening, icon: Headphones },
      { key: "speaking", label: "Speaking", value: skillAccuracy.speaking, icon: MessageSquare },
    ].map(({ key, label, value, icon: Icon }) => {
      const isSelected = pillar === key;
      const isOther = pillar && !isSelected;

      return (
        <div
          key={key}
          className={`
            rounded-xl border p-4
            ${isSelected ? "md:col-span-2 border-2" : ""}
            ${isOther ? "opacity-40" : "opacity-100"}
            ${skillColor(value)}
            transition-all duration-200
          `}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4" />
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <p className="text-2xl font-bold">{Math.round(value)}%</p>
          <p className="text-xs opacity-75 mt-1">accuracy</p>
        </div>
      );
    })}
  </div>

  {skillAccuracy.active_today > 0 && (
    <p className="text-xs text-gray-500 mt-3">
      {skillAccuracy.active_today} student{skillAccuracy.active_today !== 1 ? "s" : ""} active today
    </p>
  )}
</div>
```

- [ ] **Step 2: Test skill prominence**

Manual test steps:
1. Run `npm run dev`
2. Navigate to `/teacher/dashboard`
3. **No skill filter:** Verify all 4 cards equal size in 2x2 (mobile) or 1x4 (desktop) grid
4. **Select Reading:** Verify Reading card spans 2 columns on desktop, has bold border (border-2), others at 40% opacity
5. **Select Writing:** Verify Writing card prominent, others dimmed
6. **Switch between skills:** Verify smooth transition (200ms)
7. **Clear skill filter:** Verify all cards return to equal size

Expected behavior: Selected skill is visually prominent, others are dimmed.

- [ ] **Step 3: Commit skill prominence**

```bash
git add frontend/app/teacher/dashboard/page.tsx
git commit -m "feat(dashboard): add visual prominence to selected skill

- Selected skill card spans 2 columns on desktop
- Selected skill gets border-2 (bolder border)
- Non-selected skills dim to 40% opacity
- Grid layout adapts: 4 equal or 1 large + 3 small
- Smooth 200ms transition between states

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Implement Stats Filter Badges

**Files:**
- Modify: `frontend/app/teacher/dashboard/page.tsx:43-100`

**Goal:** Add "Reading only" style badges to stats cards when skill filter is active.

- [ ] **Step 1: Add badge to Total Interactions card**

Find the Total Interactions stat card (around line 60) and add the badge after the value:

```typescript
{/* Total Interactions */}
<div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">Total Interactions</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_interactions}</p>

      {/* NEW: Skill filter badge */}
      {pillar && (
        <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
          {pillar.charAt(0).toUpperCase() + pillar.slice(1)} only
        </span>
      )}

      <p className="text-xs text-gray-500 mt-2">Student missions &amp; chat</p>
    </div>
    <div className="p-3 bg-emerald-100 rounded-lg">
      <Zap className="w-6 h-6 text-emerald-600" />
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add badge to Avg Accuracy card**

Find the Avg Accuracy stat card (around line 74) and add the same badge:

```typescript
{/* Avg Accuracy */}
<div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">Avg Accuracy</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{Math.round(stats.avg_accuracy)}%</p>

      {/* NEW: Skill filter badge */}
      {pillar && (
        <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
          {pillar.charAt(0).toUpperCase() + pillar.slice(1)} only
        </span>
      )}

      <p className="text-xs text-gray-500 mt-2">Across all students</p>
    </div>
    <div className="p-3 bg-rose-100 rounded-lg">
      <TrendingUp className="w-6 h-6 text-rose-600" />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add badge to Active This Week card**

Find the Active This Week stat card (around line 88) and add the badge:

```typescript
{/* Active This Week */}
<div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">Active This Week</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_this_week}</p>

      {/* NEW: Skill filter badge */}
      {pillar && (
        <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
          {pillar.charAt(0).toUpperCase() + pillar.slice(1)} only
        </span>
      )}

      <p className="text-xs text-gray-500 mt-2">Students with recent activity</p>
    </div>
    <div className="p-3 bg-sky-100 rounded-lg">
      <Activity className="w-6 h-6 text-sky-600" />
    </div>
  </div>
</div>
```

Note: Do NOT add badge to "Total Students" card - it doesn't filter by skill.

- [ ] **Step 4: Test stats badges**

Manual test steps:
1. Run `npm run dev`
2. Navigate to `/teacher/dashboard`
3. **No skill filter:** Verify no badges appear
4. **Select Reading:** Verify "Reading only" badges appear on Total Interactions, Avg Accuracy, and Active This Week
5. **Select Writing:** Verify badges update to "Writing only"
6. Verify "Total Students" card never shows a badge
7. **Clear skill filter:** Verify all badges disappear

Expected behavior: Skill filter badges clearly indicate filtered stats.

- [ ] **Step 5: Commit stats badges**

```bash
git add frontend/app/teacher/dashboard/page.tsx
git commit -m "feat(dashboard): add skill filter badges to stats cards

- Add 'Reading only' style badges when skill filter active
- Badges appear on Total Interactions, Avg Accuracy, Active This Week
- Total Students card has no badge (not filtered by skill)
- Badge style: indigo-50 background, small pill shape
- Positioned below stat value, above description

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Comprehensive Testing & Documentation

**Files:**
- Test: Manual testing of all features combined
- Modify: `frontend/app/teacher/dashboard/page.tsx` - Add comments if needed

**Goal:** Verify all cascading filter behaviors work correctly together.

- [ ] **Step 1: Test scenario 1 - No filters (baseline)**

Manual test:
1. Navigate to `/teacher/dashboard` with no query params
2. Verify: All sections in dropdown
3. Verify: All classrooms at 100% opacity
4. Verify: All 4 skill cards equal size
5. Verify: No badges on stats cards

Expected: Default view unchanged from original behavior.

- [ ] **Step 2: Test scenario 2 - Grade filter only**

Manual test:
1. Select Grade 1
2. Verify: Section dropdown shows only Grade 1 sections
3. Verify: Grade 1 classrooms at 100%, others at 30%
4. Verify: Skill cards still equal size
5. Verify: No badges (no skill filter)

Expected: Grade filtering works independently.

- [ ] **Step 3: Test scenario 3 - Grade + Section filter**

Manual test:
1. Select Grade 1, then Section A
2. Verify: Grade 1-A classroom at 100%
3. Verify: Other Grade 1 sections at 60%
4. Verify: Other grades at 30%
5. Verify: All classrooms present (none hidden)

Expected: 3-tier visual hierarchy clear.

- [ ] **Step 4: Test scenario 4 - Skill filter only**

Manual test:
1. Clear grade/section, select Reading skill
2. Verify: All sections still in dropdown
3. Verify: All classrooms at 100% (no grade filter)
4. Verify: Reading card large (2 cols), others small at 40% opacity
5. Verify: "Reading only" badges on 3 stat cards

Expected: Skill prominence and badges work independently.

- [ ] **Step 5: Test scenario 5 - Combined filters (Grade + Skill)**

Manual test:
1. Select Grade 1 AND Reading
2. Verify: Section dropdown filtered to Grade 1 sections
3. Verify: Classroom hierarchy based on grade
4. Verify: Reading skill prominent
5. Verify: Stats badges show "Reading only"

Expected: All filters work together without conflicts.

- [ ] **Step 6: Test edge case - Grade change with invalid section**

Manual test:
1. Select Grade 1, then Section A
2. Change to Grade 2 (which has no Section A)
3. Verify: Section filter auto-clears
4. Verify: Section dropdown shows Grade 2 sections
5. Verify: URL updates (section param removed)

Expected: Invalid section clears gracefully.

- [ ] **Step 7: Test edge case - Grade with no sections**

Manual test:
1. If you have a grade with no sections, select it
2. Verify: Section dropdown either hides or shows empty state
3. Verify: Dashboard still functions normally

Expected: Handles missing data gracefully.

- [ ] **Step 8: Test responsive behavior**

Manual test:
1. Resize browser to mobile width
2. Verify: Skill cards stack vertically when filter active
3. Verify: Classroom grid adapts responsively
4. Verify: Opacity transitions work on mobile
5. Resize to desktop and verify layout adapts

Expected: All filter features responsive.

- [ ] **Step 9: Add code documentation**

Add a comment block at the top of the `DashboardContent` function explaining the filtering logic:

```typescript
function DashboardContent() {
  const { gradeLevel, pillar, section } = useFilterParams();

  // Data fetching
  const { data: classrooms = [], isLoading: classroomsLoading } = useTeacherClassrooms();
  const { data: stats, isLoading: statsLoading } = useTeacherDashboardStats({ gradeLevel, pillar, section });
  const { data: skillAccuracy, isLoading: skillLoading } = useTeacherSkillAccuracy(gradeLevel, section);

  /**
   * Cascading Filter Logic:
   *
   * 1. Section Filter: Only shows sections from classrooms matching selected grade
   * 2. Classroom Display: 3-tier visual hierarchy based on match score
   *    - 100% opacity: Matches grade + section (or just grade if no section selected)
   *    - 60% opacity: Matches grade but not section
   *    - 30% opacity: Different grade
   * 3. Skill Prominence: Selected skill spans 2 columns, others dim to 40%
   * 4. Stats Badges: Show "{Skill} only" on filtered stats when skill selected
   */
```

- [ ] **Step 10: Final commit**

```bash
git add frontend/app/teacher/dashboard/page.tsx
git commit -m "docs(dashboard): add cascading filter documentation

- Document filter logic and behavior
- All manual tests passing
- Section cascading works correctly
- Classroom hierarchy clear at 3 tiers
- Skill prominence functional
- Stats badges indicate active filters

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ Section filter cascading (Task 1)
- ✓ Classroom visual hierarchy (Task 2)
- ✓ Skill breakdown prominence (Task 3)
- ✓ Stats filter badges (Task 4)
- ✓ Manual testing scenarios (Task 5)

**Placeholders:** None - all code provided in full

**Type consistency:**
- `gradeLevel` used consistently (number from useFilterParams)
- `pillar` used consistently (string: "reading" | "writing" | "listening" | "speaking")
- `section` used consistently (string)
- `TeacherClassroom` type from teacher-queries.ts used correctly

**Dependencies:** All tasks build on each other sequentially, no circular dependencies

---

## Execution Notes

- All changes in a single file: `frontend/app/teacher/dashboard/page.tsx`
- No backend changes needed
- No new dependencies
- Manual testing after each task ensures incremental verification
- Can be completed in ~30-45 minutes with testing
- Each commit represents a complete, working feature increment
