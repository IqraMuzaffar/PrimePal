# Ticket 03: Mock Data Removal

**Priority:** 3 (Ship-blocker)
**Status:** TODO
**Impact:** Teachers see fabricated statistics and analytics

## Issues

### Teacher Dashboard — Random stats

- [ ] `frontend/app/teacher/dashboard/page.tsx:37-39` — Student count, interactions, accuracy all generated with `Math.random()`
- **Fix:** Wire to real backend data via API calls, or show "coming soon" placeholder

### Teacher Analytics — Fabricated data

- [ ] `frontend/app/teacher/analytics/page.tsx:101` — Points fabricated as `total_interactions * 10`
- [ ] `frontend/app/teacher/analytics/page.tsx:104-111` — Weak points per grade are hardcoded strings
- [ ] `frontend/app/teacher/analytics/page.tsx:119` — Roll numbers are `Math.floor(Math.random() * 9000) + 1000`
- **Fix:** Wire to real backend analytics endpoints or clearly mark as "demo data"

### Report Page — Auth never works

- [ ] `frontend/app/teacher/students/[id]/report/page.tsx:59-62` — Uses `localStorage.getItem("primepal_teacher_token")` which is never set
- **Fix:** Switch to `getTeacherHeaders()` which uses Supabase session
