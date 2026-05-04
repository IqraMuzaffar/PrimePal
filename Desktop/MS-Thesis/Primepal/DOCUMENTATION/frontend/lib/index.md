# Frontend Libraries

Shared utilities, auth helpers, React Query hooks, and networking modules in `frontend/lib/`.

## Modules

| File | Doc | Description |
|------|-----|-------------|
| `api.ts` | [api.md](api.md) | `apiFetch()` -- generic typed fetch wrapper for the backend API |
| `api-helpers.ts` | [api.md](api.md) | Role-specific fetch helpers: `adminFetch`, `teacherFetch`, `studentFetch`, `adminMutate`, `teacherMutate`, `studentMutate` |
| `teacherAuth.ts` | [auth.md](auth.md) | `getTeacherHeaders()` -- Supabase session-based auth headers |
| `adminAuth.ts` | [auth.md](auth.md) | `getAdminHeaders()`, `isCurrentUserAdmin()` -- admin auth and role check |
| `hooks/queries.ts` | [hooks.md](hooks.md) | Student React Query hooks: profile, streak, leaderboard, missions, spelling, story, evaluations |
| `hooks/mutations.ts` | [hooks.md](hooks.md) | Student mutations: `useClaimReward`, `useMissionComplete` |
| `hooks/teacher-queries.ts` | [hooks.md](hooks.md) | Teacher React Query hooks: classrooms, announcements, topics, syllabus, dashboard stats, daily plan |
| `hooks/admin-queries.ts` | [hooks.md](hooks.md) | Admin React Query hooks: CRUD for classrooms/students/teachers, books, evaluations, invites |
| `query-client.ts` | [hooks.md](hooks.md) | Singleton `QueryClient` factory with SSR safety |
| `query-provider.tsx` | [hooks.md](hooks.md) | `QueryProvider` -- wraps the app in `QueryClientProvider` |
| `network-queue.ts` | [networking.md](networking.md) | Offline queue: stores pending mission answers in localStorage, batch-flushes on reconnect |
| `use-network-status.ts` | [networking.md](networking.md) | `useNetworkStatus()` -- tracks browser online/offline state |
| `supabase/client.ts` | [networking.md](networking.md) | Browser-side Supabase client instance |
| `useTeacherRole.ts` | [hooks.md](hooks.md) | `useTeacherRole()` -- fetches and caches the teacher's role (teacher vs admin) |
| `avatarHelper.ts` | [api.md](api.md) | Avatar URL generation (DiceBear), initials extraction, deterministic background colors |

## Types

See [../types/index.md](../types/index.md) for all shared TypeScript type definitions (`types/index.ts`, `types/missions.ts`, `types/analytics.ts`).
