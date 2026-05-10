# Weakness Detection System - Implementation Summary

**Date**: 2026-05-06
**Branch**: student-design-refactoring-branch
**Issue**: Broken weakness detection returning empty results

## Problem

The weakness detection system in `backend/app/api/v1/endpoints/missions.py` was broken:

- **Root Cause**: Queried `original_message` field which is always `None` for mission completions
- **Impact**: Weakness list always empty, personalized missions not working
- **Affected Feature**: Pillar missions generation (Feature 3)

## Solution Implemented

Replaced broken message-based tracking with **pillar-based performance analysis**:

### Key Changes

1. **New Query** (line 797-804)
   ```python
   # Old: .select("original_message, interaction_type")
   #      .eq("correct", False)
   #      .limit(5)

   # New: .select("pillar, correct, interaction_type")
   #      .not_.is_("pillar", "null")
   #      .limit(30)
   ```

2. **Accuracy Calculation** (line 806-815)
   - Analyzes last 30 interactions per student
   - Calculates accuracy per pillar (reading, writing, listening, speaking)
   - Tracks correct/total attempts

3. **Weakness Threshold** (line 817-823)
   - Returns pillars with <60% accuracy
   - Requires minimum 3 attempts for statistical validity
   - Format: `["reading (accuracy: 40%)", "listening (accuracy: 50%)"]`

## Files Modified

### Core Implementation
- **`backend/app/api/v1/endpoints/missions.py`** (lines 784-836)
  - Rewrote `fetch_weaknesses()` function
  - Added comprehensive docstring
  - Added informational logging

### Documentation
- **`DOCUMENTATION/backend/endpoints/missions.md`** (lines 173-189)
  - Updated business logic description
  - Added weakness detection section

## Testing

### Test Files Created
1. **`test_weakness_detection.py`** - Unit test for core logic
2. **`test_weakness_integration.py`** - Integration with mission generator
3. **`test_weakness_e2e.py`** - End-to-end flow validation

### Test Results
- ✅ All unit tests pass (6/6)
- ✅ All integration tests pass (3/3)
- ✅ All edge cases pass (5/5)
- ✅ Python syntax validation pass
- ✅ Import validation pass

### Edge Cases Covered
1. No interactions → empty list
2. All correct (100% accuracy) → empty list
3. Insufficient data (<3 attempts) → pillar excluded
4. Exactly 60% accuracy → not a weakness (boundary test)
5. Null pillars (chat/spelling_bee) → correctly filtered

## Performance Impact

### Query Optimization
- **Index Used**: `idx_student_interactions_pillar_created` (existing)
- **Query Time**: Fast (30 rows max, indexed query)
- **Caching**: Results cached as part of mission generation cache (1-hour TTL)

### Parallel Execution
- Runs via `asyncio.gather()` with grade level and performance profile
- No blocking operations

## Integration Flow

```
Student completes missions
         ↓
student_interactions table updated
         ↓
GET /api/v1/missions/pillar
         ↓
fetch_weaknesses() analyzes last 30 interactions
         ↓
Calculates accuracy per pillar
         ↓
Returns weak pillars (<60%, min 3 attempts)
         ↓
generate_pillar_missions() receives weaknesses
         ↓
LLM prompt includes weakness context
         ↓
Mission generator creates 3-4 targeted questions
```

## Example Output

### Before (Broken)
```python
student_weaknesses = []  # Always empty
```

### After (Working)
```python
student_weaknesses = [
    "reading (accuracy: 40%)",
    "listening (accuracy: 50%)"
]
```

### LLM Prompt Section
```
STUDENT'S RECENT WEAK AREAS (create 3-4 questions targeting these):
- reading (accuracy: 40%)
- listening (accuracy: 50%)
```

## Backward Compatibility

✅ **Fully compatible**
- Function signature unchanged: `async def fetch_weaknesses() -> list[str]`
- Return type unchanged: `list[str]`
- Only output format improved (empty → meaningful)

## Logging Added

```python
logger.info(
    "Student %s weaknesses detected: %s",
    student_id,
    ", ".join(weaknesses)
)
```

Example log output:
```
Student uuid-123 weaknesses detected: reading (accuracy: 40%), listening (accuracy: 50%)
```

## Database Schema

**No migration required** - Uses existing columns:
- `student_interactions.pillar` (added in migration 017)
- `student_interactions.correct` (original table)
- `student_interactions.created_at` (original table)

## Deployment Notes

### Pre-deployment
1. ✅ Code changes complete
2. ✅ Tests pass
3. ✅ Documentation updated
4. ✅ No database migrations needed

### Post-deployment
1. Monitor logs for weakness detection messages
2. Verify mission personalization improves
3. Check cache hit rates remain high

### Rollback Plan
If issues arise, revert single file:
```bash
git checkout HEAD~1 -- backend/app/api/v1/endpoints/missions.py
```

## Metrics to Monitor

1. **Weakness Detection Rate**: % of students with detected weaknesses
2. **Mission Personalization**: % of missions with weakness-focused questions
3. **Student Accuracy**: Track if targeted questions improve weak pillar accuracy
4. **Cache Performance**: Ensure 1-hour TTL still effective

## Future Enhancements

Potential improvements (not in current scope):
1. **Configurable threshold**: Make 60% threshold configurable
2. **Minimum attempts**: Make 3-attempt minimum configurable
3. **Time window**: Make 30-interaction window configurable
4. **Topic-level weaknesses**: Track weak topics within pillars
5. **Trend analysis**: Detect improving/declining trends

## References

- **Issue**: Weakness detection broken (original_message always None)
- **Branch**: student-design-refactoring-branch
- **Related PR**: (to be created)
- **Documentation**: WEAKNESS_DETECTION_FIX.md

## Sign-off

- ✅ Implementation complete
- ✅ Tests pass
- ✅ Documentation updated
- ✅ Ready for review
