# API Client and Helpers

## Core: `apiFetch()` -- `frontend/lib/api.ts`

Generic typed fetch wrapper. All role-specific helpers delegate to this.

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T>
```

### Behavior

- Prepends `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`) to the path.
- Sets `Content-Type: application/json` by default (can be overridden via `options.headers`).
- On non-OK response, throws `Error` with `detail` from JSON body or `"API error <status>"`.
- Returns parsed JSON typed as `T`.

### When NOT to use `apiFetch` directly

- **FormData uploads** -- `apiFetch` forces `Content-Type: application/json`, breaking multipart. Use raw `fetch()`.
- **Unauthenticated requests** -- `apiFetch` does not add auth headers on its own. Use the role-specific helpers below.

---

## Role-Specific Helpers -- `frontend/lib/api-helpers.ts`

These add authentication headers automatically and delegate to `apiFetch` or raw `fetch`.

### `getStudentClassroomId(): string | null`

Extracts `classroom_id` from the student JWT stored in `localStorage["primepal_student_token"]` by base64-decoding the payload. Returns `null` if no token or decoding fails.

### `adminFetch<T>(path: string): Promise<T>`

GET request with admin Supabase auth headers (via `getAdminHeaders()`). Uses raw `fetch` internally (not `apiFetch`).

### `adminMutate<T>(path: string, body: unknown, method?: string): Promise<T>`

Write request (default POST) with admin auth headers and JSON body. Uses raw `fetch`.

### `teacherFetch<T>(path: string, options?: RequestInit): Promise<T>`

GET/read request with teacher Supabase auth headers (via `getTeacherHeaders()`). Delegates to `apiFetch`.

### `teacherMutate<T>(path: string, body: unknown, method?: string): Promise<T>`

Write request (default POST) with teacher auth headers and JSON body. Delegates to `apiFetch`.

### `studentFetch<T>(path: string, options?: RequestInit): Promise<T>`

GET/read request with student JWT from `localStorage["primepal_student_token"]`. Delegates to `apiFetch`. Throws `"Not authenticated"` if no token.

### `studentMutate<T>(path: string, body: unknown, method?: string): Promise<T>`

Write request (default POST) with student JWT and JSON body. Delegates to `apiFetch`. Throws `"Not authenticated"` if no token.

---

## Avatar Helper -- `frontend/lib/avatarHelper.ts`

Utility functions for avatar display across the app.

### `getAvatarUrl(name: string | null | undefined, fallbackUrl?: string): string`

Returns an avatar image URL:
1. If `name` is falsy, returns `"/avatars/default.svg"`.
2. If `fallbackUrl` is provided, returns it.
3. Otherwise, returns a DiceBear initials avatar: `https://api.dicebear.com/8.x/initials/svg?seed=<name>&backgroundColor=random`.

### `getInitials(name: string | null | undefined): string`

Extracts up to 2 uppercase initials from a name (e.g. `"Ali Khan"` -> `"AK"`). Returns `"?"` for null/undefined.

### `getAvatarBackgroundColor(name: string | null | undefined): string`

Returns a deterministic Tailwind background color class (e.g. `"bg-blue-400"`) based on a hash of the name. Falls back to `"bg-gray-400"`. Uses an 8-color palette: red, blue, green, yellow, purple, pink, indigo, teal.

---

## Environment Variable

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
