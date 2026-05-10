# Ticket 01: Hardcoded URLs and CORS

**Priority:** 1 (Ship-blocker)
**Status:** TODO
**Impact:** Entire app non-functional in production

## Problem

Frontend has 6 hardcoded `localhost:8000` URLs bypassing `apiFetch`, admin pages use relative `/api/v1/` paths with no proxy, and backend CORS only allows `localhost:3000`.

## Issues

### Frontend — Hardcoded localhost:8000

- [ ] `frontend/app/student/speaking/page.tsx:182` — `fetch('http://localhost:8000/api/v1/speaking/evaluate-pro', ...)`
- [ ] `frontend/components/teacher/CreateClassroomModal.tsx:28` — `fetch("http://localhost:8000/api/v1/classroom/", ...)`
- [ ] `frontend/components/teacher/FileUploadZone.tsx:68` — `fetch("http://localhost:8000/api/v1/curriculum/upload", ...)`
- [ ] `frontend/components/teacher/UploadBookModal.tsx:67` — `fetch("http://localhost:8000/api/v1/curriculum/upload", ...)`
- [ ] `frontend/app/teacher/curriculum/page.tsx:46` — `fetch("http://localhost:8000/api/v1/curriculum/uploads", ...)`
- [ ] `frontend/app/teacher/curriculum/page.tsx:107` — `fetch("http://localhost:8000/api/v1/topics?grade_level=...", ...)`

**Fix:** Replace all with `apiFetch()` or use the configured `NEXT_PUBLIC_API_URL` env var.

### Frontend — Admin pages with no proxy

- [ ] `frontend/app/admin/login/page.tsx:28,61` — `fetch("/api/v1/admin/...")`
- [ ] `frontend/app/admin/dashboard/staff/page.tsx:29,43` — `fetch("/api/v1/admin/...")`
- [ ] `frontend/app/admin/dashboard/hierarchy/page.tsx:35,39` — `fetch("/api/v1/admin/...")`
- [ ] `frontend/app/admin/dashboard/curriculum/page.tsx:25` — `fetch("/api/v1/admin/...")`

**Fix:** Either add Next.js rewrites in `next.config.mjs` or switch to `apiFetch()`.

### Backend — CORS locked to localhost

- [ ] `backend/app/core/config.py:37` — `ALLOWED_ORIGINS` defaults to `["http://localhost:3000"]`
- [ ] `backend/.env:25` — only `http://localhost:3000`

**Fix:** Make CORS origins configurable, add production domain.

### Backend — Redis hardcoded

- [ ] `backend/app/main.py:24` — Redis URL hardcoded to `"redis://localhost:6379"`

**Fix:** Move to config/env var.
