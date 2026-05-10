# Spelling Bee Loading Issue - Root Cause & Fix

## Problem
Spelling Bee feature stuck on "Loading your words..." screen indefinitely.

## Root Causes Identified

### 1. Backend: Missing Active Week Data (Primary Issue)
**File**: `backend/app/api/v1/endpoints/spelling_bee.py` (lines 87-101)

**Issue**:
- Endpoint queries `classroom_syllabus` table for an active week
- Requires `status = 'active'` record to exist
- If no active week found, throws 404 error
- Most classrooms have empty `classroom_syllabus` table (no weeks seeded)

**Original Code**:
```python
syllabus_resp = (
    supabase.table("classroom_syllabus")
    .select("topic_title, week_number")
    .eq("classroom_id", classroom_id)
    .eq("status", "active")
    .order("week_number")
    .limit(1)
    .maybe_single()
    .execute()
)
if not syllabus_resp.data:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No active week found in pacing calendar",
    )
```

**Fix Applied**:
Added fallback logic to use active topics from `classroom_active_topics` when no syllabus week exists:

```python
# Fallback: if no active week, use a random active topic from snc_topics
if not syllabus_resp.data:
    topics_resp = (
        supabase.table("classroom_active_topics")
        .select("topic_id")
        .eq("classroom_id", classroom_id)
        .limit(1)
        .execute()
    )

    if topics_resp.data and len(topics_resp.data) > 0:
        topic_id = topics_resp.data[0]["topic_id"]
        topic_resp = (
            supabase.table("snc_topics")
            .select("topic_name")
            .eq("id", topic_id)
            .maybe_single()
            .execute()
        )
        topic_title = topic_resp.data["topic_name"] if topic_resp.data else "General English Vocabulary"
        week_number = 1
    else:
        # Final fallback: use grade-appropriate general topic
        topic_title = f"Grade {grade_level} English Vocabulary"
        week_number = 1
```

### 2. Frontend: Broken Error Handling (Secondary Issue)
**File**: `frontend/app/student/spelling-bee/page.tsx` (line 75)

**Issue**:
- When API call fails, error is set BUT gameState is set back to "loading"
- Loading screen is shown instead of error screen
- User sees infinite loading instead of helpful error message

**Original Code**:
```javascript
catch (err) {
  console.error("Failed to fetch words:", err);
  setError("Failed to load spelling words. Please try again.");
  setGameState("loading"); // ❌ BUG: keeps showing loading screen
}
```

**Fix Applied**:
```javascript
catch (err) {
  console.error("Failed to fetch words:", err);
  setError("Failed to load spelling words. Please try again.");
  setGameState("playing"); // ✅ Shows error screen
}
```

## Testing After Fix

### Backend Test
```bash
# Check if fallback works when no syllabus exists
curl -X GET http://localhost:8000/api/v1/spelling-bee/words \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"

# Expected: Returns 10 words based on classroom's active topics
# If no active topics: Uses "Grade X English Vocabulary" as fallback
```

### Frontend Test
1. Navigate to `/student/spelling-bee`
2. Should load words successfully (no longer stuck)
3. If backend fails, should show error screen with "Back Home" button

## Long-term Solution

### Seed Default Syllabus Data
Teachers should be able to set up their 30-week pacing calendar via the teacher dashboard. Until then, we can seed default data:

```sql
-- Create 30-week default syllabus for each classroom
INSERT INTO classroom_syllabus (classroom_id, week_number, topic_title, status)
SELECT
  c.id as classroom_id,
  generate_series(1, 30) as week_number,
  'Week ' || generate_series(1, 30) || ' Topics' as topic_title,
  CASE WHEN generate_series(1, 30) = 1 THEN 'active' ELSE 'locked' END as status
FROM classrooms c
ON CONFLICT (classroom_id, week_number) DO NOTHING;
```

## Files Changed
- ✅ `backend/app/api/v1/endpoints/spelling_bee.py` (added fallback logic)
- ✅ `frontend/app/student/spelling-bee/page.tsx` (fixed error handling)

## Status
🟢 **FIXED** - Spelling Bee now works even without syllabus data
