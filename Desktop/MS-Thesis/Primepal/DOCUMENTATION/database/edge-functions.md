# Edge Functions

## `auth-hook-add-role`

**Location**: `supabase/functions/auth-hook-add-role/index.ts`

**Runtime**: Deno (Supabase Edge Functions)

**Purpose**: Supabase Auth hook that injects the teacher's `role` field into JWT custom claims. This allows RLS policies and frontend route guards to distinguish between `teacher` and `admin` roles.

### Source Code Summary

The function:
1. Receives the authenticated user object from Supabase's auth hook system
2. Creates a Supabase admin client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables
3. Queries the `teachers` table for the user's `role` column: `SELECT role FROM teachers WHERE id = user.id`
4. Returns `{ claims: { role: "<role>" } }` which Supabase merges into the user's JWT

### Request/Response

**Input** (POST body from Supabase auth hook):
```json
{
  "user": {
    "id": "uuid-of-authenticated-user"
  }
}
```

**Output**:
```json
{
  "claims": {
    "role": "teacher" | "admin"
  }
}
```

### Error Handling

The function defaults to `{ claims: { role: "teacher" } }` in all error cases:
- User object missing or no `id` field
- Teacher record not found in database
- Database query error
- Any uncaught exception

This fail-safe design ensures authentication never breaks -- the worst case is an admin being treated as a regular teacher until the issue is resolved.

### Flow Diagram

```
User authenticates via Supabase GoTrue (email/password)
  |
  v
Supabase auth hook fires (configured in Supabase dashboard)
  |
  v
auth-hook-add-role Edge Function receives { user: { id } }
  |
  v
SELECT role FROM teachers WHERE id = user.id (via service_role client)
  |
  +-- Found: returns { claims: { role: data.role } }
  +-- Not found / error: returns { claims: { role: "teacher" } }
  |
  v
JWT now contains custom claim: { role: "teacher" | "admin" }
  |
  v
Frontend/RLS can check role via auth.jwt() ->> 'role'
```

### Environment Variables Required

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL (auto-injected by Supabase Edge Functions runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin-level DB access (must be set in Supabase dashboard under Edge Function secrets) |

### Dependencies

- `@supabase/supabase-js@2` (imported from esm.sh CDN)

### Consumed By

- **RLS policies** in migration 014 that check `auth.jwt_claims ->> 'role' = 'admin'` (or `(SELECT role FROM teachers WHERE id = auth.uid()) = 'admin'` in the 900 catchup version)
- **Frontend** admin route guards that inspect the JWT for role claims
- **Backend** `get_current_teacher` dependency that may check role claims for admin-only endpoints

### Scope

This hook only applies to **teacher/admin accounts** (Supabase GoTrue users). Student authentication uses a separate custom PyJWT system that never touches Supabase GoTrue or this hook.
