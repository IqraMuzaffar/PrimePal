# Security

**File:** `backend/app/core/security.py`

Handles JWT creation and validation for both teacher and student auth systems.

## Functions

### `create_student_token(student_id, classroom_id) -> str`
Creates a custom HS256 JWT for student authentication.
- Signed with `STUDENT_JWT_SECRET`
- Expires in 24 hours
- Payload: `{ sub: student_id, classroom_id, exp }`

### `decode_student_token(token) -> dict`
Decodes and validates a student JWT. Raises HTTPException 401 on failure.

### `get_current_student(authorization: Header) -> dict`
FastAPI dependency. Extracts Bearer token from Authorization header, decodes it, returns student payload.

### `get_current_teacher(authorization: Header) -> dict`
FastAPI dependency. Validates Supabase GoTrue JWT by calling `supabase.auth.get_user(token)`. Returns `{ id: teacher_uuid }`.

## Important
These are two completely separate auth systems. Teacher tokens are Supabase-managed GoTrue JWTs. Student tokens are custom PyJWT HS256 tokens. They use different secrets and different validation paths.
