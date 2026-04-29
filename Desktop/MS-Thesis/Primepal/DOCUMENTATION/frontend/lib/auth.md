# Auth Helpers

## Teacher Auth (`lib/teacherAuth.ts`)

### `getTeacherHeaders() -> HeadersInit`
Reads the current Supabase session and returns an Authorization header with the GoTrue JWT.

```typescript
const headers = await getTeacherHeaders();
// { "Authorization": "Bearer <supabase_jwt>" }
```

Used by `apiFetch` and all teacher-facing API calls.

## Student Auth

Students authenticate via custom PyJWT tokens stored in localStorage.

```typescript
// After login
localStorage.setItem("primepal_student_token", token);

// For API calls
const token = localStorage.getItem("primepal_student_token");
headers: { "Authorization": `Bearer ${token}` }
```

## Admin Auth (`lib/adminAuth.ts`)

### `isCurrentUserAdmin() -> boolean`
Decodes the Supabase JWT client-side (via `atob`) to check for admin claims. Used for UI gating only — server-side validation is the real security boundary.

### `getAdminHeaders() -> HeadersInit`
Returns auth headers for admin API calls (same as teacher headers since admins are teachers with elevated privileges).
