# A05 — Admin Has All Teacher Features

**Priority:** MEDIUM
**Status:** TODO
**Depends on:** T01-T05 (teacher features must be built first)

## What Exists

- Admin login: `/admin/login` — email/password + invite code
- Admin dashboard: `/admin/dashboard/*` — limited to staff + hierarchy + curriculum stubs
- Admin auth: custom PyJWT with `is_admin: true`
- Teacher pages: `/teacher/*` — full dashboard, analytics, classroom management, reports
- Admin CANNOT access teacher pages (separate auth systems)

## What Needs to Be Built

### 1. Route Access Strategy

Two approaches (pick one):

**Option A — Dual-auth route guard (recommended):**
- Teacher pages (`/teacher/*`) accept BOTH teacher JWT (Supabase GoTrue) and admin JWT (custom PyJWT)
- Add middleware: if admin JWT is valid, allow access to teacher routes
- Admin sees the same UI but with an "Admin" badge

**Option B — Replicate on admin routes:**
- Copy teacher functionality to `/admin/dashboard/analytics`, `/admin/dashboard/classrooms`, etc.
- More code duplication but cleaner separation

### 2. Feature Checklist — Admin Must Have

| Teacher Feature | Teacher Route | Admin Access? |
|----------------|---------------|---------------|
| Dashboard KPIs | `/teacher/dashboard` | NEEDED |
| Analytics (Overview/Grade/Class/Student) | `/teacher/dashboard` tabs | NEEDED |
| Classroom management | `/teacher/classroom/*` | NEEDED (via A02) |
| Topic selection | `/teacher/topics` (T02) | NEEDED |
| Student reports | `/teacher/students/[id]/report` | NEEDED |
| Report generation + PDF export | `/teacher/reports` (T03) | NEEDED |
| Grade overview | `/teacher/dashboard` (T04) | NEEDED |
| Teacher AI assistant | `/teacher/assistant` (T05) | NEEDED |
| Announcements | `/teacher/announcements` | NEEDED |
| Curriculum upload | `/teacher/curriculum` | MOVED TO ADMIN (A03) |

### 3. Admin-Only Features (Beyond Teacher)

These features are admin-exclusive and should NOT be on teacher routes:
- Pre/post test triggers (A01)
- Full CRUD on all entities (A02)
- Gradebook upload (A03)
- Data export (A04)
- Invite code management (exists)

## Engineering Notes

- Option A (dual-auth) is cleaner — less code, single source of truth for teacher features
- Backend endpoints already check auth via JWT — extend the auth middleware to accept admin tokens on teacher endpoints
- Frontend: create a shared `useAuth()` hook that works for both teacher and admin sessions
- The admin should see all data (global view) — not filtered to one teacher's classrooms

## Files to Touch

- `frontend/src/lib/auth.ts` — dual-auth support
- `frontend/src/app/teacher/` — route guards to accept admin JWT
- `backend/app/core/security.py` — middleware to accept admin JWT on teacher endpoints
- `frontend/src/app/admin/dashboard/` — navigation links to teacher features
