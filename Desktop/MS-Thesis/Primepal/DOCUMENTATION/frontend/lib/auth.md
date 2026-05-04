# Auth Helpers

PrimePal uses two separate auth systems. Teachers/admins authenticate via Supabase GoTrue. Students authenticate via custom PyJWT tokens stored in localStorage.

---

## Teacher Auth -- `frontend/lib/teacherAuth.ts`

### `getTeacherHeaders(): Promise<HeadersInit>`

Reads the current Supabase session via `supabase.auth.getSession()` and returns an Authorization header with the access token.

```typescript
export async function getTeacherHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated — please sign in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}
```

- **Throws** if no active session (expired or not logged in).
- Used by `teacherFetch()` and `teacherMutate()` in `api-helpers.ts`.

---

## Admin Auth -- `frontend/lib/adminAuth.ts`

### `getAdminHeaders(): Promise<HeadersInit>`

Identical to `getTeacherHeaders()` -- returns Supabase session token as an Authorization header. Admins are teachers with `role = "admin"` in the database; they share the same Supabase auth mechanism.

```typescript
export async function getAdminHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated — please sign in again.");
  return { Authorization: `Bearer ${session.access_token}` };
}
```

### `isCurrentUserAdmin(): Promise<boolean>`

Checks whether the currently logged-in user has admin role by calling the backend `/auth/me` endpoint with the Supabase token. Returns `true` only if `data.role === "admin"`. Returns `false` on any error or missing session.

```typescript
export async function isCurrentUserAdmin(): Promise<boolean>
```

- **Does NOT decode the JWT client-side** -- calls the server for verification.
- Used for UI gating; server-side validation is the real security boundary.

---

## Student Auth

Students authenticate via custom PyJWT tokens (not Supabase). The token is stored in:

```
localStorage["primepal_student_token"]
```

The `studentFetch()` and `studentMutate()` helpers in `api-helpers.ts` read this token and attach it as a Bearer header. If the token is missing, they throw `"Not authenticated"`.

The student's `classroom_id` can be extracted from the JWT payload via `getStudentClassroomId()` in `api-helpers.ts`.

---

## Teacher Role Hook -- `frontend/lib/useTeacherRole.ts`

### `useTeacherRole(): { role: string | null; isAdmin: boolean; loading: boolean }`

React hook that fetches and caches the teacher's role. Calls `GET /auth/me` with teacher auth headers on first mount.

```typescript
interface TeacherProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}
```

- Uses a module-level `cachedRole` variable so the `/auth/me` call only happens once per page session.
- On fetch error, defaults to `role = "teacher"`.
- Returns `{ role, isAdmin: role === "admin", loading }`.
