# Auth Endpoints

**Module:** `backend/app/api/v1/endpoints/auth.py`
**Prefix:** `/api/v1/auth`

## Endpoints

### GET `/auth/classroom/{class_code}/avatars`
**Auth:** None
**Purpose:** Returns all students in a classroom for the visual login grid.
**Response:** `{ students: [{ id, full_name, avatar_url }] }`

### POST `/auth/student/login`
**Auth:** None
**Purpose:** Student login via class code + student selection + PIN.
**Body:** `{ classroom_id, student_id, secret_pin }`
**Response:** `{ token: "<JWT>", student: { id, full_name, avatar_url, classroom_id } }`

### POST `/auth/student/register`
**Auth:** Teacher (GoTrue JWT)
**Purpose:** Register a new student in a classroom.
**Body:** `{ full_name, classroom_id, secret_pin? }`

### PATCH `/auth/student/{student_id}/pin`
**Auth:** Teacher
**Purpose:** Reset a student's 4-digit PIN.
**Body:** `{ secret_pin }`

### POST `/auth/teacher/login`
**Auth:** None
**Purpose:** Teacher login (delegates to Supabase GoTrue).

## Notes
- Student PINs are stored in plaintext (see TICKETS/05 for planned hashing)
- The avatars endpoint has no auth — class codes should not be guessable
