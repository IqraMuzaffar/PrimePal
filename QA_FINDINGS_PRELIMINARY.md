# QA Findings - Preliminary Code Analysis
**Date:** 2026-05-06
**Status:** In Progress (Parallel agents analyzing mission generation, reporting, and topic selection)

---

## EXECUTIVE SUMMARY

Based on static code analysis of the complete teacher-student flow, I've identified several **CRITICAL** and **HIGH** priority issues that must be addressed before production deployment.

**Overall Assessment:** ⚠️ **NOT PRODUCTION READY** - Critical issues found

---

## CRITICAL ISSUES

### ISSUE #1: Mission Topic Alignment - CRITICAL BUG 🔴
**Component:** Student Mission Generation
**File:** `backend/app/agents/tutor_agent/mission_generator.py:419-420`
**Severity:** CRITICAL (P0)

**Problem:**
The LLM prompt includes the text:
```python
ACTIVE TOPICS: {topic_text}
```

BUT there's no enforcement or validation that the generated questions actually use these topics. The LLM is instructed to use the topics, but:
1. No post-generation validation checks if questions align with teacher-selected topics
2. LLM may ignore the instruction (especially under token/context pressure)
3. Students may get questions on topics the teacher DIDN'T select

**Impact:**
- **Teacher selects** "Animals" and "Food" topics for Grade 4
- **Student gets questions** about "Weather" and "Transportation" (from LLM's general knowledge)
- **Complete disconnect** between teacher planning and student experience
- **Breaks the core promise** of the system

**Evidence:**
```python
# mission_generator.py:419-420
ACTIVE TOPICS: {topic_text}
# ...but then:
# mission_generator.py:502-514 - NO validation that questions match topics
validated.append(d)  # Just accepts whatever LLM returns!
```

**Recommended Fix:**
```python
# After LLM generation, validate each question
for q in result.questions:
    # Extract keywords from question text
    q_keywords = extract_keywords(q.question.lower())

    # Check if ANY active topic appears in the question
    topic_match = any(
        topic.lower() in q.question.lower()
        for topic in active_topics
    )

    if not topic_match and active_topics:
        logger.warning(f"Question doesn't match active topics: {q.question[:50]}")
        # Either reject and regenerate, or flag for review
```

**Test Case:**
```
Teacher selects: ["Phonics", "Vocabulary Building"]
Student requests reading missions
→ VERIFY: All 10 questions actually reference these topics
```

---

### ISSUE #2: No Topics Selected Fallback - AMBIGUOUS BEHAVIOR 🟡
**Component:** Mission Generation
**File:** `backend/app/agents/tutor_agent/mission_generator.py:341`
**Severity:** HIGH (P1)

**Problem:**
```python
topic_text = ", ".join(active_topics) if active_topics else "General English skills"
```

When teacher hasn't selected topics:
- LLM receives "General English skills" as topic
- Generates questions from ANY random English content
- Student experience is unpredictable
- No clear messaging to teacher that topic selection is needed

**Current Behavior:**
- `active_topics = []` → missions generated on "General English skills"
- Student sees random questions
- Teacher has no visibility that topics need configuration

**Impact:**
- New classrooms without topic selection give random experience
- Teachers don't know they need to select topics
- Inconsistent student experience across classrooms

**Recommended Fix:**
1. **Option A (Strict):** Require topic selection before missions are available
   ```python
   if not active_topics:
       raise HTTPException(
           status_code=400,
           detail="No topics selected. Teacher must select topics first."
       )
   ```

2. **Option B (Permissive):** Default to ALL grade topics + clear warning
   ```python
   if not active_topics:
       # Get ALL topics for this grade
       all_grade_topics = get_all_topics_for_grade(grade_level)
       logger.warning(f"No topics selected for classroom {classroom_id}, using all grade topics")
       # Show UI message to student: "Your teacher hasn't selected specific topics yet"
   ```

**Test Case:**
```
Teacher creates Grade 4 classroom
Teacher does NOT select topics
Student logs in and requests reading missions
→ VERIFY: What happens? Clear error? All topics? Random topics?
```

---

###ISSUE #3: Weakness Detection - POTENTIAL INSUFFICIENT DATA 🟡
**Component:** Student Weakness Tracking
**File:** `backend/app/api/v1/endpoints/missions.py:769-787`
**Severity:** HIGH (P1)

**Problem:**
```python
async def fetch_weaknesses():
    """Fetch student's recent incorrect answers (weaknesses)."""
    resp = (
        supabase.table("student_interactions")
        .select("original_message, interaction_type")
        .eq("student_id", student_id)
        .eq("correct", False)
        .order("created_at", desc=True)
        .limit(5)  # ONLY LAST 5 INCORRECT ANSWERS
        .execute()
    )
    return [r["original_message"] for r in (resp.data or []) if r.get("original_message")]
```

**Issues:**
1. **Only 5 incorrect answers** - Not enough data for robust weakness detection
2. **Uses `original_message` field** - This is only populated for chat interactions, NOT mission completions
3. **Mission completions don't store question text** - They only store `correct: true/false`
4. **Weakness context may be empty** even when student has many wrong answers

**Evidence:**
Check `student_interactions` table schema (DOCUMENTATION/database/tables.md:94-96):
```
| original_message | TEXT | YES | -- | Student's raw input |
```
- This is populated for CHAT ("What is a noun?")
- This is NULL for mission completions (they only log correct/incorrect)

**Impact:**
- Weakness detection doesn't actually work for mission-based weaknesses
- LLM receives empty weakness context
- Personalization feature is broken for most students

**Recommended Fix:**
```python
# Option 1: Store question topic/skill in interactions
# migration: ADD COLUMN topic TEXT, skill TEXT to student_interactions

# Option 2: Analyze pillar-based weaknesses
async def fetch_weaknesses():
    # Get last 30 interactions (more data)
    resp = supabase.table("student_interactions")
        .select("pillar, interaction_type, correct, score")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .limit(30)
        .execute()

    # Analyze: Which pillars have low accuracy?
    pillar_stats = {}
    for r in resp.data:
        p = r.get("pillar")
        if p:
            if p not in pillar_stats:
                pillar_stats[p] = {"correct": 0, "total": 0}
            pillar_stats[p]["total"] += 1
            if r.get("correct"):
                pillar_stats[p]["correct"] += 1

    # Return pillars with <60% accuracy as weaknesses
    weaknesses = []
    for pillar, stats in pillar_stats.items():
        if stats["total"] >= 3:  # At least 3 attempts
            acc = stats["correct"] / stats["total"]
            if acc < 0.6:
                weaknesses.append(f"{pillar} (accuracy: {acc*100:.0f}%)")

    return weaknesses
```

**Test Case:**
```
Student completes 10 reading missions with 4 correct, 6 wrong
→ CHECK student_interactions.original_message: Are question texts stored?
→ REQUEST new reading missions: Does weakness context include reading struggles?
```

---

### ISSUE #4: Cache Invalidation on Topic Change - NOT IMPLEMENTED 🟡
**Component:** Mission Caching
**File:** `backend/app/api/v1/endpoints/missions.py:808-827`
**Severity:** HIGH (P1)

**Problem:**
Missions are cached for 1 hour (`ttl=3600`) with a cache key based on:
```python
cache_key = make_cache_key("pillar_missions", student_id, pillar, str(is_frustrated), topics_hash)
```

The `topics_hash` is based on active topics:
```python
topics_hash = hashlib.md5(",".join(sorted(active_topic_names)).encode()).hexdigest()[:12]
```

**BUT** when teacher changes topics via `PUT /classroom/{id}/active-topics`:
```python
# classroom.py:509-530
async def update_classroom_active_topics(...):
    # ...saves new topics...
    # background_tasks.add_task(invalidate_missions_cache, classroom_id)  # NOT FOUND!
```

**No cache invalidation!**

**Impact:**
1. Teacher selects topics A, B, C at 10:00 AM
2. Student gets missions cached (expires 11:00 AM)
3. Teacher changes to topics D, E, F at 10:15 AM
4. **Student STILL gets old missions until 11:00 AM**
5. Missions don't reflect current topic selection for up to 1 hour

**Recommended Fix:**
```python
# classroom.py - after updating topics
background_tasks.add_task(invalidate_classroom_missions_cache, classroom_id)

# Add function to invalidate all student caches for this classroom
async def invalidate_classroom_missions_cache(classroom_id: str):
    """Invalidate mission caches for all students in a classroom."""
    # Get all students in classroom
    students = supabase.table("students"
).select("id").eq("classroom_id", classroom_id).execute()

    for student in students.data:
        for pillar in ["reading", "writing", "listening", "speaking"]:
            # Delete cache keys for this student
            cache_key_pattern = f"pillar_missions:{student['id']}:{pillar}:*"
            await cache_delete_pattern(cache_key_pattern)
```

**Test Case:**
```
Teacher selects topics A, B
Student requests missions → cached
Teacher changes to topics C, D
Student requests missions IMMEDIATELY
→ VERIFY: Student gets NEW missions with topics C, D (not cached A, B missions)
```

---

## HIGH PRIORITY ISSUES

### ISSUE #5: Performance Profile Caching - STALE DATA RISK 🟡
**Component:** Student Performance
**File:** `backend/app/utils/performance_profile.py` (referenced)
**Severity:** MEDIUM (P2)

**Problem:**
Performance profile is fetched and cached, but may show stale data after student completes missions.

**Current Flow:**
1. Student requests missions → performance profile fetched and cached
2. Student completes 10 missions → points updated, interactions logged
3. Student requests more missions → **OLD performance profile used** (cached)
4. Next missions not adaptive to just-completed work

**Impact:**
- Student struggles with reading (40% accuracy)
- Completes 8/10 reading missions correctly (improves to 60%)
- Requests more reading missions
- **Still sees "struggling" difficulty** because profile is cached

**Recommended Fix:**
```python
# missions.py:426-430 - Already has invalidation!
background_tasks.add_task(
    debounced_invalidate,
    student_id,
    [invalidate_performance_cache, invalidate_rewards_cache, invalidate_scores_cache],
)
```

**Test:** Verify `invalidate_performance_cache` is actually called and works.

---

### ISSUE #6: LLM Timeout Handling - USER EXPERIENCE 🟡
**Component:** Mission Generation
**File:** `backend/app/agents/tutor_agent/mission_generator.py:472-475`
**Severity:** MEDIUM (P2)

**Current:**
```python
result: PillarMissions | None = await asyncio.wait_for(
    chain.ainvoke({}),
    timeout=30.0,  # 30 second timeout
)
```

**Problem:**
- If LLM takes >30s → asyncio.TimeoutError raised
- User sees generic 503 error: "Could not generate missions right now"
- No retry mechanism at the endpoint level
- User has to manually retry (bad UX)

**Impact:**
- Peak times or slow OpenAI responses → students can't get missions
- Error message not helpful ("try again shortly" - when?)
- No automatic retry

**Recommended Fix:**
```python
# Endpoint level (missions.py) - already has retry in generator
# BUT: Consider adding retry at endpoint level too

MAX_GENERATION_ATTEMPTS = 3
for attempt in range(MAX_GENERATION_ATTEMPTS):
    try:
        missions = await generate_pillar_missions(...)
        break
    except asyncio.TimeoutError:
        if attempt < MAX_GENERATION_ATTEMPTS - 1:
            logger.warning(f"LLM timeout, retrying... ({attempt+1}/{MAX_GENERATION_ATTEMPTS})")
            await asyncio.sleep(2)  # Brief delay
        else:
            raise HTTPException(
                status_code=503,
                detail="Mission generation timed out after 3 attempts. Please try again in a moment."
            )
```

---

### ISSUE #7: No Question Count Validation - DATA INTEGRITY 🟡
**Component:** Mission Generation
**File:** `backend/app/agents/tutor_agent/mission_generator.py:484-496`
**Severity:** MEDIUM (P2)

**Current:**
```python
if questions_returned < PILLAR_QUESTIONS_COUNT:
    logger.error(f"LLM generated only {questions_returned}/{PILLAR_QUESTIONS_COUNT} questions")
    raise ValueError("LLM returned incomplete results")
```

**Good:** Already validates count!

**BUT:** What if LLM returns 11, 12, or 15 questions?
```python
questions_to_use = result.questions[:PILLAR_QUESTIONS_COUNT]  # Just truncates
```

**Issue:**
- No warning logged if LLM over-generates
- Silently discards extra questions
- Might indicate prompt issue if consistently generating too many

**Recommended Fix:**
```python
if questions_returned > PILLAR_QUESTIONS_COUNT:
    logger.warning(
        f"LLM generated {questions_returned} questions (expected {PILLAR_QUESTIONS_COUNT}). "
        f"Truncating to {PILLAR_QUESTIONS_COUNT}. Check prompt if this happens frequently."
    )
```

---

## MEDIUM PRIORITY ISSUES

### ISSUE #8: Student Weaknesses Always Fetched - PERFORMANCE 🔵
**Component:** Mission Generation
**File:** `backend/app/api/v1/endpoints/missions.py:790-794`
**Severity:** LOW (P3)

**Current:**
```python
grade_level, student_weaknesses, performance_profile = await asyncio.gather(
    fetch_classroom_grade(),
    fetch_weaknesses(),  # ALWAYS fetched, even if not used
    get_student_performance_profile(student_id)
)
```

**Problem:**
- `fetch_weaknesses()` queries DB even when `is_frustrated=true` (which ignores weaknesses)
- Wastes DB query + processing time
- Not a critical issue but impacts performance at scale

**Recommended Fix:**
```python
if not is_frustrated:
    grade_level, student_weaknesses, performance_profile = await asyncio.gather(...)
else:
    # Skip weakness fetch for frustrated students (confidence builder mode)
    grade_level = await fetch_classroom_grade()
    student_weaknesses = []
    performance_profile = None
```

---

### ISSUE #9: Reporting Endpoint - No Date Range Filter ⚠️
**Component:** Teacher Reporting
**File:** `backend/app/api/v1/endpoints/evaluator.py:64-120`
**Severity:** MEDIUM (P2)

**Current:**
```python
@router.get("/report/student/{student_id}", ...)
async def student_report(student_id: str, teacher: dict = Depends(...)):
    # Fetches last 30 interactions
    return await evaluate_interactions(student_id=student_id, ...)
```

**Problem:**
- Always shows last 30 interactions
- No way for teacher to see:
  - "How did student do THIS WEEK?"
  - "What's the improvement since LAST MONTH?"
  - "Show me just TODAY's work"

**Impact:**
- Limited analytical capability
- Can't track progress over time periods
- Can't see if interventions worked

**Recommended Fix:**
```python
@router.get("/report/student/{student_id}/detailed", ...)
async def student_report(
    student_id: str,
    teacher: dict = Depends(...),
    start_date: str | None = Query(None, description="Filter interactions from this date (ISO 8601)"),
    end_date: str | None = Query(None, description="Filter interactions to this date (ISO 8601)"),
    pillar: str | None = Query(None, description="Filter by specific pillar"),
):
    # Pass filters to evaluation function
    return await evaluate_interactions(
        student_id=student_id,
        start_date=start_date,
        end_date=end_date,
        pillar_filter=pillar,
        ...
    )
```

---

## SECURITY AUDIT

### ISSUE #10: Correct Answers Returned to Client - CHEATING RISK 🔴
**Component:** Mission Response
**File:** `backend/app/api/v1/endpoints/missions.py:156-157`
**Severity:** CRITICAL (P0) - But Acknowledged

**Current:**
```python
correct_order=getattr(q, 'correct_order', None),  # Include for frontend validation!
correct_answer=getattr(q, 'correct_answer', None),  # Include for frontend validation!
```

**Problem:**
- Correct answers ARE sent to client (line 87, 171)
- Comment says "for frontend validation"
- Opens door to cheating (inspect network tab → see all answers)

**Justification** (from code comments):
> "primary students, learning-focused"

**Risk Assessment:**
- **Low** for primary students (6-10 years old, unlikely to use dev tools)
- **Medium** if older students get access
- **High** if system scales beyond primary grades

**Recommended Fix (for production):**
1. **Option A:** Remove `correct_answer` from response, validate server-side only
2. **Option B:** Encrypt correct_answer in response, decrypt on submit (client can't read)
3. **Option C:** Accept the risk for primary grades, add rate limiting to prevent brute force

**Current Status:** ✅ Acceptable for Grade 1-5 primary students, ⚠️ Document as known limitation

---

## PERFORMANCE ANALYSIS

### Response Time Targets vs. Estimated Actual

| Endpoint | Target | Estimated Actual | Status |
|----------|--------|------------------|--------|
| GET /topics | <500ms | ~200ms | ✅ OK |
| PUT /active-topics | <1s | ~300ms | ✅ OK |
| GET /missions/pillar (cold) | <5s | ~8-12s | ⚠️ SLOW |
| GET /missions/pillar (cached) | <1s | ~200ms | ✅ OK |
| POST /missions/complete | <500ms | ~300ms | ✅ OK |
| GET /evaluator/report (detailed) | <10s | ~15-20s | ⚠️ SLOW |

**Bottlenecks Identified:**
1. **LLM Generation (missions):** 8-12s for 10 questions
   - Mitigation: Caching (already implemented)
   - Improvement: Pre-generate missions for common scenarios
2. **LLM Insights (reporting):** 10-15s for evaluation
   - Mitigation: Background job + polling?
   - Improvement: Simpler prompts, smaller context

---

## EDGE CASES CHECKLIST

| Scenario | Handled? | Notes |
|----------|----------|-------|
| No topics selected | ⚠️ Partial | Falls back to "General English skills" - unclear UX |
| Student with 0 interactions | ✅ Yes | Generic missions, no weaknesses |
| Teacher changes topics mid-session | ❌ No | Cache not invalidated |
| LLM timeout/failure | ⚠️ Partial | Retry at generator level, but poor UX messaging |
| Duplicate submission (offline sync) | ✅ Yes | Idempotency check implemented (60s window) |
| Invalid pillar name | ✅ Yes | Validation before generation |
| Malformed JSON | ✅ Yes | Pydantic validation |
| SQL injection | ✅ Yes | Parameterized queries via Supabase client |
| XSS in questions | ⚠️ Unknown | Need to verify output encoding |
| Student in multiple classrooms | ⚠️ Unknown | JWT only has one classroom_id |

---

## PRODUCTION READINESS SCORECARD

| Category | Score | Details |
|----------|-------|---------|
| **Functionality** | 6/10 | Core flow works but topic alignment not validated |
| **Data Integrity** | 7/10 | Weakness tracking broken, cache invalidation missing |
| **Performance** | 6/10 | LLM calls slow, but cached well |
| **Security** | 8/10 | Auth good, RLS enabled, but answers sent to client |
| **Error Handling** | 7/10 | Most errors caught, but UX messaging poor |
| **Scalability** | 7/10 | Caching helps, but no load testing done |
| **Monitoring** | 5/10 | Basic logging, no metrics/alerts |
| **Documentation** | 9/10 | Excellent documentation! |

**Overall: 6.9/10** - **Not Production Ready Without Fixes**

---

## RECOMMENDATIONS

### Must Fix Before Production (P0):
1. ✅ Add topic alignment validation in mission generation
2. ✅ Fix weakness detection to actually work for missions
3. ✅ Implement cache invalidation on topic changes
4. ⚠️ Decision needed: Allow/block missions when no topics selected

### Should Fix Before Production (P1):
5. Improve error messages for LLM timeouts
6. Add date range filters to reporting
7. Performance optimize report generation (consider background jobs)

### Nice to Have (P2):
8. Pre-generate missions for common scenarios
9. Add monitoring/alerting for LLM failures
10. Load testing with 50-100 concurrent students

---

## NEXT STEPS

1. **Wait for parallel agent analysis** to complete:
   - Mission generation logic deep dive
   - Reporting and AI assistant analysis
   - Topic selection flow verification

2. **Manual Testing** (requires running backend):
   - Create Grade 4 and Grade 5 test classrooms
   - Select topics and verify mission alignment
   - Complete missions and verify weakness tracking
   - Generate reports and check AI insights

3. **Performance Testing:**
   - Measure actual response times
   - Test concurrent student load
   - Verify cache hit rates

4. **Fix Critical Issues:**
   - Implement topic validation
   - Fix weakness detection
   - Add cache invalidation

5. **Re-test Complete Flow:**
   - Run full QA test plan
   - Verify all issues resolved

---

**Status:** Waiting for parallel agent completions...
**Next Update:** After agents finish analysis
