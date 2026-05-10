# Feature 2: Classroom Manager — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Overview

Feature 2 gives authenticated teachers the ability to:
1. Create classrooms — a PostgreSQL trigger auto-generates a unique 6-char alphanumeric class code.
2. View and manage all their classrooms from a dashboard-style list.
3. Bulk-add student "ghost profiles" to a classroom roster with assigned avatars.
4. Remove individual students.

This connects directly to Feature 1 (the class code is what students enter on the student login screen) and will feed into Feature 10 (analytics per classroom).

---

## 1. SQL Migration

**File:** `supabase/migrations/002_feature2_classroom.sql`

### Changes to schema
- `ALTER TABLE classrooms ADD COLUMN grade_level INTEGER NOT NULL DEFAULT 1` — adds grade level (1–5 for primary school).
- No change to the `class_code NOT NULL` constraint — the BEFORE INSERT trigger fills it in before the constraint is checked.

### New trigger function
```sql
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS trigger AS $$
DECLARE
    new_code VARCHAR(6);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        SELECT EXISTS(SELECT 1 FROM classrooms WHERE class_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            NEW.class_code := new_code;
            EXIT;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### New trigger
```sql
DROP TRIGGER IF EXISTS set_class_code ON classrooms;
CREATE TRIGGER set_class_code
BEFORE INSERT ON classrooms
FOR EACH ROW EXECUTE FUNCTION generate_class_code();
```

The trigger loop is collision-safe at any realistic classroom count. At 6 alphanumeric chars (36^6 = ~2.18B combinations), even with 10,000 classrooms the collision probability per insert is negligible.

---

## 2. Backend

### 2a. `get_current_teacher` dependency (added to `app/core/security.py`)

Teachers authenticate via Supabase GoTrue — their token is a Supabase-issued JWT, **not** a custom PyJWT. To validate server-side, call `supabase.auth.get_user(token)`. Supabase verifies the token and returns the user object. Returns `{"id": <teacher_uuid>}`.

```python
def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    supabase = get_supabase()
    response = supabase.auth.get_user(credentials.credentials)
    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired teacher token")
    return {"id": str(response.user.id)}
```

### 2b. Schemas (`app/schemas/classroom.py`)

Replace the existing stub with:

| Schema | Fields |
|---|---|
| `ClassroomCreate` | `class_name: str`, `grade_level: int` |
| `ClassroomResponse` | `id: str`, `class_name: str`, `class_code: str`, `grade_level: int`, `created_at: str` |
| `ClassroomDetail` | Extends `ClassroomResponse` + `students: List[StudentResponse]` |
| `StudentBulkCreate` | `names: List[str]` (1–50 names) |
| `StudentResponse` | `id: str`, `student_name: str`, `avatar_url: str` |

### 2c. Endpoints (`app/api/v1/endpoints/classroom.py`)

All routes protected by `Depends(get_current_teacher)`. All writes use `get_supabase_admin()` (service role, bypasses RLS). Reads also use admin client to avoid needing to pass user session to Supabase Python client.

| Method | Path (under `/classroom`) | Description |
|---|---|---|
| `POST /` | Create classroom | Insert into `classrooms` with `teacher_id`, `class_name`, `grade_level`. `class_code` filled by trigger. Return `ClassroomResponse`. |
| `GET /` | List classrooms | `SELECT * FROM classrooms WHERE teacher_id = <id> ORDER BY created_at DESC`. Return `List[ClassroomResponse]`. |
| `GET /{id}` | Get classroom detail | Fetch classroom (verify ownership). Fetch all students for that classroom. Return `ClassroomDetail`. |
| `POST /{id}/students/bulk` | Bulk-add students | Verify classroom ownership. Iterate names, assign random avatar from 6-item list, bulk insert into `students`. Return `{"added": N}`. |
| `DELETE /{id}/students/{student_id}` | Remove student | Verify classroom ownership. Delete student from `students`. Return 204. |

**Avatar list** (local Next.js public assets):
```python
DEFAULT_AVATARS = [
    "/avatars/tiger.png", "/avatars/owl.png", "/avatars/panda.png",
    "/avatars/fox.png", "/avatars/monkey.png", "/avatars/rabbit.png",
]
```

**Bulk-add input sanitisation** (backend): strip whitespace, filter empty strings, deduplicate names already on roster.

### 2d. Tests (`backend/tests/test_classroom.py`)

8 tests, same mock-at-import-path pattern as `test_auth.py`. Mock targets: `app.api.v1.endpoints.classroom.get_supabase_admin` and `app.api.v1.endpoints.classroom.get_current_teacher`.

| Test | Scenario |
|---|---|
| `test_create_classroom_success` | 201, returns class_name + class_code |
| `test_create_classroom_unauthorized` | No token → 403 |
| `test_list_classrooms_returns_owned` | Returns only teacher's classrooms |
| `test_list_classrooms_empty` | No classrooms → empty list, 200 |
| `test_get_classroom_detail_with_students` | Returns classroom + roster |
| `test_get_classroom_not_owned` | Wrong teacher_id → 403 |
| `test_bulk_add_students_success` | 3 names → {"added": 3} |
| `test_bulk_add_empty_names_filtered` | Empty/whitespace names stripped before insert |

---

## 3. Frontend

### 3a. Route structure

```
app/(teacher)/
  classroom/
    page.tsx              ← Classroom list / manager (replaces Feature 2 stub)
    [id]/
      page.tsx            ← Classroom detail: header + Roster tab + bulk-add
components/
  teacher/
    CreateClassroomModal.tsx
    BulkAddStudentsModal.tsx
```

`/dashboard` remains the Feature 10 stub — untouched.

### 3b. `classroom/page.tsx` — Classroom List

- On mount: `GET /classroom/` with teacher's Supabase session token as Bearer.
- Renders a grid of **Classroom Cards** (indigo palette, same design language as login page). Each card shows: `class_name`, `grade_level` badge, `class_code` in a monospace block with a **Copy** button (clipboard API).
- **"New Classroom"** button (top-right) opens `CreateClassroomModal`.
- Loading skeleton and empty-state ("No classrooms yet — create your first one").
- Each card is a link to `/classroom/{id}`.

### 3c. `classroom/[id]/page.tsx` — Classroom Detail

- On mount: `GET /classroom/{id}` — fetches classroom + full roster.
- **Header**: class name, grade badge, class code with copy button, back link.
- **Tabs**: "Roster" | "Missions (coming soon)" | "Analytics (coming soon)".
- **Roster tab**: table with columns — avatar thumbnail (24×24), student name. "Add Students" button opens `BulkAddStudentsModal`. Each row has a remove (trash) icon → `DELETE /classroom/{id}/students/{student_id}` with confirmation.
- Re-fetches roster after successful bulk-add or remove.

### 3d. `CreateClassroomModal.tsx`

- Fields: Class Name (text), Grade Level (select 1–5).
- Submit → `POST /classroom/` → on success closes modal and re-fetches list.
- Inline validation: class name required, grade level required.

### 3e. `BulkAddStudentsModal.tsx`

- `<textarea>` — comma or newline separated names.
- Client-side parse: split on `/[\n,]/`, trim, filter empty strings.
- Submit → `POST /classroom/{id}/students/bulk` → on success: show "X students added", close modal, trigger re-fetch.

### 3f. Auth helper

```ts
// lib/teacherAuth.ts
export async function getTeacherHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${session.access_token}` };
}
```

All classroom `apiFetch` calls spread these headers into `options.headers`.

### 3g. Types (`types/index.ts`)

Update `Classroom` interface:
```ts
export interface Classroom {
  id: string;
  class_name: string;   // was `name` — align to DB column
  class_code: string;
  grade_level: number;  // was `string | null`
  created_at: string;
}

export interface Student {
  id: string;
  student_name: string;  // align to DB column
  avatar_url: string;
}
```

---

## 4. Architectural constraints honoured

- RLS remains enabled on all tables. Backend bypasses via service role only after validating teacher identity in `get_current_teacher`.
- No Supabase Auth users created for students — ghost profiles only.
- All routes under `/api/v1/` prefix (set in `main.py`).
- Frontend uses `apiFetch` from `lib/api.ts` for all backend calls.
- Teacher and student route groups stay isolated.
