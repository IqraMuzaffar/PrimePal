# Weakness Detection System Fix

## Problem

The original weakness detection in `backend/app/api/v1/endpoints/missions.py` (lines 768-787) was broken because:

1. **Broken Query**: Tried to fetch `original_message` from `student_interactions` table
2. **Always Empty**: Mission completions always set `original_message=None`, so weakness list was always empty
3. **Wrong Focus**: Attempted to track individual incorrect messages instead of overall pillar performance

## Solution

Replaced the broken implementation with pillar-based performance analysis that:

1. **Analyzes last 30 interactions** per student across all pillars
2. **Calculates accuracy per pillar** (reading, writing, listening, speaking)
3. **Returns pillars with <60% accuracy** as weaknesses
4. **Minimum 3 attempts** required to ensure statistical validity

## Implementation Details

### New `fetch_weaknesses()` Function

**Location**: `backend/app/api/v1/endpoints/missions.py:784-836`

**Logic**:
```python
1. Query last 30 student_interactions with non-null pillar
2. For each pillar (reading, writing, listening, speaking):
   - Count total attempts
   - Count correct attempts
   - Calculate accuracy = correct / total
3. Return pillars with:
   - At least 3 attempts (statistical validity)
   - Accuracy < 60% (weakness threshold)
4. Format: ["reading (accuracy: 40%)", "listening (accuracy: 50%)"]
```

### Query Details

```python
supabase.table("student_interactions")
    .select("pillar, correct, interaction_type")
    .eq("student_id", student_id)
    .not_.is_("pillar", "null")  # Exclude chat/spelling_bee interactions
    .order("created_at", desc=True)
    .limit(30)  # Recent performance window
    .execute()
```

### Edge Cases Handled

1. **Insufficient data**: Pillars with <3 attempts are excluded
2. **High accuracy**: Pillars with >=60% accuracy are excluded
3. **No interactions**: Returns empty list (no weaknesses)
4. **Null pillars**: Chat and spelling_bee interactions are excluded
5. **Database errors**: Caught and logged, returns empty list

## Output Format

**Before** (broken):
```python
[]  # Always empty because original_message is always None
```

**After** (working):
```python
["reading (accuracy: 40%)", "listening (accuracy: 50%)"]
```

## Integration

The weakness list is passed to the mission generator LLM prompt:

```python
weakness_context = (
    "\n\nSTUDENT'S RECENT WEAK AREAS (create 3-4 questions targeting these):\n"
    + "\n".join([f"- {w}" for w in student_weaknesses])
)
```

**Example prompt section**:
```
STUDENT'S RECENT WEAK AREAS (create 3-4 questions targeting these):
- reading (accuracy: 40%)
- listening (accuracy: 50%)
```

This instructs the LLM to generate 3-4 questions targeting the student's weak pillars.

## Logging

Added informational logging when weaknesses are detected:

```python
logger.info(
    "Student %s weaknesses detected: %s",
    student_id,
    ", ".join(weaknesses)
)
```

## Testing

### Unit Test
- **File**: `backend/test_weakness_detection.py`
- **Validates**: Core detection logic with sample data
- **All tests**: PASS

### Integration Test
- **File**: `backend/test_weakness_integration.py`
- **Validates**: Integration with mission generator prompt format
- **All tests**: PASS

### Test Cases Covered
1. Multiple weaknesses (reading 40%, listening 50%)
2. No weaknesses (all high accuracy)
3. Insufficient data (<3 attempts)
4. Mixed accuracy (some weak, some strong)
5. Pillar exclusion based on attempt count
6. Null pillar filtering

## Performance Considerations

- **Query limit**: 30 interactions per student (fast)
- **Index**: Leverages existing `idx_student_interactions_pillar_created` index
- **Caching**: Results cached as part of mission generation cache
- **Async**: Runs in parallel with other queries via `asyncio.gather()`

## Migration Notes

No database migration required. Uses existing:
- `student_interactions.pillar` column (added in migration 017)
- `student_interactions.correct` column (original table)

## Related Files

- **Modified**: `backend/app/api/v1/endpoints/missions.py` (lines 784-836)
- **Uses**: `backend/app/agents/tutor_agent/mission_generator.py` (lines 354-360, 420-425)
- **Tests**: `backend/test_weakness_detection.py`, `backend/test_weakness_integration.py`

## Backward Compatibility

✅ **Fully compatible** - Function signature unchanged:
```python
async def fetch_weaknesses() -> list[str]
```

Output format change from `[]` (always empty) to meaningful weakness list improves mission personalization without breaking downstream code.
