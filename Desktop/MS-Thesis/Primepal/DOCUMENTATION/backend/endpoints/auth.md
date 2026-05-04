# Auth Endpoints

**Module:** `backend/app/api/v1/endpoints/auth.py`
**Prefix:** `/api/v1/auth`
**Feature:** Smart Auth & Role Management (Feature 1)

## Overview

Implements the student visual login flow (avatar select + PIN) and teacher profile retrieval. Two separate auth systems: students use custom PyJWT tokens; teachers use Supabase GoTrue.

---

## GET `/api/v1/auth/classroom/{class_code}/avatars`

**Auth:** None (public)

Fetch the student roster for the visual login grid. Step 1 of the student login flow.

**Path Parameters:**
- `class_code` (string) -- Classroom code (case-insensitive, uppercased server-side)

**Response:** `List[AvatarResponse]`
```json
[
  {
    "id": "uuid",
    "student_name": "Ali",
    "avatar_url": "https://api.dicebear.com/...",
    "avatar_style": "adventurer",
    "theme_color": "#6366f1"
  }
]
```

**DB Tables:** `classrooms` (lookup by class_code), `students` (select roster)

**Errors:**
- 404: No classroom found for given class code

---

## POST `/api/v1/auth/student/login`

**Auth:** None (public)

Validate student avatar selection + 4-digit PIN, issue a signed JWT. Step 2 of the student login flow.

**Request Body:** `StudentLoginRequest`
```json
{
  "student_id": "uuid",
  "class_code": "ABC123",
  "secret_pin": "1234"
}
```

**Validation:**
- `secret_pin` must be exactly 4 digits (regex `\d{4}`)

**Response:** `TokenResponse`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Business Logic:**
1. Lookup classroom by `class_code` (case-insensitive)
2. Verify student belongs to that classroom
3. Compare `secret_pin` against DB value
4. Generate JWT via `create_student_token(student_id, classroom_id)`

**DB Tables:** `classrooms`, `students`

**Errors:**
- 404: Classroom not found
- 403: Student does not belong to classroom
- 401: Incorrect PIN

---

## PATCH `/api/v1/auth/student/profile`

**Auth:** Student JWT (`get_current_student`)

Update the authenticated student's avatar_style and/or theme_color.

**Request Body:** `UpdateProfileRequest`
```json
{
  "avatar_style": "fun-emoji",
  "theme_color": "#10b981"
}
```

Both fields are optional, but at least one must be provided.

**Validation:**
- `avatar_style` must be one of: `adventurer`, `bottts`, `fun-emoji`, `pixel-art`, `lorelei`
- `theme_color` must match `^#[0-9a-fA-F]{6}$`

**Response:** `UpdateProfileResponse`
```json
{
  "avatar_style": "fun-emoji",
  "theme_color": "#10b981"
}
```

**DB Tables:** `students` (update + re-fetch)

**Errors:**
- 422: No fields provided
- 404: Student not found

---

## PATCH `/api/v1/auth/student/{student_id}/pin`

**Auth:** Teacher GoTrue (`get_current_teacher`) + permission `student:update`

Reset a student's secret PIN. Teacher must own the classroom the student belongs to.

**Path Parameters:**
- `student_id` (string) -- UUID of the student

**Request Body:** `ResetPinRequest`
```json
{
  "secret_pin": "5678"
}
```

**Validation:**
- `secret_pin` must be exactly 4 digits

**Response:** `ResetPinResponse`
```json
{
  "student_id": "uuid",
  "secret_pin": "5678"
}
```

**Business Logic:**
1. Check `student:update` permission
2. Fetch student record, verify it exists
3. Fetch student's classroom, verify `teacher_id` matches authenticated teacher
4. Update `secret_pin` in students table

**DB Tables:** `students`, `classrooms`

**Errors:**
- 404: Student not found
- 403: Not your student (teacher doesn't own the classroom)

---

## GET `/api/v1/auth/me`

**Auth:** Teacher GoTrue (`get_current_teacher`)

Get the current teacher's profile including role (teacher or admin).

**Response:** `TeacherProfileResponse`
```json
{
  "id": "uuid",
  "email": "teacher@example.com",
  "full_name": "Amna Khan",
  "role": "teacher"
}
```

**Business Logic:**
- Queries `teachers` table by teacher ID from JWT
- Falls back to basic profile from JWT claims if DB lookup fails

**DB Tables:** `teachers`

**Errors:** None (graceful fallback)
