# Frontend

Next.js 14 App Router application with three user interfaces: student (mobile-first gamified), teacher (web dashboard), and admin (management panel).

## Subsections

| Section | Description |
|---------|-------------|
| [pages/](pages/index.md) | All route pages organized by role (student, teacher, admin) |
| [components/](components/index.md) | Reusable components grouped by domain (student, teacher) |
| [lib/](lib/index.md) | Shared utilities, auth helpers, API client |

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx          → Root layout (fonts, global CSS)
│   ├── page.tsx            → Landing page (/)
│   ├── globals.css         → Tailwind base styles
│   ├── student/            → Student routes (/student/*)
│   │   ├── layout.tsx      → Sticky header + bottom nav + logout
│   │   ├── play/           → Login flow (class code → avatar → PIN)
│   │   ├── home/           → Student dashboard
│   │   ├── missions/       → Daily + pillar missions
│   │   ├── chat/           → Bilingual chatbot
│   │   ├── spelling-bee/   → Spelling practice
│   │   ├── story-time/     → AI stories + comprehension
│   │   ├── speaking/       → Speech practice
│   │   └── leaderboard/    → Classroom ranking
│   ├── teacher/            → Teacher routes (/teacher/*)
│   │   ├── layout.tsx      → TeacherShell sidebar nav
│   │   ├── login/          → Email/password login
│   │   ├── dashboard/      → Stats + quick actions
│   │   ├── classroom/      → Classroom CRUD + detail
│   │   ├── students/       → Student directory + reports
│   │   ├── curriculum/     → Upload hub
│   │   ├── missions/       → Mission management
│   │   ├── analytics/      → Global analytics
│   │   ├── announcements/  → Announcement CRUD
│   │   └── reports/        → PDF report generation
│   └── admin/              → Admin routes (/admin/*)
│       ├── layout.tsx      → Admin sidebar with tab nav
│       ├── login/          → Admin login + signup (invite code)
│       └── dashboard/      → Staff, hierarchy, curriculum management
├── components/
│   ├── student/            → Gamified UI components
│   └── teacher/            → Dashboard components
├── lib/                    → Auth, API, utilities
├── types/                  → Shared TypeScript types
└── public/                 → Static assets (sounds, avatars)
```

## Key Patterns

- **apiFetch** (`lib/api.ts`) — Typed fetch wrapper using `NEXT_PUBLIC_API_URL` env var, handles JSON serialization + teacher auth headers
- **Teacher auth** — `lib/teacherAuth.ts` → `getTeacherHeaders()` reads Supabase session
- **Student auth** — JWT stored in `localStorage['primepal_student_token']`, sent as Bearer token
- **Admin auth** — `lib/adminAuth.ts` → Supabase GoTrue + client-side JWT decode for admin check
- **Supabase client** — `lib/supabase/client.ts` → browser-side Supabase instance
