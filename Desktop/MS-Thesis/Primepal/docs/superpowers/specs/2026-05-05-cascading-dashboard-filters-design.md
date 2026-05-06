---
name: Cascading Dashboard Filters
description: Implement cascading filter behavior on teacher dashboard for grade, section, and skill filtering
type: Feature Enhancement
---

# Cascading Dashboard Filters Design

## Overview

Enhance the teacher dashboard filtering system to provide cascading filter behavior:
- Grade filter constrains available sections
- Grade/section filters visually organize classroom display
- Skill filter provides visual prominence and context badges

## Problem Statement

Currently, all filters operate independently:
- Section dropdown shows all sections regardless of selected grade
- "Your Classrooms" section displays all classrooms equally
- Skill filter updates data but provides no visual feedback about which skill is active

This creates confusion about what data is being displayed and makes it harder to focus on specific grades, sections, or skills.

## Goals

1. Make section dropdown context-aware of grade selection
2. Provide visual hierarchy in classroom display based on filters
3. Add visual prominence to selected skills
4. Indicate active skill filters on stats cards

## Design

### Architecture

**Approach:** Client-side filtering with existing API structure
- Section filtering computed from classroom data
- Classroom sorting/styling based on match score
- Skill card conditional rendering
- Stats badge conditional rendering

**Why this approach:**
- All classroom data already loaded for display
- Instant user feedback (no API latency)
- Minimal code changes
- Consistent with existing backend filter usage for stats/skills

### Component Changes

#### 1. FilterBar Component (`components/teacher/FilterBar.tsx`)

**Current:** Receives static `sections` prop and displays all

**New:** Receives full classroom list, computes available sections dynamically

**Changes:**
- No structural changes needed
- Dashboard will compute filtered sections and pass them in
- FilterBar continues to work the same way

#### 2. Dashboard Page (`app/teacher/dashboard/page.tsx`)

**Changes:**
- Compute filtered sections based on grade selection
- Sort and group classrooms by match score
- Apply conditional styling to classroom cards
- Add conditional layout and styling to skill cards
- Add skill filter badges to stats cards

### Feature 1: Section Filter Cascading

**Behavior:**
- **No grade selected:** Show all unique sections from all classrooms
- **Grade selected:** Show only sections that exist for that grade level
- **Auto-clear:** If current section becomes invalid after grade change, clear it

**Implementation:**
```typescript
// In DashboardContent component
const filteredSections = gradeLevel
  ? Array.from(new Set(
      classrooms
        .filter(c => c.grade_level === Number(gradeLevel))
        .map(c => c.section)
        .filter(Boolean)
    )).sort()
  : availableSections;

// Pass to FilterBar
<FilterBar sections={filteredSections} ... />
```

**Edge cases:**
- Empty sections for a grade → section dropdown hides or shows empty state
- User changes grade with section selected → section auto-clears if invalid

### Feature 2: Classroom Visual Hierarchy

**Behavior:** Three visual tiers

**Tier 1 - Full prominence (100% opacity):**
- Grade + section selected → classrooms matching both
- Only grade selected → classrooms matching grade
- No filters → all classrooms

**Tier 2 - Dimmed (60% opacity):**
- Grade + section selected → classrooms matching grade but different section
- Other cases → not applicable

**Tier 3 - Very dimmed (30% opacity):**
- Any grade selected → classrooms from other grades

**Implementation:**
```typescript
// Sorting function
const getMatchScore = (classroom: TeacherClassroom) => {
  let score = 0;
  if (gradeLevel) {
    if (classroom.grade_level === Number(gradeLevel)) {
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

// Sort classrooms
const sortedClassrooms = [...classrooms].sort((a, b) =>
  getMatchScore(b) - getMatchScore(a)
);

// Get opacity class
const getClassroomOpacity = (classroom: TeacherClassroom) => {
  if (!gradeLevel) return "opacity-100";

  const matchesGrade = classroom.grade_level === Number(gradeLevel);
  const matchesSection = !section || classroom.section === section;

  if (matchesGrade && matchesSection) return "opacity-100";
  if (matchesGrade) return "opacity-60";
  return "opacity-30";
};

// Apply in render
<div className={`... ${getClassroomOpacity(classroom)} transition-opacity duration-200`}>
```

**Visual design:**
- Maintain current card design
- Add opacity transition (200ms) for smooth effect
- No layout changes, just opacity and sort order

### Feature 3: Skill Breakdown Prominence

**Behavior:**
- **No skill filter:** All 4 cards equal size (current 2x2 on mobile, 1x4 on desktop)
- **Skill selected:** Selected skill prominent, others dimmed

**Visual changes:**

*Selected skill card:*
- Takes 2 columns on desktop (col-span-2)
- 100% opacity
- Slightly bolder border
- Potentially larger text

*Other skill cards:*
- Regular size (1 column each)
- 40% opacity
- Standard border

**Implementation:**
```typescript
const skillCards = [
  { key: "reading", label: "Reading", value: skillAccuracy.reading, icon: BookOpenCheck },
  { key: "writing", label: "Writing", value: skillAccuracy.writing, icon: BookOpen },
  { key: "listening", label: "Listening", value: skillAccuracy.listening, icon: Headphones },
  { key: "speaking", label: "Speaking", value: skillAccuracy.speaking, icon: MessageSquare },
];

<div className={
  pillar
    ? "grid grid-cols-1 md:grid-cols-3 gap-4"  // 1 large + 3 small
    : "grid grid-cols-2 md:grid-cols-4 gap-4"  // 4 equal
}>
  {skillCards.map(({ key, label, value, icon: Icon }) => {
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
        {/* Existing card content */}
      </div>
    );
  })}
</div>
```

**Layout strategy:**
- Mobile: All cards stack vertically (selected card full width, others full width dimmed)
- Desktop: Selected card takes 2 columns, others share remaining space

### Feature 4: Stats Filter Badges

**Behavior:**
When skill filter is active, show a small badge on relevant stats cards indicating the filter.

**Badge design:**
- Small pill shape
- Light indigo background (bg-indigo-50 text-indigo-600)
- Positioned below the stat value
- Text format: "{Skill} only" (e.g., "Reading only")

**Which stats get badges:**
- ✓ Total Interactions (filtered by skill)
- ✓ Avg Accuracy (filtered by skill)
- ✓ Active This Week (filtered by skill)
- ✗ Total Students (not filtered by skill, counts all students)

**Implementation:**
```typescript
{pillar && (
  <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
    {pillar.charAt(0).toUpperCase() + pillar.slice(1)} only
  </span>
)}
```

## Data Flow

1. **Load data:**
   - `useTeacherClassrooms()` - loads all classrooms
   - `useTeacherDashboardStats({ gradeLevel, pillar, section })` - loads filtered stats
   - `useTeacherSkillAccuracy(gradeLevel, section)` - loads filtered skill data

2. **Filter derivation:**
   - Extract filter params from URL via `useFilterParams()`
   - Compute filtered sections from classrooms + grade filter
   - Compute classroom match scores
   - Determine skill card prominence

3. **Render:**
   - Pass filtered sections to FilterBar
   - Render sorted classrooms with opacity classes
   - Render skill cards with conditional size/opacity
   - Render stats with conditional badges

## Testing Strategy

**Manual testing scenarios:**
1. No filters → all sections visible, all classrooms equal, all skills equal
2. Grade 1 selected → only grade 1 sections, grade 1 classrooms prominent
3. Grade 1 + Section A → only matching classroom prominent, other grade 1 dimmed, other grades very dimmed
4. Reading skill selected → reading card large, others small/dimmed, stats show "Reading only"
5. Grade 1 + Reading → combined filters work correctly
6. Change from Grade 1 (Section A selected) to Grade 2 (no Section A) → section clears

**Edge cases:**
- No classrooms → empty state unchanged
- Grade with no sections → section dropdown empty/hidden
- Very long classroom list → scroll behavior intact

## Success Criteria

- Section dropdown only shows sections for selected grade
- Classroom visual hierarchy clearly indicates filter matches
- Selected skill is visually prominent in skill breakdown
- Stats cards indicate active skill filter
- Filter changes are instant (no loading states needed)
- Existing functionality (stats queries, navigation) unchanged

## Non-Goals

- Backend API changes (using existing endpoints)
- New filter types (e.g., date range, student count)
- Saved filter preferences (session-only)
- Filter reset button (can click "All Grades", "All Skills", etc.)

## Implementation Notes

**File changes:**
- `frontend/app/teacher/dashboard/page.tsx` - main implementation
- `frontend/components/teacher/FilterBar.tsx` - no changes, receives filtered data

**Dependencies:**
- No new dependencies
- Uses existing hooks and components
- Compatible with current React Query setup

**Performance:**
- Filtering/sorting operations are O(n) where n = number of classrooms
- Expected n < 50 for typical teacher, so client-side filtering is fast
- No additional API calls introduced

**Accessibility:**
- Opacity changes maintain readable contrast ratios
- Screen readers announce filter changes (existing URL param updates)
- Keyboard navigation unchanged

## Future Enhancements (Out of Scope)

- Animated transitions between filter states
- Filter combination chips/tags showing active filters
- Save filter presets
- Export filtered view
- Multi-select filters (e.g., Grade 1 + Grade 2)
