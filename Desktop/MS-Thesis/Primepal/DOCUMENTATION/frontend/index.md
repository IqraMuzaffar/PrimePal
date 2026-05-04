# Frontend

Next.js 14 App Router application with three user interfaces: student (mobile-first gamified), teacher (web dashboard), and admin (management panel).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data Fetching | TanStack Query (React Query) |
| Auth (Teacher/Admin) | Supabase GoTrue via `@supabase/supabase-js` |
| Auth (Student) | Custom PyJWT stored in `localStorage` |
| Animations | Framer Motion |
| Icons | Lucide React |
| PDF Export | jsPDF + jspdf-autotable |
| Avatars | DiceBear API |
| Fonts | Geist Sans + Geist Mono (next/font) |

## Subsections

| Section | Description |
|---------|-------------|
| [pages/](pages/index.md) | All route pages organized by role (student, teacher, admin) |
| [pages/student.md](pages/student.md) | Detailed documentation for every student page |
| [pages/teacher.md](pages/teacher.md) | Detailed documentation for every teacher page |
| [pages/admin.md](pages/admin.md) | Detailed documentation for every admin page |
| [components/](components/index.md) | Reusable components grouped by domain (student, teacher) |
| [lib/](lib/index.md) | Shared utilities, auth helpers, API client |

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx          Root layout (Geist fonts, QueryProvider, metadata)
│   ├── page.tsx            Landing page (/) -- role selector
│   ├── globals.css         Tailwind base styles
│   ├── student/            Student routes (/student/*)
│   │   ├── layout.tsx      Sticky header + bottom nav + streak + offline banner
│   │   ├── play/           Login flow (class code -> avatar -> PIN)
│   │   ├── home/           Student dashboard
│   │   ├── chat/           Bilingual streaming chatbot
│   │   ├── missions/       Mission dashboard + pillar gameplay
│   │   ├── speaking/       Speech recording + evaluation
│   │   ├── spelling-bee/   Audio spelling practice
│   │   ├── story-time/     AI stories + comprehension MCQs
│   │   ├── achievements/   Badge display
│   │   ├── evaluation/     Pre/post test
│   │   └── leaderboard/    Classroom ranking
│   ├── teacher/            Teacher routes (/teacher/*)
│   │   ├── layout.tsx      TeacherShell sidebar nav
│   │   ├── login/          Email/password login (Supabase)
│   │   ├── dashboard/      Stats + quick actions + curriculum upload
│   │   ├── classroom/      Classroom CRUD + detail + syllabus
│   │   ├── students/       Student directory + individual reports
│   │   ├── curriculum/     Upload hub (per-grade)
│   │   ├── missions/       Mission monitoring
│   │   ├── analytics/      Server-side global analytics
│   │   ├── announcements/  Announcement CRUD (school/grade/classroom scope)
│   │   ├── assistant/      AI daily plan generator
│   │   ├── reports/        Grade + student reports with PDF/CSV export
│   │   └── topics/         SNC topic selection per grade
│   └── admin/              Admin routes (/admin/*)
│       ├── layout.tsx      Dark theme shell + admin auth guard
│       ├── login/          Invite code + signup + login
│       └── dashboard/      Evaluations, staff, hierarchy, students, curriculum, export
├── components/
│   ├── student/            Gamified UI components
│   └── teacher/            Dashboard components
├── lib/                    Auth, API, hooks, utilities
├── types/                  Shared TypeScript types
└── public/                 Static assets (sounds, avatars)
```

## Key Patterns

### Authentication

Two completely separate auth systems -- never mix them:

1. **Teacher / Admin** -- Supabase GoTrue. Session managed by `@supabase/supabase-js`. Token attached automatically via `apiFetch()` which calls `supabase.auth.getSession()`.
2. **Student** -- Custom JWT. Token stored in `localStorage` under key `primepal_student_token`. Passed as `Authorization: Bearer <token>` via raw `fetch()` or `studentFetch()` / `studentMutate()`.

### Data Fetching

- **Teacher endpoints**: `apiFetch()` from `lib/api.ts` auto-attaches the Supabase session token.
- **Student endpoints**: Raw `fetch()` with manual `Authorization` header, or `studentFetch()` / `studentMutate()` helpers.
- **TanStack Query hooks**: `lib/hooks/teacher-queries.ts` and `lib/hooks/student-queries.ts`. Provide caching, refetching, loading/error states.
- **Mutations**: `teacherMutate()` and `studentMutate()` helpers wrap fetch + JSON parsing + error handling.
- **FormData uploads**: Always use raw `fetch()` (never `apiFetch`) since `Content-Type` must be omitted for multipart boundaries.

### Offline Support

Student mission completion has offline resilience:
- Failed submissions are queued via `addPendingAnswer()` in localStorage.
- On mount, `flushPendingAnswers()` replays queued submissions.
- `OfflineBanner` component shows connection status in the student layout.

### Audio / Speech APIs

- **Web Speech API** (`SpeechSynthesis`): Used in spelling-bee (pronounce word), story-time (read aloud), evaluation (audio hints for listening/speaking questions).
- **MediaRecorder API**: Used in speaking practice to capture student audio as `audio/webm`, submitted via FormData.
- **Server-Sent Events (SSE)**: Chat streaming -- POST to `/chat/stream`, response is `text/event-stream` with `data: JSON` lines parsed token-by-token.

### Theming

- **Student**: Colorful, gamified. Dynamic backgrounds, Framer Motion animations, confetti effects, floating emojis.
- **Teacher**: Clean white/gray professional dashboard via `TeacherShell` component.
- **Admin**: Dark slate theme (`bg-slate-900`) with its own layout and auth guard.
