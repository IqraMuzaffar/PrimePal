# Teacher Analytics Dashboard - Design Specification

**Date:** 2026-05-06
**Status:** Approved
**Author:** Claude Code
**Approach:** Hybrid (Server-Side Initial Load + Client-Side Filtering)

---

## Overview

Build a comprehensive analytics dashboard for teachers to visualize student performance across grades, sections, and skills. The feature was previously removed and needs to be rebuilt from scratch with improved visualizations and filtering capabilities.

### Goals

1. **Performance Metrics:** Show total students, interactions, average accuracy, active students
2. **Student Insights:** Display top performers and struggling students who need attention
3. **Trend Analysis:** Visualize performance over time (weekly trends for last 8 weeks)
4. **Skill Breakdown:** Break down performance by pillar (reading, writing, listening, speaking)
5. **Grade & Section Filtering:** Allow teachers to drill down by grade level and classroom section

### Non-Goals

- Real-time updates (5-minute cache acceptable)
- Individual student drill-down (separate feature exists)
- Export to PDF/Excel (future enhancement)
- Custom date range selection (defaults to last 30 days)

---

## Architecture

### High-Level Flow

```
Teacher clicks "View Analytics"
  ↓
Next.js server fetches data from backend API
  ↓
Backend queries database, aggregates statistics
  ↓
Server renders page with embedded data (fast initial load)
  ↓
React hydrates, FilterBar becomes interactive
  ↓
Teacher changes filters → client re-computes stats instantly
  ↓
Charts/tables update without page reload
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single comprehensive endpoint** | Avoids multiple API calls; all data fetched once |
| **Client-side filtering** | Instant filter updates without page reloads |
| **Server-side initial render** | Fast first paint, SEO-friendly |
| **Reuse design system components** | Leverage StatCard, ProgressBar, LineChart from recent refactor |
| **URL parameter preservation** | Allow bookmarking, sharing filtered views |
| **5-minute cache** | Balance freshness vs. performance |

### System Context

**Authentication:** Teacher-only (Supabase GoTrue JWT)
**Authorization:** Shared teacher account sees ALL classrooms system-wide (no teacher_id filtering)
**Database:** PostgreSQL (Supabase) with existing indexes on `student_interactions`
**Caching:** Redis (5-minute TTL) or in-memory fallback

---

## Backend Design

### New Endpoint

**Path:** `GET /api/v1/teacher/analytics`
**File:** `backend/app/api/v1/endpoints/teacher.py` (new)
**Auth:** Requires valid teacher JWT (uses `get_current_teacher` dependency)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grade_level` | Integer (1-6) | No | Filter to specific grade |
| `pillar` | String | No | Filter to skill: reading, writing, listening, speaking |
| `section` | String | No | Filter to classroom section (A, B, C, etc.) |

#### Response Schema

```json
{
  "summary_stats": {
    "total_students": 120,
    "total_interactions": 4500,
    "avg_accuracy": 78,
    "active_this_week": 95
  },
  "grade_breakdown": [
    {
      "grade_level": 1,
      "student_count": 25,
      "avg_accuracy": 82,
      "total_interactions": 890,
      "top_student": {
        "name": "Ali Khan",
        "accuracy": 95
      },
      "struggling_count": 3
    }
    // ... grades 2-6
  ],
  "pillar_breakdown": [
    {
      "pillar": "reading",
      "avg_accuracy": 85,
      "total_attempts": 1200,
      "top_performers": 45,
      "needs_help": 12
    }
    // ... writing, listening, speaking
  ],
  "top_students": [
    {
      "student_id": "uuid",
      "name": "Ali Khan",
      "avatar_url": "https://...",
      "grade_level": 3,
      "overall_accuracy": 95,
      "total_interactions": 150,
      "strongest_pillar": "reading"
    }
    // ... top 10 by overall accuracy
  ],
  "struggling_students": [
    {
      "student_id": "uuid",
      "name": "Sara Ahmed",
      "grade_level": 2,
      "overall_accuracy": 45,
      "total_interactions": 25,
      "weakest_pillar": "speaking",
      "recent_activity": "2026-05-01T10:30:00Z"
    }
    // ... bottom 10 with accuracy < 60%
  ],
  "weekly_trends": [
    {
      "week_start": "2026-04-07",
      "week_label": "Week 1",
      "avg_accuracy": 75,
      "total_interactions": 450
    }
    // ... last 8 weeks
  ]
}
```

### SQL Strategy

#### Main Query Structure

```sql
-- Fetch all student interactions with classroom/student metadata
WITH interactions_base AS (
  SELECT
    si.id,
    si.student_id,
    si.classroom_id,
    si.pillar,
    si.correct,
    si.created_at,
    s.student_name,
    s.avatar_url,
    c.grade_level,
    c.section,
    c.class_name
  FROM student_interactions si
  JOIN students s ON si.student_id = s.id
  JOIN classrooms c ON si.classroom_id = c.id
  WHERE si.created_at >= NOW() - INTERVAL '30 days'
    AND si.interaction_type IN ('mission_mc', 'mission_fill', 'spelling_bee')
    AND ($1::integer IS NULL OR c.grade_level = $1)
    AND ($2::text IS NULL OR si.pillar = $2)
    AND ($3::text IS NULL OR c.section = $3)
),

-- Aggregate per student
student_stats AS (
  SELECT
    student_id,
    student_name,
    avatar_url,
    grade_level,
    section,
    COUNT(*) as total_interactions,
    ROUND(AVG(CASE WHEN correct THEN 100 ELSE 0 END)) as overall_accuracy,
    -- Per-pillar accuracy
    ROUND(AVG(CASE WHEN pillar = 'reading' AND correct THEN 100
                   WHEN pillar = 'reading' THEN 0 END)) as reading_accuracy,
    ROUND(AVG(CASE WHEN pillar = 'writing' AND correct THEN 100
                   WHEN pillar = 'writing' THEN 0 END)) as writing_accuracy,
    ROUND(AVG(CASE WHEN pillar = 'listening' AND correct THEN 100
                   WHEN pillar = 'listening' THEN 0 END)) as listening_accuracy,
    ROUND(AVG(CASE WHEN pillar = 'speaking' AND correct THEN 100
                   WHEN pillar = 'speaking' THEN 0 END)) as speaking_accuracy,
    MAX(created_at) as recent_activity
  FROM interactions_base
  GROUP BY student_id, student_name, avatar_url, grade_level, section
)

-- Final aggregations for response
SELECT
  -- Summary stats
  COUNT(DISTINCT student_id) as total_students,
  SUM(total_interactions) as total_interactions,
  ROUND(AVG(overall_accuracy)) as avg_accuracy,

  -- Grade breakdown (array_agg grouped by grade_level)
  -- Pillar breakdown (array_agg grouped by pillar)
  -- Top students (ORDER BY overall_accuracy DESC LIMIT 10)
  -- Struggling students (WHERE overall_accuracy < 60 LIMIT 10)

FROM student_stats;
```

#### Weekly Trends Query

```sql
SELECT
  DATE_TRUNC('week', created_at) as week_start,
  ROUND(AVG(CASE WHEN correct THEN 100 ELSE 0 END)) as avg_accuracy,
  COUNT(*) as total_interactions
FROM student_interactions si
JOIN classrooms c ON si.classroom_id = c.id
WHERE si.created_at >= NOW() - INTERVAL '8 weeks'
  AND si.interaction_type IN ('mission_mc', 'mission_fill', 'spelling_bee')
  AND ($1::integer IS NULL OR c.grade_level = $1)
  AND ($2::text IS NULL OR si.pillar = $2)
  AND ($3::text IS NULL OR c.section = $3)
GROUP BY week_start
ORDER BY week_start ASC;
```

### Caching Strategy

**Cache Key:** `teacher_analytics:{grade}:{pillar}:{section}`
Examples:
- `teacher_analytics:all` (no filters)
- `teacher_analytics:1:reading:A` (grade 1, reading, section A)

**TTL:** 5 minutes
**Invalidation:** On new student interaction logged (optional, not critical)
**Fallback:** If Redis unavailable, skip caching (query directly)

### Error Handling

| Error | HTTP Code | Response | Frontend Behavior |
|-------|-----------|----------|-------------------|
| Invalid grade (not 1-6) | 400 | `{"detail": "Invalid grade level"}` | Show error banner |
| Invalid pillar | 400 | `{"detail": "Invalid pillar"}` | Show error banner |
| Database timeout (>5s) | 504 | `{"detail": "Query timeout"}` | Show timeout message, retry button |
| Auth failure | 401 | `{"detail": "Unauthorized"}` | Redirect to login |
| Server error | 500 | `{"detail": "Internal error"}` | Show error state, retry button |

---

## Frontend Design

### Page Structure

**Route:** `/teacher/analytics`
**File:** `frontend/app/teacher/analytics/page.tsx`
**Layout:** Uses existing Sidebar + TopBar from design system

#### Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│ Analytics Dashboard                          [Filters]   │ ← TopBar
├─────────────────────────────────────────────────────────┤
│ [Grade ▼] [Pillar ▼] [Section ▼]                       │ ← FilterBar
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ 120     │ │ 4,500   │ │ 78%     │ │ 95      │       │ ← StatCards
│ │ Students│ │ Interact│ │ Avg Acc │ │ Active  │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────┤
│ Performance by Skill                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │ Reading  │ │ Writing  │ │ Listening│ │ Speaking │  │ ← SkillBreakdown
│ │ 85% ████ │ │ 72% ███░ │ │ 68% ███░ │ │ 79% ████ │  │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│ Performance by Grade                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│ │ Gr1 │ │ Gr2 │ │ Gr3 │ │ Gr4 │ │ Gr5 │ │ Gr6 │      │ ← GradeBreakdown
│ │ 82% │ │ 78% │ │ 75% │ │ 80% │ │ 70% │ │ 85% │      │
│ │25 st│ │30 st│ │20 st│ │22 st│ │15 st│ │8 st │      │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
├─────────────────────────────────────────────────────────┤
│ Weekly Performance Trend                                 │
│     %                                                    │
│ 100 │                                    •               │
│  80 │              •─────•─────•────•                   │ ← PerformanceTrends
│  60 │        •────•                                      │
│  40 │   •───•                                            │
│     └────────────────────────────────────────────       │
│     Week1 Week2 Week3 Week4 Week5 Week6 Week7 Week8    │
├─────────────────────────────────────────────────────────┤
│ Top Performers              │ Needs Attention            │
│ 🥇 Ali Khan - 95%          │ ⚠️ Sara Ahmed - 45%        │ ← StudentRankings
│ 🥈 Fatima - 92%            │ ⚠️ Ahmed Ali - 48%         │
│ 🥉 Hassan - 90%            │ ⚠️ Zara Khan - 52%         │
└─────────────────────────────────────────────────────────┘
```

### Component Architecture

```
frontend/app/teacher/analytics/
├── page.tsx (Server Component - fetches data)
└── components/
    ├── AnalyticsClient.tsx (Client wrapper - manages filters)
    ├── AnalyticsOverview.tsx (Summary stats grid)
    ├── GradeBreakdown.tsx (6 grade cards)
    ├── SkillBreakdown.tsx (4 pillar cards)
    ├── StudentRankings.tsx (Top 10 + Bottom 10)
    └── PerformanceTrends.tsx (Line chart)
```

### Component Specifications

#### 1. `page.tsx` (Server Component)

**Responsibilities:**
- Fetch analytics data from backend API
- Parse URL search params (grade, pillar, section)
- Handle loading and error states
- Pass data to client component

**Code Structure:**
```typescript
export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const grade = params.grade ? Number(params.grade) : undefined;
  const pillar = params.pillar || undefined;
  const section = params.section || undefined;

  const data = await fetchAnalyticsData(grade, pillar, section);

  if (data.error) {
    return <ErrorState />;
  }

  if (data.summary_stats.total_students === 0) {
    return <EmptyState />;
  }

  return <AnalyticsClient initialData={data} />;
}
```

#### 2. `AnalyticsClient.tsx` (Client Component)

**Responsibilities:**
- Manage filter state (grade, pillar, section)
- Sync filters with URL params
- Re-filter data when filters change
- Pass filtered data to child components

**State:**
```typescript
const [gradeFilter, setGradeFilter] = useState<number | null>(initialGrade);
const [pillarFilter, setPillarFilter] = useState<string | null>(initialPillar);
const [sectionFilter, setSectionFilter] = useState<string | null>(initialSection);
```

**Filtering Logic:**
```typescript
const filteredData = useMemo(() => {
  let filtered = initialData;

  if (gradeFilter) {
    filtered = filterByGrade(filtered, gradeFilter);
  }
  if (sectionFilter) {
    filtered = filterBySection(filtered, sectionFilter);
  }
  if (pillarFilter) {
    filtered = recalculateForPillar(filtered, pillarFilter);
  }

  return filtered;
}, [gradeFilter, pillarFilter, sectionFilter, initialData]);
```

#### 3. `AnalyticsOverview.tsx`

**Props:**
```typescript
interface Props {
  summaryStats: {
    total_students: number;
    total_interactions: number;
    avg_accuracy: number;
    active_this_week: number;
  };
}
```

**Renders:**
- 4 StatCard components (reuse from design system)
- Icons: Users, Activity, Target, TrendingUp (from lucide-react)
- Color coding: Primary, Success, Warning, Purple

#### 4. `GradeBreakdown.tsx`

**Props:**
```typescript
interface Props {
  gradeData: Array<{
    grade_level: number;
    student_count: number;
    avg_accuracy: number;
    total_interactions: number;
  }>;
  selectedGrade: number | null;
  onGradeClick: (grade: number) => void;
}
```

**Behavior:**
- Render 6 cards (Grades 1-6)
- Each card shows: grade badge, student count, accuracy %, progress bar
- Clicking a card sets grade filter
- Selected card has highlighted border
- Uses `designTokens.colors.grade[1-6]` for color coding

#### 5. `SkillBreakdown.tsx`

**Props:**
```typescript
interface Props {
  pillarData: Array<{
    pillar: string;
    avg_accuracy: number;
    total_attempts: number;
    top_performers: number;
    needs_help: number;
  }>;
  selectedPillar: string | null;
  onPillarClick: (pillar: string) => void;
}
```

**Behavior:**
- Render 4 cards (Reading, Writing, Listening, Speaking)
- Each shows: pillar name, accuracy %, ProgressBar, student counts
- Clicking a card sets pillar filter
- Uses ProgressBar component from design system
- Color codes: >70% green, 40-70% yellow, <40% red

#### 6. `StudentRankings.tsx`

**Props:**
```typescript
interface Props {
  topStudents: Array<StudentRanking>;
  strugglingStudents: Array<StudentRanking>;
}
```

**Layout:**
- Two columns: "Top Performers" | "Needs Attention"
- Top students: Show trophy icons (🥇🥈🥉 for top 3)
- Struggling students: Show warning icon (⚠️)
- Each row: Avatar, name, grade badge, accuracy %
- Click student → navigate to individual report (future)

#### 7. `PerformanceTrends.tsx`

**Props:**
```typescript
interface Props {
  weeklyData: Array<{
    week_label: string;
    avg_accuracy: number;
    total_interactions: number;
  }>;
}
```

**Behavior:**
- Uses LineChart component from design system
- X-axis: 8 week labels
- Y-axis: Accuracy percentage (0-100%)
- Optional secondary line: Interaction count
- Smooth curve with gradient fill

### Filtering Behavior

#### Single Filter Examples

**Grade Filter:**
```
User selects "Grade 1"
  → URL: /teacher/analytics?grade=1
  → Summary stats: Only Grade 1 students
  → Grade cards: Grade 1 highlighted, others dimmed
  → Pillar breakdown: Only Grade 1 interactions
  → Top/Struggling: Only Grade 1 students
  → Weekly trend: Only Grade 1 data
```

**Pillar Filter:**
```
User selects "Reading"
  → URL: /teacher/analytics?pillar=reading
  → Summary stats: Recalculated using only reading interactions
  → Pillar cards: Reading highlighted, others dimmed
  → Top/Struggling: Ranked by reading accuracy
  → Weekly trend: Reading accuracy over time
```

#### Multi-Filter Example

**Grade 1 + Section A + Reading:**
```
Filters: grade=1, section=A, pillar=reading
  → Students shown: Only Grade 1, Section A
  → Accuracy metric: Based on reading interactions only
  → Pillar breakdown: Only "Reading" card shown
  → Grade breakdown: Only "Grade 1" card shown
  → Top students: Top 10 in Grade 1-A by reading accuracy
```

#### Clear Filters

```
User clicks "Clear Filters" or navigates to /teacher/analytics
  → All filters reset to null
  → Shows ALL students, ALL pillars, ALL grades
  → Default comprehensive view
```

### URL Synchronization

**Pattern:** `/teacher/analytics?grade={1-6}&pillar={reading|writing|listening|speaking}&section={A|B|C}`

**Implementation:**
```typescript
const router = useRouter();
const searchParams = useSearchParams();

// Update URL when filter changes
const updateFilters = (newGrade, newPillar, newSection) => {
  const params = new URLSearchParams();
  if (newGrade) params.set('grade', String(newGrade));
  if (newPillar) params.set('pillar', newPillar);
  if (newSection) params.set('section', newSection);

  router.push(`/teacher/analytics?${params.toString()}`);
};
```

**Benefits:**
- Bookmarkable URLs
- Shareable filtered views
- Browser back/forward works
- Refresh preserves filters

### Empty & Error States

**No Students:**
```tsx
<div className="text-center py-16">
  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-700">No students yet</h3>
  <p className="text-sm text-gray-500 mt-2">
    Create a classroom to start tracking analytics.
  </p>
  <Link href="/teacher/classroom" className="btn-primary mt-4">
    Create Classroom
  </Link>
</div>
```

**No Interactions:**
```tsx
<div className="text-center py-16">
  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-700">No activity yet</h3>
  <p className="text-sm text-gray-500 mt-2">
    Students haven't started missions yet. Check back soon!
  </p>
</div>
```

**Filter Returns Zero:**
```tsx
<div className="text-center py-12">
  <p className="text-gray-600">
    No students match your current filters.
  </p>
  <button onClick={clearFilters} className="btn-secondary mt-4">
    Clear Filters
  </button>
</div>
```

**API Error:**
```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
  <p className="text-red-700 font-medium">Failed to load analytics</p>
  <p className="text-sm text-red-500 mt-1">
    Please check your connection and try refreshing.
  </p>
  <button onClick={retry} className="btn-primary mt-4">
    Retry
  </button>
</div>
```

---

## Data Flow

### Initial Page Load (Server-Side)

```
1. User clicks "View Analytics" button on dashboard
   ↓
2. Browser navigates to /teacher/analytics
   ↓
3. Next.js server component executes:
   - Reads URL search params
   - Calls fetchAnalyticsData(grade, pillar, section)
   ↓
4. fetchAnalyticsData() makes HTTP request:
   GET /api/v1/teacher/analytics?grade_level=1
   Headers: { Authorization: "Bearer {teacher_jwt}" }
   ↓
5. Backend receives request:
   - Validates teacher JWT
   - Checks Redis cache for key "teacher_analytics:1"
   - If miss: Query database (see SQL Strategy)
   - If hit: Return cached data
   ↓
6. Backend response (JSON):
   { summary_stats, grade_breakdown, pillar_breakdown, ... }
   ↓
7. Server renders HTML with embedded data
   ↓
8. Browser receives HTML (First Contentful Paint: ~500ms)
   ↓
9. React hydrates client components
   ↓
10. Page becomes interactive (Time to Interactive: ~800ms)
```

**Performance Metrics:**
- **Server Response Time:** <500ms (with cache hit)
- **First Contentful Paint:** <1s
- **Time to Interactive:** <1.5s

---

### Filter Change (Client-Side)

```
1. Teacher clicks FilterBar: selects "Grade 2"
   ↓
2. FilterBar onChange event fires
   ↓
3. AnalyticsClient updates state:
   setGradeFilter(2)
   ↓
4. useEffect triggers URL update:
   router.push('/teacher/analytics?grade=2')
   ↓
5. useMemo re-runs filtering logic:
   - Take initialData (all students from server)
   - Filter to grade_level === 2
   - Recalculate summary stats
   - Recalculate grade breakdown
   - Recalculate pillar breakdown
   - Filter top/struggling students
   - Filter weekly trends
   ↓
6. filteredData updates
   ↓
7. React re-renders child components with new data:
   - AnalyticsOverview updates stat cards
   - GradeBreakdown highlights Grade 2 card
   - SkillBreakdown shows Grade 2 pillar stats
   - StudentRankings shows Grade 2 students only
   - PerformanceTrends shows Grade 2 trend line
   ↓
8. Transition completes (Duration: ~50ms)
```

**Performance Metrics:**
- **Filter Update Time:** <100ms
- **No network requests:** Pure client-side computation
- **Smooth animations:** Uses CSS transitions from design tokens

---

### Caching Behavior

**Backend Cache (Redis):**
```
Cache Key Pattern: "teacher_analytics:{grade}:{pillar}:{section}"

Examples:
- No filters → "teacher_analytics:all"
- Grade 1 → "teacher_analytics:1:null:null"
- Grade 2, Reading → "teacher_analytics:2:reading:null"
- Grade 1, Section A, Speaking → "teacher_analytics:1:speaking:A"

TTL: 5 minutes (300 seconds)

Invalidation (optional):
- On new student_interaction INSERT
- On student enrollment change
- Manual cache clear via admin tool
```

**Frontend Cache:**
```
Initial server data stored in React state (initialData)
  → Never refetched unless page refresh
  → All filtering happens on this cached data
  → Benefits: Instant filter updates, reduced API load
```

**Cache Miss Handling:**
```python
# backend/app/api/v1/endpoints/teacher.py
cache_key = f"teacher_analytics:{grade}:{pillar}:{section}"
cached_data = redis.get(cache_key)

if cached_data:
    return json.loads(cached_data)

# Cache miss: Query database
data = query_analytics_data(grade, pillar, section)

# Store in cache
redis.setex(cache_key, 300, json.dumps(data))

return data
```

---

## Error Handling

### Backend Error Scenarios

**1. Database Connection Failure**
```python
try:
    result = supabase.from_("student_interactions").select(...).execute()
except Exception as e:
    logger.error(f"Database query failed: {e}")
    raise HTTPException(
        status_code=500,
        detail="Failed to fetch analytics data. Please try again later."
    )
```
**Frontend:** Shows error banner with retry button

---

**2. Query Timeout (>5 seconds)**
```python
# Set statement timeout
supabase.rpc("get_analytics_data", timeout=5000)

# If timeout exceeded
raise HTTPException(
    status_code=504,
    detail="Query timed out. Try filtering by grade to reduce data size."
)
```
**Frontend:** Shows timeout message, suggests using filters

---

**3. Invalid Parameters**
```python
# Validate grade_level
if grade_level and not (1 <= grade_level <= 6):
    raise HTTPException(
        status_code=400,
        detail="Invalid grade level. Must be between 1 and 6."
    )

# Validate pillar
valid_pillars = ["reading", "writing", "listening", "speaking"]
if pillar and pillar not in valid_pillars:
    raise HTTPException(
        status_code=400,
        detail=f"Invalid pillar. Must be one of: {', '.join(valid_pillars)}"
    )
```
**Frontend:** Shows error message, clears invalid filter

---

**4. Authentication Failure**
```python
@router.get("/analytics")
async def get_analytics(teacher: dict = Depends(get_current_teacher)):
    # If JWT invalid/expired, get_current_teacher raises 401
    pass
```
**Frontend:** Redirects to `/teacher/login`

---

**5. Partial Data Issues**

**Scenario:** Student has interactions but all are chat (no mission data)
```python
# Ensure mission_accuracy_pct is 0, not NULL
mission_accuracy_pct = (
    ROUND(AVG(CASE WHEN correct THEN 100 ELSE 0 END))
    OVER (PARTITION BY student_id)
) ?? 0  -- Coalesce to 0 if NULL
```

**Scenario:** Student has no avatar
```tsx
// Frontend handles gracefully
<img
  src={student.avatar_url || '/default-avatar.png'}
  alt={student.name}
/>
```

---

### Frontend Error Handling

**API Fetch Wrapper:**
```typescript
async function fetchAnalyticsData(grade?, pillar?, section?) {
  try {
    const headers = await getTeacherHeaders();
    const params = new URLSearchParams();
    if (grade) params.set('grade_level', String(grade));
    if (pillar) params.set('pillar', pillar);
    if (section) params.set('section', section);

    const response = await apiFetch(
      `/teacher/analytics?${params.toString()}`,
      { headers }
    );

    return { data: response, error: null };
  } catch (error) {
    console.error('Analytics fetch failed:', error);
    return { data: null, error: error.message };
  }
}
```

**Error State Rendering:**
```typescript
if (fetchError) {
  return (
    <ErrorBoundary>
      <ErrorState
        message="Failed to load analytics"
        onRetry={() => window.location.reload()}
      />
    </ErrorBoundary>
  );
}
```

---

## Testing Strategy

### Backend Tests

**File:** `backend/tests/test_teacher_endpoints.py`

**Test Cases:**

```python
def test_analytics_endpoint_returns_comprehensive_data():
    """Verify all expected fields are present in response."""
    response = client.get(
        "/api/v1/teacher/analytics",
        headers=teacher_auth_headers
    )
    assert response.status_code == 200
    data = response.json()

    # Verify structure
    assert "summary_stats" in data
    assert "grade_breakdown" in data
    assert "pillar_breakdown" in data
    assert "top_students" in data
    assert "struggling_students" in data
    assert "weekly_trends" in data

    # Verify summary stats fields
    assert "total_students" in data["summary_stats"]
    assert "total_interactions" in data["summary_stats"]
    assert "avg_accuracy" in data["summary_stats"]
    assert "active_this_week" in data["summary_stats"]


def test_analytics_grade_filter():
    """Test filtering by grade level."""
    response = client.get(
        "/api/v1/teacher/analytics?grade_level=1",
        headers=teacher_auth_headers
    )
    data = response.json()

    # All students in response should be grade 1
    for student in data["top_students"]:
        assert student["grade_level"] == 1

    # Grade breakdown should only have grade 1
    assert len(data["grade_breakdown"]) == 1
    assert data["grade_breakdown"][0]["grade_level"] == 1


def test_analytics_pillar_filter():
    """Test filtering by pillar."""
    response = client.get(
        "/api/v1/teacher/analytics?pillar=reading",
        headers=teacher_auth_headers
    )
    data = response.json()

    # Pillar breakdown should only have reading
    assert len(data["pillar_breakdown"]) == 1
    assert data["pillar_breakdown"][0]["pillar"] == "reading"


def test_analytics_multi_filter():
    """Test combining multiple filters."""
    response = client.get(
        "/api/v1/teacher/analytics?grade_level=2&pillar=writing&section=A",
        headers=teacher_auth_headers
    )
    assert response.status_code == 200
    data = response.json()

    # Verify filtered correctly
    assert all(s["grade_level"] == 2 for s in data["top_students"])


def test_analytics_requires_auth():
    """Test endpoint requires teacher authentication."""
    response = client.get("/api/v1/teacher/analytics")
    assert response.status_code == 401


def test_analytics_invalid_grade():
    """Test validation of grade parameter."""
    response = client.get(
        "/api/v1/teacher/analytics?grade_level=10",
        headers=teacher_auth_headers
    )
    assert response.status_code == 400
    assert "Invalid grade level" in response.json()["detail"]


def test_analytics_invalid_pillar():
    """Test validation of pillar parameter."""
    response = client.get(
        "/api/v1/teacher/analytics?pillar=invalid",
        headers=teacher_auth_headers
    )
    assert response.status_code == 400
    assert "Invalid pillar" in response.json()["detail"]


def test_analytics_with_no_data():
    """Test graceful handling when no interactions exist."""
    # Clear all interactions
    supabase.table("student_interactions").delete().neq("id", "").execute()

    response = client.get(
        "/api/v1/teacher/analytics",
        headers=teacher_auth_headers
    )
    data = response.json()

    assert data["summary_stats"]["total_interactions"] == 0
    assert data["summary_stats"]["total_students"] >= 0
    assert data["top_students"] == []
    assert data["struggling_students"] == []


def test_analytics_caching():
    """Test Redis caching behavior."""
    # First request (cache miss)
    response1 = client.get(
        "/api/v1/teacher/analytics?grade_level=1",
        headers=teacher_auth_headers
    )

    # Second request (cache hit)
    response2 = client.get(
        "/api/v1/teacher/analytics?grade_level=1",
        headers=teacher_auth_headers
    )

    # Should return same data
    assert response1.json() == response2.json()

    # Check cache key exists in Redis
    cache_key = "teacher_analytics:1:null:null"
    assert redis.exists(cache_key)
```

---

### Frontend Tests (Manual Checklist)

**Initial Load:**
- [ ] Page loads without errors
- [ ] All sections render: Summary stats, skill breakdown, grade breakdown, trends, rankings
- [ ] No console errors in browser DevTools
- [ ] Loading spinner shows during data fetch

**Filtering:**
- [ ] Grade filter: Select Grade 1 → only Grade 1 data shown
- [ ] Grade filter: Grade 1 card highlighted, others dimmed
- [ ] Pillar filter: Select Reading → reading accuracy shown across all metrics
- [ ] Pillar filter: Reading card highlighted, others dimmed
- [ ] Section filter: Select Section A → only Section A students shown
- [ ] Multi-filter: Grade 2 + Writing → correct subset shown
- [ ] Clear filters: All data shown again

**URL Synchronization:**
- [ ] Selecting filter updates URL
- [ ] Bookmark filtered URL, reopen → filters preserved
- [ ] Browser back button works
- [ ] Sharing URL with filters works

**Empty States:**
- [ ] No students → shows empty state message
- [ ] No interactions → shows "No activity yet" message
- [ ] Filter returns zero → shows "No matches" message

**Error States:**
- [ ] Backend down → shows error banner with retry button
- [ ] Invalid token → redirects to login
- [ ] Slow network → shows loading spinner, then data

**Responsive Design:**
- [ ] Mobile (375px): Cards stack vertically, readable
- [ ] Tablet (768px): 2-column grid for cards
- [ ] Desktop (1440px): Full layout, no overflow

**Chart Rendering:**
- [ ] Line chart displays with correct data points
- [ ] Progress bars show correct percentages
- [ ] Stat cards show correct icons and colors
- [ ] Grade cards use correct color coding (designTokens.colors.grade)

**Interactions:**
- [ ] Clicking grade card sets filter
- [ ] Clicking skill card sets filter
- [ ] Clicking "Clear Filters" resets all
- [ ] Hovering over cards shows hover state

---

## Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Backend query time** | <2s | PostgreSQL EXPLAIN ANALYZE |
| **Cache hit response** | <100ms | Backend timing logs |
| **Server-side render** | <500ms | Next.js build logs |
| **First Contentful Paint** | <1s | Chrome Lighthouse |
| **Time to Interactive** | <1.5s | Chrome Lighthouse |
| **Filter update time** | <100ms | React DevTools Profiler |
| **Chart render time** | <200ms | Chrome Performance tab |

**Optimization Strategies:**
- **Database indexes:** Ensure indexes on `(student_id, pillar, created_at)`, `(classroom_id, grade_level)`
- **SQL query optimization:** Use CTEs, avoid N+1 queries, limit result sets
- **Redis caching:** 5-minute TTL, precompute heavy aggregations
- **Frontend memoization:** useMemo for filtering, React.memo for chart components
- **Code splitting:** Lazy load chart components if not initially visible

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Backend endpoint** added to `backend/app/main.py` router
- [ ] **Database indexes** verified:
  - `idx_si_student_id` on `student_interactions(student_id)`
  - `idx_si_classroom_id` on `student_interactions(classroom_id)`
  - `idx_si_created_at` on `student_interactions(created_at DESC)`
  - `idx_student_interactions_pillar_created` on `(student_id, pillar, created_at DESC)`
- [ ] **Redis cache** configured (or fallback if unavailable)
- [ ] **Frontend page** added to navigation (Sidebar link exists)
- [ ] **Design tokens** confirmed working
- [ ] **FilterBar** tested with analytics page
- [ ] **Error boundaries** added around analytics components

### Testing

- [ ] **Backend tests** passing (9/9)
- [ ] **Manual frontend tests** completed (20/20 from checklist)
- [ ] **Performance benchmarks** met (7/7 targets)
- [ ] **Cross-browser** tested (Chrome, Firefox, Safari, Edge)
- [ ] **Mobile responsive** verified (iOS Safari, Android Chrome)

### Security

- [ ] **Authentication** enforced (teacher JWT required)
- [ ] **Authorization** verified (shared account sees all data correctly)
- [ ] **Input validation** applied (grade 1-6, valid pillar values)
- [ ] **SQL injection** prevented (parameterized queries)
- [ ] **Rate limiting** considered (optional: 100 req/min per teacher)

### Monitoring

- [ ] **Error tracking** enabled (Sentry or similar)
- [ ] **Performance monitoring** enabled (query timing logs)
- [ ] **Cache hit rate** tracked (Redis metrics)
- [ ] **User analytics** tracked (page views, filter usage)

---

## Future Enhancements (Out of Scope)

**Phase 2 Features:**
- Export to PDF/Excel
- Custom date range selection
- Individual student drill-down from rankings
- Email reports (weekly summary to teachers)
- Comparison view (Grade 1 vs Grade 2)
- Real-time updates (WebSocket for live data)
- Advanced filters (by classroom, by date range, by mission type)
- Downloadable charts (PNG/SVG export)

**Performance Improvements:**
- Pagination for large student lists
- Virtual scrolling for rankings
- Incremental data loading (load more on scroll)
- Service worker caching for offline access

---

## Glossary

| Term | Definition |
|------|------------|
| **Pillar** | One of four skills: reading, writing, listening, speaking |
| **Accuracy** | Percentage of mission questions answered correctly |
| **Interaction** | Any student action: mission attempt, chat message, spelling bee |
| **Struggling Student** | Student with overall accuracy < 60% |
| **Top Performer** | Student with overall accuracy ≥ 80% |
| **Weekly Trend** | Average accuracy aggregated by calendar week |
| **Section** | Classroom section identifier (A, B, C, etc.) |

---

## Approval

**Design Status:** ✅ **APPROVED**
**Approved By:** User (Thesis Student)
**Date:** 2026-05-06
**Next Step:** Create implementation plan via writing-plans skill

---

## References

- **Existing Dashboard:** `frontend/app/teacher/dashboard/page.tsx`
- **Design System:** `frontend/lib/design-tokens.ts`
- **Database Schema:** `DOCUMENTATION/database/tables.md`
- **Backend API Patterns:** `DOCUMENTATION/backend/endpoints/index.md`
- **Authentication:** `DOCUMENTATION/architecture/auth-flows.md`
