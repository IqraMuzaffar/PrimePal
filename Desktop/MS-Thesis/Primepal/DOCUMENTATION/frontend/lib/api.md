# API Client

**File:** `frontend/lib/api.ts`

## `apiFetch(path, options?)`

Typed fetch wrapper that all frontend API calls should use.

### Behavior
- Prepends `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`) to the path
- Sets `Content-Type: application/json` by default
- Adds teacher auth headers via `getTeacherHeaders()` if a Supabase session exists
- Parses response as JSON

### Usage
```typescript
import { apiFetch } from "@/lib/api";

const classrooms = await apiFetch("/classroom/");
const detail = await apiFetch(`/classroom/${id}`);
await apiFetch("/classroom/", { method: "POST", body: JSON.stringify({ name, grade_level }) });
```

### When NOT to use apiFetch
- **FormData uploads** — `apiFetch` forces `Content-Type: application/json`, breaking multipart uploads. Use raw `fetch()` with `process.env.NEXT_PUBLIC_API_URL` instead.
- **Student-authenticated requests** — `apiFetch` adds teacher headers. Student endpoints need the custom JWT from `localStorage['primepal_student_token']`.
- **Non-JSON responses** — `apiFetch` always parses as JSON.

### Environment Variable
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
