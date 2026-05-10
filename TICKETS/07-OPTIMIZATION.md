# Ticket 07: Optimization

**Priority:** 7
**Status:** DONE
**Impact:** Slow queries, large bundles, unnecessary network calls

## Backend

### Supabase client re-created every request

- [x] `backend/app/core/supabase_client.py:11-18` — `create_client()` called on every invocation
- **Fix:** Cache as module-level singletons

### N+1 query in classroom report

- [x] `backend/app/api/v1/endpoints/evaluator.py:168-192` — separate query per student
- **Fix:** Single query with `in_("student_id", student_ids)`

### Double DB query on empty transcript

- [x] `backend/app/api/v1/endpoints/speaking.py:200-217` — two separate queries for points when transcript is empty
- **Fix:** Fetch once, reuse result

### Hardcoded grade_level

- [x] `backend/app/api/v1/endpoints/interactions.py:96` — hardcodes `grade_level: 0`
- **Fix:** Fetch actual grade level from student record

## Frontend

### Static import of heavy PDF library

- [x] `frontend/app/teacher/students/[id]/report/page.tsx:7-8` — jsPDF (~500KB) imported statically
- **Fix:** Use dynamic `import()` on button click

### Raw img instead of next/image

- [x] `frontend/components/teacher/AnalyticsOverview.tsx:94` — `<img>` for avatar
- [x] `frontend/components/teacher/AnalyticsByStudent.tsx:151` — `<img>` for avatar
- **Fix:** Replace with `next/image` Image component

### Duplicate schema

- [x] `frontend` — not applicable here, but backend has duplicate `SncTopicOut` in `topics.py` and `classroom.py`
- **Fix:** Extract to shared schema file
