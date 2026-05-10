# Security

**File:** `backend/app/core/security.py`

Handles JWT creation and validation for both teacher and student auth systems. Provides three FastAPI dependencies for route-level auth enforcement.

## Constants

| Name | Value | Description |
|------|-------|-------------|
| `ALGORITHM` | `"HS256"` | JWT signing algorithm |
| `TOKEN_EXPIRE_HOURS` | `24` | Student token lifetime |
| `_bearer` | `HTTPBearer(auto_error=True)` | FastAPI security scheme (returns 403 when no credentials) |

## Student Auth (Custom PyJWT)

Students are not Supabase Auth users. They authenticate with a custom HS256 JWT signed with `settings.STUDENT_JWT_SECRET`.

### `create_student_token(student_id: str, classroom_id: str) -> str`

Mints a signed JWT for a student session.

**Payload:**
```python
{
    "sub": student_id,       # Student UUID
    "classroom_id": classroom_id,  # Classroom UUID
    "role": "student",
    "exp": datetime.now(utc) + timedelta(hours=24),
}
```

**Returns:** Encoded JWT string.

### `decode_student_token(token: str) -> dict`

Decodes and validates a student JWT.

**Raises:**
- `HTTPException(401)` -- Token expired (`jwt.ExpiredSignatureError`)
- `HTTPException(401)` -- Invalid token (`jwt.InvalidTokenError`)
- `HTTPException(403)` -- Token role is not `"student"`

**Returns:** The decoded payload dict.

### `get_current_student(credentials: HTTPAuthorizationCredentials) -> dict`

FastAPI dependency. Extracts the Bearer token from the `Authorization` header, decodes it via `decode_student_token()`, and returns the payload.

**Usage:**
```python
@router.get("/missions/daily")
async def get_daily(student: dict = Depends(get_current_student)):
    student_id = student["sub"]
    classroom_id = student["classroom_id"]
```

## Teacher Auth (Supabase GoTrue)

Teachers authenticate via Supabase GoTrue. Their JWTs are validated by calling `supabase.auth.get_user(token)`.

### `get_current_teacher(credentials: HTTPAuthorizationCredentials) -> dict`

FastAPI dependency. Validates a Supabase GoTrue JWT for a teacher session.

**Flow:**
1. Calls `supabase.auth.get_user(token)` via the anon client
2. Extracts `user_id` from the response
3. Checks Redis cache for `teacher_role:{user_id}`
4. On cache miss: queries `teachers` table via admin client for the teacher's `role`
5. Caches the role in Redis with TTL 3600s (1 hour)

**Returns:**
```python
{"id": "<teacher_uuid>", "role": str, "is_admin": bool}
```

**Raises:**
- `HTTPException(401)` -- Invalid or expired teacher session

**Cache key pattern:** `teacher_role:{user_id}` (TTL: 1 hour)

### `get_current_admin(credentials: HTTPAuthorizationCredentials) -> dict`

FastAPI dependency. Validates that the authenticated user has the `"admin"` role.

**Flow:**
1. Same Supabase GoTrue validation as `get_current_teacher`
2. Checks Redis cache for `teacher_role:{user_id}`
3. On cache miss: queries `teachers` table for role
4. If role is not `"admin"`, raises 403
5. Caches the role result (both admin and non-admin) for 1 hour

**Returns:**
```python
{"id": "<admin_uuid>"}
```

**Raises:**
- `HTTPException(401)` -- Invalid or expired session
- `HTTPException(403)` -- User is not admin

## Important Design Decisions

- **Two completely separate auth systems.** Teacher tokens are Supabase-managed GoTrue JWTs. Student tokens are custom PyJWT HS256 tokens. They use different secrets and different validation paths. Never mix them.
- **Role caching in Redis.** Teacher role lookups hit Redis first (key: `teacher_role:{user_id}`, TTL: 1hr) to avoid repeated DB queries on every request.
- **Import ordering.** The Supabase client imports are placed mid-file (not at the top) to avoid load-order issues -- this is documented in the source with a comment.
- **HTTPBearer `auto_error=True`** means routes using these dependencies return 403 (not 401) when the `Authorization` header is missing entirely. This is FastAPI's default behavior for `HTTPBearer`.
