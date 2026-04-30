# A02 — Global Entity Management (CRUD Operations)

**Priority:** HIGH
**Status:** TODO
**Depends on:** None

## What Exists

**Teacher Management:**
- Admin can list teachers (`/admin/dashboard/staff`)
- Invite code creation for new teacher signups
- Edit/delete UI buttons exist but **handlers not implemented**

**Classroom Management (teacher-level only):**
- Create classrooms with auto-generated class codes
- View classroom roster
- Bulk add students (name-only or name+roll+email)
- Edit individual students
- Remove students from roster
- All via `/teacher/classroom/*` routes

**Student Management (teacher-level only):**
- Add students to a classroom
- Edit student name, roll number
- Remove from classroom
- PIN reset (via teacher)

**Admin-Level CRUD: MISSING**
- No admin page for classroom CRUD
- No admin page for student CRUD across classrooms
- No edit/delete for teachers
- No PIN/password reset from admin

## What Needs to Be Built

### 1. Admin Inherits All Teacher Features

- Admin must have access to all teacher dashboard pages and features
- Route guard: admin role should be able to access `/teacher/*` routes
- OR: replicate teacher features on `/admin/dashboard/*` with admin-level permissions

### 2. Teacher Account Management (Full CRUD)

| Operation | Endpoint | Admin UI |
|-----------|----------|----------|
| List all teachers | `GET /admin/teachers` | EXISTS |
| Create teacher | Invite code flow | EXISTS |
| Edit teacher (name, email, role) | `PUT /admin/teachers/{id}` | MISSING |
| Delete teacher | `DELETE /admin/teachers/{id}` | MISSING |
| Reset teacher password | `POST /admin/teachers/{id}/reset-password` | MISSING |

### 3. Classroom Management (Admin-Level)

| Operation | Endpoint | Admin UI |
|-----------|----------|----------|
| List all classrooms (all grades) | `GET /admin/classrooms` | MISSING |
| Create classroom | `POST /admin/classrooms` | MISSING (teacher-level only) |
| Edit classroom (name, grade, teacher assignment) | `PUT /admin/classrooms/{id}` | MISSING |
| Delete classroom | `DELETE /admin/classrooms/{id}` | MISSING |
| Reassign teacher to classroom | `PUT /admin/classrooms/{id}/teacher` | MISSING |

### 4. Student Management (Admin-Level, Cross-Classroom)

| Operation | Endpoint | Admin UI |
|-----------|----------|----------|
| List all students (global) | `GET /admin/students` | MISSING |
| Search students (name, roll number, grade) | `GET /admin/students?q=...` | MISSING |
| Create student | `POST /admin/students` | MISSING (teacher-level only) |
| Edit student (name, roll, classroom transfer) | `PUT /admin/students/{id}` | MISSING |
| Delete student | `DELETE /admin/students/{id}` | MISSING |
| Reset student PIN | `POST /admin/students/{id}/reset-pin` | MISSING |
| Transfer student between classrooms | `PUT /admin/students/{id}/transfer` | MISSING |

### 5. Admin UI Pages

- `/admin/dashboard/teachers` — teacher CRUD (enhance existing staff page)
- `/admin/dashboard/classrooms` — classroom CRUD (new page)
- `/admin/dashboard/students` — global student management (new page)
- Each page: data table with search, filter, bulk actions, create/edit/delete

### 6. Safety Guards

- Deleting a teacher: soft-delete (set `is_active = false`), don't cascade-delete classrooms
- Deleting a classroom: warn if students exist, offer to transfer students first
- Deleting a student: soft-delete, preserve `student_interactions` for historical data
- All delete operations require confirmation dialog

## Engineering Notes

- The backend admin router (`backend/app/endpoints/admin.py`) exists but only handles teacher listing + invite codes
- Extend it with full CRUD endpoints for all three entities
- Admin auth: already uses custom PyJWT with `is_admin` flag — leverage this
- Consider using the existing teacher classroom endpoints for admin too (admin should pass admin JWT and bypass teacher_id filtering)

## Files to Touch

- `backend/app/endpoints/admin.py` — expand with full CRUD for teachers, classrooms, students
- `frontend/src/app/admin/dashboard/staff/` — enhance teacher management
- `frontend/src/app/admin/dashboard/classrooms/` — new page
- `frontend/src/app/admin/dashboard/students/` — new page
- `supabase/migrations/` — add `is_active` soft-delete columns if not present
