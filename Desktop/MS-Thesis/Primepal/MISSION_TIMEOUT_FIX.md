# Mission Timeout & Database Issues - Root Cause Analysis & Fixes

## Problem Summary
All missions (reading, writing, listening, speaking) failing to load with multiple errors:
1. ⏱️ **OpenAI API timeout** - Mission generation timing out after 20 seconds
2. ❌ **Missing `achievements` table** - Database schema incomplete
3. ❌ **Missing `score` column** in `student_interactions` table

## Root Causes Identified

### 1. OpenAI API Timeout (PRIMARY ISSUE)

**Error:**
```
RuntimeError: Mission generation timed out. Please try again.
TimeoutError at asyncio.wait_for(..., timeout=20.0)
```

**Location:** `backend/app/agents/tutor_agent/mission_generator.py:464-466`

**Cause:**
- Timeout set to 20 seconds was too short for complex prompts
- OpenAI API taking longer to respond (network latency, model load, prompt complexity)
- Redis cache connection failed (no caching = every request hits OpenAI fresh)

**Fix Applied:**
```python
# Before:
result: PillarMissions = await asyncio.wait_for(
    chain.ainvoke({}),
    timeout=20.0,  # ❌ Too short
)

# After:
result: PillarMissions = await asyncio.wait_for(
    chain.ainvoke({}),
    timeout=60.0,  # ✅ Increased to 60s for complex prompts
)
```

### 2. Missing Achievements Table

**Error:**
```
APIError: {'code': 'PGRST205', 'message': "Could not find the table 'public.achievements' in the schema cache"}
```

**Cause:**
- Migration `026_achievements.sql` exists but was never applied to cloud database
- Code references `achievements` table but it doesn't exist

**Fix:**
Apply migration 026 (see `fix_missing_migrations.sql`)

### 3. Missing Score Column

**Error:**
```
APIError: {'code': '42703', 'message': 'column student_interactions.score does not exist'}
```

**Cause:**
- Migration `028_interactions_score_column.sql` exists but was never applied
- Code tries to SELECT `score` column but it doesn't exist

**Fix:**
Apply migration 028 (see `fix_missing_migrations.sql`)

### 4. Redis Connection Failure (Secondary)

**Warning:**
```
Redis connection failed: Error Multiple exceptions: [Errno 10061] Connect call failed
```

**Impact:**
- No caching of mission generation results
- Every request hits OpenAI API fresh
- Slower performance + higher costs

**Fix:**
Start Redis server (optional, system works without it but slower)

## Action Items

### ✅ COMPLETED

1. **Increased OpenAI timeout** from 20s to 60s
   - File: `backend/app/agents/tutor_agent/mission_generator.py`
   - Change: Line 466
   - Backend restarted with this fix

### 🔄 TODO (Required)

2. **Apply missing database migrations**
   - Run `fix_missing_migrations.sql` in Supabase SQL Editor
   - Creates `achievements` and `student_achievements` tables
   - Adds `score` column to `student_interactions`
   - Adds `noise_flagged` column for speaking tasks

**Steps:**
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/ygpfvkffzrzijqekflep/sql/new
2. Copy contents of `fix_missing_migrations.sql`
3. Paste and click "Run"
4. Verify output shows 10 achievements created

### 🔧 OPTIONAL (Performance)

3. **Start Redis for caching**
   ```bash
   # Install Redis (if not installed)
   # Windows: https://github.com/microsoftarchive/redis/releases
   # Or use WSL: sudo apt install redis-server

   # Start Redis
   redis-server
   ```

## Testing After Fixes

### Backend Test (Timeout Fix)
```bash
# Backend is now running with 60s timeout
# Test by loading any mission type
curl -X GET http://localhost:8000/api/v1/missions/pillar?pillar=reading \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"

# Should succeed within 60s (previously failed at 20s)
```

### Frontend Test (After Applying SQL)
1. Navigate to `/student/missions`
2. Click "Reading Mission" or any mission type
3. Should load successfully without 500 errors

## Expected Results

**Before Fixes:**
- ❌ Missions timeout after 20 seconds
- ❌ 500 errors about missing `achievements` table
- ❌ 500 errors about missing `score` column
- ❌ Redis warning about connection failed

**After Fixes:**
- ✅ Missions load within 60 seconds
- ✅ No errors about achievements table
- ✅ No errors about score column
- ⚠️ Redis warning still appears (but harmless - caching just disabled)

## Files Changed

| File | Change | Status |
|------|--------|--------|
| `backend/app/agents/tutor_agent/mission_generator.py` | Increased timeout 20s → 60s | ✅ Applied |
| `backend/app/api/v1/endpoints/spelling_bee.py` | Added fallback logic | ✅ Applied (previous fix) |
| `frontend/app/student/spelling-bee/page.tsx` | Fixed error handling | ✅ Applied (previous fix) |
| Database schema (via SQL migration) | Add achievements + score column | 🔄 Pending |

## Why This Happened

The code was updated to use new features (achievements, interaction scoring) but the corresponding database migrations were never applied to the production/cloud database. This is a classic **code-database drift** issue.

**Prevention:**
- Always apply migrations immediately after creating them
- Use migration tracking to ensure all migrations are applied
- Run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` regularly to verify schema completeness
