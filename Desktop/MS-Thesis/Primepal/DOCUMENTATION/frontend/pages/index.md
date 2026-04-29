# Frontend Pages

All pages use the Next.js 14 App Router (`app/` directory). Routes are organized by user role.

## Student Pages (`/student/*`)

| Route | File | Description |
|-------|------|-------------|
| `/student/play` | `play/page.tsx` | Login step 1: class code entry |
| `/student/play` (step 2) | `play/avatar-select.tsx` | Login step 2: avatar grid selection |
| `/student/play` (step 3) | `play/pin-entry.tsx` | Login step 3: 4-digit PIN entry |
| `/student/home` | `home/page.tsx` | Dashboard: hero, badges, activity cards, daily chest |
| `/student/missions` | `missions/page.tsx` | Four-pillar mission dashboard (reading/writing/listening/speaking) |
| `/student/missions/[pillar]` | `missions/[pillar]/page.tsx` | Pillar gameplay with 15-second timer |
| `/student/chat` | `chat/page.tsx` | Bilingual chatbot interface |
| `/student/spelling-bee` | `spelling-bee/page.tsx` | Audio + typed spelling practice |
| `/student/story-time` | `story-time/page.tsx` | AI story with comprehension questions + TTS |
| `/student/speaking` | `speaking/page.tsx` | Speech recognition practice |
| `/student/leaderboard` | `leaderboard/page.tsx` | Classroom points ranking with podium |

## Teacher Pages (`/teacher/*`)

| Route | File | Description |
|-------|------|-------------|
| `/teacher/login` | `login/page.tsx` | Email/password login via Supabase |
| `/teacher/dashboard` | `dashboard/page.tsx` | KPI stats, at-risk students, quick actions |
| `/teacher/dashboard/curriculum` | `dashboard/curriculum/page.tsx` | Upload history + grade card UI |
| `/teacher/classroom` | `classroom/page.tsx` | Classroom list grouped by grade |
| `/teacher/classroom/[id]` | `classroom/[id]/page.tsx` | Classroom detail: roster, topics, analytics |
| `/teacher/classroom/[id]/syllabus` | `classroom/[id]/syllabus/page.tsx` | Weekly syllabus configuration |
| `/teacher/students` | `students/page.tsx` | Global student directory with search/filter |
| `/teacher/students/[id]/report` | `students/[id]/report/page.tsx` | Per-student AI report card + PDF export |
| `/teacher/curriculum` | `curriculum/page.tsx` | Curriculum upload hub |
| `/teacher/missions` | `missions/page.tsx` | Mission management |
| `/teacher/analytics` | `analytics/page.tsx` | Global analytics dashboard |
| `/teacher/announcements` | `announcements/page.tsx` | Announcement CRUD |
| `/teacher/reports` | `reports/page.tsx` | Bulk PDF report generation |

## Admin Pages (`/admin/*`)

| Route | File | Description |
|-------|------|-------------|
| `/admin/login` | `login/page.tsx` | Admin login + signup with invite code |
| `/admin/dashboard` | `dashboard/page.tsx` | Admin overview |
| `/admin/dashboard/staff` | `dashboard/staff/page.tsx` | Teacher management + invite codes |
| `/admin/dashboard/hierarchy` | `dashboard/hierarchy/page.tsx` | Classroom-teacher assignment |
| `/admin/dashboard/curriculum` | `dashboard/curriculum/page.tsx` | Curriculum chunk audit |
