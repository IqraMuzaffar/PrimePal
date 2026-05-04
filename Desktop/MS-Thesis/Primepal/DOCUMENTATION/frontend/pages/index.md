# Frontend Pages

All pages use the Next.js 14 App Router (`app/` directory). Routes are organized by user role.

For detailed per-page documentation see:
- [Student Pages](student.md) -- 12 pages (login, dashboard, chat, missions, speaking, spelling, stories, achievements, evaluation, leaderboard)
- [Teacher Pages](teacher.md) -- 15 pages (login, dashboard, classrooms, students, reports, analytics, announcements, topics, missions, AI assistant)
- [Admin Pages](admin.md) -- 7 pages (login, evaluations, staff, hierarchy, students, curriculum, export)

---

## Root Pages

| Route | File | Auth | Description |
|-------|------|------|-------------|
| `/` | `app/page.tsx` | None | Landing page with two role cards: Student -> `/student/play`, Teacher -> `/teacher/login`. Uses `AnimatedHero` and `FloatingEmojis`. |

## Student Pages (`/student/*`)

Auth: Custom PyJWT via `localStorage['primepal_student_token']`

| Route | File | Description |
|-------|------|-------------|
| `/student/play` | `play/page.tsx` | 3-step login: class code -> avatar selection -> PIN entry |
| `/student/home` | `home/page.tsx` | Dashboard: hero strip, quick-launch cards, daily chest, achievements shelf |
| `/student/chat` | `chat/page.tsx` | Bilingual streaming chatbot (SSE) |
| `/student/missions` | `missions/page.tsx` | Four-pillar mission dashboard |
| `/student/missions/[pillar]` | `missions/[pillar]/page.tsx` | Pillar gameplay with offline support |
| `/student/speaking` | `speaking/page.tsx` | Audio recording + pronunciation evaluation |
| `/student/spelling-bee` | `spelling-bee/page.tsx` | Audio spelling practice with TTS + 2 attempts |
| `/student/story-time` | `story-time/page.tsx` | AI story with TTS read-aloud + MCQ comprehension |
| `/student/achievements` | `achievements/page.tsx` | Badge display (unlocked vs locked, bronze/silver/gold tiers) |
| `/student/evaluation` | `evaluation/page.tsx` | Pre/post test (likert_emoji + MCQ, audio hints) |
| `/student/leaderboard` | `leaderboard/page.tsx` | Classroom points ranking with podium for top 3 |

## Teacher Pages (`/teacher/*`)

Auth: Supabase GoTrue via `apiFetch()` / `teacherFetch()`

| Route | File | Description |
|-------|------|-------------|
| `/teacher/login` | `login/page.tsx` | Email/password login via Supabase |
| `/teacher/dashboard` | `dashboard/page.tsx` | KPI stats, skill accuracy breakdown, classroom cards |
| `/teacher/dashboard/curriculum` | `dashboard/curriculum/page.tsx` | Textbook PDF upload + chunk preview |
| `/teacher/classroom` | `classroom/page.tsx` | Classroom list grouped by grade, create/delete |
| `/teacher/classroom/[id]` | `classroom/[id]/page.tsx` | Roster management, topic selection, PIN management |
| `/teacher/classroom/[id]/syllabus` | `classroom/[id]/syllabus/page.tsx` | 30-week syllabus grid, unlock next week |
| `/teacher/curriculum` | `curriculum/page.tsx` | Per-grade curriculum upload hub |
| `/teacher/students` | `students/page.tsx` | Global student directory with search/filter |
| `/teacher/students/[id]/report` | `students/[id]/report/page.tsx` | Individual student AI report card + PDF export |
| `/teacher/analytics` | `analytics/page.tsx` | Server-side aggregated analytics dashboard |
| `/teacher/announcements` | `announcements/page.tsx` | Announcement CRUD (classroom/grade/school scope) |
| `/teacher/assistant` | `assistant/page.tsx` | AI daily teaching plan generator |
| `/teacher/missions` | `missions/page.tsx` | Per-classroom mission monitoring |
| `/teacher/reports` | `reports/page.tsx` | Grade + student reports with PDF/CSV export |
| `/teacher/topics` | `topics/page.tsx` | SNC topic activation per grade (admin-only editing) |

## Admin Pages (`/admin/*`)

Auth: Supabase GoTrue + `isCurrentUserAdmin()` guard

| Route | File | Description |
|-------|------|-------------|
| `/admin/login` | `login/page.tsx` | Invite code validation + signup + login |
| `/admin/dashboard` | `dashboard/page.tsx` | Evaluation management, trigger post-tests |
| `/admin/dashboard/staff` | `dashboard/staff/page.tsx` | Teacher management + invite code generation |
| `/admin/dashboard/hierarchy` | `dashboard/hierarchy/page.tsx` | Classroom-teacher assignments |
| `/admin/dashboard/students` | `dashboard/students/page.tsx` | Student CRUD + PIN reset |
| `/admin/dashboard/curriculum` | `dashboard/curriculum/page.tsx` | Book upload pipeline + chunk viewer |
| `/admin/dashboard/export` | `dashboard/export/page.tsx` | Data export (CSV/JSON) with filters |
